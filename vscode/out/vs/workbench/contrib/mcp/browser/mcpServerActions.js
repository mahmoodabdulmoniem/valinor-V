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
var InstallAction_1, UninstallAction_1, ManageMcpServerAction_1, StartServerAction_1, StopServerAction_1, RestartServerAction_1, AuthServerAction_1, ShowServerOutputAction_1, ShowServerConfigurationAction_1, ConfigureModelAccessAction_1, ShowSamplingRequestsAction_1, BrowseResourcesAction_1, McpServerStatusAction_1;
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { disposeIfDisposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { errorIcon, infoIcon, manageExtensionIcon, trustIcon, warningIcon } from '../../extensions/browser/extensionsIcons.js';
import { getDomNodePagePosition } from '../../../../base/browser/dom.js';
import { IMcpSamplingService, IMcpService, IMcpWorkbenchService, McpConnectionState } from '../common/mcpTypes.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IAuthenticationQueryService } from '../../../services/authentication/common/authenticationQuery.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Emitter } from '../../../../base/common/event.js';
import { IAllowedMcpServersService } from '../../../../platform/mcp/common/mcpManagement.js';
export class McpServerAction extends Action {
    constructor() {
        super(...arguments);
        this._mcpServer = null;
    }
    static { this.EXTENSION_ACTION_CLASS = 'extension-action'; }
    static { this.TEXT_ACTION_CLASS = `${McpServerAction.EXTENSION_ACTION_CLASS} text`; }
    static { this.LABEL_ACTION_CLASS = `${McpServerAction.EXTENSION_ACTION_CLASS} label`; }
    static { this.PROMINENT_LABEL_ACTION_CLASS = `${McpServerAction.LABEL_ACTION_CLASS} prominent`; }
    static { this.ICON_ACTION_CLASS = `${McpServerAction.EXTENSION_ACTION_CLASS} icon`; }
    get mcpServer() { return this._mcpServer; }
    set mcpServer(mcpServer) { this._mcpServer = mcpServer; this.update(); }
}
let DropDownAction = class DropDownAction extends McpServerAction {
    constructor(id, label, cssClass, enabled, instantiationService) {
        super(id, label, cssClass, enabled);
        this.instantiationService = instantiationService;
        this._actionViewItem = null;
    }
    createActionViewItem(options) {
        this._actionViewItem = this.instantiationService.createInstance(DropDownExtensionActionViewItem, this, options);
        return this._actionViewItem;
    }
    run(actionGroups) {
        this._actionViewItem?.showMenu(actionGroups);
        return Promise.resolve();
    }
};
DropDownAction = __decorate([
    __param(4, IInstantiationService)
], DropDownAction);
export { DropDownAction };
let DropDownExtensionActionViewItem = class DropDownExtensionActionViewItem extends ActionViewItem {
    constructor(action, options, contextMenuService) {
        super(null, action, { ...options, icon: true, label: true });
        this.contextMenuService = contextMenuService;
    }
    showMenu(menuActionGroups) {
        if (this.element) {
            const actions = this.getActions(menuActionGroups);
            const elementPosition = getDomNodePagePosition(this.element);
            const anchor = { x: elementPosition.left, y: elementPosition.top + elementPosition.height + 10 };
            this.contextMenuService.showContextMenu({
                getAnchor: () => anchor,
                getActions: () => actions,
                actionRunner: this.actionRunner,
                onHide: () => disposeIfDisposable(actions)
            });
        }
    }
    getActions(menuActionGroups) {
        let actions = [];
        for (const menuActions of menuActionGroups) {
            actions = [...actions, ...menuActions, new Separator()];
        }
        return actions.length ? actions.slice(0, actions.length - 1) : actions;
    }
};
DropDownExtensionActionViewItem = __decorate([
    __param(2, IContextMenuService)
], DropDownExtensionActionViewItem);
export { DropDownExtensionActionViewItem };
let InstallAction = class InstallAction extends McpServerAction {
    static { InstallAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent install`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(editor, mcpWorkbenchService, telemetryService) {
        super('extensions.install', localize('install', "Install"), InstallAction_1.CLASS, false);
        this.editor = editor;
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.telemetryService = telemetryService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = InstallAction_1.HIDE;
        if (this.mcpServer?.local) {
            return;
        }
        if (!this.mcpServer?.gallery && !this.mcpServer?.installable) {
            return;
        }
        if (this.mcpServer.installState !== 3 /* McpServerInstallState.Uninstalled */) {
            return;
        }
        this.class = InstallAction_1.CLASS;
        this.enabled = this.mcpWorkbenchService.canInstall(this.mcpServer) === true;
    }
    async run() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.editor) {
            this.mcpWorkbenchService.open(this.mcpServer);
            alert(localize('mcpServerInstallation', "Installing MCP Server {0} started. An editor is now open with more details on this MCP Server", this.mcpServer.label));
        }
        this.telemetryService.publicLog2('mcp:action:install', { name: this.mcpServer.gallery?.name });
        await this.mcpWorkbenchService.install(this.mcpServer);
    }
};
InstallAction = InstallAction_1 = __decorate([
    __param(1, IMcpWorkbenchService),
    __param(2, ITelemetryService)
], InstallAction);
export { InstallAction };
export class InstallingLabelAction extends McpServerAction {
    static { this.LABEL = localize('installing', "Installing"); }
    static { this.CLASS = `${McpServerAction.LABEL_ACTION_CLASS} install installing`; }
    constructor() {
        super('extension.installing', InstallingLabelAction.LABEL, InstallingLabelAction.CLASS, false);
    }
    update() {
        this.class = `${InstallingLabelAction.CLASS}${this.mcpServer && this.mcpServer.installState === 0 /* McpServerInstallState.Installing */ ? '' : ' hide'}`;
    }
}
let UninstallAction = class UninstallAction extends McpServerAction {
    static { UninstallAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent uninstall`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpWorkbenchService) {
        super('extensions.uninstall', localize('uninstall', "Uninstall"), UninstallAction_1.CLASS, false);
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = UninstallAction_1.HIDE;
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        if (this.mcpServer.installState !== 1 /* McpServerInstallState.Installed */) {
            this.enabled = false;
            return;
        }
        this.class = UninstallAction_1.CLASS;
        this.enabled = true;
        this.label = localize('uninstall', "Uninstall");
    }
    async run() {
        if (!this.mcpServer) {
            return;
        }
        await this.mcpWorkbenchService.uninstall(this.mcpServer);
    }
};
UninstallAction = UninstallAction_1 = __decorate([
    __param(0, IMcpWorkbenchService)
], UninstallAction);
export { UninstallAction };
let ManageMcpServerAction = class ManageMcpServerAction extends DropDownAction {
    static { ManageMcpServerAction_1 = this; }
    static { this.ID = 'mcpServer.manage'; }
    static { this.Class = `${McpServerAction.ICON_ACTION_CLASS} manage ` + ThemeIcon.asClassName(manageExtensionIcon); }
    static { this.HideManageExtensionClass = `${this.Class} hide`; }
    constructor(isEditorAction, instantiationService) {
        super(ManageMcpServerAction_1.ID, '', '', true, instantiationService);
        this.isEditorAction = isEditorAction;
        this.tooltip = localize('manage', "Manage");
        this.update();
    }
    async getActionGroups() {
        const groups = [];
        groups.push([
            this.instantiationService.createInstance(StartServerAction),
        ]);
        groups.push([
            this.instantiationService.createInstance(StopServerAction),
            this.instantiationService.createInstance(RestartServerAction),
        ]);
        groups.push([
            this.instantiationService.createInstance(AuthServerAction),
        ]);
        groups.push([
            this.instantiationService.createInstance(ShowServerOutputAction),
            this.instantiationService.createInstance(ShowServerConfigurationAction),
        ]);
        groups.push([
            this.instantiationService.createInstance(ConfigureModelAccessAction),
            this.instantiationService.createInstance(ShowSamplingRequestsAction),
        ]);
        groups.push([
            this.instantiationService.createInstance(BrowseResourcesAction),
        ]);
        if (!this.isEditorAction) {
            groups.push([
                this.instantiationService.createInstance(UninstallAction),
            ]);
        }
        groups.forEach(group => group.forEach(extensionAction => {
            if (extensionAction instanceof McpServerAction) {
                extensionAction.mcpServer = this.mcpServer;
            }
        }));
        return groups;
    }
    async run() {
        return super.run(await this.getActionGroups());
    }
    update() {
        this.class = ManageMcpServerAction_1.HideManageExtensionClass;
        this.enabled = false;
        if (this.mcpServer) {
            this.enabled = !!this.mcpServer.local;
            this.class = this.enabled ? ManageMcpServerAction_1.Class : ManageMcpServerAction_1.HideManageExtensionClass;
        }
    }
};
ManageMcpServerAction = ManageMcpServerAction_1 = __decorate([
    __param(1, IInstantiationService)
], ManageMcpServerAction);
export { ManageMcpServerAction };
let StartServerAction = class StartServerAction extends McpServerAction {
    static { StartServerAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent start`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService) {
        super('extensions.start', localize('start', "Start Server"), StartServerAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = StartServerAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        const serverState = server.connectionState.get();
        if (!McpConnectionState.canBeStarted(serverState.state)) {
            return;
        }
        this.class = StartServerAction_1.CLASS;
        this.enabled = true;
        this.label = localize('start', "Start Server");
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        await server.start({ isFromInteraction: true });
        server.showOutput();
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.label === this.mcpServer?.name);
    }
};
StartServerAction = StartServerAction_1 = __decorate([
    __param(0, IMcpService)
], StartServerAction);
export { StartServerAction };
let StopServerAction = class StopServerAction extends McpServerAction {
    static { StopServerAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent stop`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService) {
        super('extensions.stop', localize('stop', "Stop Server"), StopServerAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = StopServerAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        const serverState = server.connectionState.get();
        if (McpConnectionState.canBeStarted(serverState.state)) {
            return;
        }
        this.class = StopServerAction_1.CLASS;
        this.enabled = true;
        this.label = localize('stop', "Stop Server");
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        await server.stop();
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.label === this.mcpServer?.name);
    }
};
StopServerAction = StopServerAction_1 = __decorate([
    __param(0, IMcpService)
], StopServerAction);
export { StopServerAction };
let RestartServerAction = class RestartServerAction extends McpServerAction {
    static { RestartServerAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent restart`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService) {
        super('extensions.restart', localize('restart', "Restart Server"), RestartServerAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = RestartServerAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        const serverState = server.connectionState.get();
        if (McpConnectionState.canBeStarted(serverState.state)) {
            return;
        }
        this.class = RestartServerAction_1.CLASS;
        this.enabled = true;
        this.label = localize('restart', "Restart Server");
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        await server.stop();
        await server.start({ isFromInteraction: true });
        server.showOutput();
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.label === this.mcpServer?.name);
    }
};
RestartServerAction = RestartServerAction_1 = __decorate([
    __param(0, IMcpService)
], RestartServerAction);
export { RestartServerAction };
let AuthServerAction = class AuthServerAction extends McpServerAction {
    static { AuthServerAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent account`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    static { this.SIGN_OUT = localize('mcp.signOut', 'Sign Out'); }
    static { this.DISCONNECT = localize('mcp.disconnect', 'Disconnect Account'); }
    constructor(mcpService, _authenticationQueryService, _authenticationService) {
        super('extensions.restart', localize('restart', "Restart Server"), RestartServerAction.CLASS, false);
        this.mcpService = mcpService;
        this._authenticationQueryService = _authenticationQueryService;
        this._authenticationService = _authenticationService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = AuthServerAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        const accountQuery = this.getAccountQuery();
        if (!accountQuery) {
            return;
        }
        this._accountQuery = accountQuery;
        this.class = AuthServerAction_1.CLASS;
        this.enabled = true;
        let label = accountQuery.entities().getEntityCount().total > 1 ? AuthServerAction_1.DISCONNECT : AuthServerAction_1.SIGN_OUT;
        label += ` (${accountQuery.accountName})`;
        this.label = label;
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        const accountQuery = this.getAccountQuery();
        if (!accountQuery) {
            return;
        }
        await server.stop();
        const { providerId, accountName } = accountQuery;
        accountQuery.mcpServer(server.definition.id).setAccessAllowed(false, server.definition.label);
        if (this.label === AuthServerAction_1.SIGN_OUT) {
            const accounts = await this._authenticationService.getAccounts(providerId);
            const account = accounts.find(a => a.label === accountName);
            if (account) {
                const sessions = await this._authenticationService.getSessions(providerId, undefined, { account });
                for (const session of sessions) {
                    await this._authenticationService.removeSession(providerId, session.id);
                }
            }
        }
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.label === this.mcpServer?.name);
    }
    getAccountQuery() {
        const server = this.getServer();
        if (!server) {
            return undefined;
        }
        if (this._accountQuery) {
            return this._accountQuery;
        }
        const serverId = server.definition.id;
        const preferences = this._authenticationQueryService.mcpServer(serverId).getAllAccountPreferences();
        if (!preferences.size) {
            return undefined;
        }
        for (const [providerId, accountName] of preferences) {
            const accountQuery = this._authenticationQueryService.provider(providerId).account(accountName);
            if (!accountQuery.mcpServer(serverId).isAccessAllowed()) {
                continue; // skip accounts that are not allowed
            }
            return accountQuery;
        }
        return undefined;
    }
};
AuthServerAction = AuthServerAction_1 = __decorate([
    __param(0, IMcpService),
    __param(1, IAuthenticationQueryService),
    __param(2, IAuthenticationService)
], AuthServerAction);
export { AuthServerAction };
let ShowServerOutputAction = class ShowServerOutputAction extends McpServerAction {
    static { ShowServerOutputAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent output`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService) {
        super('extensions.output', localize('output', "Show Output"), ShowServerOutputAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ShowServerOutputAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        this.class = ShowServerOutputAction_1.CLASS;
        this.enabled = true;
        this.label = localize('output', "Show Output");
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        server.showOutput();
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.label === this.mcpServer?.name);
    }
};
ShowServerOutputAction = ShowServerOutputAction_1 = __decorate([
    __param(0, IMcpService)
], ShowServerOutputAction);
export { ShowServerOutputAction };
let ShowServerConfigurationAction = class ShowServerConfigurationAction extends McpServerAction {
    static { ShowServerConfigurationAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent config`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpWorkbenchService) {
        super('extensions.config', localize('config', "Show Configuration"), ShowServerConfigurationAction_1.CLASS, false);
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ShowServerConfigurationAction_1.HIDE;
        if (!this.mcpServer?.local) {
            return;
        }
        this.class = ShowServerConfigurationAction_1.CLASS;
        this.enabled = true;
        this.label = localize('config', "Show Configuration");
    }
    async run() {
        if (!this.mcpServer?.local) {
            return;
        }
        this.mcpWorkbenchService.open(this.mcpServer, { tab: "configuration" /* McpServerEditorTab.Configuration */ });
    }
};
ShowServerConfigurationAction = ShowServerConfigurationAction_1 = __decorate([
    __param(0, IMcpWorkbenchService)
], ShowServerConfigurationAction);
export { ShowServerConfigurationAction };
let ConfigureModelAccessAction = class ConfigureModelAccessAction extends McpServerAction {
    static { ConfigureModelAccessAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent config`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService, commandService) {
        super('extensions.config', localize('mcp.configAccess', 'Configure Model Access'), ConfigureModelAccessAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.commandService = commandService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ConfigureModelAccessAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        this.class = ConfigureModelAccessAction_1.CLASS;
        this.enabled = true;
        this.label = localize('mcp.configAccess', 'Configure Model Access');
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        this.commandService.executeCommand("workbench.mcp.configureSamplingModels" /* McpCommandIds.ConfigureSamplingModels */, server);
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.label === this.mcpServer?.name);
    }
};
ConfigureModelAccessAction = ConfigureModelAccessAction_1 = __decorate([
    __param(0, IMcpService),
    __param(1, ICommandService)
], ConfigureModelAccessAction);
export { ConfigureModelAccessAction };
let ShowSamplingRequestsAction = class ShowSamplingRequestsAction extends McpServerAction {
    static { ShowSamplingRequestsAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent config`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService, samplingService, editorService) {
        super('extensions.config', localize('mcp.samplingLog', 'Show Sampling Requests'), ShowSamplingRequestsAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.samplingService = samplingService;
        this.editorService = editorService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ShowSamplingRequestsAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        if (!this.samplingService.hasLogs(server)) {
            return;
        }
        this.class = ShowSamplingRequestsAction_1.CLASS;
        this.enabled = true;
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        if (!this.samplingService.hasLogs(server)) {
            return;
        }
        this.editorService.openEditor({
            resource: undefined,
            contents: this.samplingService.getLogText(server),
            label: localize('mcp.samplingLog.title', 'MCP Sampling: {0}', server.definition.label),
        });
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.label === this.mcpServer?.name);
    }
};
ShowSamplingRequestsAction = ShowSamplingRequestsAction_1 = __decorate([
    __param(0, IMcpService),
    __param(1, IMcpSamplingService),
    __param(2, IEditorService)
], ShowSamplingRequestsAction);
export { ShowSamplingRequestsAction };
let BrowseResourcesAction = class BrowseResourcesAction extends McpServerAction {
    static { BrowseResourcesAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent config`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService, commandService) {
        super('extensions.config', localize('mcp.resources', 'Browse Resources'), BrowseResourcesAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.commandService = commandService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = BrowseResourcesAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        const capabilities = server.capabilities.get();
        if (capabilities !== undefined && !(capabilities & 16 /* McpCapability.Resources */)) {
            return;
        }
        this.class = BrowseResourcesAction_1.CLASS;
        this.enabled = true;
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        const capabilities = server.capabilities.get();
        if (capabilities !== undefined && !(capabilities & 16 /* McpCapability.Resources */)) {
            return;
        }
        return this.commandService.executeCommand("workbench.mcp.browseResources" /* McpCommandIds.BrowseResources */, server);
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.label === this.mcpServer?.name);
    }
};
BrowseResourcesAction = BrowseResourcesAction_1 = __decorate([
    __param(0, IMcpService),
    __param(1, ICommandService)
], BrowseResourcesAction);
export { BrowseResourcesAction };
let McpServerStatusAction = class McpServerStatusAction extends McpServerAction {
    static { McpServerStatusAction_1 = this; }
    static { this.CLASS = `${McpServerAction.ICON_ACTION_CLASS} extension-status`; }
    get status() { return this._status; }
    constructor(mcpWorkbenchService, allowedMcpServersService, commandService) {
        super('extensions.status', '', `${McpServerStatusAction_1.CLASS} hide`, false);
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.allowedMcpServersService = allowedMcpServersService;
        this.commandService = commandService;
        this._status = [];
        this._onDidChangeStatus = this._register(new Emitter());
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this._register(allowedMcpServersService.onDidChangeAllowedMcpServers(() => this.update()));
        this.update();
    }
    update() {
        this.computeAndUpdateStatus();
    }
    computeAndUpdateStatus() {
        this.updateStatus(undefined, true);
        this.enabled = false;
        if (!this.mcpServer) {
            return;
        }
        if (this.mcpServer.installState === 3 /* McpServerInstallState.Uninstalled */) {
            const result = this.mcpWorkbenchService.canInstall(this.mcpServer);
            if (result !== true) {
                this.updateStatus({ icon: warningIcon, message: result }, true);
                return;
            }
        }
        if (this.mcpServer.local && this.mcpServer.installState === 1 /* McpServerInstallState.Installed */) {
            const result = this.allowedMcpServersService.isAllowed(this.mcpServer.local);
            if (result !== true) {
                this.updateStatus({ icon: warningIcon, message: new MarkdownString(localize('disabled - not allowed', "This MCP Server is disabled because {0}", result.value)) }, true);
                return;
            }
        }
    }
    updateStatus(status, updateClass) {
        if (status) {
            if (this._status.some(s => s.message.value === status.message.value && s.icon?.id === status.icon?.id)) {
                return;
            }
        }
        else {
            if (this._status.length === 0) {
                return;
            }
            this._status = [];
        }
        if (status) {
            this._status.push(status);
            this._status.sort((a, b) => b.icon === trustIcon ? -1 :
                a.icon === trustIcon ? 1 :
                    b.icon === errorIcon ? -1 :
                        a.icon === errorIcon ? 1 :
                            b.icon === warningIcon ? -1 :
                                a.icon === warningIcon ? 1 :
                                    b.icon === infoIcon ? -1 :
                                        a.icon === infoIcon ? 1 :
                                            0);
        }
        if (updateClass) {
            if (status?.icon === errorIcon) {
                this.class = `${McpServerStatusAction_1.CLASS} extension-status-error ${ThemeIcon.asClassName(errorIcon)}`;
            }
            else if (status?.icon === warningIcon) {
                this.class = `${McpServerStatusAction_1.CLASS} extension-status-warning ${ThemeIcon.asClassName(warningIcon)}`;
            }
            else if (status?.icon === infoIcon) {
                this.class = `${McpServerStatusAction_1.CLASS} extension-status-info ${ThemeIcon.asClassName(infoIcon)}`;
            }
            else if (status?.icon === trustIcon) {
                this.class = `${McpServerStatusAction_1.CLASS} ${ThemeIcon.asClassName(trustIcon)}`;
            }
            else {
                this.class = `${McpServerStatusAction_1.CLASS} hide`;
            }
        }
        this._onDidChangeStatus.fire();
    }
    async run() {
        if (this._status[0]?.icon === trustIcon) {
            return this.commandService.executeCommand('workbench.trust.manage');
        }
    }
};
McpServerStatusAction = McpServerStatusAction_1 = __decorate([
    __param(0, IMcpWorkbenchService),
    __param(1, IAllowedMcpServersService),
    __param(2, ICommandService)
], McpServerStatusAction);
export { McpServerStatusAction };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvbWNwU2VydmVyQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBMEIsTUFBTSwwREFBMEQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsTUFBTSxFQUFXLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQy9ILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBbUMsV0FBVyxFQUFFLG9CQUFvQixFQUFzQyxrQkFBa0IsRUFBNkMsTUFBTSx1QkFBdUIsQ0FBQztBQUNuTyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRW5GLE9BQU8sRUFBaUIsMkJBQTJCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUM1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