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
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import * as nls from '../../../nls.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IAuthenticationService, IAuthenticationExtensionsService } from '../../services/authentication/common/authentication.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../base/common/severity.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { Emitter } from '../../../base/common/event.js';
import { IAuthenticationAccessService } from '../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationUsageService } from '../../services/authentication/browser/authenticationUsageService.js';
import { getAuthenticationProviderActivationEvent } from '../../services/authentication/browser/authenticationService.js';
import { URI } from '../../../base/common/uri.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { CancellationError } from '../../../base/common/errors.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IURLService } from '../../../platform/url/common/url.js';
import { DeferredPromise, raceTimeout } from '../../../base/common/async.js';
import { IDynamicAuthenticationProviderStorageService } from '../../services/authentication/common/dynamicAuthenticationProviderStorage.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
export class MainThreadAuthenticationProvider extends Disposable {
    constructor(_proxy, id, label, supportsMultipleAccounts, authorizationServers, onDidChangeSessionsEmitter) {
        super();
        this._proxy = _proxy;
        this.id = id;
        this.label = label;
        this.supportsMultipleAccounts = supportsMultipleAccounts;
        this.authorizationServers = authorizationServers;
        this.onDidChangeSessions = onDidChangeSessionsEmitter.event;
    }
    async getSessions(scopes, options) {
        return this._proxy.$getSessions(this.id, scopes, options);
    }
    createSession(scopes, options) {
        return this._proxy.$createSession(this.id, scopes, options);
    }
    async removeSession(sessionId) {
        await this._proxy.$removeSession(this.id, sessionId);
    }
}
let MainThreadAuthentication = class MainThreadAuthentication extends Disposable {
    constructor(extHostContext, authenticationService, authenticationExtensionsService, authenticationAccessService, authenticationUsageService, dialogService, notificationService, extensionService, telemetryService, openerService, logService, urlService, dynamicAuthProviderStorageService, clipboardService, quickInputService) {
        super();
        this.authenticationService = authenticationService;
        this.authenticationExtensionsService = authenticationExtensionsService;
        this.authenticationAccessService = authenticationAccessService;
        this.authenticationUsageService = authenticationUsageService;
        this.dialogService = dialogService;
        this.notificationService = notificationService;
        this.extensionService = extensionService;
        this.telemetryService = telemetryService;
        this.openerService = openerService;
        this.logService = logService;
        this.urlService = urlService;
        this.dynamicAuthProviderStorageService = dynamicAuthProviderStorageService;
        this.clipboardService = clipboardService;
        this.quickInputService = quickInputService;
        this._registrations = this._register(new DisposableMap());
        this._sentProviderUsageEvents = new Set();
        this._suppressUnregisterEvent = false;
        // TODO@TylerLeonhardt this is a temporary addition to telemetry to understand what extensions are overriding the client id.
        // We can use this telemetry to reach out to these extension authors and let them know that they many need configuration changes
        // due to the adoption of the Microsoft broker.
        // Remove this in a few iterations.
        this._sentClientIdUsageEvents = new Set();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostAuthentication);
        this._register(this.authenticationService.onDidChangeSessions(e => this._proxy.$onDidChangeAuthenticationSessions(e.providerId, e.label)));
        this._register(this.authenticationService.onDidUnregisterAuthenticationProvider(e => {
            if (!this._suppressUnregisterEvent) {
                this._proxy.$onDidUnregisterAuthenticationProvider(e.id);
            }
        }));
        this._register(this.authenticationExtensionsService.onDidChangeAccountPreference(e => {
            const providerInfo = this.authenticationService.getProvider(e.providerId);
            this._proxy.$onDidChangeAuthenticationSessions(providerInfo.id, providerInfo.label, e.extensionIds);
        }));
        // Listen for dynamic authentication provider token changes
        this._register(this.dynamicAuthProviderStorageService.onDidChangeTokens(e => {
            this._proxy.$onDidChangeDynamicAuthProviderTokens(e.authProviderId, e.clientId, e.tokens);
        }));
        this._register(authenticationService.registerAuthenticationProviderHostDelegate({
            // Prefer Node.js extension hosts when they're available. No CORS issues etc.
            priority: extHostContext.extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */ ? 0 : 1,
            create: async (authorizationServer, serverMetadata, resource) => {
                // Auth Provider Id is a combination of the authorization server and the resource, if provided.
                const authProviderId = resource ? `${authorizationServer.toString(true)} ${resource.resource}` : authorizationServer.toString(true);
                const clientDetails = await this.dynamicAuthProviderStorageService.getClientRegistration(authProviderId);
                const clientId = clientDetails?.clientId;
                const clientSecret = clientDetails?.clientSecret;
                let initialTokens = undefined;
                if (clientId) {
                    initialTokens = await this.dynamicAuthProviderStorageService.getSessionsForDynamicAuthProvider(authProviderId, clientId);
                }
                return await this._proxy.$registerDynamicAuthProvider(authorizationServer, serverMetadata, resource, clientId, clientSecret, initialTokens);
            }
        }));
    }
    async $registerAuthenticationProvider(id, label, supportsMultipleAccounts, supportedAuthorizationServer = []) {
        if (!this.authenticationService.declaredProviders.find(p => p.id === id)) {
            // If telemetry shows that this is not happening much, we can instead throw an error here.
            this.logService.warn(`Authentication provider ${id} was not declared in the Extension Manifest.`);
            this.telemetryService.publicLog2('authentication.providerNotDeclared', { id });
        }
        const emitter = new Emitter();
        this._registrations.set(id, emitter);
        const supportedAuthorizationServerUris = supportedAuthorizationServer.map(i => URI.revive(i));
        const provider = new MainThreadAuthenticationProvider(this._proxy, id, label, supportsMultipleAccounts, supportedAuthorizationServerUris, emitter);
        this.authenticationService.registerAuthenticationProvider(id, provider);
    }
    async $unregisterAuthenticationProvider(id) {
        this._registrations.deleteAndDispose(id);
        // The ext host side already unregisters the provider, so we can suppress the event here.
        this._suppressUnregisterEvent = true;
        try {
            this.authenticationService.unregisterAuthenticationProvider(id);
        }
        finally {
            this._suppressUnregisterEvent = false;
        }
    }
    async $ensureProvider(id) {
        if (!this.authenticationService.isAuthenticationProviderRegistered(id)) {
            return await this.extensionService.activateByEvent(getAuthenticationProviderActivationEvent(id), 1 /* ActivationKind.Immediate */);
        }
    }
    async $sendDidChangeSessions(providerId, event) {
        const obj = this._registrations.get(providerId);
        if (obj instanceof Emitter) {
            obj.fire(event);
        }
    }
    $removeSession(providerId, sessionId) {
        return this.authenticationService.removeSession(providerId, sessionId);
    }
    async $waitForUriHandler(expectedUri) {
        const deferredPromise = new DeferredPromise();
        const disposable = this.urlService.registerHandler({
            handleURL: async (uri) => {
                if (uri.scheme !== expectedUri.scheme || uri.authority !== expectedUri.authority || uri.path !== expectedUri.path) {
                    return false;
                }
                deferredPromise.complete(uri);
                disposable.dispose();
                return true;
            }
        });
        const result = await raceTimeout(deferredPromise.p, 5 * 60 * 1000); // 5 minutes
        if (!result) {
            throw new Error('Timed out waiting for URI handler');
        }
        return await deferredPromise.p;
    }
    $showContinueNotification(message) {
        const yes = nls.localize('yes', "Yes");
        const no = nls.localize('no', "No");
        const deferredPromise = new DeferredPromise();
        let result = false;
        const handle = this.notificationService.prompt(Severity.Warning, message, [{
                label: yes,
                run: () => result = true
            }, {
                label: no,
                run: () => result = false
            }]);
        const disposable = handle.onDidClose(() => {
            deferredPromise.complete(result);
            disposable.dispose();
        });
        return deferredPromise.p;
    }
    async $registerDynamicAuthenticationProvider(id, label, authorizationServer, clientId, clientSecret) {
        await this.$registerAuthenticationProvider(id, label, true, [authorizationServer]);
        await this.dynamicAuthProviderStorageService.storeClientRegistration(id, URI.revive(authorizationServer).toString(true), clientId, clientSecret, label);
    }
    async $setSessionsForDynamicAuthProvider(authProviderId, clientId, sessions) {
        await this.dynamicAuthProviderStorageService.setSessionsForDynamicAuthProvider(authProviderId, clientId, sessions);
    }
    async $sendDidChangeDynamicProviderInfo({ providerId, clientId, authorizationServer, label, clientSecret }) {
        this.logService.info(`Client ID for authentication provider ${providerId} changed to ${clientId}`);
        const existing = this.dynamicAuthProviderStorageService.getInteractedProviders().find(p => p.providerId === providerId);
        if (!existing) {
            throw new Error(`Dynamic authentication provider ${providerId} not found. Has it been registered?`);
        }
        // Store client credentials together
        await this.dynamicAuthProviderStorageService.storeClientRegistration(providerId || existing.providerId, authorizationServer ? URI.revive(authorizationServer).toString(true) : existing.authorizationServer, clientId || existing.clientId, clientSecret, label || existing.label);
    }
    async loginPrompt(provider, extensionName, recreatingSession, options) {
        let message;
        // Check if the provider has a custom confirmation message
        const customMessage = provider.confirmation?.(extensionName, recreatingSession);
        if (customMessage) {
            message = customMessage;
        }
        else {
            message = recreatingSession
                ? nls.localize('confirmRelogin', "The extension '{0}' wants you to sign in again using {1}.", extensionName, provider.label)
                : nls.localize('confirmLogin', "The extension '{0}' wants to sign in using {1}.", extensionName, provider.label);
        }
        const buttons = [
            {
                label: nls.localize({ key: 'allow', comment: ['&& denotes a mnemonic'] }, "&&Allow"),
                run() {
                    return true;
                },
            }
        ];
        if (options?.learnMore) {
            buttons.push({
                label: nls.localize('learnMore', "Learn more"),
                run: async () => {
                    const result = this.loginPrompt(provider, extensionName, recreatingSession, options);
                    await this.openerService.open(URI.revive(options.learnMore), { allowCommands: true });
                    return await result;
                }
            });
        }
        const { result } = await this.dialogService.prompt({
            type: Severity.Info,
            message,
            buttons,
            detail: options?.detail,
            cancelButton: true,
        });
        return result ?? false;
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
    async doGetSession(providerId, scopes, extensionId, extensionName, options) {
        const authorizationServer = URI.revive(options.authorizationServer);
        const sessions = await this.authenticationService.getSessions(providerId, scopes, { account: options.account, authorizationServer }, true);
        const provider = this.authenticationService.getProvider(providerId);
        // Error cases
        if (options.forceNewSession && options.createIfNone) {
            throw new Error('Invalid combination of options. Please remove one of the following: forceNewSession, createIfNone');
        }
        if (options.forceNewSession && options.silent) {
            throw new Error('Invalid combination of options. Please remove one of the following: forceNewSession, silent');
        }
        if (options.createIfNone && options.silent) {
            throw new Error('Invalid combination of options. Please remove one of the following: createIfNone, silent');
        }
        if (options.clearSessionPreference) {
            // Clearing the session preference is usually paired with createIfNone, so just remove the preference and
            // defer to the rest of the logic in this function to choose the session.
            this._removeAccountPreference(extensionId, providerId, scopes);
        }
        const matchingAccountPreferenceSession = 
        // If an account was passed in, that takes precedence over the account preference
        options.account
            // We only support one session per account per set of scopes so grab the first one here
            ? sessions[0]
            : this._getAccountPreference(extensionId, providerId, scopes, sessions);
        // Check if the sessions we have are valid
        if (!options.forceNewSession && sessions.length) {
            // If we have an existing session preference, use that. If not, we'll return any valid session at the end of this function.
            if (matchingAccountPreferenceSession && this.authenticationAccessService.isAccessAllowed(providerId, matchingAccountPreferenceSession.account.label, extensionId)) {
                return matchingAccountPreferenceSession;
            }
            // If we only have one account for a single auth provider, lets just check if it's allowed and return it if it is.
            if (!provider.supportsMultipleAccounts && this.authenticationAccessService.isAccessAllowed(providerId, sessions[0].account.label, extensionId)) {
                return sessions[0];
            }
        }
        // We may need to prompt because we don't have a valid session
        // modal flows
        if (options.createIfNone || options.forceNewSession) {
            let uiOptions;
            if (typeof options.forceNewSession === 'object') {
                uiOptions = options.forceNewSession;
            }
            else if (typeof options.createIfNone === 'object') {
                uiOptions = options.createIfNone;
            }
            // We only want to show the "recreating session" prompt if we are using forceNewSession & there are sessions
            // that we will be "forcing through".
            const recreatingSession = !!(options.forceNewSession && sessions.length);
            const isAllowed = await this.loginPrompt(provider, extensionName, recreatingSession, uiOptions);
            if (!isAllowed) {
                throw new Error('User did not consent to login.');
            }
            let session;
            if (sessions?.length && !options.forceNewSession) {
                session = provider.supportsMultipleAccounts && !options.account
                    ? await this.authenticationExtensionsService.selectSession(providerId, extensionId, extensionName, scopes, sessions)
                    : sessions[0];
            }
            else {
                const accountToCreate = options.account ?? matchingAccountPreferenceSession?.account;
                do {
                    session = await this.authenticationService.createSession(providerId, scopes, {
                        activateImmediate: true,
                        account: accountToCreate,
                        authorizationServer
                    });
                } while (accountToCreate
                    && accountToCreate.label !== session.account.label
                    && !await this.continueWithIncorrectAccountPrompt(session.account.label, accountToCreate.label));
            }
            this.authenticationAccessService.updateAllowedExtensions(providerId, session.account.label, [{ id: extensionId, name: extensionName, allowed: true }]);
            this._updateAccountPreference(extensionId, providerId, session);
            return session;
        }
        // For the silent flows, if we have a session but we don't have a session preference, we'll return the first one that is valid.
        if (!matchingAccountPreferenceSession && !this.authenticationExtensionsService.getAccountPreference(extensionId, providerId)) {
            const validSession = sessions.find(session => this.authenticationAccessService.isAccessAllowed(providerId, session.account.label, extensionId));
            if (validSession) {
                return validSession;
            }
        }
        // passive flows (silent or default)
        if (!options.silent) {
            // If there is a potential session, but the extension doesn't have access to it, use the "grant access" flow,
            // otherwise request a new one.
            sessions.length
                ? this.authenticationExtensionsService.requestSessionAccess(providerId, extensionId, extensionName, scopes, sessions)
                : await this.authenticationExtensionsService.requestNewSession(providerId, scopes, extensionId, extensionName);
        }
        return undefined;
    }
    async $getSession(providerId, scopes, extensionId, extensionName, options) {
        this.sendClientIdUsageTelemetry(extensionId, providerId, scopes);
        const session = await this.doGetSession(providerId, scopes, extensionId, extensionName, options);
        if (session) {
            this.sendProviderUsageTelemetry(extensionId, providerId);
            this.authenticationUsageService.addAccountUsage(providerId, session.account.label, scopes, extensionId, extensionName);
        }
        return session;
    }
    async $getAccounts(providerId) {
        const accounts = await this.authenticationService.getAccounts(providerId);
        return accounts;
    }
    sendClientIdUsageTelemetry(extensionId, providerId, scopes) {
        const containsVSCodeClientIdScope = scopes.some(scope => scope.startsWith('VSCODE_CLIENT_ID:'));
        const key = `${extensionId}|${providerId}|${containsVSCodeClientIdScope}`;
        if (this._sentClientIdUsageEvents.has(key)) {
            return;
        }
        this._sentClientIdUsageEvents.add(key);
        if (containsVSCodeClientIdScope) {
            this.telemetryService.publicLog2('authentication.clientIdUsage', { extensionId });
        }
    }
    sendProviderUsageTelemetry(extensionId, providerId) {
        const key = `${extensionId}|${providerId}`;
        if (this._sentProviderUsageEvents.has(key)) {
            return;
        }
        this._sentProviderUsageEvents.add(key);
        this.telemetryService.publicLog2('authentication.providerUsage', { providerId, extensionId });
    }
    //#region Account Preferences
    // TODO@TylerLeonhardt: Update this after a few iterations to no longer fallback to the session preference
    _getAccountPreference(extensionId, providerId, scopes, sessions) {
        if (sessions.length === 0) {
            return undefined;
        }
        const accountNamePreference = this.authenticationExtensionsService.getAccountPreference(extensionId, providerId);
        if (accountNamePreference) {
            const session = sessions.find(session => session.account.label === accountNamePreference);
            return session;
        }
        const sessionIdPreference = this.authenticationExtensionsService.getSessionPreference(providerId, extensionId, scopes);
        if (sessionIdPreference) {
            const session = sessions.find(session => session.id === sessionIdPreference);
            if (session) {
                // Migrate the session preference to the account preference
                this.authenticationExtensionsService.updateAccountPreference(extensionId, providerId, session.account);
                return session;
            }
        }
        return undefined;
    }
    _updateAccountPreference(extensionId, providerId, session) {
        this.authenticationExtensionsService.updateAccountPreference(extensionId, providerId, session.account);
        this.authenticationExtensionsService.updateSessionPreference(providerId, extensionId, session);
    }
    _removeAccountPreference(extensionId, providerId, scopes) {
        this.authenticationExtensionsService.removeAccountPreference(extensionId, providerId);
        this.authenticationExtensionsService.removeSessionPreference(providerId, extensionId, scopes);
    }
    //#endregion
    async $showDeviceCodeModal(userCode, verificationUri) {
        const { result } = await this.dialogService.prompt({
            type: Severity.Info,
            message: nls.localize('deviceCodeTitle', "Device Code Authentication"),
            detail: nls.localize('deviceCodeDetail', "Your code: {0}\n\nTo complete authentication, navigate to {1} and enter the code above.", userCode, verificationUri),
            buttons: [
                {
                    label: nls.localize('copyAndContinue', "Copy & Continue"),
                    run: () => true
                }
            ],
            cancelButton: true
        });
        if (result) {
            // Open verification URI
            try {
                await this.clipboardService.writeText(userCode);
                return await this.openerService.open(URI.parse(verificationUri));
            }
            catch (error) {
                this.notificationService.error(nls.localize('failedToOpenUri', "Failed to open {0}", verificationUri));
            }
        }
        return false;
    }
    async $promptForClientRegistration(authorizationServerUrl) {
        // Show modal dialog first to explain the situation and get user consent
        const result = await this.dialogService.prompt({
            type: Severity.Info,
            message: nls.localize('dcrNotSupported', "Dynamic Client Registration not supported"),
            detail: nls.localize('dcrNotSupportedDetail', "The authorization server '{0}' does not support automatic client registration. Do you want to proceed by manually providing a client registration (client ID)?\n\nNote: When registering your OAuth application, make sure to include these redirect URIs:\nhttp://127.0.0.1:33418\nhttps://vscode.dev/redirect", authorizationServerUrl),
            buttons: [
                {
                    label: nls.localize('provideClientDetails', "Proceed"),
                    run: () => true
                }
            ],
            cancelButton: {
                label: nls.localize('cancel', "Cancel"),
                run: () => false
            }
        });
        if (!result) {
            return undefined;
        }
        const sharedTitle = nls.localize('addClientRegistrationDetails', "Add Client Registration Details");
        const clientId = await this.quickInputService.input({
            title: sharedTitle,
            prompt: nls.localize('clientIdPrompt', "Enter an existing client ID that has been registered with the following redirect URIs: http://127.0.0.1:33418, https://vscode.dev/redirect"),
            placeHolder: nls.localize('clientIdPlaceholder', "OAuth client ID (azye39d...)"),
            ignoreFocusLost: true,
            validateInput: async (value) => {
                if (!value || value.trim().length === 0) {
                    return nls.localize('clientIdRequired', "Client ID is required");
                }
                return undefined;
            }
        });
        if (!clientId || clientId.trim().length === 0) {
            return undefined;
        }
        const clientSecret = await this.quickInputService.input({
            title: sharedTitle,
            prompt: nls.localize('clientSecretPrompt', "(optional) Enter an existing client secret associated with the client id '{0}' or leave this field blank", clientId),
            placeHolder: nls.localize('clientSecretPlaceholder', "OAuth client secret (wer32o50f...) or leave it blank"),
            password: true,
            ignoreFocusLost: true
        });
        return {
            clientId: clientId.trim(),
            clientSecret: clientSecret?.trim() || undefined
        };
    }
};
MainThreadAuthentication = __decorate([
    extHostNamedCustomer(MainContext.MainThreadAuthentication),
    __param(1, IAuthenticationService),
    __param(2, IAuthenticationExtensionsService),
    __param(3, IAuthenticationAccessService),
    __param(4, IAuthenticationUsageService),
    __param(5, IDialogService),
    __param(6, INotificationService),
    __param(7, IExtensionService),
    __param(8, ITelemetryService),
    __param(9, IOpenerService),
    __param(10, ILogService),
    __param(11, IURLService),
    __param(12, IDynamicAuthenticationProviderStorageService),
    __param(13, IClipboardService),
    __param(14, IQuickInputService)
], MainThreadAuthentication);
export { MainThreadAuthentication };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEF1dGhlbnRpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZEF1dGhlbnRpY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFxRixzQkFBc0IsRUFBRSxnQ0FBZ0MsRUFBdUUsTUFBTSx3REFBd0QsQ0FBQztBQUMxUixPQUFPLEVBQThCLGNBQWMsRUFBRSxXQUFXLEVBQWlDLE1BQU0sK0JBQStCLENBQUM7QUFDdkksT0FBTyxFQUFFLGNBQWMsRUFBaUIsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RixPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM3RixPQUFPLEVBQWtCLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ2xILE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQzFILE9BQU8sRUFBRSxH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