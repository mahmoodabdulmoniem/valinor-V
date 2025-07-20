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
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { assertNever } from '../../../../base/common/assert.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { parse as parseJsonc } from '../../../../base/common/jsonc.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorun } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isWorkspaceFolder, IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IWorkbenchMcpManagementService } from '../../../services/mcp/common/mcpWorkbenchManagementService.js';
import { mcpStdioServerSchema } from '../common/mcpConfiguration.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { IMcpService } from '../common/mcpTypes.js';
var AddConfigurationType;
(function (AddConfigurationType) {
    AddConfigurationType[AddConfigurationType["Stdio"] = 0] = "Stdio";
    AddConfigurationType[AddConfigurationType["HTTP"] = 1] = "HTTP";
    AddConfigurationType[AddConfigurationType["NpmPackage"] = 2] = "NpmPackage";
    AddConfigurationType[AddConfigurationType["PipPackage"] = 3] = "PipPackage";
    AddConfigurationType[AddConfigurationType["NuGetPackage"] = 4] = "NuGetPackage";
    AddConfigurationType[AddConfigurationType["DockerImage"] = 5] = "DockerImage";
})(AddConfigurationType || (AddConfigurationType = {}));
const assistedTypes = {
    [2 /* AddConfigurationType.NpmPackage */]: {
        title: localize('mcp.npm.title', "Enter NPM Package Name"),
        placeholder: localize('mcp.npm.placeholder', "Package name (e.g., @org/package)"),
        pickLabel: localize('mcp.serverType.npm', "NPM Package"),
        pickDescription: localize('mcp.serverType.npm.description', "Install from an NPM package name")
    },
    [3 /* AddConfigurationType.PipPackage */]: {
        title: localize('mcp.pip.title', "Enter Pip Package Name"),
        placeholder: localize('mcp.pip.placeholder', "Package name (e.g., package-name)"),
        pickLabel: localize('mcp.serverType.pip', "Pip Package"),
        pickDescription: localize('mcp.serverType.pip.description', "Install from a Pip package name")
    },
    [4 /* AddConfigurationType.NuGetPackage */]: {
        title: localize('mcp.nuget.title', "Enter NuGet Package Name"),
        placeholder: localize('mcp.nuget.placeholder', "Package name (e.g., Package.Name)"),
        pickLabel: localize('mcp.serverType.nuget', "NuGet Package"),
        pickDescription: localize('mcp.serverType.nuget.description', "Install from a NuGet package name")
    },
    [5 /* AddConfigurationType.DockerImage */]: {
        title: localize('mcp.docker.title', "Enter Docker Image Name"),
        placeholder: localize('mcp.docker.placeholder', "Image name (e.g., mcp/imagename)"),
        pickLabel: localize('mcp.serverType.docker', "Docker Image"),
        pickDescription: localize('mcp.serverType.docker.description', "Install from a Docker image")
    },
};
var AddConfigurationCopilotCommand;
(function (AddConfigurationCopilotCommand) {
    /** Returns whether MCP enhanced setup is enabled. */
    AddConfigurationCopilotCommand["IsSupported"] = "github.copilot.chat.mcp.setup.check";
    /** Takes an npm/pip package name, validates its owner. */
    AddConfigurationCopilotCommand["ValidatePackage"] = "github.copilot.chat.mcp.setup.validatePackage";
    /** Returns the resolved MCP configuration. */
    AddConfigurationCopilotCommand["StartFlow"] = "github.copilot.chat.mcp.setup.flow";
})(AddConfigurationCopilotCommand || (AddConfigurationCopilotCommand = {}));
let McpAddConfigurationCommand = class McpAddConfigurationCommand {
    constructor(workspaceFolder, _quickInputService, _mcpManagementService, _workspaceService, _environmentService, _commandService, _mcpRegistry, _openerService, _editorService, _fileService, _notificationService, _telemetryService, _mcpService, _label) {
        this.workspaceFolder = workspaceFolder;
        this._quickInputService = _quickInputService;
        this._mcpManagementService = _mcpManagementService;
        this._workspaceService = _workspaceService;
        this._environmentService = _environmentService;
        this._commandService = _commandService;
        this._mcpRegistry = _mcpRegistry;
        this._openerService = _openerService;
        this._editorService = _editorService;
        this._fileService = _fileService;
        this._notificationService = _notificationService;
        this._telemetryService = _telemetryService;
        this._mcpService = _mcpService;
        this._label = _label;
    }
    async getServerType() {
        const items = [
            { kind: 0 /* AddConfigurationType.Stdio */, label: localize('mcp.serverType.command', "Command (stdio)"), description: localize('mcp.serverType.command.description', "Run a local command that implements the MCP protocol") },
            { kind: 1 /* AddConfigurationType.HTTP */, label: localize('mcp.serverType.http', "HTTP (HTTP or Server-Sent Events)"), description: localize('mcp.serverType.http.description', "Connect to a remote HTTP server that implements the MCP protocol") }
        ];
        let aiSupported;
        try {
            aiSupported = await this._commandService.executeCommand("github.copilot.chat.mcp.setup.check" /* AddConfigurationCopilotCommand.IsSupported */);
        }
        catch {
            // ignored
        }
        if (aiSupported) {
            items.unshift({ type: 'separator', label: localize('mcp.serverType.manual', "Manual Install") });
            items.push({ type: 'separator', label: localize('mcp.serverType.copilot', "Model-Assisted") }, ...Object.entries(assistedTypes).map(([type, { pickLabel, pickDescription }]) => ({
                kind: Number(type),
                label: pickLabel,
                description: pickDescription,
            })));
        }
        items.push({ type: 'separator' }, {
            kind: 'browse',
            label: localize('mcp.servers.browse', "Browse MCP Servers..."),
        });
        const result = await this._quickInputService.pick(items, {
            placeHolder: localize('mcp.serverType.placeholder', "Choose the type of MCP server to add"),
        });
        if (result?.kind === 'browse') {
            this._commandService.executeCommand("workbench.mcp.browseServers" /* McpCommandIds.Browse */);
            return undefined;
        }
        return result?.kind;
    }
    async getStdioConfig() {
        const command = await this._quickInputService.input({
            title: localize('mcp.command.title', "Enter Command"),
            placeHolder: localize('mcp.command.placeholder', "Command to run (with optional arguments)"),
            ignoreFocusLost: true,
        });
        if (!command) {
            return undefined;
        }
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: 'stdio'
        });
        // Split command into command and args, handling quotes
        const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g);
        return {
            type: "stdio" /* McpServerType.LOCAL */,
            command: parts[0].replace(/"/g, ''),
            args: parts.slice(1).map(arg => arg.replace(/"/g, ''))
        };
    }
    async getSSEConfig() {
        const url = await this._quickInputService.input({
            title: localize('mcp.url.title', "Enter Server URL"),
            placeHolder: localize('mcp.url.placeholder', "URL of the MCP server (e.g., http://localhost:3000)"),
            ignoreFocusLost: true,
        });
        if (!url) {
            return undefined;
        }
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: 'sse'
        });
        return { url, type: "http" /* McpServerType.REMOTE */ };
    }
    async getServerId(suggestion = `my-mcp-server-${generateUuid().split('-')[0]}`) {
        const id = await this._quickInputService.input({
            title: localize('mcp.serverId.title', "Enter Server ID"),
            placeHolder: localize('mcp.serverId.placeholder', "Unique identifier for this server"),
            value: suggestion,
            ignoreFocusLost: true,
        });
        return id;
    }
    async getConfigurationTarget() {
        const options = [
            { target: 3 /* ConfigurationTarget.USER_LOCAL */, label: localize('mcp.target.user', "Global"), description: localize('mcp.target.user.description', "Available in all workspaces, runs locally") }
        ];
        const raLabel = this._environmentService.remoteAuthority && this._label.getHostLabel(Schemas.vscodeRemote, this._environmentService.remoteAuthority);
        if (raLabel) {
            options.push({ target: 4 /* ConfigurationTarget.USER_REMOTE */, label: localize('mcp.target.remote', "Remote"), description: localize('mcp.target..remote.description', "Available on this remote machine, runs on {0}", raLabel) });
        }
        const workbenchState = this._workspaceService.getWorkbenchState();
        if (workbenchState !== 1 /* WorkbenchState.EMPTY */) {
            const target = workbenchState === 2 /* WorkbenchState.FOLDER */ ? this._workspaceService.getWorkspace().folders[0] : 5 /* ConfigurationTarget.WORKSPACE */;
            if (this._environmentService.remoteAuthority) {
                options.push({ target, label: localize('mcp.target.workspace', "Workspace"), description: localize('mcp.target.workspace.description.remote', "Available in this workspace, runs on {0}", raLabel) });
            }
            else {
                options.push({ target, label: localize('mcp.target.workspace', "Workspace"), description: localize('mcp.target.workspace.description', "Available in this workspace, runs locally") });
            }
        }
        if (options.length === 1) {
            return options[0].target;
        }
        const targetPick = await this._quickInputService.pick(options, {
            title: localize('mcp.target.title', "Choose where to install the MCP server"),
        });
        return targetPick?.target;
    }
    async getAssistedConfig(type) {
        const packageName = await this._quickInputService.input({
            ignoreFocusLost: true,
            title: assistedTypes[type].title,
            placeHolder: assistedTypes[type].placeholder,
        });
        if (!packageName) {
            return undefined;
        }
        let LoadAction;
        (function (LoadAction) {
            LoadAction["Retry"] = "retry";
            LoadAction["Cancel"] = "cancel";
            LoadAction["Allow"] = "allow";
        })(LoadAction || (LoadAction = {}));
        const loadingQuickPickStore = new DisposableStore();
        const loadingQuickPick = loadingQuickPickStore.add(this._quickInputService.createQuickPick());
        loadingQuickPick.title = localize('mcp.loading.title', "Loading package details...");
        loadingQuickPick.busy = true;
        loadingQuickPick.ignoreFocusOut = true;
        const packageType = this.getPackageType(type);
        this._telemetryService.publicLog2('mcp.addserver', {
            packageType: packageType
        });
        this._commandService.executeCommand("github.copilot.chat.mcp.setup.validatePackage" /* AddConfigurationCopilotCommand.ValidatePackage */, {
            type: packageType,
            name: packageName,
            targetConfig: {
                ...mcpStdioServerSchema,
                properties: {
                    ...mcpStdioServerSchema.properties,
                    name: {
                        type: 'string',
                        description: 'Suggested name of the server, alphanumeric and hyphen only',
                    }
                },
                required: [...(mcpStdioServerSchema.required || []), 'name'],
            },
        }).then(result => {
            if (!result || result.state === 'error') {
                loadingQuickPick.title = result?.error || 'Unknown error loading package';
                loadingQuickPick.items = [{ id: "retry" /* LoadAction.Retry */, label: localize('mcp.error.retry', 'Try a different package') }, { id: "cancel" /* LoadAction.Cancel */, label: localize('cancel', 'Cancel') }];
            }
            else {
                loadingQuickPick.title = localize('mcp.confirmPublish', 'Install {0} from {1}?', packageName, result.publisher);
                loadingQuickPick.items = [
                    { id: "allow" /* LoadAction.Allow */, label: localize('allow', "Allow") },
                    { id: "cancel" /* LoadAction.Cancel */, label: localize('cancel', 'Cancel') }
                ];
            }
            loadingQuickPick.busy = false;
        });
        const loadingAction = await new Promise(resolve => {
            loadingQuickPick.onDidAccept(() => resolve(loadingQuickPick.selectedItems[0]?.id));
            loadingQuickPick.onDidHide(() => resolve(undefined));
            loadingQuickPick.show();
        }).finally(() => loadingQuickPick.dispose());
        switch (loadingAction) {
            case "retry" /* LoadAction.Retry */:
                return this.getAssistedConfig(type);
            case "allow" /* LoadAction.Allow */:
                break;
            case "cancel" /* LoadAction.Cancel */:
            default:
                return undefined;
        }
        return await this._commandService.executeCommand("github.copilot.chat.mcp.setup.flow" /* AddConfigurationCopilotCommand.StartFlow */, {
            name: packageName,
            type: packageType
        });
    }
    /** Shows the location of a server config once it's discovered. */
    showOnceDiscovered(name) {
        const store = new DisposableStore();
        store.add(autorun(reader => {
            const colls = this._mcpRegistry.collections.read(reader);
            const servers = this._mcpService.servers.read(reader);
            const match = mapFindFirst(colls, collection => mapFindFirst(collection.serverDefinitions.read(reader), server => server.label === name ? { server, collection } : undefined));
            const server = match && servers.find(s => s.definition.id === match.server.id);
            if (match && server) {
                if (match.collection.presentation?.origin) {
                    this._openerService.openEditor({
                        resource: match.collection.presentation.origin,
                        options: {
                            selection: match.server.presentation?.origin?.range,
                            preserveFocus: true,
                        }
                    });
                }
                else {
                    this._commandService.executeCommand("workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */, name);
                }
                server.start({ isFromInteraction: true }).then(state => {
                    if (state.state === 3 /* McpConnectionState.Kind.Error */) {
                        server.showOutput();
                    }
                });
                store.dispose();
            }
        }));
        store.add(disposableTimeout(() => store.dispose(), 5000));
    }
    async run() {
        // Step 1: Choose server type
        const serverType = await this.getServerType();
        if (serverType === undefined) {
            return;
        }
        // Step 2: Get server details based on type
        let config;
        let suggestedName;
        let inputs;
        let inputValues;
        switch (serverType) {
            case 0 /* AddConfigurationType.Stdio */:
                config = await this.getStdioConfig();
                break;
            case 1 /* AddConfigurationType.HTTP */:
                config = await this.getSSEConfig();
                break;
            case 2 /* AddConfigurationType.NpmPackage */:
            case 3 /* AddConfigurationType.PipPackage */:
            case 4 /* AddConfigurationType.NuGetPackage */:
            case 5 /* AddConfigurationType.DockerImage */: {
                const r = await this.getAssistedConfig(serverType);
                config = r?.server ? { ...r.server, type: "stdio" /* McpServerType.LOCAL */ } : undefined;
                suggestedName = r?.name;
                inputs = r?.inputs;
                inputValues = r?.inputValues;
                break;
            }
            default:
                assertNever(serverType);
        }
        if (!config) {
            return;
        }
        // Step 3: Get server ID
        const name = await this.getServerId(suggestedName);
        if (!name) {
            return;
        }
        // Step 4: Choose configuration target if no configUri provided
        let target = this.workspaceFolder;
        if (!target) {
            target = await this.getConfigurationTarget();
            if (!target) {
                return;
            }
        }
        await this._mcpManagementService.install({ name, config, inputs }, { target });
        if (inputValues) {
            for (const [key, value] of Object.entries(inputValues)) {
                await this._mcpRegistry.setSavedInput(key, (isWorkspaceFolder(target) ? 6 /* ConfigurationTarget.WORKSPACE_FOLDER */ : target) ?? 5 /* ConfigurationTarget.WORKSPACE */, value);
            }
        }
        const packageType = this.getPackageType(serverType);
        if (packageType) {
            this._telemetryService.publicLog2('mcp.addserver.completed', {
                packageType,
                serverType: config.type,
                target: target === 5 /* ConfigurationTarget.WORKSPACE */ ? 'workspace' : 'user'
            });
        }
        this.showOnceDiscovered(name);
    }
    async pickForUrlHandler(resource, showIsPrimary = false) {
        const name = decodeURIComponent(basename(resource)).replace(/\.json$/, '');
        const placeHolder = localize('install.title', 'Install MCP server {0}', name);
        const items = [
            { id: 'install', label: localize('install.start', 'Install Server') },
            { id: 'show', label: localize('install.show', 'Show Configuration', name) },
            { id: 'rename', label: localize('install.rename', 'Rename "{0}"', name) },
            { id: 'cancel', label: localize('cancel', 'Cancel') },
        ];
        if (showIsPrimary) {
            [items[0], items[1]] = [items[1], items[0]];
        }
        const pick = await this._quickInputService.pick(items, { placeHolder, ignoreFocusLost: true });
        const getEditors = () => this._editorService.findEditors(resource);
        switch (pick?.id) {
            case 'show':
                await this._editorService.openEditor({ resource });
                break;
            case 'install':
                await this._editorService.save(getEditors());
                try {
                    const contents = await this._fileService.readFile(resource);
                    const { inputs, ...config } = parseJsonc(contents.value.toString());
                    await this._mcpManagementService.install({ name, config, inputs });
                    this._editorService.closeEditors(getEditors());
                    this.showOnceDiscovered(name);
                }
                catch (e) {
                    this._notificationService.error(localize('install.error', 'Error installing MCP server {0}: {1}', name, e.message));
                    await this._editorService.openEditor({ resource });
                }
                break;
            case 'rename': {
                const newName = await this._quickInputService.input({ placeHolder: localize('install.newName', 'Enter new name'), value: name });
                if (newName) {
                    const newURI = resource.with({ path: `/${encodeURIComponent(newName)}.json` });
                    await this._editorService.save(getEditors());
                    await this._fileService.move(resource, newURI);
                    return this.pickForUrlHandler(newURI, showIsPrimary);
                }
                break;
            }
        }
    }
    getPackageType(serverType) {
        switch (serverType) {
            case 2 /* AddConfigurationType.NpmPackage */:
                return 'npm';
            case 3 /* AddConfigurationType.PipPackage */:
                return 'pip';
            case 4 /* AddConfigurationType.NuGetPackage */:
                return 'nuget';
            case 5 /* AddConfigurationType.DockerImage */:
                return 'docker';
            case 0 /* AddConfigurationType.Stdio */:
                return 'stdio';
            case 1 /* AddConfigurationType.HTTP */:
                return 'sse';
            default:
                return undefined;
        }
    }
};
McpAddConfigurationCommand = __decorate([
    __param(1, IQuickInputService),
    __param(2, IWorkbenchMcpManagementService),
    __param(3, IWorkspaceContextService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, ICommandService),
    __param(6, IMcpRegistry),
    __param(7, IEditorService),
    __param(8, IEditorService),
    __param(9, IFileService),
    __param(10, INotificationService),
    __param(11, ITelemetryService),
    __param(12, IMcpService),
    __param(13, ILabelService)
], McpAddConfigurationCommand);
export { McpAddConfigurationCommand };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29tbWFuZHNBZGRDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvYnJvd3Nlci9tY3BDb21tYW5kc0FkZENvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsS0FBSyxJQUFJLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0Ms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