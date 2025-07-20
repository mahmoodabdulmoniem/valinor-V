/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as os from 'os';
import { Emitter, Event } from '../../base/common/event.js';
import { cloneAndChange } from '../../base/common/objects.js';
import { Disposable } from '../../base/common/lifecycle.js';
import * as path from '../../base/common/path.js';
import * as platform from '../../base/common/platform.js';
import { URI } from '../../base/common/uri.js';
import { createRandomIPCHandle } from '../../base/parts/ipc/node/ipc.net.js';
import { createURITransformer } from '../../workbench/api/node/uriTransformer.js';
import { CLIServerBase } from '../../workbench/api/node/extHostCLIServer.js';
import { MergedEnvironmentVariableCollection } from '../../platform/terminal/common/environmentVariableCollection.js';
import { deserializeEnvironmentDescriptionMap, deserializeEnvironmentVariableCollection } from '../../platform/terminal/common/environmentVariableShared.js';
import * as terminalEnvironment from '../../workbench/contrib/terminal/common/terminalEnvironment.js';
import { AbstractVariableResolverService } from '../../workbench/services/configurationResolver/common/variableResolver.js';
import { buildUserEnvironment } from './extensionHostConnection.js';
import { promiseWithResolvers } from '../../base/common/async.js';
import { shouldUseEnvironmentVariableCollection } from '../../platform/terminal/common/terminalEnvironment.js';
class CustomVariableResolver extends AbstractVariableResolverService {
    constructor(env, workspaceFolders, activeFileResource, resolvedVariables, extensionService) {
        super({
            getFolderUri: (folderName) => {
                const found = workspaceFolders.filter(f => f.name === folderName);
                if (found && found.length > 0) {
                    return found[0].uri;
                }
                return undefined;
            },
            getWorkspaceFolderCount: () => {
                return workspaceFolders.length;
            },
            getConfigurationValue: (folderUri, section) => {
                return resolvedVariables[`config:${section}`];
            },
            getExecPath: () => {
                return env['VSCODE_EXEC_PATH'];
            },
            getAppRoot: () => {
                return env['VSCODE_CWD'];
            },
            getFilePath: () => {
                if (activeFileResource) {
                    return path.normalize(activeFileResource.fsPath);
                }
                return undefined;
            },
            getSelectedText: () => {
                return resolvedVariables['selectedText'];
            },
            getLineNumber: () => {
                return resolvedVariables['lineNumber'];
            },
            getColumnNumber: () => {
                return resolvedVariables['columnNumber'];
            },
            getExtension: async (id) => {
                const installed = await extensionService.getInstalled();
                const found = installed.find(e => e.identifier.id === id);
                return found && { extensionLocation: found.location };
            },
        }, undefined, Promise.resolve(os.homedir()), Promise.resolve(env));
    }
}
export class RemoteTerminalChannel extends Disposable {
    constructor(_environmentService, _logService, _ptyHostService, _productService, _extensionManagementService, _configurationService) {
        super();
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._ptyHostService = _ptyHostService;
        this._productService = _productService;
        this._extensionManagementService = _extensionManagementService;
        this._configurationService = _configurationService;
        this._lastReqId = 0;
        this._pendingCommands = new Map();
        this._onExecuteCommand = this._register(new Emitter());
        this.onExecuteCommand = this._onExecuteCommand.event;
    }
    async call(ctx, command, args) {
        switch (command) {
            case "$restartPtyHost" /* RemoteTerminalChannelRequest.RestartPtyHost */: return this._ptyHostService.restartPtyHost.apply(this._ptyHostService, args);
            case "$createProcess" /* RemoteTerminalChannelRequest.CreateProcess */: {
                const uriTransformer = createURITransformer(ctx.remoteAuthority);
                return this._createProcess(uriTransformer, args);
            }
            case "$attachToProcess" /* RemoteTerminalChannelRequest.AttachToProcess */: return this._ptyHostService.attachToProcess.apply(this._ptyHostService, args);
            case "$detachFromProcess" /* RemoteTerminalChannelRequest.DetachFromProcess */: return this._ptyHostService.detachFromProcess.apply(this._ptyHostService, args);
            case "$listProcesses" /* RemoteTerminalChannelRequest.ListProcesses */: return this._ptyHostService.listProcesses.apply(this._ptyHostService, args);
            case "$getLatency" /* RemoteTerminalChannelRequest.GetLatency */: return this._ptyHostService.getLatency.apply(this._ptyHostService, args);
            case "$getPerformanceMarks" /* RemoteTerminalChannelRequest.GetPerformanceMarks */: return this._ptyHostService.getPerformanceMarks.apply(this._ptyHostService, args);
            case "$orphanQuestionReply" /* RemoteTerminalChannelRequest.OrphanQuestionReply */: return this._ptyHostService.orphanQuestionReply.apply(this._ptyHostService, args);
            case "$acceptPtyHostResolvedVariables" /* RemoteTerminalChannelRequest.AcceptPtyHostResolvedVariables */: return this._ptyHostService.acceptPtyHostResolvedVariables.apply(this._ptyHostService, args);
            case "$start" /* RemoteTerminalChannelRequest.Start */: return this._ptyHostService.start.apply(this._ptyHostService, args);
            case "$input" /* RemoteTerminalChannelRequest.Input */: return this._ptyHostService.input.apply(this._ptyHostService, args);
            case "$sendSignal" /* RemoteTerminalChannelRequest.SendSignal */: return this._ptyHostService.sendSignal.apply(this._ptyHostService, args);
            case "$acknowledgeDataEvent" /* RemoteTerminalChannelRequest.AcknowledgeDataEvent */: return this._ptyHostService.acknowledgeDataEvent.apply(this._ptyHostService, args);
            case "$shutdown" /* RemoteTerminalChannelRequest.Shutdown */: return this._ptyHostService.shutdown.apply(this._ptyHostService, args);
            case "$resize" /* RemoteTerminalChannelRequest.Resize */: return this._ptyHostService.resize.apply(this._ptyHostService, args);
            case "$clearBuffer" /* RemoteTerminalChannelRequest.ClearBuffer */: return this._ptyHostService.clearBuffer.apply(this._ptyHostService, args);
            case "$getInitialCwd" /* RemoteTerminalChannelRequest.GetInitialCwd */: return this._ptyHostService.getInitialCwd.apply(this._ptyHostService, args);
            case "$getCwd" /* RemoteTerminalChannelRequest.GetCwd */: return this._ptyHostService.getCwd.apply(this._ptyHostService, args);
            case "$processBinary" /* RemoteTerminalChannelRequest.ProcessBinary */: return this._ptyHostService.processBinary.apply(this._ptyHostService, args);
            case "$sendCommandResult" /* RemoteTerminalChannelRequest.SendCommandResult */: return this._sendCommandResult(args[0], args[1], args[2]);
            case "$installAutoReply" /* RemoteTerminalChannelRequest.InstallAutoReply */: return this._ptyHostService.installAutoReply.apply(this._ptyHostService, args);
            case "$uninstallAllAutoReplies" /* RemoteTerminalChannelRequest.UninstallAllAutoReplies */: return this._ptyHostService.uninstallAllAutoReplies.apply(this._ptyHostService, args);
            case "$getDefaultSystemShell" /* RemoteTerminalChannelRequest.GetDefaultSystemShell */: return this._getDefaultSystemShell.apply(this, args);
            case "$getProfiles" /* RemoteTerminalChannelRequest.GetProfiles */: return this._getProfiles.apply(this, args);
            case "$getEnvironment" /* RemoteTerminalChannelRequest.GetEnvironment */: return this._getEnvironment();
            case "$getWslPath" /* RemoteTerminalChannelRequest.GetWslPath */: return this._getWslPath(args[0], args[1]);
            case "$getTerminalLayoutInfo" /* RemoteTerminalChannelRequest.GetTerminalLayoutInfo */: return this._ptyHostService.getTerminalLayoutInfo(args);
            case "$setTerminalLayoutInfo" /* RemoteTerminalChannelRequest.SetTerminalLayoutInfo */: return this._ptyHostService.setTerminalLayoutInfo(args);
            case "$serializeTerminalState" /* RemoteTerminalChannelRequest.SerializeTerminalState */: return this._ptyHostService.serializeTerminalState.apply(this._ptyHostService, args);
            case "$reviveTerminalProcesses" /* RemoteTerminalChannelRequest.ReviveTerminalProcesses */: return this._ptyHostService.reviveTerminalProcesses.apply(this._ptyHostService, args);
            case "$getRevivedPtyNewId" /* RemoteTerminalChannelRequest.GetRevivedPtyNewId */: return this._ptyHostService.getRevivedPtyNewId.apply(this._ptyHostService, args);
            case "$setUnicodeVersion" /* RemoteTerminalChannelRequest.SetUnicodeVersion */: return this._ptyHostService.setUnicodeVersion.apply(this._ptyHostService, args);
            case "$reduceConnectionGraceTime" /* RemoteTerminalChannelRequest.ReduceConnectionGraceTime */: return this._reduceConnectionGraceTime();
            case "$updateIcon" /* RemoteTerminalChannelRequest.UpdateIcon */: return this._ptyHostService.updateIcon.apply(this._ptyHostService, args);
            case "$updateTitle" /* RemoteTerminalChannelRequest.UpdateTitle */: return this._ptyHostService.updateTitle.apply(this._ptyHostService, args);
            case "$updateProperty" /* RemoteTerminalChannelRequest.UpdateProperty */: return this._ptyHostService.updateProperty.apply(this._ptyHostService, args);
            case "$refreshProperty" /* RemoteTerminalChannelRequest.RefreshProperty */: return this._ptyHostService.refreshProperty.apply(this._ptyHostService, args);
            case "$requestDetachInstance" /* RemoteTerminalChannelRequest.RequestDetachInstance */: return this._ptyHostService.requestDetachInstance(args[0], args[1]);
            case "$acceptDetachedInstance" /* RemoteTerminalChannelRequest.AcceptDetachedInstance */: return this._ptyHostService.acceptDetachInstanceReply(args[0], args[1]);
            case "$freePortKillProcess" /* RemoteTerminalChannelRequest.FreePortKillProcess */: return this._ptyHostService.freePortKillProcess.apply(this._ptyHostService, args);
            case "$acceptDetachInstanceReply" /* RemoteTerminalChannelRequest.AcceptDetachInstanceReply */: return this._ptyHostService.acceptDetachInstanceReply.apply(this._ptyHostService, args);
        }
        // @ts-expect-error Assert command is the `never` type to ensure all messages are handled
        throw new Error(`IPC Command ${command} not found`);
    }
    listen(_, event, arg) {
        switch (event) {
            case "$onPtyHostExitEvent" /* RemoteTerminalChannelEvent.OnPtyHostExitEvent */: return this._ptyHostService.onPtyHostExit || Event.None;
            case "$onPtyHostStartEvent" /* RemoteTerminalChannelEvent.OnPtyHostStartEvent */: return this._ptyHostService.onPtyHostStart || Event.None;
            case "$onPtyHostUnresponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostUnresponsiveEvent */: return this._ptyHostService.onPtyHostUnresponsive || Event.None;
            case "$onPtyHostResponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostResponsiveEvent */: return this._ptyHostService.onPtyHostResponsive || Event.None;
            case "$onPtyHostRequestResolveVariablesEvent" /* RemoteTerminalChannelEvent.OnPtyHostRequestResolveVariablesEvent */: return this._ptyHostService.onPtyHostRequestResolveVariables || Event.None;
            case "$onProcessDataEvent" /* RemoteTerminalChannelEvent.OnProcessDataEvent */: return this._ptyHostService.onProcessData;
            case "$onProcessReadyEvent" /* RemoteTerminalChannelEvent.OnProcessReadyEvent */: return this._ptyHostService.onProcessReady;
            case "$onProcessExitEvent" /* RemoteTerminalChannelEvent.OnProcessExitEvent */: return this._ptyHostService.onProcessExit;
            case "$onProcessReplayEvent" /* RemoteTerminalChannelEvent.OnProcessReplayEvent */: return this._ptyHostService.onProcessReplay;
            case "$onProcessOrphanQuestion" /* RemoteTerminalChannelEvent.OnProcessOrphanQuestion */: return this._ptyHostService.onProcessOrphanQuestion;
            case "$onExecuteCommand" /* RemoteTerminalChannelEvent.OnExecuteCommand */: return this.onExecuteCommand;
            case "$onDidRequestDetach" /* RemoteTerminalChannelEvent.OnDidRequestDetach */: return this._ptyHostService.onDidRequestDetach || Event.None;
            case "$onDidChangeProperty" /* RemoteTerminalChannelEvent.OnDidChangeProperty */: return this._ptyHostService.onDidChangeProperty;
        }
        // @ts-expect-error Assert event is the `never` type to ensure all messages are handled
        throw new Error(`IPC Command ${event} not found`);
    }
    async _createProcess(uriTransformer, args) {
        const shellLaunchConfig = {
            name: args.shellLaunchConfig.name,
            executable: args.shellLaunchConfig.executable,
            args: args.shellLaunchConfig.args,
            cwd: (typeof args.shellLaunchConfig.cwd === 'string' || typeof args.shellLaunchConfig.cwd === 'undefined'
                ? args.shellLaunchConfig.cwd
                : URI.revive(uriTransformer.transformIncoming(args.shellLaunchConfig.cwd))),
            env: args.shellLaunchConfig.env,
            useShellEnvironment: args.shellLaunchConfig.useShellEnvironment,
            reconnectionProperties: args.shellLaunchConfig.reconnectionProperties,
            type: args.shellLaunchConfig.type,
            isFeatureTerminal: args.shellLaunchConfig.isFeatureTerminal,
            tabActions: args.shellLaunchConfig.tabActions,
            shellIntegrationEnvironmentReporting: args.shellLaunchConfig.shellIntegrationEnvironmentReporting,
        };
        const baseEnv = await buildUserEnvironment(args.resolverEnv, !!args.shellLaunchConfig.useShellEnvironment, platform.language, this._environmentService, this._logService, this._configurationService);
        this._logService.trace('baseEnv', baseEnv);
        const reviveWorkspaceFolder = (workspaceData) => {
            return {
                uri: URI.revive(uriTransformer.transformIncoming(workspaceData.uri)),
                name: workspaceData.name,
                index: workspaceData.index,
                toResource: () => {
                    throw new Error('Not implemented');
                }
            };
        };
        const workspaceFolders = args.workspaceFolders.map(reviveWorkspaceFolder);
        const activeWorkspaceFolder = args.activeWorkspaceFolder ? reviveWorkspaceFolder(args.activeWorkspaceFolder) : undefined;
        const activeFileResource = args.activeFileResource ? URI.revive(uriTransformer.transformIncoming(args.activeFileResource)) : undefined;
        const customVariableResolver = new CustomVariableResolver(baseEnv, workspaceFolders, activeFileResource, args.resolvedVariables, this._extensionManagementService);
        const variableResolver = terminalEnvironment.createVariableResolver(activeWorkspaceFolder, process.env, customVariableResolver);
        // Get the initial cwd
        const initialCwd = await terminalEnvironment.getCwd(shellLaunchConfig, os.homedir(), variableResolver, activeWorkspaceFolder?.uri, args.configuration['terminal.integrated.cwd'], this._logService);
        shellLaunchConfig.cwd = initialCwd;
        const envPlatformKey = platform.isWindows ? 'terminal.integrated.env.windows' : (platform.isMacintosh ? 'terminal.integrated.env.osx' : 'terminal.integrated.env.linux');
        const envFromConfig = args.configuration[envPlatformKey];
        const env = await terminalEnvironment.createTerminalEnvironment(shellLaunchConfig, envFromConfig, variableResolver, this._productService.version, args.configuration['terminal.integrated.detectLocale'], baseEnv);
        // Apply extension environment variable collections to the environment
        if (shouldUseEnvironmentVariableCollection(shellLaunchConfig)) {
            const entries = [];
            for (const [k, v, d] of args.envVariableCollections) {
                entries.push([k, { map: deserializeEnvironmentVariableCollection(v), descriptionMap: deserializeEnvironmentDescriptionMap(d) }]);
            }
            const envVariableCollections = new Map(entries);
            const mergedCollection = new MergedEnvironmentVariableCollection(envVariableCollections);
            const workspaceFolder = activeWorkspaceFolder ? activeWorkspaceFolder ?? undefined : undefined;
            await mergedCollection.applyToProcessEnvironment(env, { workspaceFolder }, variableResolver);
        }
        // Fork the process and listen for messages
        this._logService.debug(`Terminal process launching on remote agent`, { shellLaunchConfig, initialCwd, cols: args.cols, rows: args.rows, env });
        // Setup the CLI server to support forwarding commands run from the CLI
        const ipcHandlePath = createRandomIPCHandle();
        env.VSCODE_IPC_HOOK_CLI = ipcHandlePath;
        const persistentProcessId = await this._ptyHostService.createProcess(shellLaunchConfig, initialCwd, args.cols, args.rows, args.unicodeVersion, env, baseEnv, args.options, args.shouldPersistTerminal, args.workspaceId, args.workspaceName);
        const commandsExecuter = {
            executeCommand: (id, ...args) => this._executeCommand(persistentProcessId, id, args, uriTransformer)
        };
        const cliServer = new CLIServerBase(commandsExecuter, this._logService, ipcHandlePath);
        this._ptyHostService.onProcessExit(e => e.id === persistentProcessId && cliServer.dispose());
        return {
            persistentTerminalId: persistentProcessId,
            resolvedShellLaunchConfig: shellLaunchConfig
        };
    }
    _executeCommand(persistentProcessId, commandId, commandArgs, uriTransformer) {
        const { resolve, reject, promise } = promiseWithResolvers();
        const reqId = ++this._lastReqId;
        this._pendingCommands.set(reqId, { resolve, reject, uriTransformer });
        const serializedCommandArgs = cloneAndChange(commandArgs, (obj) => {
            if (obj && obj.$mid === 1) {
                // this is UriComponents
                return uriTransformer.transformOutgoing(obj);
            }
            if (obj && obj instanceof URI) {
                return uriTransformer.transformOutgoingURI(obj);
            }
            return undefined;
        });
        this._onExecuteCommand.fire({
            reqId,
            persistentProcessId,
            commandId,
            commandArgs: serializedCommandArgs
        });
        return promise;
    }
    _sendCommandResult(reqId, isError, serializedPayload) {
        const data = this._pendingCommands.get(reqId);
        if (!data) {
            return;
        }
        this._pendingCommands.delete(reqId);
        const payload = cloneAndChange(serializedPayload, (obj) => {
            if (obj && obj.$mid === 1) {
                // this is UriComponents
                return data.uriTransformer.transformIncoming(obj);
            }
            return undefined;
        });
        if (isError) {
            data.reject(payload);
        }
        else {
            data.resolve(payload);
        }
    }
    _getDefaultSystemShell(osOverride) {
        return this._ptyHostService.getDefaultSystemShell(osOverride);
    }
    async _getProfiles(workspaceId, profiles, defaultProfile, includeDetectedProfiles) {
        return this._ptyHostService.getProfiles(workspaceId, profiles, defaultProfile, includeDetectedProfiles) || [];
    }
    _getEnvironment() {
        return { ...process.env };
    }
    _getWslPath(original, direction) {
        return this._ptyHostService.getWslPath(original, direction);
    }
    _reduceConnectionGraceTime() {
        return this._ptyHostService.reduceConnectionGraceTime();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVGVybWluYWxDaGFubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9yZW1vdGVUZXJtaW5hbENoYW5uZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzVELE9BQU8sS0FBSyxJQUFJLE1BQU0sMkJBQTJCLENBQUM7QUFDbEQsT0FBTyxLQUFLLFFBQVEsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFHL0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFLN0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBcUIsTUFBTSw4Q0FBOEMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUN0SCxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsd0NBQXdDLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUU3SixPQUFPLEtBQUssbUJBQW1CLE1BQU0sZ0VBQWdFLENBQUM7QUFDdEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDNUgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFNcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbEUsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFL0csTUFBTSxzQkFBdUIsU0FBUSwrQkFBK0I7SUFDbkUsWUFDQyxHQUFpQyxFQUNqQyxnQkFBb0MsRUFDcEMsa0JBQW1DLEVBQ25DLGlCQUE2QyxFQUM3QyxnQkFBNkM7UUFFN0MsS0FBSyxDQUFDO1lBQ0wsWUFBWSxFQUFFLENBQUMsVUFBa0IsRUFBbUIsRUFBRTtnQkFDckQsTUFBTSxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsQ0FBQztnQkFDbEUsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDL0IsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUNyQixDQUFDO2dCQUNELE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7WUFDRCx1QkFBdUIsRUFBRSxHQUFXLEVBQUU7Z0JBQ3JDLE9BQU8sZ0JBQWdCLENBQUMsTUFBTSxDQUFDO1lBQ2hDLENBQUM7WUFDRCxxQkFBcUIsRUFBRSxDQUFDLFNBQWMsRUFBRSxPQUFlLEVBQXNCLEVBQUU7Z0JBQzlFLE9BQU8saUJBQWlCLENBQUMsVUFBVSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQy9DLENBQUM7WUFDRCxXQUFXLEVBQUUsR0FBdUIsRUFBRTtnQkFDckMsT0FBTyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUNoQyxDQUFDO1lBQ0QsVUFBVSxFQUFFLEdBQXVCLEVBQUU7Z0JBQ3BDLE9BQU8sR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzFCLENBQUM7WUFDRCxXQUFXLEVBQUUsR0FBdUIsRUFBRTtnQkFDckMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO29CQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2xELENBQUM7Z0JBQ0QsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUNELGVBQWUsRUFBRSxHQUF1QixFQUFFO2dCQUN6QyxPQUFPLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzFDLENBQUM7WUFDRCxhQUFhLEVBQUUsR0FBdUIsRUFBRTtnQkFDdkMsT0FBTyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN4QyxDQUFDO1lBQ0QsZUFBZSxFQUFFLEdBQXVCLEVBQUU7Z0JBQ3pDLE9BQU8saUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDMUMsQ0FBQztZQUNELFlBQVksRUFBRSxLQUFLLEVBQUMsRUFBRSxFQUFDLEVBQUU7Z0JBQ3hCLE1BQU0sU0FBUyxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3hELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUQsT0FBTyxLQUFLLElBQUksRUFBRSxpQkFBaUIsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdkQsQ0FBQztTQUNELEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxVQUFVO0lBWXBELFlBQ2tCLG1CQUE4QyxFQUM5QyxXQUF3QixFQUN4QixlQUFnQyxFQUNoQyxlQUFnQyxFQUNoQywyQkFBd0QsRUFDeEQscUJBQTRDO1FBRTdELEtBQUssRUFBRSxDQUFDO1FBUFMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUEyQjtRQUM5QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUN4QixvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDaEMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ2hDLGdDQUEyQixHQUEzQiwyQkFBMkIsQ0FBNkI7UUFDeEQsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQWhCdEQsZUFBVSxHQUFHLENBQUMsQ0FBQztRQUNOLHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUl2QyxDQUFDO1FBRVksc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBeUYsQ0FBQyxDQUFDO1FBQ2pKLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7SUFXekQsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBaUMsRUFBRSxPQUFxQyxFQUFFLElBQVU7UUFDOUYsUUFBUSxPQUFPLEVBQUUsQ0FBQztZQUNqQix3RUFBZ0QsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFL0gsc0VBQStDLENBQUMsQ0FBQyxDQUFDO2dCQUNqRCxNQUFNLGNBQWMsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ2pFLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQW1DLElBQUksQ0FBQyxDQUFDO1lBQ25GLENBQUM7WUFDRCwwRUFBaUQsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakksOEVBQW1ELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFckksc0VBQStDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzdILGdFQUE0QyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2SCxrRkFBcUQsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6SSxrRkFBcUQsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6SSx3R0FBZ0UsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUUvSixzREFBdUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0csc0RBQXVDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzdHLGdFQUE0QyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2SCxvRkFBc0QsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMzSSw0REFBMEMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbkgsd0RBQXdDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQy9HLGtFQUE2QyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6SCxzRUFBK0MsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0gsd0RBQXdDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRS9HLHNFQUErQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUU3SCw4RUFBbUQsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0csNEVBQWtELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbkksMEZBQXlELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDakosc0ZBQXVELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlHLGtFQUE2QyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUYsd0VBQWdELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNoRixnRUFBNEMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEYsc0ZBQXVELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQTZCLElBQUksQ0FBQyxDQUFDO1lBQzdJLHNGQUF1RCxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUE2QixJQUFJLENBQUMsQ0FBQztZQUM3SSx3RkFBd0QsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMvSSwwRkFBeUQsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNqSixnRkFBb0QsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN2SSw4RUFBbUQsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNySSw4RkFBMkQsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFDdEcsZ0VBQTRDLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3ZILGtFQUE2QyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6SCx3RUFBZ0QsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0gsMEVBQWlELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2pJLHNGQUF1RCxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM3SCx3RkFBd0QsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEksa0ZBQXFELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekksOEZBQTJELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEosQ0FBQztRQUVELHlGQUF5RjtRQUN6RixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsT0FBTyxZQUFZLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQsTUFBTSxDQUFDLENBQU0sRUFBRSxLQUFpQyxFQUFFLEdBQVE7UUFDekQsUUFBUSxLQUFLLEVBQUUsQ0FBQztZQUNmLDhFQUFrRCxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQzVHLGdGQUFtRCxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQzlHLDhGQUEwRCxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLHFCQUFxQixJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDNUgsMEZBQXdELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsbUJBQW1CLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQztZQUN4SCxvSEFBcUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQ0FBZ0MsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ2xKLDhFQUFrRCxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQztZQUM5RixnRkFBbUQsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUM7WUFDaEcsOEVBQWtELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDO1lBQzlGLGtGQUFvRCxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQztZQUNsRyx3RkFBdUQsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQztZQUM3RywwRUFBZ0QsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQy9FLDhFQUFrRCxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLGtCQUFrQixJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDakgsZ0ZBQW1ELENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUM7UUFDdEcsQ0FBQztRQUVELHVGQUF1RjtRQUN2RixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsS0FBSyxZQUFZLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRU8sS0FBSyxDQUFDLGNBQWMsQ0FBQyxjQUErQixFQUFFLElBQXFDO1FBQ2xHLE1BQU0saUJBQWlCLEdBQXVCO1lBQzdDLElBQUksRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSTtZQUNqQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVU7WUFDN0MsSUFBSSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJO1lBQ2pDLEdBQUcsRUFBRSxDQUNKLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsS0FBSyxRQUFRLElBQUksT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxLQUFLLFdBQVc7Z0JBQ2xHLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRztnQkFDNUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUMzRTtZQUNELEdBQUcsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRztZQUMvQixtQkFBbUIsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CO1lBQy9ELHNCQUFzQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0I7WUFDckUsSUFBSSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJO1lBQ2pDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUI7WUFDM0QsVUFBVSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVO1lBQzdDLG9DQUFvQyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQ0FBb0M7U0FDakcsQ0FBQztRQUdGLE1BQU0sT0FBTyxHQUFHLE1BQU0sb0JBQW9CLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDdE0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTNDLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxhQUFtQyxFQUFvQixFQUFFO1lBQ3ZGLE9BQU87Z0JBQ04sR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEUsSUFBSSxFQUFFLGFBQWEsQ0FBQyxJQUFJO2dCQUN4QixLQUFLLEVBQUUsYUFBYSxDQUFDLEtBQUs7Z0JBQzFCLFVBQVUsRUFBRSxHQUFHLEVBQUU7b0JBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztnQkFDcEMsQ0FBQzthQUNELENBQUM7UUFDSCxDQUFDLENBQUM7UUFDRixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUMxRSxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN6SCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3ZJLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ25LLE1BQU0sZ0JBQWdCLEdBQUcsbUJBQW1CLENBQUMsc0JBQXNCLENBQUMscUJBQXFCLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBRWhJLHNCQUFzQjtRQUN0QixNQUFNLFVBQVUsR0FBRyxNQUFNLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsZ0JBQWdCLEVBQUUscUJBQXFCLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMseUJBQXlCLENBQUMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDcE0saUJBQWlCLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQztRQUVuQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUN6SyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sR0FBRyxHQUFHLE1BQU0sbUJBQW1CLENBQUMseUJBQXlCLENBQzlELGlCQUFpQixFQUNqQixhQUFhLEVBQ2IsZ0JBQWdCLEVBQ2hCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUM1QixJQUFJLENBQUMsYUFBYSxDQUFDLGtDQUFrQyxDQUFDLEVBQ3RELE9BQU8sQ0FDUCxDQUFDO1FBRUYsc0VBQXNFO1FBQ3RFLElBQUksc0NBQXNDLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQy9ELE1BQU0sT0FBTyxHQUErQyxFQUFFLENBQUM7WUFDL0QsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDckQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEksQ0FBQztZQUNELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxHQUFHLENBQXlDLE9BQU8sQ0FBQyxDQUFDO1lBQ3hGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxtQ0FBbUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3pGLE1BQU0sZUFBZSxHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxxQkFBcUIsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUMvRixNQUFNLGdCQUFnQixDQUFDLHlCQUF5QixDQUFDLEdBQUcsRUFBRSxFQUFFLGVBQWUsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDOUYsQ0FBQztRQUVELDJDQUEyQztRQUMzQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRS9JLHVFQUF1RTtRQUN2RSxNQUFNLGFBQWEsR0FBRyxxQkFBcUIsRUFBRSxDQUFDO1FBQzlDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxhQUFhLENBQUM7UUFFeEMsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzdPLE1BQU0sZ0JBQWdCLEdBQXNCO1lBQzNDLGNBQWMsRUFBRSxDQUFJLEVBQVUsRUFBRSxHQUFHLElBQVcsRUFBYyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQztTQUNsSSxDQUFDO1FBQ0YsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2RixJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssbUJBQW1CLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFFN0YsT0FBTztZQUNOLG9CQUFvQixFQUFFLG1CQUFtQjtZQUN6Qyx5QkFBeUIsRUFBRSxpQkFBaUI7U0FDNUMsQ0FBQztJQUNILENBQUM7SUFFTyxlQUFlLENBQUksbUJBQTJCLEVBQUUsU0FBaUIsRUFBRSxXQUFrQixFQUFFLGNBQStCO1FBQzdILE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLG9CQUFvQixFQUFLLENBQUM7UUFFL0QsTUFBTSxLQUFLLEdBQUcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBRXRFLE1BQU0scUJBQXFCLEdBQUcsY0FBYyxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ2pFLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLHdCQUF3QjtnQkFDeEIsT0FBTyxjQUFjLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDOUMsQ0FBQztZQUNELElBQUksR0FBRyxJQUFJLEdBQUcsWUFBWSxHQUFHLEVBQUUsQ0FBQztnQkFDL0IsT0FBTyxjQUFjLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakQsQ0FBQztZQUNELE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQztZQUMzQixLQUFLO1lBQ0wsbUJBQW1CO1lBQ25CLFNBQVM7WUFDVCxXQUFXLEVBQUUscUJBQXFCO1NBQ2xDLENBQUMsQ0FBQztRQUVILE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxLQUFhLEVBQUUsT0FBZ0IsRUFBRSxpQkFBc0I7UUFDakYsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLGlCQUFpQixFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDekQsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDM0Isd0JBQXdCO2dCQUN4QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkQsQ0FBQztZQUNELE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsVUFBcUM7UUFDbkUsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUFDLFdBQW1CLEVBQUUsUUFBaUIsRUFBRSxjQUF1QixFQUFFLHVCQUFpQztRQUM1SCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLHVCQUF1QixDQUFDLElBQUksRUFBRSxDQUFDO0lBQy9HLENBQUM7SUFFTyxlQUFlO1FBQ3RCLE9BQU8sRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRU8sV0FBVyxDQUFDLFFBQWdCLEVBQUUsU0FBd0M7UUFDN0UsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUdPLDBCQUEwQjtRQUNqQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMseUJBQXlCLEVBQUUsQ0FBQztJQUN6RCxDQUFDO0NBQ0QifQ==