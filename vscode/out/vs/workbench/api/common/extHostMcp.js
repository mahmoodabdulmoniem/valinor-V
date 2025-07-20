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
import { DeferredPromise, raceCancellationError, Sequencer, timeout } from '../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { SSEParser } from '../../../base/common/sseParser.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { canLog, ILogService, LogLevel } from '../../../platform/log/common/log.js';
import { extensionPrefixedIdentifier, McpServerLaunch } from '../../contrib/mcp/common/mcpTypes.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import * as Convert from './extHostTypeConverters.js';
import { AUTH_SERVER_METADATA_DISCOVERY_PATH, OPENID_CONNECT_DISCOVERY_PATH, getDefaultMetadataForUrl, getResourceServerBaseUrlFromDiscoveryUrl, isAuthorizationProtectedResourceMetadata, isAuthorizationServerMetadata, parseWWWAuthenticateHeader } from '../../../base/common/oauth.js';
import { URI } from '../../../base/common/uri.js';
import { MCP } from '../../contrib/mcp/common/modelContextProtocol.js';
import { CancellationError } from '../../../base/common/errors.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
export const IExtHostMpcService = createDecorator('IExtHostMpcService');
let ExtHostMcpService = class ExtHostMcpService extends Disposable {
    constructor(extHostRpc, _logService, _extHostInitData) {
        super();
        this._logService = _logService;
        this._extHostInitData = _extHostInitData;
        this._initialProviderPromises = new Set();
        this._sseEventSources = this._register(new DisposableMap());
        this._unresolvedMcpServers = new Map();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadMcp);
    }
    $startMcp(id, launch) {
        this._startMcp(id, McpServerLaunch.fromSerialized(launch));
    }
    _startMcp(id, launch) {
        if (launch.type === 2 /* McpServerTransportType.HTTP */) {
            this._sseEventSources.set(id, new McpHTTPHandle(id, launch, this._proxy, this._logService));
            return;
        }
        throw new Error('not implemented');
    }
    $stopMcp(id) {
        if (this._sseEventSources.has(id)) {
            this._sseEventSources.deleteAndDispose(id);
            this._proxy.$onDidChangeState(id, { state: 0 /* McpConnectionState.Kind.Stopped */ });
        }
    }
    $sendMessage(id, message) {
        this._sseEventSources.get(id)?.send(message);
    }
    async $waitForInitialCollectionProviders() {
        await Promise.all(this._initialProviderPromises);
    }
    async $resolveMcpLaunch(collectionId, label) {
        const rec = this._unresolvedMcpServers.get(collectionId);
        if (!rec) {
            return;
        }
        const server = rec.servers.find(s => s.label === label);
        if (!server) {
            return;
        }
        if (!rec.provider.resolveMcpServerDefinition) {
            return Convert.McpServerDefinition.from(server);
        }
        const resolved = await rec.provider.resolveMcpServerDefinition(server, CancellationToken.None);
        return resolved ? Convert.McpServerDefinition.from(resolved) : undefined;
    }
    /** {@link vscode.lm.registerMcpServerDefinitionProvider} */
    registerMcpConfigurationProvider(extension, id, provider) {
        const store = new DisposableStore();
        const metadata = extension.contributes?.mcpServerDefinitionProviders?.find(m => m.id === id);
        if (!metadata) {
            throw new Error(`MCP configuration providers must be registered in the contributes.mcpServerDefinitionProviders array within your package.json, but "${id}" was not`);
        }
        const mcp = {
            id: extensionPrefixedIdentifier(extension.identifier, id),
            isTrustedByDefault: true,
            label: metadata?.label ?? extension.displayName ?? extension.name,
            scope: 1 /* StorageScope.WORKSPACE */,
            canResolveLaunch: typeof provider.resolveMcpServerDefinition === 'function',
            extensionId: extension.identifier.value,
            configTarget: this._extHostInitData.remote.isRemote ? 4 /* ConfigurationTarget.USER_REMOTE */ : 2 /* ConfigurationTarget.USER */,
        };
        const update = async () => {
            const list = await provider.provideMcpServerDefinitions(CancellationToken.None);
            this._unresolvedMcpServers.set(mcp.id, { servers: list ?? [], provider });
            const servers = [];
            for (const item of list ?? []) {
                let id = ExtensionIdentifier.toKey(extension.identifier) + '/' + item.label;
                if (servers.some(s => s.id === id)) {
                    let i = 2;
                    while (servers.some(s => s.id === id + i)) {
                        i++;
                    }
                    id = id + i;
                }
                servers.push({
                    id,
                    label: item.label,
                    cacheNonce: item.version,
                    launch: Convert.McpServerDefinition.from(item),
                });
            }
            this._proxy.$upsertMcpCollection(mcp, servers);
        };
        store.add(toDisposable(() => {
            this._unresolvedMcpServers.delete(mcp.id);
            this._proxy.$deleteMcpCollection(mcp.id);
        }));
        if (provider.onDidChangeMcpServerDefinitions) {
            store.add(provider.onDidChangeMcpServerDefinitions(update));
        }
        // todo@connor4312: proposed API back-compat
        if (provider.onDidChangeServerDefinitions) {
            store.add(provider.onDidChangeServerDefinitions(update));
        }
        if (provider.onDidChange) {
            store.add(provider.onDidChange(update));
        }
        const promise = new Promise(resolve => {
            setTimeout(() => update().finally(() => {
                this._initialProviderPromises.delete(promise);
                resolve();
            }), 0);
        });
        this._initialProviderPromises.add(promise);
        return store;
    }
};
ExtHostMcpService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService),
    __param(2, IExtHostInitDataService)
], ExtHostMcpService);
export { ExtHostMcpService };
var HttpMode;
(function (HttpMode) {
    HttpMode[HttpMode["Unknown"] = 0] = "Unknown";
    HttpMode[HttpMode["Http"] = 1] = "Http";
    HttpMode[HttpMode["SSE"] = 2] = "SSE";
})(HttpMode || (HttpMode = {}));
const MAX_FOLLOW_REDIRECTS = 5;
const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308];
/**
 * Implementation of both MCP HTTP Streaming as well as legacy SSE.
 *
 * The first request will POST to the endpoint, assuming HTTP streaming. If the
 * server is legacy SSE, it should return some 4xx status in that case,
 * and we'll automatically fall back to SSE and res
 */
class McpHTTPHandle extends Disposable {
    constructor(_id, _launch, _proxy, _logService) {
        super();
        this._id = _id;
        this._launch = _launch;
        this._proxy = _proxy;
        this._logService = _logService;
        this._requestSequencer = new Sequencer();
        this._postEndpoint = new DeferredPromise();
        this._mode = { value: 0 /* HttpMode.Unknown */ };
        this._cts = new CancellationTokenSource();
        this._abortCtrl = new AbortController();
        this._register(toDisposable(() => {
            this._abortCtrl.abort();
            this._cts.dispose(true);
        }));
        this._proxy.$onDidChangeState(this._id, { state: 2 /* McpConnectionState.Kind.Running */ });
    }
    async send(message) {
        try {
            if (this._mode.value === 0 /* HttpMode.Unknown */) {
                await this._requestSequencer.queue(() => this._send(message));
            }
            else {
                await this._send(message);
            }
        }
        catch (err) {
            const msg = `Error sending message to ${this._launch.uri}: ${String(err)}`;
            this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: msg });
        }
    }
    _send(message) {
        if (this._mode.value === 2 /* HttpMode.SSE */) {
            return this._sendLegacySSE(this._mode.endpoint, message);
        }
        else {
            return this._sendStreamableHttp(message, this._mode.value === 1 /* HttpMode.Http */ ? this._mode.sessionId : undefined);
        }
    }
    /**
     * Sends a streamable-HTTP request.
     * 1. Posts to the endpoint
     * 2. Updates internal state as needed. Falls back to SSE if appropriate.
     * 3. If the response body is empty, JSON, or a JSON stream, handle it appropriately.
     */
    async _sendStreamableHttp(message, sessionId) {
        const asBytes = new TextEncoder().encode(message);
        const headers = {
            ...Object.fromEntries(this._launch.headers),
            'Content-Type': 'application/json',
            'Content-Length': String(asBytes.length),
            Accept: 'text/event-stream, application/json',
        };
        if (sessionId) {
            headers['Mcp-Session-Id'] = sessionId;
        }
        await this._addAuthHeader(headers);
        const res = await this._fetchWithAuthRetry(this._launch.uri.toString(true), {
            method: 'POST',
            headers,
            body: asBytes,
        }, headers);
        const wasUnknown = this._mode.value === 0 /* HttpMode.Unknown */;
        // Mcp-Session-Id is the strongest signal that we're in streamable HTTP mode
        const nextSessionId = res.headers.get('Mcp-Session-Id');
        if (nextSessionId) {
            this._mode = { value: 1 /* HttpMode.Http */, sessionId: nextSessionId };
        }
        if (this._mode.value === 0 /* HttpMode.Unknown */ &&
            // We care about 4xx errors...
            res.status >= 400 && res.status < 500
            // ...except for 401 and 403, which are auth errors
            && res.status !== 401 && res.status !== 403) {
            this._log(LogLevel.Info, `${res.status} status sending message to ${this._launch.uri}, will attempt to fall back to legacy SSE`);
            this._sseFallbackWithMessage(message);
            return;
        }
        if (res.status >= 300) {
            // "When a client receives HTTP 404 in response to a request containing an Mcp-Session-Id, it MUST start a new session by sending a new InitializeRequest without a session ID attached"
            // Though this says only 404, some servers send 400s as well, including their example
            // https://github.com/modelcontextprotocol/typescript-sdk/issues/389
            const retryWithSessionId = this._mode.value === 1 /* HttpMode.Http */ && !!this._mode.sessionId && (res.status === 400 || res.status === 404);
            this._proxy.$onDidChangeState(this._id, {
                state: 3 /* McpConnectionState.Kind.Error */,
                message: `${res.status} status sending message to ${this._launch.uri}: ${await this._getErrText(res)}` + (retryWithSessionId ? `; will retry with new session ID` : ''),
                shouldRetry: retryWithSessionId,
            });
            return;
        }
        if (this._mode.value === 0 /* HttpMode.Unknown */) {
            this._mode = { value: 1 /* HttpMode.Http */, sessionId: undefined };
        }
        if (wasUnknown) {
            this._attachStreamableBackchannel();
        }
        await this._handleSuccessfulStreamableHttp(res, message);
    }
    async _sseFallbackWithMessage(message) {
        const endpoint = await this._attachSSE();
        if (endpoint) {
            this._mode = { value: 2 /* HttpMode.SSE */, endpoint };
            await this._sendLegacySSE(endpoint, message);
        }
    }
    async _populateAuthMetadata(originalResponse) {
        // If there is a resource_metadata challenge, use that to get the oauth server. This is done in 2 steps.
        // First, extract the resource_metada challenge from the WWW-Authenticate header (if available)
        let resourceMetadataChallenge;
        if (originalResponse.headers.has('WWW-Authenticate')) {
            const authHeader = originalResponse.headers.get('WWW-Authenticate');
            const { scheme, params } = parseWWWAuthenticateHeader(authHeader);
            if (scheme === 'Bearer' && params['resource_metadata']) {
                resourceMetadataChallenge = params['resource_metadata'];
            }
        }
        // Second, fetch that url's well-known server metadata
        let serverMetadataUrl;
        let scopesSupported;
        let resource;
        if (resourceMetadataChallenge) {
            const resourceMetadata = await this._getResourceMetadata(resourceMetadataChallenge);
            // TODO:@TylerLeonhardt support multiple authorization servers
            // Consider using one that has an auth provider first, over the dynamic flow
            serverMetadataUrl = resourceMetadata.authorization_servers?.[0];
            scopesSupported = resourceMetadata.scopes_supported;
            resource = resourceMetadata;
        }
        const baseUrl = new URL(originalResponse.url).origin;
        // If we are not given a resource_metadata, see if the well-known server metadata is available
        // on the base url.
        let addtionalHeaders = {};
        if (!serverMetadataUrl) {
            serverMetadataUrl = baseUrl;
            // Maintain the launch headers when talking to the MCP origin.
            addtionalHeaders = {
                ...Object.fromEntries(this._launch.headers)
            };
        }
        try {
            const serverMetadataResponse = await this._getAuthorizationServerMetadata(serverMetadataUrl, addtionalHeaders);
            this._authMetadata = {
                authorizationServer: URI.parse(serverMetadataUrl),
                serverMetadata: serverMetadataResponse,
                resourceMetadata: resource
            };
            return;
        }
        catch (e) {
            this._log(LogLevel.Warning, `Error populating auth metadata: ${String(e)}`);
        }
        // If there's no well-known server metadata, then use the default values based off of the url.
        const defaultMetadata = getDefaultMetadataForUrl(new URL(baseUrl));
        defaultMetadata.scopes_supported = scopesSupported ?? defaultMetadata.scopes_supported ?? [];
        this._authMetadata = {
            authorizationServer: URI.parse(serverMetadataUrl),
            serverMetadata: defaultMetadata,
            resourceMetadata: resource
        };
    }
    async _getResourceMetadata(resourceMetadata) {
        // detect if the resourceMetadata, which is a URL, is in the same origin as the MCP server
        const resourceMetadataUrl = new URL(resourceMetadata);
        const mcpServerUrl = new URL(this._launch.uri.toString(true));
        let additionalHeaders = {};
        if (resourceMetadataUrl.origin === mcpServerUrl.origin) {
            additionalHeaders = {
                ...Object.fromEntries(this._launch.headers)
            };
        }
        const resourceMetadataResponse = await this._fetch(resourceMetadata, {
            method: 'GET',
            headers: {
                ...additionalHeaders,
                'Accept': 'application/json',
                'MCP-Protocol-Version': MCP.LATEST_PROTOCOL_VERSION
            }
        });
        if (resourceMetadataResponse.status !== 200) {
            throw new Error(`Failed to fetch resource metadata: ${resourceMetadataResponse.status} ${await this._getErrText(resourceMetadataResponse)}`);
        }
        const body = await resourceMetadataResponse.json();
        if (isAuthorizationProtectedResourceMetadata(body)) {
            const resolvedResource = getResourceServerBaseUrlFromDiscoveryUrl(resourceMetadata);
            // Use URL constructor for normalization - it handles hostname case and trailing slashes
            if (new URL(body.resource).toString() !== new URL(resolvedResource).toString()) {
                throw new Error(`Protected Resource Metadata resource "${body.resource}" does not match MCP server resolved resource "${resolvedResource}". The MCP server must follow OAuth spec https://datatracker.ietf.org/doc/html/rfc9728#PRConfigurationValidation`);
            }
            return body;
        }
        else {
            throw new Error(`Invalid resource metadata: ${JSON.stringify(body)}`);
        }
    }
    async _getAuthorizationServerMetadata(authorizationServer, addtionalHeaders) {
        // For the oauth server metadata discovery path, we _INSERT_
        // the well known path after the origin and before the path.
        // https://datatracker.ietf.org/doc/html/rfc8414#section-3
        const authorizationServerUrl = new URL(authorizationServer);
        const extraPath = authorizationServerUrl.pathname === '/' ? '' : authorizationServerUrl.pathname;
        const pathToFetch = new URL(AUTH_SERVER_METADATA_DISCOVERY_PATH, authorizationServer).toString() + extraPath;
        let authServerMetadataResponse = await this._fetch(pathToFetch, {
            method: 'GET',
            headers: {
                ...addtionalHeaders,
                'Accept': 'application/json',
                'MCP-Protocol-Version': MCP.LATEST_PROTOCOL_VERSION,
            }
        });
        if (authServerMetadataResponse.status !== 200) {
            // Try fetching the OpenID Connect Discovery with path insertion.
            // For issuer URLs with path components, this inserts the well-known path
            // after the origin and before the path.
            const openidPathInsertionUrl = new URL(OPENID_CONNECT_DISCOVERY_PATH, authorizationServer).toString() + extraPath;
            authServerMetadataResponse = await this._fetch(openidPathInsertionUrl, {
                method: 'GET',
                headers: {
                    ...addtionalHeaders,
                    'Accept': 'application/json',
                    'MCP-Protocol-Version': MCP.LATEST_PROTOCOL_VERSION
                }
            });
            if (authServerMetadataResponse.status !== 200) {
                // Try fetching the other discovery URL. For the openid metadata discovery
                // path, we _ADD_ the well known path after the existing path.
                // https://datatracker.ietf.org/doc/html/rfc8414#section-3
                authServerMetadataResponse = await this._fetch(URI.joinPath(URI.parse(authorizationServer), OPENID_CONNECT_DISCOVERY_PATH).toString(true), {
                    method: 'GET',
                    headers: {
                        ...addtionalHeaders,
                        'Accept': 'application/json',
                        'MCP-Protocol-Version': MCP.LATEST_PROTOCOL_VERSION
                    }
                });
                if (authServerMetadataResponse.status !== 200) {
                    throw new Error(`Failed to fetch authorization server metadata: ${authServerMetadataResponse.status} ${await this._getErrText(authServerMetadataResponse)}`);
                }
            }
        }
        const body = await authServerMetadataResponse.json();
        if (isAuthorizationServerMetadata(body)) {
            return body;
        }
        throw new Error(`Invalid authorization server metadata: ${JSON.stringify(body)}`);
    }
    async _handleSuccessfulStreamableHttp(res, message) {
        if (res.status === 202) {
            return; // no body
        }
        switch (res.headers.get('Content-Type')?.toLowerCase()) {
            case 'text/event-stream': {
                const parser = new SSEParser(event => {
                    if (event.type === 'message') {
                        this._proxy.$onDidReceiveMessage(this._id, event.data);
                    }
                    else if (event.type === 'endpoint') {
                        // An SSE server that didn't correctly return a 4xx status when we POSTed
                        this._log(LogLevel.Warning, `Received SSE endpoint from a POST to ${this._launch.uri}, will fall back to legacy SSE`);
                        this._sseFallbackWithMessage(message);
                        throw new CancellationError(); // just to end the SSE stream
                    }
                });
                try {
                    await this._doSSE(parser, res);
                }
                catch (err) {
                    this._log(LogLevel.Warning, `Error reading SSE stream: ${String(err)}`);
                }
                break;
            }
            case 'application/json':
                this._proxy.$onDidReceiveMessage(this._id, await res.text());
                break;
            default: {
                const responseBody = await res.text();
                if (isJSON(responseBody)) { // try to read as JSON even if the server didn't set the content type
                    this._proxy.$onDidReceiveMessage(this._id, responseBody);
                }
                else {
                    this._log(LogLevel.Warning, `Unexpected ${res.status} response for request: ${responseBody}`);
                }
            }
        }
    }
    /**
     * Attaches the SSE backchannel that streamable HTTP servers can use
     * for async notifications. This is a "MAY" support, so if the server gives
     * us a 4xx code, we'll stop trying to connect..
     */
    async _attachStreamableBackchannel() {
        let lastEventId;
        for (let retry = 0; !this._store.isDisposed; retry++) {
            await timeout(Math.min(retry * 1000, 30_000), this._cts.token);
            let res;
            try {
                const headers = {
                    ...Object.fromEntries(this._launch.headers),
                    'Accept': 'text/event-stream',
                };
                await this._addAuthHeader(headers);
                if (this._mode.value === 1 /* HttpMode.Http */ && this._mode.sessionId !== undefined) {
                    headers['Mcp-Session-Id'] = this._mode.sessionId;
                }
                if (lastEventId) {
                    headers['Last-Event-ID'] = lastEventId;
                }
                res = await this._fetchWithAuthRetry(this._launch.uri.toString(true), {
                    method: 'GET',
                    headers,
                }, headers);
            }
            catch (e) {
                this._log(LogLevel.Info, `Error connecting to ${this._launch.uri} for async notifications, will retry`);
                continue;
            }
            if (res.status >= 400) {
                this._log(LogLevel.Debug, `${res.status} status connecting to ${this._launch.uri} for async notifications; they will be disabled: ${await this._getErrText(res)}`);
                return;
            }
            // Only reset the retry counter if we definitely get an event stream to avoid
            // spamming servers that (incorrectly) don't return one from this endpoint.
            if (res.headers.get('content-type')?.toLowerCase().includes('text/event-stream')) {
                retry = 0;
            }
            const parser = new SSEParser(event => {
                if (event.type === 'message') {
                    this._proxy.$onDidReceiveMessage(this._id, event.data);
                }
                if (event.id) {
                    lastEventId = event.id;
                }
            });
            try {
                await this._doSSE(parser, res);
            }
            catch (e) {
                this._log(LogLevel.Info, `Error reading from async stream, we will reconnect: ${e}`);
            }
        }
    }
    /**
     * Starts a legacy SSE attachment, where the SSE response is the session lifetime.
     * Unlike `_attachStreamableBackchannel`, this fails the server if it disconnects.
     */
    async _attachSSE() {
        const postEndpoint = new DeferredPromise();
        const headers = {
            ...Object.fromEntries(this._launch.headers),
            'Accept': 'text/event-stream',
        };
        await this._addAuthHeader(headers);
        let res;
        try {
            res = await this._fetchWithAuthRetry(this._launch.uri.toString(true), {
                method: 'GET',
                headers,
            }, headers);
            if (res.status >= 300) {
                this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: `${res.status} status connecting to ${this._launch.uri} as SSE: ${await this._getErrText(res)}` });
                return;
            }
        }
        catch (e) {
            this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: `Error connecting to ${this._launch.uri} as SSE: ${e}` });
            return;
        }
        const parser = new SSEParser(event => {
            if (event.type === 'message') {
                this._proxy.$onDidReceiveMessage(this._id, event.data);
            }
            else if (event.type === 'endpoint') {
                postEndpoint.complete(new URL(event.data, this._launch.uri.toString(true)).toString());
            }
        });
        this._register(toDisposable(() => postEndpoint.cancel()));
        this._doSSE(parser, res).catch(err => {
            this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: `Error reading SSE stream: ${String(err)}` });
        });
        return postEndpoint.p;
    }
    /**
     * Sends a legacy SSE message to the server. The response is always empty and
     * is otherwise received in {@link _attachSSE}'s loop.
     */
    async _sendLegacySSE(url, message) {
        const asBytes = new TextEncoder().encode(message);
        const headers = {
            ...Object.fromEntries(this._launch.headers),
            'Content-Type': 'application/json',
            'Content-Length': String(asBytes.length),
        };
        await this._addAuthHeader(headers);
        const res = await this._fetch(url, {
            method: 'POST',
            headers,
            body: asBytes,
        });
        if (res.status >= 300) {
            this._log(LogLevel.Warning, `${res.status} status sending message to ${this._postEndpoint}: ${await this._getErrText(res)}`);
        }
    }
    /** Generic handle to pipe a response into an SSE parser. */
    async _doSSE(parser, res) {
        if (!res.body) {
            return;
        }
        const reader = res.body.getReader();
        let chunk;
        do {
            try {
                chunk = await raceCancellationError(reader.read(), this._cts.token);
            }
            catch (err) {
                reader.cancel();
                if (this._store.isDisposed) {
                    return;
                }
                else {
                    throw err;
                }
            }
            if (chunk.value) {
                parser.feed(chunk.value);
            }
        } while (!chunk.done);
    }
    async _addAuthHeader(headers) {
        if (this._authMetadata) {
            try {
                const token = await this._proxy.$getTokenFromServerMetadata(this._id, this._authMetadata.authorizationServer, this._authMetadata.serverMetadata, this._authMetadata.resourceMetadata);
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
            catch (e) {
                this._log(LogLevel.Warning, `Error getting token from server metadata: ${String(e)}`);
            }
        }
        return headers;
    }
    _log(level, message) {
        if (!this._store.isDisposed) {
            this._proxy.$onDidPublishLog(this._id, level, message);
        }
    }
    async _getErrText(res) {
        try {
            return await res.text();
        }
        catch {
            return res.statusText;
        }
    }
    /**
     * Helper method to perform fetch with 401 authentication retry logic.
     * If the initial request returns 401 and we don't have auth metadata,
     * it will populate the auth metadata and retry once.
     */
    async _fetchWithAuthRetry(url, init, headers) {
        const doFetch = () => this._fetch(url, init);
        let res = await doFetch();
        if (res.status === 401) {
            if (!this._authMetadata) {
                await this._populateAuthMetadata(res);
                await this._addAuthHeader(headers);
                if (headers['Authorization']) {
                    // Update the headers in the init object
                    init.headers = headers;
                    res = await doFetch();
                }
            }
        }
        return res;
    }
    async _fetch(url, init) {
        if (canLog(this._logService.getLevel(), LogLevel.Trace)) {
            const traceObj = { ...init, headers: { ...init.headers } };
            if (traceObj.body) {
                traceObj.body = new TextDecoder().decode(traceObj.body);
            }
            if (traceObj.headers?.Authorization) {
                traceObj.headers.Authorization = '***'; // don't log the auth header
            }
            this._log(LogLevel.Trace, `Fetching ${url} with options: ${JSON.stringify(traceObj)}`);
        }
        let currentUrl = url;
        let response;
        for (let redirectCount = 0; redirectCount < MAX_FOLLOW_REDIRECTS; redirectCount++) {
            response = await fetch(currentUrl, {
                ...init,
                signal: this._abortCtrl.signal,
                redirect: 'manual'
            });
            // Check for redirect status codes (301, 302, 303, 307, 308)
            if (!REDIRECT_STATUS_CODES.includes(response.status)) {
                break;
            }
            const location = response.headers.get('location');
            if (!location) {
                break;
            }
            const nextUrl = new URL(location, currentUrl).toString();
            this._log(LogLevel.Trace, `Redirect (${response.status}) from ${currentUrl} to ${nextUrl}`);
            currentUrl = nextUrl;
            // Per fetch spec, for 303 always use GET, keep method unless original was POST and 301/302, then GET.
            if (response.status === 303 || ((response.status === 301 || response.status === 302) && init.method === 'POST')) {
                init.method = 'GET';
                delete init.body;
            }
        }
        if (canLog(this._logService.getLevel(), LogLevel.Trace)) {
            const headers = {};
            response.headers.forEach((value, key) => { headers[key] = value; });
            this._log(LogLevel.Trace, `Fetched ${currentUrl}: ${JSON.stringify({
                status: response.status,
                headers: headers,
            })}`);
        }
        return response;
    }
}
function isJSON(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch (e) {
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1jcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE1jcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMzRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxtQkFBbUIsRUFBeUIsTUFBTSxtREFBbUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFcEYsT0FBTyxFQUFFLDJCQUEyQixFQUFvRSxlQUFlLEVBQWtELE1BQU0sc0NBQXNDLENBQUM7QUFDdE4sT0FBTyxFQUFtQixXQUFXLEVBQXNCLE1BQU0sdUJBQXVCLENBQUM7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDNUQsT0FBTyxLQUFLLE9BQU8sTUFBTSw0QkFBNEIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsNkJBQTZCLEVBQUUsd0JBQXdCLEVBQUUsd0NBQXdDLEVBQXlFLHdDQUF3QyxFQUFFLDZCQUE2QixFQUFFLDBCQUEwQixFQUFFLE1B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