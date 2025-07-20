/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { URL } from 'url';
import { ExtHostAuthentication, DynamicAuthProvider } from '../common/extHostAuthentication.js';
import { isAuthorizationDeviceResponse, isAuthorizationTokenResponse } from '../../../base/common/oauth.js';
import { raceCancellationError } from '../../../base/common/async.js';
import { CancellationError, isCancellationError } from '../../../base/common/errors.js';
import { URI } from '../../../base/common/uri.js';
import { LoopbackAuthServer } from './loopbackServer.js';
export class NodeDynamicAuthProvider extends DynamicAuthProvider {
    constructor(extHostWindow, extHostUrls, initData, extHostProgress, loggerService, proxy, authorizationServer, serverMetadata, resourceMetadata, clientId, clientSecret, onDidDynamicAuthProviderTokensChange, initialTokens) {
        super(extHostWindow, extHostUrls, initData, extHostProgress, loggerService, proxy, authorizationServer, serverMetadata, resourceMetadata, clientId, clientSecret, onDidDynamicAuthProviderTokensChange, initialTokens);
        // Prepend Node-specific flows to the existing flows
        if (!initData.remote.isRemote && serverMetadata.authorization_endpoint) {
            // If we are not in a remote environment, we can use the loopback server for authentication
            this._createFlows.unshift({
                label: nls.localize('loopback', "Loopback Server"),
                handler: (scopes, progress, token) => this._createWithLoopbackServer(scopes, progress, token)
            });
        }
        // Add device code flow to the end since it's not as streamlined
        if (serverMetadata.device_authorization_endpoint) {
            this._createFlows.push({
                label: nls.localize('device code', "Device Code"),
                handler: (scopes, progress, token) => this._createWithDeviceCode(scopes, progress, token)
            });
        }
    }
    async _createWithLoopbackServer(scopes, progress, token) {
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
        const callbackUri = URI.parse(`${this._initData.environment.appUriScheme}://dynamicauthprovider/${this.authorizationServer.authority}/redirect?nonce=${nonce}`);
        let appUri;
        try {
            appUri = await this._extHostUrls.createAppUri(callbackUri);
        }
        catch (error) {
            throw new Error(`Failed to create external URI: ${error}`);
        }
        // Prepare the authorization request URL
        const authorizationUrl = new URL(this._serverMetadata.authorization_endpoint);
        authorizationUrl.searchParams.append('client_id', this._clientId);
        authorizationUrl.searchParams.append('response_type', 'code');
        authorizationUrl.searchParams.append('code_challenge', codeChallenge);
        authorizationUrl.searchParams.append('code_challenge_method', 'S256');
        const scopeString = scopes.join(' ');
        if (scopeString) {
            authorizationUrl.searchParams.append('scope', scopeString);
        }
        if (this._resourceMetadata?.resource) {
            // If a resource is specified, include it in the request
            authorizationUrl.searchParams.append('resource', this._resourceMetadata.resource);
        }
        // Create and start the loopback server
        const server = new LoopbackAuthServer(this._logger, appUri, this._initData.environment.appName);
        try {
            await server.start();
        }
        catch (err) {
            throw new Error(`Failed to start loopback server: ${err}`);
        }
        // Update the authorization URL with the actual redirect URI
        authorizationUrl.searchParams.set('redirect_uri', server.redirectUri);
        authorizationUrl.searchParams.set('state', server.state);
        const promise = server.waitForOAuthResponse();
        // Set up a Uri Handler but it's just to redirect not to handle the code
        void this._proxy.$waitForUriHandler(appUri);
        try {
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
            // Wait for the authorization code via the loopback server
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
            const tokenResponse = await this.exchangeCodeForToken(code, codeVerifier, server.redirectUri);
            return tokenResponse;
        }
        finally {
            // Clean up the server
            setTimeout(() => {
                void server.stop();
            }, 5000);
        }
    }
    async _createWithDeviceCode(scopes, progress, token) {
        if (!this._serverMetadata.token_endpoint) {
            throw new Error('Token endpoint not available in server metadata');
        }
        if (!this._serverMetadata.device_authorization_endpoint) {
            throw new Error('Device authorization endpoint not available in server metadata');
        }
        const deviceAuthUrl = this._serverMetadata.device_authorization_endpoint;
        const scopeString = scopes.join(' ');
        this._logger.info(`Starting device code flow for scopes: ${scopeString}`);
        // Step 1: Request device and user codes
        const deviceCodeRequest = new URLSearchParams();
        deviceCodeRequest.append('client_id', this._clientId);
        if (scopeString) {
            deviceCodeRequest.append('scope', scopeString);
        }
        if (this._resourceMetadata?.resource) {
            // If a resource is specified, include it in the request
            deviceCodeRequest.append('resource', this._resourceMetadata.resource);
        }
        let deviceCodeResponse;
        try {
            deviceCodeResponse = await fetch(deviceAuthUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: deviceCodeRequest.toString()
            });
        }
        catch (error) {
            this._logger.error(`Failed to request device code: ${error}`);
            throw new Error(`Failed to request device code: ${error}`);
        }
        if (!deviceCodeResponse.ok) {
            const text = await deviceCodeResponse.text();
            throw new Error(`Device code request failed: ${deviceCodeResponse.status} ${deviceCodeResponse.statusText} - ${text}`);
        }
        const deviceCodeData = await deviceCodeResponse.json();
        if (!isAuthorizationDeviceResponse(deviceCodeData)) {
            this._logger.error('Invalid device code response received from server');
            throw new Error('Invalid device code response received from server');
        }
        this._logger.info(`Device code received: ${deviceCodeData.user_code}`);
        // Step 2: Show the device code modal
        const userConfirmed = await this._proxy.$showDeviceCodeModal(deviceCodeData.user_code, deviceCodeData.verification_uri);
        if (!userConfirmed) {
            throw new CancellationError();
        }
        // Step 3: Poll for token
        progress.report({
            message: nls.localize('waitingForAuth', "Open [{0}]({0}) in a new tab and paste your one-time code: {1}", deviceCodeData.verification_uri, deviceCodeData.user_code)
        });
        const pollInterval = (deviceCodeData.interval || 5) * 1000; // Convert to milliseconds
        const expiresAt = Date.now() + (deviceCodeData.expires_in * 1000);
        while (Date.now() < expiresAt) {
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            // Wait for the specified interval
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            // Poll the token endpoint
            const tokenRequest = new URLSearchParams();
            tokenRequest.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
            tokenRequest.append('device_code', deviceCodeData.device_code);
            tokenRequest.append('client_id', this._clientId);
            try {
                const tokenResponse = await fetch(this._serverMetadata.token_endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: tokenRequest.toString()
                });
                if (tokenResponse.ok) {
                    const tokenData = await tokenResponse.json();
                    if (!isAuthorizationTokenResponse(tokenData)) {
                        this._logger.error('Invalid token response received from server');
                        throw new Error('Invalid token response received from server');
                    }
                    this._logger.info(`Device code flow completed successfully for scopes: ${scopeString}`);
                    return tokenData;
                }
                else {
                    let errorData;
                    try {
                        errorData = await tokenResponse.json();
                    }
                    catch (e) {
                        this._logger.error(`Failed to parse error response: ${e}`);
                        throw new Error(`Token request failed with status ${tokenResponse.status}: ${tokenResponse.statusText}`);
                    }
                    // Handle known error cases
                    if (errorData.error === "authorization_pending" /* AuthorizationDeviceCodeErrorType.AuthorizationPending */) {
                        // User hasn't completed authorization yet, continue polling
                        continue;
                    }
                    else if (errorData.error === "slow_down" /* AuthorizationDeviceCodeErrorType.SlowDown */) {
                        // Server is asking us to slow down
                        await new Promise(resolve => setTimeout(resolve, pollInterval));
                        continue;
                    }
                    else if (errorData.error === "expired_token" /* AuthorizationDeviceCodeErrorType.ExpiredToken */) {
                        throw new Error('Device code expired. Please try again.');
                    }
                    else if (errorData.error === "access_denied" /* AuthorizationDeviceCodeErrorType.AccessDenied */) {
                        throw new CancellationError();
                    }
                    else if (errorData.error === "invalid_client" /* AuthorizationErrorType.InvalidClient */) {
                        this._logger.warn(`Client ID (${this._clientId}) was invalid, generated a new one.`);
                        await this._generateNewClientId();
                        throw new Error(`Client ID was invalid, generated a new one. Please try again.`);
                    }
                    else {
                        throw new Error(`Token request failed: ${errorData.error_description || errorData.error || 'Unknown error'}`);
                    }
                }
            }
            catch (error) {
                if (isCancellationError(error)) {
                    throw error;
                }
                throw new Error(`Error polling for token: ${error}`);
            }
        }
        throw new Error('Device code flow timed out. Please try again.');
    }
}
export class NodeExtHostAuthentication extends ExtHostAuthentication {
    constructor(extHostRpc, initData, extHostWindow, extHostUrls, extHostProgress, extHostLoggerService, extHostLogService) {
        super(extHostRpc, initData, extHostWindow, extHostUrls, extHostProgress, extHostLoggerService, extHostLogService);
        this._dynamicAuthProviderCtor = NodeDynamicAuthProvider;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEF1dGhlbnRpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdEF1dGhlbnRpY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFFdkMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLEtBQUssQ0FBQztBQUMxQixPQUFPLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQTBCLE1BQU0sb0NBQW9DLENBQUM7QUFPeEgsT0FBTyxFQUFvSSw2QkFBNkIsRUFBRSw0QkFBNEIsRUFBb0csTUFBTSwrQkFBK0IsQ0FBQztBQUVoVixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUd0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFekQsTUFBTSxPQUFPLHVCQUF3QixTQUFRLG1CQUFtQjtJQUUvRCxZQUNDLGFBQTZCLEVBQzdCLFdBQWdDLEVBQ2hDLFFBQWlDLEVBQ2pDLGVBQWlDLEVBQ2pDLGFBQTZCLEVBQzdCLEtBQW9DLEVBQ3BDLG1CQUF3QixFQUN4QixjQUE0QyxFQUM1QyxnQkFBcUUsRUFDckUsUUFBZ0IsRUFDaEIsWUFBZ0MsRUFDaEMsb0NBQTBHLEVBQzFHLGFBQW9CO1FBRXBCLEtBQUssQ0FDSixhQUFhLEVBQ2IsV0FBVyxFQUNYLFFBQVEsRUFDUixlQUFlLEVBQ2YsYUFBYSxFQUNiLEtBQUssRUFDTCxtQkFBbUIsRUFDbkIsY0FB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