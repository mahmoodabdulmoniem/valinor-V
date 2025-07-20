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
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IRemoteAgentService, remoteConnectionLatencyMeasurer } from '../../../services/remote/common/remoteAgentService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { Extensions as WorkbenchContributionsExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { Schemas } from '../../../../base/common/network.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-browser/globals.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-browser/environmentService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { OpenLocalFileFolderCommand, OpenLocalFileCommand, OpenLocalFolderCommand, SaveLocalFileCommand, RemoteFileDialogContext } from '../../../services/dialogs/browser/simpleFileDialog.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { TELEMETRY_SETTING_ID } from '../../../../platform/telemetry/common/telemetry.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IContextKeyService, RawContextKey, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IRemoteExplorerService, PORT_AUTO_SOURCE_SETTING, PORT_AUTO_SOURCE_SETTING_OUTPUT } from '../../../services/remote/common/remoteExplorerService.js';
import { TunnelCloseReason } from '../../../services/remote/common/tunnelModel.js';
import { localize } from '../../../../nls.js';
import { RemoteNameContext } from '../../../common/contextkeys.js';
let RemoteAgentDiagnosticListener = class RemoteAgentDiagnosticListener {
    constructor(remoteAgentService, labelService) {
        ipcRenderer.on('vscode:getDiagnosticInfo', (event, request) => {
            const connection = remoteAgentService.getConnection();
            if (connection) {
                const hostName = labelService.getHostLabel(Schemas.vscodeRemote, connection.remoteAuthority);
                remoteAgentService.getDiagnosticInfo(request.args)
                    .then(info => {
                    if (info) {
                        info.hostName = hostName;
                        if (remoteConnectionLatencyMeasurer.latency?.high) {
                            info.latency = {
                                average: remoteConnectionLatencyMeasurer.latency.average,
                                current: remoteConnectionLatencyMeasurer.latency.current
                            };
                        }
                    }
                    ipcRenderer.send(request.replyChannel, info);
                })
                    .catch(e => {
                    const errorMessage = e && e.message ? `Connection to '${hostName}' could not be established  ${e.message}` : `Connection to '${hostName}' could not be established `;
                    ipcRenderer.send(request.replyChannel, { hostName, errorMessage });
                });
            }
            else {
                ipcRenderer.send(request.replyChannel);
            }
        });
    }
};
RemoteAgentDiagnosticListener = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, ILabelService)
], RemoteAgentDiagnosticListener);
let RemoteExtensionHostEnvironmentUpdater = class RemoteExtensionHostEnvironmentUpdater extends Disposable {
    constructor(remoteAgentService, remoteResolverService, extensionService) {
        super();
        const connection = remoteAgentService.getConnection();
        if (connection) {
            this._register(connection.onDidStateChange(async (e) => {
                if (e.type === 4 /* PersistentConnectionEventType.ConnectionGain */) {
                    const resolveResult = await remoteResolverService.resolveAuthority(connection.remoteAuthority);
                    if (resolveResult.options && resolveResult.options.extensionHostEnv) {
                        await extensionService.setRemoteEnvironment(resolveResult.options.extensionHostEnv);
                    }
                }
            }));
        }
    }
};
RemoteExtensionHostEnvironmentUpdater = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IRemoteAuthorityResolverService),
    __param(2, IExtensionService)
], RemoteExtensionHostEnvironmentUpdater);
let RemoteTelemetryEnablementUpdater = class RemoteTelemetryEnablementUpdater extends Disposable {
    static { this.ID = 'workbench.contrib.remoteTelemetryEnablementUpdater'; }
    constructor(remoteAgentService, configurationService) {
        super();
        this.remoteAgentService = remoteAgentService;
        this.configurationService = configurationService;
        this.updateRemoteTelemetryEnablement();
        this._register(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(TELEMETRY_SETTING_ID)) {
                this.updateRemoteTelemetryEnablement();
            }
        }));
    }
    updateRemoteTelemetryEnablement() {
        return this.remoteAgentService.updateTelemetryLevel(getTelemetryLevel(this.configurationService));
    }
};
RemoteTelemetryEnablementUpdater = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IConfigurationService)
], RemoteTelemetryEnablementUpdater);
let RemoteEmptyWorkbenchPresentation = class RemoteEmptyWorkbenchPresentation extends Disposable {
    static { this.ID = 'workbench.contrib.remoteEmptyWorkbenchPresentation'; }
    constructor(environmentService, remoteAuthorityResolverService, configurationService, commandService, contextService) {
        super();
        function shouldShowExplorer() {
            const startupEditor = configurationService.getValue('workbench.startupEditor');
            return startupEditor !== 'welcomePage' && startupEditor !== 'welcomePageInEmptyWorkbench';
        }
        function shouldShowTerminal() {
            return shouldShowExplorer();
        }
        const { remoteAuthority, filesToDiff, filesToMerge, filesToOpenOrCreate, filesToWait } = environmentService;
        if (remoteAuthority && contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ && !filesToDiff?.length && !filesToMerge?.length && !filesToOpenOrCreate?.length && !filesToWait) {
            remoteAuthorityResolverService.resolveAuthority(remoteAuthority).then(() => {
                if (shouldShowExplorer()) {
                    commandService.executeCommand('workbench.view.explorer');
                }
                if (shouldShowTerminal()) {
                    commandService.executeCommand('workbench.action.terminal.toggleTerminal');
                }
            });
        }
    }
};
RemoteEmptyWorkbenchPresentation = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IRemoteAuthorityResolverService),
    __param(2, IConfigurationService),
    __param(3, ICommandService),
    __param(4, IWorkspaceContextService)
], RemoteEmptyWorkbenchPresentation);
/**
 * Sets the 'wslFeatureInstalled' context key if the WSL feature is or was installed on this machine.
 */
let WSLContextKeyInitializer = class WSLContextKeyInitializer extends Disposable {
    static { this.ID = 'workbench.contrib.wslContextKeyInitializer'; }
    constructor(contextKeyService, nativeHostService, storageService, lifecycleService) {
        super();
        const contextKeyId = 'wslFeatureInstalled';
        const storageKey = 'remote.wslFeatureInstalled';
        const defaultValue = storageService.getBoolean(storageKey, -1 /* StorageScope.APPLICATION */, undefined);
        const hasWSLFeatureContext = new RawContextKey(contextKeyId, !!defaultValue, nls.localize('wslFeatureInstalled', "Whether the platform has the WSL feature installed"));
        const contextKey = hasWSLFeatureContext.bindTo(contextKeyService);
        if (defaultValue === undefined) {
            lifecycleService.when(4 /* LifecyclePhase.Eventually */).then(async () => {
                nativeHostService.hasWSLFeatureInstalled().then(res => {
                    if (res) {
                        contextKey.set(true);
                        // once detected, set to true
                        storageService.store(storageKey, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                    }
                });
            });
        }
    }
};
WSLContextKeyInitializer = __decorate([
    __param(0, IContextKeyService),
    __param(1, INativeHostService),
    __param(2, IStorageService),
    __param(3, ILifecycleService)
], WSLContextKeyInitializer);
const workbenchContributionsRegistry = Registry.as(WorkbenchContributionsExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteAgentDiagnosticListener, 4 /* LifecyclePhase.Eventually */);
workbenchContributionsRegistry.registerWorkbenchContribution(RemoteExtensionHostEnvironmentUpdater, 4 /* LifecyclePhase.Eventually */);
registerWorkbenchContribution2(RemoteTelemetryEnablementUpdater.ID, RemoteTelemetryEnablementUpdater, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(RemoteEmptyWorkbenchPresentation.ID, RemoteEmptyWorkbenchPresentation, 2 /* WorkbenchPhase.BlockRestore */);
if (isWindows) {
    registerWorkbenchContribution2(WSLContextKeyInitializer.ID, WSLContextKeyInitializer, 2 /* WorkbenchPhase.BlockRestore */);
}
Registry.as(ConfigurationExtensions.Configuration)
    .registerConfiguration({
    id: 'remote',
    title: nls.localize('remote', "Remote"),
    type: 'object',
    properties: {
        'remote.downloadExtensionsLocally': {
            type: 'boolean',
            markdownDescription: nls.localize('remote.downloadExtensionsLocally', "When enabled extensions are downloaded locally and installed on remote."),
            default: false
        },
    }
});
if (isMacintosh) {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: OpenLocalFileFolderCommand.ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */,
        when: RemoteFileDialogContext,
        metadata: { description: OpenLocalFileFolderCommand.LABEL, args: [] },
        handler: OpenLocalFileFolderCommand.handler()
    });
}
else {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: OpenLocalFileCommand.ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */,
        when: RemoteFileDialogContext,
        metadata: { description: OpenLocalFileCommand.LABEL, args: [] },
        handler: OpenLocalFileCommand.handler()
    });
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: OpenLocalFolderCommand.ID,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */),
        when: RemoteFileDialogContext,
        metadata: { description: OpenLocalFolderCommand.LABEL, args: [] },
        handler: OpenLocalFolderCommand.handler()
    });
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: SaveLocalFileCommand.ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 49 /* KeyCode.KeyS */,
    when: RemoteFileDialogContext,
    metadata: { description: SaveLocalFileCommand.LABEL, args: [] },
    handler: SaveLocalFileCommand.handler()
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.remote.action.closeUnusedPorts',
            title: localize('remote.actions.closeUnusedPorts', 'Close Unused Forwarded Ports'),
            category: localize('remote.category', 'Remote'),
            menu: [{
                    id: MenuId.CommandPalette
                }],
            precondition: ContextKeyExpr.and(ContextKeyExpr.notEquals(`config.${PORT_AUTO_SOURCE_SETTING}`, PORT_AUTO_SOURCE_SETTING_OUTPUT), RemoteNameContext)
        });
    }
    async run(accessor) {
        const remoteExplorerService = accessor.get(IRemoteExplorerService);
        const ports = [];
        // collect all forwarded ports and filter out those who do not have a process running
        const forwarded = remoteExplorerService.tunnelModel.forwarded;
        for (const [_, tunnel] of forwarded) {
            if (tunnel.hasRunningProcess === false) {
                ports.push(tunnel);
            }
        }
        // Close the collected unused ports
        if (ports.length) {
            for (const port of ports) {
                await remoteExplorerService.close({
                    host: port.remoteHost,
                    port: port.remotePort
                }, TunnelCloseReason.User);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVtb3RlL2VsZWN0cm9uLWJyb3dzZXIvcmVtb3RlLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM3SCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQVUsUUFBUSxFQUFXLE1BQU0scUNBQXFDLENBQUM7QUFDaEYsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3RILE9BQU8sRUFBMkUsVUFBVSxJQUFJLGdDQUFnQyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM00sT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLGlEQUFpRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0REFBNEQs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