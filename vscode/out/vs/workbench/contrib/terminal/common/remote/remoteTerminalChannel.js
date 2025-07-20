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
import { IWorkbenchConfigurationService } from '../../../../services/configuration/common/configuration.js';
import { IRemoteAuthorityResolverService } from '../../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { serializeEnvironmentDescriptionMap, serializeEnvironmentVariableCollection } from '../../../../../platform/terminal/common/environmentVariableShared.js';
import { IConfigurationResolverService } from '../../../../services/configurationResolver/common/configurationResolver.js';
import { SideBySideEditor, EditorResourceAccessor } from '../../../../common/editor.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IEnvironmentVariableService } from '../environmentVariable.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
import { ConfigurationResolverExpression } from '../../../../services/configurationResolver/common/configurationResolverExpression.js';
export const REMOTE_TERMINAL_CHANNEL_NAME = 'remoteterminal';
let RemoteTerminalChannelClient = class RemoteTerminalChannelClient {
    get onPtyHostExit() {
        return this._channel.listen("$onPtyHostExitEvent" /* RemoteTerminalChannelEvent.OnPtyHostExitEvent */);
    }
    get onPtyHostStart() {
        return this._channel.listen("$onPtyHostStartEvent" /* RemoteTerminalChannelEvent.OnPtyHostStartEvent */);
    }
    get onPtyHostUnresponsive() {
        return this._channel.listen("$onPtyHostUnresponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostUnresponsiveEvent */);
    }
    get onPtyHostResponsive() {
        return this._channel.listen("$onPtyHostResponsiveEvent" /* RemoteTerminalChannelEvent.OnPtyHostResponsiveEvent */);
    }
    get onPtyHostRequestResolveVariables() {
        return this._channel.listen("$onPtyHostRequestResolveVariablesEvent" /* RemoteTerminalChannelEvent.OnPtyHostRequestResolveVariablesEvent */);
    }
    get onProcessData() {
        return this._channel.listen("$onProcessDataEvent" /* RemoteTerminalChannelEvent.OnProcessDataEvent */);
    }
    get onProcessExit() {
        return this._channel.listen("$onProcessExitEvent" /* RemoteTerminalChannelEvent.OnProcessExitEvent */);
    }
    get onProcessReady() {
        return this._channel.listen("$onProcessReadyEvent" /* RemoteTerminalChannelEvent.OnProcessReadyEvent */);
    }
    get onProcessReplay() {
        return this._channel.listen("$onProcessReplayEvent" /* RemoteTerminalChannelEvent.OnProcessReplayEvent */);
    }
    get onProcessOrphanQuestion() {
        return this._channel.listen("$onProcessOrphanQuestion" /* RemoteTerminalChannelEvent.OnProcessOrphanQuestion */);
    }
    get onExecuteCommand() {
        return this._channel.listen("$onExecuteCommand" /* RemoteTerminalChannelEvent.OnExecuteCommand */);
    }
    get onDidRequestDetach() {
        return this._channel.listen("$onDidRequestDetach" /* RemoteTerminalChannelEvent.OnDidRequestDetach */);
    }
    get onDidChangeProperty() {
        return this._channel.listen("$onDidChangeProperty" /* RemoteTerminalChannelEvent.OnDidChangeProperty */);
    }
    constructor(_remoteAuthority, _channel, _configurationService, _workspaceContextService, _resolverService, _environmentVariableService, _remoteAuthorityResolverService, _logService, _editorService, _labelService) {
        this._remoteAuthority = _remoteAuthority;
        this._channel = _channel;
        this._configurationService = _configurationService;
        this._workspaceContextService = _workspaceContextService;
        this._resolverService = _resolverService;
        this._environmentVariableService = _environmentVariableService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._logService = _logService;
        this._editorService = _editorService;
        this._labelService = _labelService;
    }
    restartPtyHost() {
        return this._channel.call("$restartPtyHost" /* RemoteTerminalChannelRequest.RestartPtyHost */, []);
    }
    async createProcess(shellLaunchConfig, configuration, activeWorkspaceRootUri, options, shouldPersistTerminal, cols, rows, unicodeVersion) {
        // Be sure to first wait for the remote configuration
        await this._configurationService.whenRemoteConfigurationLoaded();
        // We will use the resolver service to resolve all the variables in the config / launch config
        // But then we will keep only some variables, since the rest need to be resolved on the remote side
        const resolvedVariables = Object.create(null);
        const lastActiveWorkspace = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
        const expr = ConfigurationResolverExpression.parse({ shellLaunchConfig, configuration });
        try {
            await this._resolverService.resolveAsync(lastActiveWorkspace, expr);
        }
        catch (err) {
            this._logService.error(err);
        }
        for (const [{ inner }, resolved] of expr.resolved()) {
            if (/^config:/.test(inner) || inner === 'selectedText' || inner === 'lineNumber') {
                resolvedVariables[inner] = resolved.value;
            }
        }
        const envVariableCollections = [];
        for (const [k, v] of this._environmentVariableService.collections.entries()) {
            envVariableCollections.push([k, serializeEnvironmentVariableCollection(v.map), serializeEnvironmentDescriptionMap(v.descriptionMap)]);
        }
        const resolverResult = await this._remoteAuthorityResolverService.resolveAuthority(this._remoteAuthority);
        const resolverEnv = resolverResult.options && resolverResult.options.extensionHostEnv;
        const workspace = this._workspaceContextService.getWorkspace();
        const workspaceFolders = workspace.folders;
        const activeWorkspaceFolder = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) : null;
        const activeFileResource = EditorResourceAccessor.getOriginalUri(this._editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
            filterByScheme: [Schemas.file, Schemas.vscodeUserData, Schemas.vscodeRemote]
        });
        const args = {
            configuration,
            resolvedVariables,
            envVariableCollections,
            shellLaunchConfig,
            workspaceId: workspace.id,
            workspaceName: this._labelService.getWorkspaceLabel(workspace),
            workspaceFolders,
            activeWorkspaceFolder,
            activeFileResource,
            shouldPersistTerminal,
            options,
            cols,
            rows,
            unicodeVersion,
            resolverEnv
        };
        return await this._channel.call("$createProcess" /* RemoteTerminalChannelRequest.CreateProcess */, args);
    }
    requestDetachInstance(workspaceId, instanceId) {
        return this._channel.call("$requestDetachInstance" /* RemoteTerminalChannelRequest.RequestDetachInstance */, [workspaceId, instanceId]);
    }
    acceptDetachInstanceReply(requestId, persistentProcessId) {
        return this._channel.call("$acceptDetachInstanceReply" /* RemoteTerminalChannelRequest.AcceptDetachInstanceReply */, [requestId, persistentProcessId]);
    }
    attachToProcess(id) {
        return this._channel.call("$attachToProcess" /* RemoteTerminalChannelRequest.AttachToProcess */, [id]);
    }
    detachFromProcess(id, forcePersist) {
        return this._channel.call("$detachFromProcess" /* RemoteTerminalChannelRequest.DetachFromProcess */, [id, forcePersist]);
    }
    listProcesses() {
        return this._channel.call("$listProcesses" /* RemoteTerminalChannelRequest.ListProcesses */);
    }
    getLatency() {
        return this._channel.call("$getLatency" /* RemoteTerminalChannelRequest.GetLatency */);
    }
    getPerformanceMarks() {
        return this._channel.call("$getPerformanceMarks" /* RemoteTerminalChannelRequest.GetPerformanceMarks */);
    }
    reduceConnectionGraceTime() {
        return this._channel.call("$reduceConnectionGraceTime" /* RemoteTerminalChannelRequest.ReduceConnectionGraceTime */);
    }
    processBinary(id, data) {
        return this._channel.call("$processBinary" /* RemoteTerminalChannelRequest.ProcessBinary */, [id, data]);
    }
    start(id) {
        return this._channel.call("$start" /* RemoteTerminalChannelRequest.Start */, [id]);
    }
    input(id, data) {
        return this._channel.call("$input" /* RemoteTerminalChannelRequest.Input */, [id, data]);
    }
    sendSignal(id, signal) {
        return this._channel.call("$sendSignal" /* RemoteTerminalChannelRequest.SendSignal */, [id, signal]);
    }
    acknowledgeDataEvent(id, charCount) {
        return this._channel.call("$acknowledgeDataEvent" /* RemoteTerminalChannelRequest.AcknowledgeDataEvent */, [id, charCount]);
    }
    setUnicodeVersion(id, version) {
        return this._channel.call("$setUnicodeVersion" /* RemoteTerminalChannelRequest.SetUnicodeVersion */, [id, version]);
    }
    shutdown(id, immediate) {
        return this._channel.call("$shutdown" /* RemoteTerminalChannelRequest.Shutdown */, [id, immediate]);
    }
    resize(id, cols, rows) {
        return this._channel.call("$resize" /* RemoteTerminalChannelRequest.Resize */, [id, cols, rows]);
    }
    clearBuffer(id) {
        return this._channel.call("$clearBuffer" /* RemoteTerminalChannelRequest.ClearBuffer */, [id]);
    }
    getInitialCwd(id) {
        return this._channel.call("$getInitialCwd" /* RemoteTerminalChannelRequest.GetInitialCwd */, [id]);
    }
    getCwd(id) {
        return this._channel.call("$getCwd" /* RemoteTerminalChannelRequest.GetCwd */, [id]);
    }
    orphanQuestionReply(id) {
        return this._channel.call("$orphanQuestionReply" /* RemoteTerminalChannelRequest.OrphanQuestionReply */, [id]);
    }
    sendCommandResult(reqId, isError, payload) {
        return this._channel.call("$sendCommandResult" /* RemoteTerminalChannelRequest.SendCommandResult */, [reqId, isError, payload]);
    }
    freePortKillProcess(port) {
        return this._channel.call("$freePortKillProcess" /* RemoteTerminalChannelRequest.FreePortKillProcess */, [port]);
    }
    getDefaultSystemShell(osOverride) {
        return this._channel.call("$getDefaultSystemShell" /* RemoteTerminalChannelRequest.GetDefaultSystemShell */, [osOverride]);
    }
    getProfiles(profiles, defaultProfile, includeDetectedProfiles) {
        return this._channel.call("$getProfiles" /* RemoteTerminalChannelRequest.GetProfiles */, [this._workspaceContextService.getWorkspace().id, profiles, defaultProfile, includeDetectedProfiles]);
    }
    acceptPtyHostResolvedVariables(requestId, resolved) {
        return this._channel.call("$acceptPtyHostResolvedVariables" /* RemoteTerminalChannelRequest.AcceptPtyHostResolvedVariables */, [requestId, resolved]);
    }
    getEnvironment() {
        return this._channel.call("$getEnvironment" /* RemoteTerminalChannelRequest.GetEnvironment */);
    }
    getWslPath(original, direction) {
        return this._channel.call("$getWslPath" /* RemoteTerminalChannelRequest.GetWslPath */, [original, direction]);
    }
    setTerminalLayoutInfo(layout) {
        const workspace = this._workspaceContextService.getWorkspace();
        const args = {
            workspaceId: workspace.id,
            tabs: layout ? layout.tabs : []
        };
        return this._channel.call("$setTerminalLayoutInfo" /* RemoteTerminalChannelRequest.SetTerminalLayoutInfo */, args);
    }
    updateTitle(id, title, titleSource) {
        return this._channel.call("$updateTitle" /* RemoteTerminalChannelRequest.UpdateTitle */, [id, title, titleSource]);
    }
    updateIcon(id, userInitiated, icon, color) {
        return this._channel.call("$updateIcon" /* RemoteTerminalChannelRequest.UpdateIcon */, [id, userInitiated, icon, color]);
    }
    refreshProperty(id, property) {
        return this._channel.call("$refreshProperty" /* RemoteTerminalChannelRequest.RefreshProperty */, [id, property]);
    }
    updateProperty(id, property, value) {
        return this._channel.call("$updateProperty" /* RemoteTerminalChannelRequest.UpdateProperty */, [id, property, value]);
    }
    getTerminalLayoutInfo() {
        const workspace = this._workspaceContextService.getWorkspace();
        const args = {
            workspaceId: workspace.id,
        };
        return this._channel.call("$getTerminalLayoutInfo" /* RemoteTerminalChannelRequest.GetTerminalLayoutInfo */, args);
    }
    reviveTerminalProcesses(workspaceId, state, dateTimeFormatLocate) {
        return this._channel.call("$reviveTerminalProcesses" /* RemoteTerminalChannelRequest.ReviveTerminalProcesses */, [workspaceId, state, dateTimeFormatLocate]);
    }
    getRevivedPtyNewId(id) {
        return this._channel.call("$getRevivedPtyNewId" /* RemoteTerminalChannelRequest.GetRevivedPtyNewId */, [id]);
    }
    serializeTerminalState(ids) {
        return this._channel.call("$serializeTerminalState" /* RemoteTerminalChannelRequest.SerializeTerminalState */, [ids]);
    }
    // #region Pty service contribution RPC calls
    installAutoReply(match, reply) {
        return this._channel.call("$installAutoReply" /* RemoteTerminalChannelRequest.InstallAutoReply */, [match, reply]);
    }
    uninstallAllAutoReplies() {
        return this._channel.call("$uninstallAllAutoReplies" /* RemoteTerminalChannelRequest.UninstallAllAutoReplies */, []);
    }
};
RemoteTerminalChannelClient = __decorate([
    __param(2, IWorkbenchConfigurationService),
    __param(3, IWorkspaceContextService),
    __param(4, IConfigurationResolverService),
    __param(5, IEnvironmentVariableService),
    __param(6, IRemoteAuthorityResolverService),
    __param(7, ITerminalLogService),
    __param(8, IEditorService),
    __param(9, ILabelService)
], RemoteTerminalChannelClient);
export { RemoteTerminalChannelClient };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVGVybWluYWxDaGFubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9jb21tb24vcmVtb3RlL3JlbW90ZVRlcm1pbmFsQ2hhbm5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUtoRyxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM1RyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNuSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUNsSyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUMzSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN4RSxPQUFPLEVBQTBWLG1CQUFtQixFQUFxRCxNQUFNLHFEQUFxRCxDQUFDO0FBUXJlLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNGQUFzRixDQUFDO0FBRXZJLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLGdCQUFnQixDQUFDO0FBaUN0RCxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUEyQjtJQUN2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