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
import * as nls from '../../../nls.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { MainContext } from './extHost.protocol.js';
import { Disposable, ProgressLocation } from './extHostTypes.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { INTERNAL_AUTH_PROVIDER_PREFIX } from '../../services/authentication/common/authentication.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { URI } from '../../../base/common/uri.js';
import { fetchDynamicRegistration, getClaimsFromJWT, isAuthorizationErrorResponse, isAuthorizationTokenResponse } from '../../../base/common/oauth.js';
import { IExtHostWindow } from './extHostWindow.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { ILoggerService, ILogService } from '../../../platform/log/common/log.js';
import { autorun, derivedOpts, observableValue } from '../../../base/common/observable.js';
import { stringHash } from '../../../base/common/hash.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { IExtHostUrlsService } from './extHostUrls.js';
import { encodeBase64, VSBuffer } from '../../../base/common/buffer.js';
import { equals as arraysEqual } from '../../../base/common/arrays.js';
import { IExtHostProgress } from './extHostProgress.js';
import { CancellationError, isCancellationError } from '../../../base/common/errors.js';
import { raceCancellationError, SequencerByKey } from '../../../base/common/async.js';
export const IExtHostAuthentication = createDecorator('IExtHostAuthentication');
let ExtHostAuthentication = class ExtHostAuthentication {
    constructor(extHostRpc, _initData, _extHostWindow, _extHostUrls, _extHostProgress, _extHostLoggerService, _logService) {
        this._initData = _initData;
        this._extHostWindow = _extHostWindow;
        this._extHostUrls = _extHostUrls;
        this._extHostProgress = _extHostProgress;
        this._extHostLoggerService = _extHostLoggerService;
        this._logService = _logService;
        this._dynamicAuthProviderCtor = DynamicAuthProvider;
        this._authenticationProviders = new Map();
        this._providerOperations = new SequencerByKey();
        this._onDidChangeSessions = new Emitter();
        this._getSessionTaskSingler = new TaskSingler();
        this._onDidDynamicAuthProviderTokensChange = new Emitter();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadAuthentication);
    }
    /**
     * This sets up an event that will fire when the auth sessions change with a built-in filter for the extensionId
     * if a session change only affects a specific extension.
     * @param extensionId The extension that is interested in the event.
     * @returns An event with a built-in filter for the extensionId
     */
    getExtensionScopedSessionsEvent(extensionId) {
        const normalizedExtensionId = extensionId.toLowerCase();
        return Event.chain(this._onDidChangeSessions.event, ($) => $
            .filter(e => !e.extensionIdFilter || e.extensionIdFilter.includes(normalizedExtensionId))
            .map(e => ({ provider: e.provider })));
    }
    async getSession(requestingExtension, providerId, scopes, options = {}) {
        const extensionId = ExtensionIdentifier.toKey(requestingExtension.identifier);
        const sortedScopes = [...scopes].sort().join(' ');
        const keys = Object.keys(options);
        const optionsStr = keys.sort().map(key => `${key}:${!!options[key]}`).join(', ');
        return await this._getSessionTaskSingler.getOrCreate(`${extensionId} ${providerId} ${sortedScopes} ${optionsStr}`, async () => {
            await this._proxy.$ensureProvider(providerId);
            const extensionName = requestingExtension.displayName || requestingExtension.name;
            return this._proxy.$getSession(providerId, scopes, extensionId, extensionName, options);
        });
    }
    async getAccounts(providerId) {
        await this._proxy.$ensureProvider(providerId);
        return await this._proxy.$getAccounts(providerId);
    }
    registerAuthenticationProvider(id, label, provider, options) {
        // register
        void this._providerOperations.queue(id, async () => {
            // This use to be synchronous, but that wasn't an accurate representation because the main thread
            // may have unregistered the provider in the meantime. I don't see how this could really be done
            // synchronously, so we just say first one wins.
            if (this._authenticationProviders.get(id)) {
                this._logService.error(`An authentication provider with id '${id}' is already registered. The existing provider will not be replaced.`);
                return;
            }
            const listener = provider.onDidChangeSessions(e => this._proxy.$sendDidChangeSessions(id, e));
            this._authenticationProviders.set(id, { label, provider, disposable: listener, options: options ?? { supportsMultipleAccounts: false } });
            await this._proxy.$registerAuthenticationProvider(id, label, options?.supportsMultipleAccounts ?? false, options?.supportedAuthorizationServers);
        });
        // unregister
        return new Disposable(() => {
            void this._providerOperations.queue(id, async () => {
                const providerData = this._authenticationProviders.get(id);
                if (providerData) {
                    providerData.disposable?.dispose();
                    this._authenticationProviders.delete(id);
                    await this._proxy.$unregisterAuthenticationProvider(id);
                }
            });
        });
    }
    $createSession(providerId, scopes, options) {
        return this._providerOperations.queue(providerId, async () => {
            const providerData = this._authenticationProviders.get(providerId);
            if (providerData) {
                options.authorizationServer = URI.revive(options.authorizationServer);
                return await providerData.provider.createSession(scopes, options);
            }
            throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
        });
    }
    $removeSession(providerId, sessionId) {
        return this._providerOperations.queue(providerId, async () => {
            const providerData = this._authenticationProviders.get(providerId);
            if (providerData) {
                return await providerData.provider.removeSession(sessionId);
            }
            throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
        });
    }
    $getSessions(providerId, scopes, options) {
        return this._providerOperations.queue(providerId, async () => {
            const providerData = this._authenticationProviders.get(providerId);
            if (providerData) {
                options.authorizationServer = URI.revive(options.authorizationServer);
                return await providerData.provider.getSessions(scopes, options);
            }
            throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
        });
    }
    $onDidChangeAuthenticationSessions(id, label, extensionIdFilter) {
        // Don't fire events for the internal auth providers
        if (!id.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX)) {
            this._onDidChangeSessions.fire({ provider: { id, label }, extensionIdFilter });
        }
        return Promise.resolve();
    }
    $onDidUnregisterAuthenticationProvider(id) {
        return this._providerOperations.queue(id, async () => {
            const providerData = this._authenticationProviders.get(id);
            if (providerData) {
                providerData.disposable?.dispose();
                this._authenticationProviders.delete(id);
            }
        });
    }
    async $registerDynamicAuthProvider(authorizationServerComponents, serverMetadata, resourceMetadata, clientId, clientSecret, initialTokens) {
        if (!clientId) {
            const authorizationServer = URI.revive(authorizationServerComponents);
            if (serverMetadata.registration_endpoint) {
                try {
                    const registration = await fetchDynamicRegistration(serverMetadata, this._initData.environment.appName, resourceMetadata?.scopes_supported);
                    clientId = registration.client_id;
                    clientSecret = registration.client_secret;
                }
                catch (err) {
                    this._logService.warn(`Dynamic registration failed for ${authorizationServer.toString()}: ${err.message}. Prompting user for client ID and client secret...`);
                }
            }
            // Still no client id so dynamic client registration was either not supported or failed
            if (!clientId) {
                this._logService.info(`Prompting user for client registration details for ${authorizationServer.toString()}`);
                const clientDetails = await this._proxy.$promptForClientRegistration(authorizationServer.toString());
                if (!clientDetails) {
                    throw new Error('User did not provide client details');
                }
                clientId = clientDetails.clientId;
                clientSecret = clientDetails.clientSecret;
                this._logService.info(`User provided client registration for ${authorizationServer.toString()}`);
                if (clientSecret) {
                    this._logService.trace(`User provided client secret for ${authorizationServer.toString()}`);
                }
                else {
                    this._logService.trace(`User did not provide client secret for ${authorizationServer.toString()}`);
                }
            }
        }
        const provider = new this._dynamicAuthProviderCtor(this._extHostWindow, this._extHostUrls, this._initData, this._extHostProgress, this._extHostLoggerService, this._proxy, URI.revive(authorizationServerComponents), serverMetadata, resourceMetadata, clientId, clientSecret, this._onDidDynamicAuthProviderTokensChange, initialTokens || []);
        // Use the sequencer to ensure dynamic provider registration is serialized
        await this._providerOperations.queue(provider.id, async () => {
            this._authenticationProviders.set(provider.id, {
                label: provider.label,
                provider,
                disposable: Disposable.from(provider, provider.onDidChangeSessions(e => this._proxy.$sendDidChangeSessions(provider.id, e)), provider.onDidChangeClientId(() => this._proxy.$sendDidChangeDynamicProviderInfo({
                    providerId: provider.id,
                    clientId: provider.clientId,
                    clientSecret: provider.clientSecret
                }))),
                options: { supportsMultipleAccounts: false }
            });
            await this._proxy.$registerDynamicAuthenticationProvider(provider.id, provider.label, provider.authorizationServer, provider.clientId, provider.clientSecret);
        });
        return provider.id;
    }
    async $onDidChangeDynamicAuthProviderTokens(authProviderId, clientId, tokens) {
        this._onDidDynamicAuthProviderTokensChange.fire({ authProviderId, clientId, tokens });
    }
};
ExtHostAuthentication = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostWindow),
    __param(3, IExtHostUrlsService),
    __param(4, IExtHostProgress),
    __param(5, ILoggerService),
    __param(6, ILogService)
], ExtHostAuthentication);
export { ExtHostAuthentication };
class TaskSingler {
    constructor() {
        this._inFlightPromises = new Map();
    }
    getOrCreate(key, promiseFactory) {
        const inFlight = this._inFlightPromises.get(key);
        if (inFlight) {
            return inFlight;
        }
        const promise = promiseFactory().finally(() => this._inFlightPromises.delete(key));
        this._inFlightPromises.set(key, promise);
        return promise;
    }
}
let DynamicAuthProvider = class DynamicAuthProvider {
    constructor(_extHostWindow, _extHostUrls, _initData, _extHostProgress, loggerService, _proxy, authorizationServer, _serverMetadata, _resourceMetadata, _clientId, _clientSecret, onDidDynamicAuthProviderTokensChange, initialTokens) {
        this._extHostWindow = _extHostWindow;
        this._extHostUrls = _extHostUrls;
        this._initData = _initData;
        this._extHostProgress = _extHostProgress;
        this._proxy = _proxy;
        this.authorizationServer = authorizationServer;
        this._serverMetadata = _serverMetadata;
        this._resourceMetadata = _resourceMetadata;
        this._clientId = _clientId;
        this._clientSecret = _clientSecret;
        this._onDidChangeSessions = new Emitter();
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this._onDidChangeClientId = new Emitter();
        this.onDidChangeClientId = this._onDidChangeClientId.event;
        const stringifiedServer = authorizationServer.toString(true);
        // Auth Provider Id is a combination of the authorization server and the resource, if provided.
        this.id = _resourceMetadata?.resource
            ? stringifiedServer + ' ' + _resourceMetadata?.resource
            : stringifiedServer;
        // Auth Provider label is just the resource name if provided, otherwise the authority of the authorization server.
        this.label = _resourceMetadata?.resource_name ?? this.authorizationServer.authority;
        this._logger = loggerService.createLogger(this.id, { name: this.label });
        this._disposable = new DisposableStore();
        this._disposable.add(this._onDidChangeSessions);
        const scopedEvent = Event.chain(onDidDynamicAuthProviderTokensChange.event, $ => $
            .filter(e => e.authProviderId === this.id && e.clientId === _clientId)
            .map(e => e.tokens));
        this._tokenStore = this._disposable.add(new TokenStore({
            onDidChange: scopedEvent,
            set: (tokens) => _proxy.$setSessionsForDynamicAuthProvider(this.id, this.clientId, tokens),
        }, initialTokens, this._logger));
        this._disposable.add(this._tokenStore.onDidChangeSessions(e => this._onDidChangeSessions.fire(e)));
        // Will be extended later to support other flows
        this._createFlows = [];
        if (_serverMetadata.authorization_endpoint) {
            this._createFlows.push({
                label: nls.localize('url handler', "URL Handler"),
                handler: (scopes, progress, token) => this._createWithUrlHandler(scopes, progress, token)
            });
        }
    }
    get clientId() {
        return this._clientId;
    }
    get clientSecret() {
        return this._clientSecret;
    }
    async getSessions(scopes, _options) {
        this._logger.info(`Getting sessions for scopes: ${scopes?.join(' ') ?? 'all'}`);
        if (!scopes) {
            return this._tokenStore.sessions;
        }
        // The oauth spec says tthat order doesn't matter so we sort the scopes for easy comparison
        // https://datatracker.ietf.org/doc/html/rfc6749#section-3.3
        // TODO@TylerLeonhardt: Do this for all scope handling in the auth APIs
        const sortedScopes = [...scopes].sort();
        const scopeStr = scopes.join(' ');
        let sessions = this._tokenStore.sessions.filter(session => arraysEqual([...session.scopes].sort(), sortedScopes));
        this._logger.info(`Found ${sessions.length} sessions for scopes: ${scopeStr}`);
        if (sessions.length) {
            const newTokens = [];
            const removedTokens = [];
            const tokenMap = new Map(this._tokenStore.tokens.map(token => [token.access_token, token]));
            for (const session of sessions) {
                const token = tokenMap.get(session.accessToken);
                if (token && token.expires_in) {
                    const now = Date.now();
                    const expiresInMS = token.expires_in * 1000;
                    // Check if the token is about to expire in 5 minutes or if it is expired
                    if (now > token.created_at + expiresInMS - (5 * 60 * 1000)) {
                        this._logger.info(`Token for session ${session.id} is about to expire, refreshing...`);
                        removedTokens.push(token);
                        if (!token.refresh_token) {
                            // No refresh token available, cannot refresh
                            this._logger.warn(`No refresh token available for scopes ${session.scopes.join(' ')}. Throwing away token.`);
                            continue;
                        }
                        try {
                            const newToken = await this.exchangeRefreshTokenForToken(token.refresh_token);
                            // TODO@TylerLeonhardt: When the core scope handling doesn't care about order, this check should be
                            // updated to not care about order
                            if (newToken.scope !== scopeStr) {
                                this._logger.warn(`Token scopes '${newToken.scope}' do not match requested scopes '${scopeStr}'. Overwriting token with what was requested...`);
                                newToken.scope = scopeStr;
                            }
                            this._logger.info(`Successfully created a new token for scopes ${session.scopes.join(' ')}.`);
                            newTokens.push(newToken);
                        }
                        catch (err) {
                            this._logger.error(`Failed to refresh token: ${err}`);
                        }
                    }
                }
            }
            if (newTokens.length || removedTokens.length) {
                this._tokenStore.update({ added: newTokens, removed: removedTokens });
                // Since we updated the tokens, we need to re-filter the sessions
                // to get the latest state
                sessions = this._tokenStore.sessions.filter(session => arraysEqual([...session.scopes].sort(), sortedScopes));
            }
            this._logger.info(`Found ${sessions.length} sessions for scopes: ${scopeStr}`);
            return sessions;
        }
        return [];
    }
    async createSession(scopes, _options) {
        this._logger.info(`Creating session for scopes: ${scopes.join(' ')}`);
        let token;
        for (let i = 0; i < this._createFlows.length; i++) {
            const { handler } = this._createFlows[i];
            try {
                token = await this._extHostProgress.withProgressFromSource({ label: this.label, id: this.id }, {
                    location: ProgressLocation.Notification,
                    title: nls.localize('authenticatingTo', "Authenticating to '{0}'", this.label),
                    cancellable: true
                }, (progress, token) => handler(scopes, progress, token));
                if (token) {
                    break;
                }
            }
            catch (err) {
                const nextMode = this._createFlows[i + 1]?.label;
                if (!nextMode) {
                    break; // No more flows to try
                }
                const message = isCancellationError(err)
                    ? nls.localize('userCanceledContinue', "Having trouble authenticating to '{0}'? Would you like to try a different way? ({1})", this.label, nextMode)
                    : nls.localize('continueWith', "You have not yet finished authenticating to '{0}'. Would you like to try a different way? ({1})", this.label, nextMode);
                const result = await this._proxy.$showContinueNotification(message);
                if (!result) {
                    throw new CancellationError();
                }
                this._logger.error(`Failed to create token via flow '${nextMode}': ${err}`);
            }
        }
        if (!token) {
            throw new Error('Failed to create authentication token');
        }
        if (token.scope !== scopes.join(' ')) {
            this._logger.warn(`Token scopes '${token.scope}' do not match requested scopes '${scopes.join(' ')}'. Overwriting token with what was requested...`);
            token.scope = scopes.join(' ');
        }
        // Store session for later retrieval
        this._tokenStore.update({ added: [{ ...token, created_at: Date.now() }], removed: [] });
        const session = this._tokenStore.sessions.find(t => t.accessToken === token.access_token);
        this._logger.info(`Created session for scopes: ${token.scope}`);
        return session;
    }
    async removeSession(sessionId) {
        this._logger.info(`Removing session with id: ${sessionId}`);
        const session = this._tokenStore.sessions.find(session => session.id === sessionId);
        if (!session) {
            this._logger.error(`Session with id ${sessionId} not found`);
            return;
        }
        const token = this._tokenStore.tokens.find(token => token.access_token === session.accessToken);
        if (!token) {
            this._logger.error(`Failed to retrieve token for removed session: ${session.id}`);
            return;
        }
        this._tokenStore.update({ added: [], removed: [token] });
        this._logger.info(`Removed token for session: ${session.id} with scopes: ${session.scopes.join(' ')}`);
    }
    dispose() {
        this._disposable.dispose();
    }
    async _createWithUrlHandler(scopes, progress, token) {
        if (!this._serverMetadata.authorization_endpoint) {
            throw new Error('Authorization Endpoint required');
        }
        if (!this._serverMetadata.token_endpoint) {
            throw new Error('Token endpoint not available in server metadata');
        }
        // Generate PKCE code verifier (random string) and code challenge (SHA-256 hash of verifier)
        const codeVerifier = this.generateRandomString(64);
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        // Generate a random state value to prevent CSRF
        const nonce = this.generateRandomString(32);
        const callbackUri = URI.parse(`${this._initData.environment.appUriScheme}://dynamicauthprovider/${this.authorizationServer.authority}/authorize?nonce=${nonce}`);
        let state;
        try {
            state = await this._extHostUrls.createAppUri(callbackUri);
        }
        catch (error) {
            throw new Error(`Failed to create external URI: ${error}`);
        }
        // Prepare the authorization request URL
        const authorizationUrl = new URL(this._serverMetadata.authorization_endpoint);
        authorizationUrl.searchParams.append('client_id', this._clientId);
        authorizationUrl.searchParams.append('response_type', 'code');
        authorizationUrl.searchParams.append('state', state.toString());
        authorizationUrl.searchParams.append('code_challenge', codeChallenge);
        authorizationUrl.searchParams.append('code_challenge_method', 'S256');
        const scopeString = scopes.join(' ');
        if (scopeString) {
            // If non-empty scopes are provided, include scope parameter in the request
            authorizationUrl.searchParams.append('scope', scopeString);
        }
        if (this._resourceMetadata?.resource) {
            // If a resource is specified, include it in the request
            authorizationUrl.searchParams.append('resource', this._resourceMetadata.resource);
        }
        // Use a redirect URI that matches what was registered during dynamic registration
        const redirectUri = 'https://vscode.dev/redirect';
        authorizationUrl.searchParams.append('redirect_uri', redirectUri);
        const promise = this.waitForAuthorizationCode(callbackUri);
        // Open the browser for user authorization
        this._logger.info(`Opening authorization URL for scopes: ${scopeString}`);
        this._logger.trace(`Authorization URL: ${authorizationUrl.toString()}`);
        const opened = await this._extHostWindow.openUri(authorizationUrl.toString(), {});
        if (!opened) {
            throw new CancellationError();
        }
        progress.report({
            message: nls.localize('completeAuth', "Complete the authentication in the browser window that has opened."),
        });
        // Wait for the authorization code via a redirect
        let code;
        try {
            const response = await raceCancellationError(promise, token);
            code = response.code;
        }
        catch (err) {
            if (isCancellationError(err)) {
                this._logger.info('Authorization code request was cancelled by the user.');
                throw err;
            }
            this._logger.error(`Failed to receive authorization code: ${err}`);
            throw new Error(`Failed to receive authorization code: ${err}`);
        }
        this._logger.info(`Authorization code received for scopes: ${scopeString}`);
        // Exchange the authorization code for tokens
        const tokenResponse = await this.exchangeCodeForToken(code, codeVerifier, redirectUri);
        return tokenResponse;
    }
    generateRandomString(length) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .substring(0, length);
    }
    async generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        // Base64url encode the digest
        return encodeBase64(VSBuffer.wrap(new Uint8Array(digest)), false, false)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
    async waitForAuthorizationCode(expectedState) {
        const result = await this._proxy.$waitForUriHandler(expectedState);
        // Extract the code parameter directly from the query string. NOTE, URLSearchParams does not work here because
        // it will decode the query string and we need to keep it encoded.
        const codeMatch = /[?&]code=([^&]+)/.exec(result.query || '');
        if (!codeMatch || codeMatch.length < 2) {
            // No code parameter found in the query string
            throw new Error('Authentication failed: No authorization code received');
        }
        return { code: codeMatch[1] };
    }
    async exchangeCodeForToken(code, codeVerifier, redirectUri) {
        if (!this._serverMetadata.token_endpoint) {
            throw new Error('Token endpoint not available in server metadata');
        }
        const tokenRequest = new URLSearchParams();
        tokenRequest.append('client_id', this._clientId);
        tokenRequest.append('grant_type', 'authorization_code');
        tokenRequest.append('code', code);
        tokenRequest.append('redirect_uri', redirectUri);
        tokenRequest.append('code_verifier', codeVerifier);
        // Add client secret if available
        if (this._clientSecret) {
            tokenRequest.append('client_secret', this._clientSecret);
        }
        const response = await fetch(this._serverMetadata.token_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: tokenRequest.toString()
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${text}`);
        }
        const result = await response.json();
        if (isAuthorizationTokenResponse(result)) {
            return result;
        }
        else if (isAuthorizationErrorResponse(result) && result.error === "invalid_client" /* AuthorizationErrorType.InvalidClient */) {
            this._logger.warn(`Client ID (${this._clientId}) was invalid, generated a new one.`);
            await this._generateNewClientId();
            throw new Error(`Client ID was invalid, generated a new one. Please try again.`);
        }
        throw new Error(`Invalid authorization token response: ${JSON.stringify(result)}`);
    }
    async exchangeRefreshTokenForToken(refreshToken) {
        if (!this._serverMetadata.token_endpoint) {
            throw new Error('Token endpoint not available in server metadata');
        }
        const tokenRequest = new URLSearchParams();
        tokenRequest.append('client_id', this._clientId);
        tokenRequest.append('grant_type', 'refresh_token');
        tokenRequest.append('refresh_token', refreshToken);
        // Add client secret if available
        if (this._clientSecret) {
            tokenRequest.append('client_secret', this._clientSecret);
        }
        const response = await fetch(this._serverMetadata.token_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: tokenRequest.toString()
        });
        const result = await response.json();
        if (isAuthorizationTokenResponse(result)) {
            return {
                ...result,
                created_at: Date.now(),
            };
        }
        else if (isAuthorizationErrorResponse(result) && result.error === "invalid_client" /* AuthorizationErrorType.InvalidClient */) {
            this._logger.warn(`Client ID (${this._clientId}) was invalid, generated a new one.`);
            await this._generateNewClientId();
            throw new Error(`Client ID was invalid, generated a new one. Please try again.`);
        }
        throw new Error(`Invalid authorization token response: ${JSON.stringify(result)}`);
    }
    async _generateNewClientId() {
        try {
            const registration = await fetchDynamicRegistration(this._serverMetadata, this._initData.environment.appName, this._resourceMetadata?.scopes_supported);
            this._clientId = registration.client_id;
            this._clientSecret = registration.client_secret;
            this._onDidChangeClientId.fire();
        }
        catch (err) {
            // When DCR fails, try to prompt the user for a client ID and client secret
            this._logger.info(`Dynamic registration failed for ${this.authorizationServer.toString()}: ${err}. Prompting user for client ID and client secret.`);
            try {
                const clientDetails = await this._proxy.$promptForClientRegistration(this.authorizationServer.toString());
                if (!clientDetails) {
                    throw new Error('User did not provide client details');
                }
                this._clientId = clientDetails.clientId;
                this._clientSecret = clientDetails.clientSecret;
                this._logger.info(`User provided client ID for ${this.authorizationServer.toString()}`);
                if (clientDetails.clientSecret) {
                    this._logger.info(`User provided client secret for ${this.authorizationServer.toString()}`);
                }
                else {
                    this._logger.info(`User did not provide client secret for ${this.authorizationServer.toString()} (optional)`);
                }
                this._onDidChangeClientId.fire();
            }
            catch (promptErr) {
                this._logger.error(`Failed to fetch new client ID and user did not provide one: ${err}`);
                throw new Error(`Failed to fetch new client ID and user did not provide one: ${err}`);
            }
        }
    }
};
DynamicAuthProvider = __decorate([
    __param(0, IExtHostWindow),
    __param(1, IExtHostUrlsService),
    __param(2, IExtHostInitDataService),
    __param(3, IExtHostProgress),
    __param(4, ILoggerService)
], DynamicAuthProvider);
export { DynamicAuthProvider };
class TokenStore {
    constructor(_persistence, initialTokens, _logger) {
        this._persistence = _persistence;
        this._logger = _logger;
        this._onDidChangeSessions = new Emitter();
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this._disposable = new DisposableStore();
        this._tokensObservable = observableValue('tokens', initialTokens);
        this._sessionsObservable = derivedOpts({ equalsFn: (a, b) => arraysEqual(a, b, (a, b) => a.accessToken === b.accessToken) }, (reader) => this._tokensObservable.read(reader).map(t => this._getSessionFromToken(t)));
        this._disposable.add(this._registerChangeEventAutorun());
        this._disposable.add(this._persistence.onDidChange((tokens) => this._tokensObservable.set(tokens, undefined)));
    }
    get tokens() {
        return this._tokensObservable.get();
    }
    get sessions() {
        return this._sessionsObservable.get();
    }
    dispose() {
        this._disposable.dispose();
    }
    update({ added, removed }) {
        this._logger.trace(`Updating tokens: added ${added.length}, removed ${removed.length}`);
        const currentTokens = [...this._tokensObservable.get()];
        for (const token of removed) {
            const index = currentTokens.findIndex(t => t.access_token === token.access_token);
            if (index !== -1) {
                currentTokens.splice(index, 1);
            }
        }
        for (const token of added) {
            const index = currentTokens.findIndex(t => t.access_token === token.access_token);
            if (index === -1) {
                currentTokens.push(token);
            }
            else {
                currentTokens[index] = token;
            }
        }
        if (added.length || removed.length) {
            this._tokensObservable.set(currentTokens, undefined);
            void this._persistence.set(currentTokens);
        }
        this._logger.trace(`Tokens updated: ${currentTokens.length} tokens stored.`);
    }
    _registerChangeEventAutorun() {
        let previousSessions = [];
        return autorun((reader) => {
            this._logger.trace('Checking for session changes...');
            const currentSessions = this._sessionsObservable.read(reader);
            if (previousSessions === currentSessions) {
                this._logger.trace('No session changes detected.');
                return;
            }
            if (!currentSessions || currentSessions.length === 0) {
                // If currentSessions is undefined, all previous sessions are considered removed
                this._logger.trace('All sessions removed.');
                if (previousSessions.length > 0) {
                    this._onDidChangeSessions.fire({
                        added: [],
                        removed: previousSessions,
                        changed: []
                    });
                    previousSessions = [];
                }
                return;
            }
            const added = [];
            const removed = [];
            // Find added sessions
            for (const current of currentSessions) {
                const exists = previousSessions.some(prev => prev.accessToken === current.accessToken);
                if (!exists) {
                    added.push(current);
                }
            }
            // Find removed sessions
            for (const prev of previousSessions) {
                const exists = currentSessions.some(current => current.accessToken === prev.accessToken);
                if (!exists) {
                    removed.push(prev);
                }
            }
            // Fire the event if there are any changes
            if (added.length > 0 || removed.length > 0) {
                this._logger.trace(`Sessions changed: added ${added.length}, removed ${removed.length}`);
                this._onDidChangeSessions.fire({ added, removed, changed: [] });
            }
            // Update previous sessions reference
            previousSessions = currentSessions;
        });
    }
    _getSessionFromToken(token) {
        let claims;
        if (token.id_token) {
            try {
                claims = getClaimsFromJWT(token.id_token);
            }
            catch (e) {
                // log
            }
        }
        if (!claims) {
            try {
                claims = getClaimsFromJWT(token.access_token);
            }
            catch (e) {
                // log
            }
        }
        const scopes = token.scope
            ? token.scope.split(' ')
            : claims?.scope
                ? claims.scope.split(' ')
                : [];
        return {
            id: stringHash(token.access_token, 0).toString(),
            accessToken: token.access_token,
            account: {
                id: claims?.sub || 'unknown',
                // TODO: Don't say MCP...
                label: claims?.preferred_username || claims?.name || claims?.email || 'MCP',
            },
            scopes: scopes,
            idToken: token.id_token
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEF1dGhlbnRpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0QXV0aGVudGljYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQTZELE1BQU0sdUJBQXVCLENBQUM7QUFDL0csT0FBTyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2pFLE9BQU8sRUFBeUIsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQTBCLHdCQUF3QixFQUFFLGdCQUFnQixFQUErSCw0QkFBNEIsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzVTLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNwRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN0RSxPQUFPLEVBQVcsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FB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