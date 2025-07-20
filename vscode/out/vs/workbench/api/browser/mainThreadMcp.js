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
import { disposableTimeout } from '../../../base/common/async.js';
import { CancellationError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { observableValue } from '../../../base/common/observable.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import * as nls from '../../../nls.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { LogLevel } from '../../../platform/log/common/log.js';
import { IMcpRegistry } from '../../contrib/mcp/common/mcpRegistryTypes.js';
import { McpConnectionState, McpServerDefinition, McpServerLaunch } from '../../contrib/mcp/common/mcpTypes.js';
import { IAuthenticationMcpAccessService } from '../../services/authentication/browser/authenticationMcpAccessService.js';
import { IAuthenticationMcpService } from '../../services/authentication/browser/authenticationMcpService.js';
import { IAuthenticationMcpUsageService } from '../../services/authentication/browser/authenticationMcpUsageService.js';
import { IAuthenticationService } from '../../services/authentication/common/authentication.js';
import { extensionHostKindToString } from '../../services/extensions/common/extensionHostKind.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadMcp = class MainThreadMcp extends Disposable {
    constructor(_extHostContext, _mcpRegistry, dialogService, _authenticationService, authenticationMcpServersService, authenticationMCPServerAccessService, authenticationMCPServerUsageService) {
        super();
        this._extHostContext = _extHostContext;
        this._mcpRegistry = _mcpRegistry;
        this.dialogService = dialogService;
        this._authenticationService = _authenticationService;
        this.authenticationMcpServersService = authenticationMcpServersService;
        this.authenticationMCPServerAccessService = authenticationMCPServerAccessService;
        this.authenticationMCPServerUsageService = authenticationMCPServerUsageService;
        this._serverIdCounter = 0;
        this._servers = new Map();
        this._serverDefinitions = new Map();
        this._collectionDefinitions = this._register(new DisposableMap());
        const proxy = this._proxy = _extHostContext.getProxy(ExtHostContext.ExtHostMcp);
        this._register(this._mcpRegistry.registerDelegate({
            // Prefer Node.js extension hosts when they're available. No CORS issues etc.
            priority: _extHostContext.extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */ ? 0 : 1,
            waitForInitialProviderPromises() {
                return proxy.$waitForInitialCollectionProviders();
            },
            canStart(collection, serverDefinition) {
                if (collection.remoteAuthority !== _extHostContext.remoteAuthority) {
                    return false;
                }
                if (serverDefinition.launch.type === 1 /* McpServerTransportType.Stdio */ && _extHostContext.extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */) {
                    return false;
                }
                return true;
            },
            start: (_collection, serverDefiniton, resolveLaunch) => {
                const id = ++this._serverIdCounter;
                const launch = new ExtHostMcpServerLaunch(_extHostContext.extensionHostKind, () => proxy.$stopMcp(id), msg => proxy.$sendMessage(id, JSON.stringify(msg)));
                this._servers.set(id, launch);
                this._serverDefinitions.set(id, serverDefiniton);
                proxy.$startMcp(id, resolveLaunch);
                return launch;
            },
        }));
    }
    $upsertMcpCollection(collection, serversDto) {
        const servers = serversDto.map(McpServerDefinition.fromSerialized);
        const existing = this._collectionDefinitions.get(collection.id);
        if (existing) {
            existing.servers.set(servers, undefined);
        }
        else {
            const serverDefinitions = observableValue('mcpServers', servers);
            const handle = this._mcpRegistry.registerCollection({
                ...collection,
                source: new ExtensionIdentifier(collection.extensionId),
                resolveServerLanch: collection.canResolveLaunch ? (async (def) => {
                    const r = await this._proxy.$resolveMcpLaunch(collection.id, def.label);
                    return r ? McpServerLaunch.fromSerialized(r) : undefined;
                }) : undefined,
                remoteAuthority: this._extHostContext.remoteAuthority,
                serverDefinitions,
            });
            this._collectionDefinitions.set(collection.id, {
                fromExtHost: collection,
                servers: serverDefinitions,
                dispose: () => handle.dispose(),
            });
        }
    }
    $deleteMcpCollection(collectionId) {
        this._collectionDefinitions.deleteAndDispose(collectionId);
    }
    $onDidChangeState(id, update) {
        const server = this._servers.get(id);
        if (!server) {
            return;
        }
        server.state.set(update, undefined);
        if (!McpConnectionState.isRunning(update)) {
            server.dispose();
            this._servers.delete(id);
            this._serverDefinitions.delete(id);
        }
    }
    $onDidPublishLog(id, level, log) {
        if (typeof level === 'string') {
            level = LogLevel.Info;
            log = level;
        }
        this._servers.get(id)?.pushLog(level, log);
    }
    $onDidReceiveMessage(id, message) {
        this._servers.get(id)?.pushMessage(message);
    }
    async $getTokenFromServerMetadata(id, authServerComponents, serverMetadata, resourceMetadata) {
        const server = this._serverDefinitions.get(id);
        if (!server) {
            return undefined;
        }
        const authorizationServer = URI.revive(authServerComponents);
        const scopesSupported = resourceMetadata?.scopes_supported || serverMetadata.scopes_supported || [];
        let providerId = await this._authenticationService.getOrActivateProviderIdForServer(authorizationServer);
        if (!providerId) {
            const provider = await this._authenticationService.createDynamicAuthenticationProvider(authorizationServer, serverMetadata, resourceMetadata);
            if (!provider) {
                return undefined;
            }
            providerId = provider.id;
        }
        const sessions = await this._authenticationService.getSessions(providerId, scopesSupported, { authorizationServer: authorizationServer }, true);
        const accountNamePreference = this.authenticationMcpServersService.getAccountPreference(server.id, providerId);
        let matchingAccountPreferenceSession;
        if (accountNamePreference) {
            matchingAccountPreferenceSession = sessions.find(session => session.account.label === accountNamePreference);
        }
        const provider = this._authenticationService.getProvider(providerId);
        let session;
        if (sessions.length) {
            // If we have an existing session preference, use that. If not, we'll return any valid session at the end of this function.
            if (matchingAccountPreferenceSession && this.authenticationMCPServerAccessService.isAccessAllowed(providerId, matchingAccountPreferenceSession.account.label, server.id)) {
                this.authenticationMCPServerUsageService.addAccountUsage(providerId, matchingAccountPreferenceSession.account.label, scopesSupported, server.id, server.label);
                return matchingAccountPreferenceSession.accessToken;
            }
            // If we only have one account for a single auth provider, lets just check if it's allowed and return it if it is.
            if (!provider.supportsMultipleAccounts && this.authenticationMCPServerAccessService.isAccessAllowed(providerId, sessions[0].account.label, server.id)) {
                this.authenticationMCPServerUsageService.addAccountUsage(providerId, sessions[0].account.label, scopesSupported, server.id, server.label);
                return sessions[0].accessToken;
            }
        }
        const isAllowed = await this.loginPrompt(server.label, provider.label, false);
        if (!isAllowed) {
            throw new Error('User did not consent to login.');
        }
        if (sessions.length) {
            session = provider.supportsMultipleAccounts
                ? await this.authenticationMcpServersService.selectSession(providerId, server.id, server.label, scopesSupported, sessions)
                : sessions[0];
        }
        else {
            const accountToCreate = matchingAccountPreferenceSession?.account;
            do {
                session = await this._authenticationService.createSession(providerId, scopesSupported, {
                    activateImmediate: true,
                    account: accountToCreate,
                    authorizationServer
                });
            } while (accountToCreate
                && accountToCreate.label !== session.account.label
                && !await this.continueWithIncorrectAccountPrompt(session.account.label, accountToCreate.label));
        }
        this.authenticationMCPServerAccessService.updateAllowedMcpServers(providerId, session.account.label, [{ id: server.id, name: server.label, allowed: true }]);
        this.authenticationMcpServersService.updateAccountPreference(server.id, providerId, session.account);
        this.authenticationMCPServerUsageService.addAccountUsage(providerId, session.account.label, scopesSupported, server.id, server.label);
        return session.accessToken;
    }
    async continueWithIncorrectAccountPrompt(chosenAccountLabel, requestedAccountLabel) {
        const result = await this.dialogService.prompt({
            message: nls.localize('incorrectAccount', "Incorrect account detected"),
            detail: nls.localize('incorrectAccountDetail', "The chosen account, {0}, does not match the requested account, {1}.", chosenAccountLabel, requestedAccountLabel),
            type: Severity.Warning,
            cancelButton: true,
            buttons: [
                {
                    label: nls.localize('keep', 'Keep {0}', chosenAccountLabel),
                    run: () => chosenAccountLabel
                },
                {
                    label: nls.localize('loginWith', 'Login with {0}', requestedAccountLabel),
                    run: () => requestedAccountLabel
                }
            ],
        });
        if (!result.result) {
            throw new CancellationError();
        }
        return result.result === chosenAccountLabel;
    }
    async loginPrompt(mcpLabel, providerLabel, recreatingSession) {
        const message = recreatingSession
            ? nls.localize('confirmRelogin', "The MCP Server Definition '{0}' wants you to authenticate to {1}.", mcpLabel, providerLabel)
            : nls.localize('confirmLogin', "The MCP Server Definition '{0}' wants to authenticate to {1}.", mcpLabel, providerLabel);
        const buttons = [
            {
                label: nls.localize({ key: 'allow', comment: ['&& denotes a mnemonic'] }, "&&Allow"),
                run() {
                    return true;
                },
            }
        ];
        const { result } = await this.dialogService.prompt({
            type: Severity.Info,
            message,
            buttons,
            cancelButton: true,
        });
        return result ?? false;
    }
    dispose() {
        for (const server of this._servers.values()) {
            server.extHostDispose();
        }
        this._servers.clear();
        this._serverDefinitions.clear();
        super.dispose();
    }
};
MainThreadMcp = __decorate([
    extHostNamedCustomer(MainContext.MainThreadMcp),
    __param(1, IMcpRegistry),
    __param(2, IDialogService),
    __param(3, IAuthenticationService),
    __param(4, IAuthenticationMcpService),
    __param(5, IAuthenticationMcpAccessService),
    __param(6, IAuthenticationMcpUsageService)
], MainThreadMcp);
export { MainThreadMcp };
class ExtHostMcpServerLaunch extends Disposable {
    pushLog(level, message) {
        this._onDidLog.fire({ message, level });
    }
    pushMessage(message) {
        let parsed;
        try {
            parsed = JSON.parse(message);
        }
        catch (e) {
            this.pushLog(LogLevel.Warning, `Failed to parse message: ${JSON.stringify(message)}`);
        }
        if (parsed) {
            if (Array.isArray(parsed)) { // streamable HTTP supports batching
                parsed.forEach(p => this._onDidReceiveMessage.fire(p));
            }
            else {
                this._onDidReceiveMessage.fire(parsed);
            }
        }
    }
    constructor(extHostKind, stop, send) {
        super();
        this.stop = stop;
        this.send = send;
        this.state = observableValue('mcpServerState', { state: 1 /* McpConnectionState.Kind.Starting */ });
        this._onDidLog = this._register(new Emitter());
        this.onDidLog = this._onDidLog.event;
        this._onDidReceiveMessage = this._register(new Emitter());
        this.onDidReceiveMessage = this._onDidReceiveMessage.event;
        this._register(disposableTimeout(() => {
            this.pushLog(LogLevel.Info, `Starting server from ${extensionHostKindToString(extHostKind)} extension host`);
        }));
    }
    extHostDispose() {
        if (McpConnectionState.isRunning(this.state.get())) {
            this.pushLog(LogLevel.Warning, 'Extension host shut down, server will stop.');
            this.state.set({ state: 0 /* McpConnectionState.Kind.Stopped */ }, undefined);
        }
        this.dispose();
    }
    dispose() {
        if (McpConnectionState.isRunning(this.state.get())) {
            this.stop();
        }
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1jcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRNY3AudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFOUUsT0FBTyxFQUF1QixlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRixPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFFLGNBQWMsRUFBaUIsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUF3QixZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRyxPQUFPLEVBQTJCLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBMEIsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqSyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUMxSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztB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