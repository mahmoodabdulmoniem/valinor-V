/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { getClaimsFromJWT, getDefaultMetadataForUrl, getResourceServerBaseUrlFromDiscoveryUrl, isAuthorizationAuthorizeResponse, isAuthorizationDeviceResponse, isAuthorizationErrorResponse, isAuthorizationDynamicClientRegistrationResponse, isAuthorizationProtectedResourceMetadata, isAuthorizationServerMetadata, isAuthorizationTokenResponse, parseWWWAuthenticateHeader, fetchDynamicRegistration, DEFAULT_AUTH_FLOW_PORT } from '../../common/oauth.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { encodeBase64, VSBuffer } from '../../common/buffer.js';
suite('OAuth', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('Type Guards', () => {
        test('isAuthorizationProtectedResourceMetadata should correctly identify protected resource metadata', () => {
            // Valid metadata
            assert.strictEqual(isAuthorizationProtectedResourceMetadata({ resource: 'https://example.com' }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationProtectedResourceMetadata(null), false);
            assert.strictEqual(isAuthorizationProtectedResourceMetadata(undefined), false);
            assert.strictEqual(isAuthorizationProtectedResourceMetadata({}), false);
            assert.strictEqual(isAuthorizationProtectedResourceMetadata('not an object'), false);
        });
        test('isAuthorizationServerMetadata should correctly identify server metadata', () => {
            // Valid metadata
            assert.strictEqual(isAuthorizationServerMetadata({
                issuer: 'https://example.com',
                response_types_supported: ['code']
            }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationServerMetadata(null), false);
            assert.strictEqual(isAuthorizationServerMetadata(undefined), false);
            assert.strictEqual(isAuthorizationServerMetadata({}), false);
            assert.strictEqual(isAuthorizationServerMetadata({ response_types_supported: ['code'] }), false);
            assert.strictEqual(isAuthorizationServerMetadata('not an object'), false);
        });
        test('isAuthorizationDynamicClientRegistrationResponse should correctly identify registration response', () => {
            // Valid response
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse({
                client_id: 'client-123',
                client_name: 'Test Client'
            }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse(null), false);
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse(undefined), false);
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse({}), false);
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse({ client_id: 'just-id' }), true);
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse({ client_name: 'missing-id' }), false);
            assert.strictEqual(isAuthorizationDynamicClientRegistrationResponse('not an object'), false);
        });
        test('isAuthorizationAuthorizeResponse should correctly identify authorization response', () => {
            // Valid response
            assert.strictEqual(isAuthorizationAuthorizeResponse({
                code: 'auth-code-123',
                state: 'state-123'
            }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationAuthorizeResponse(null), false);
            assert.strictEqual(isAuthorizationAuthorizeResponse(undefined), false);
            assert.strictEqual(isAuthorizationAuthorizeResponse({}), false);
            assert.strictEqual(isAuthorizationAuthorizeResponse({ code: 'missing-state' }), false);
            assert.strictEqual(isAuthorizationAuthorizeResponse({ state: 'missing-code' }), false);
            assert.strictEqual(isAuthorizationAuthorizeResponse('not an object'), false);
        });
        test('isAuthorizationTokenResponse should correctly identify token response', () => {
            // Valid response
            assert.strictEqual(isAuthorizationTokenResponse({
                access_token: 'token-123',
                token_type: 'Bearer'
            }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationTokenResponse(null), false);
            assert.strictEqual(isAuthorizationTokenResponse(undefined), false);
            assert.strictEqual(isAuthorizationTokenResponse({}), false);
            assert.strictEqual(isAuthorizationTokenResponse({ access_token: 'missing-type' }), false);
            assert.strictEqual(isAuthorizationTokenResponse({ token_type: 'missing-token' }), false);
            assert.strictEqual(isAuthorizationTokenResponse('not an object'), false);
        });
        test('isAuthorizationDeviceResponse should correctly identify device authorization response', () => {
            // Valid response
            assert.strictEqual(isAuthorizationDeviceResponse({
                device_code: 'device-code-123',
                user_code: 'ABCD-EFGH',
                verification_uri: 'https://example.com/verify',
                expires_in: 1800
            }), true);
            // Valid response with optional fields
            assert.strictEqual(isAuthorizationDeviceResponse({
                device_code: 'device-code-123',
                user_code: 'ABCD-EFGH',
                verification_uri: 'https://example.com/verify',
                verification_uri_complete: 'https://example.com/verify?user_code=ABCD-EFGH',
                expires_in: 1800,
                interval: 5
            }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationDeviceResponse(null), false);
            assert.strictEqual(isAuthorizationDeviceResponse(undefined), false);
            assert.strictEqual(isAuthorizationDeviceResponse({}), false);
            assert.strictEqual(isAuthorizationDeviceResponse({ device_code: 'missing-others' }), false);
            assert.strictEqual(isAuthorizationDeviceResponse({ user_code: 'missing-others' }), false);
            assert.strictEqual(isAuthorizationDeviceResponse({ verification_uri: 'missing-others' }), false);
            assert.strictEqual(isAuthorizationDeviceResponse({ expires_in: 1800 }), false);
            assert.strictEqual(isAuthorizationDeviceResponse({
                device_code: 'device-code-123',
                user_code: 'ABCD-EFGH',
                verification_uri: 'https://example.com/verify'
                // Missing expires_in
            }), false);
            assert.strictEqual(isAuthorizationDeviceResponse('not an object'), false);
        });
        test('isAuthorizationErrorResponse should correctly identify error response', () => {
            // Valid error response
            assert.strictEqual(isAuthorizationErrorResponse({
                error: 'authorization_pending',
                error_description: 'The authorization request is still pending'
            }), true);
            // Valid error response with different error codes
            assert.strictEqual(isAuthorizationErrorResponse({
                error: 'slow_down',
                error_description: 'Polling too fast'
            }), true);
            assert.strictEqual(isAuthorizationErrorResponse({
                error: 'access_denied',
                error_description: 'The user denied the request'
            }), true);
            assert.strictEqual(isAuthorizationErrorResponse({
                error: 'expired_token',
                error_description: 'The device code has expired'
            }), true);
            // Valid response with optional error_uri
            assert.strictEqual(isAuthorizationErrorResponse({
                error: 'invalid_request',
                error_description: 'The request is missing a required parameter',
                error_uri: 'https://example.com/error'
            }), true);
            // Invalid cases
            assert.strictEqual(isAuthorizationErrorResponse(null), false);
            assert.strictEqual(isAuthorizationErrorResponse(undefined), false);
            assert.strictEqual(isAuthorizationErrorResponse({}), false);
            assert.strictEqual(isAuthorizationErrorResponse({ error_description: 'missing-error' }), false);
            assert.strictEqual(isAuthorizationErrorResponse('not an object'), false);
        });
    });
    suite('Utility Functions', () => {
        test('getDefaultMetadataForUrl should return correct default endpoints', () => {
            const authorizationServer = new URL('https://auth.example.com');
            const metadata = getDefaultMetadataForUrl(authorizationServer);
            assert.strictEqual(metadata.issuer, 'https://auth.example.com/');
            assert.strictEqual(metadata.authorization_endpoint, 'https://auth.example.com/authorize');
            assert.strictEqual(metadata.token_endpoint, 'https://auth.example.com/token');
            assert.strictEqual(metadata.registration_endpoint, 'https://auth.example.com/register');
            assert.deepStrictEqual(metadata.response_types_supported, ['code', 'id_token', 'id_token token']);
        });
    });
    suite('Parsing Functions', () => {
        test('parseWWWAuthenticateHeader should correctly parse simple header', () => {
            const result = parseWWWAuthenticateHeader('Bearer');
            assert.strictEqual(result.scheme, 'Bearer');
            assert.deepStrictEqual(result.params, {});
        });
        test('parseWWWAuthenticateHeader should correctly parse header with parameters', () => {
            const result = parseWWWAuthenticateHeader('Bearer realm="api", error="invalid_token", error_description="The access token expired"');
            assert.strictEqual(result.scheme, 'Bearer');
            assert.deepStrictEqual(result.params, {
                realm: 'api',
                error: 'invalid_token',
                error_description: 'The access token expired'
            });
        });
        test('getClaimsFromJWT should correctly parse a JWT token', () => {
            // Create a sample JWT with known payload
            const payload = {
                jti: 'id123',
                sub: 'user123',
                iss: 'https://example.com',
                aud: 'client123',
                exp: 1716239022,
                iat: 1716235422,
                name: 'Test User'
            };
            // Create fake but properly formatted JWT
            const header = { alg: 'HS256', typ: 'JWT' };
            const encodedHeader = encodeBase64(VSBuffer.fromString(JSON.stringify(header)));
            const encodedPayload = encodeBase64(VSBuffer.fromString(JSON.stringify(payload)));
            const fakeSignature = 'fake-signature';
            const token = `${encodedHeader}.${encodedPayload}.${fakeSignature}`;
            const claims = getClaimsFromJWT(token);
            assert.deepStrictEqual(claims, payload);
        });
        test('getClaimsFromJWT should throw for invalid JWT format', () => {
            // Test with wrong number of parts - should throw "Invalid JWT token format"
            assert.throws(() => getClaimsFromJWT('only.two'), /Invalid JWT token format.*three parts/);
            assert.throws(() => getClaimsFromJWT('one'), /Invalid JWT token format.*three parts/);
            assert.throws(() => getClaimsFromJWT('has.four.parts.here'), /Invalid JWT token format.*three parts/);
        });
        test('getClaimsFromJWT should throw for invalid header content', () => {
            // Create JWT with invalid header
            const encodedHeader = encodeBase64(VSBuffer.fromString('not-json'));
            const encodedPayload = encodeBase64(VSBuffer.fromString(JSON.stringify({ sub: 'test' })));
            const token = `${encodedHeader}.${encodedPayload}.signature`;
            assert.throws(() => getClaimsFromJWT(token), /Failed to parse JWT token/);
        });
        test('getClaimsFromJWT should throw for invalid payload content', () => {
            // Create JWT with valid header but invalid payload
            const header = { alg: 'HS256', typ: 'JWT' };
            const encodedHeader = encodeBase64(VSBuffer.fromString(JSON.stringify(header)));
            const encodedPayload = encodeBase64(VSBuffer.fromString('not-json'));
            const token = `${encodedHeader}.${encodedPayload}.signature`;
            assert.throws(() => getClaimsFromJWT(token), /Failed to parse JWT token/);
        });
    });
    suite('Network Functions', () => {
        let sandbox;
        let fetchStub;
        setup(() => {
            sandbox = sinon.createSandbox();
            fetchStub = sandbox.stub(globalThis, 'fetch');
        });
        teardown(() => {
            sandbox.restore();
        });
        test('fetchDynamicRegistration should make correct request and parse response', async () => {
            // Setup successful response
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client',
                client_uri: 'https://code.visualstudio.com'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            const result = await fetchDynamicRegistration(serverMetadata, 'Test Client');
            // Verify fetch was called correctly
            assert.strictEqual(fetchStub.callCount, 1);
            const [url, options] = fetchStub.firstCall.args;
            assert.strictEqual(url, 'https://auth.example.com/register');
            assert.strictEqual(options.method, 'POST');
            assert.strictEqual(options.headers['Content-Type'], 'application/json');
            // Verify request body
            const requestBody = JSON.parse(options.body);
            assert.strictEqual(requestBody.client_name, 'Test Client');
            assert.strictEqual(requestBody.client_uri, 'https://code.visualstudio.com');
            assert.deepStrictEqual(requestBody.grant_types, ['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:device_code']);
            assert.deepStrictEqual(requestBody.response_types, ['code']);
            assert.deepStrictEqual(requestBody.redirect_uris, [
                'https://insiders.vscode.dev/redirect',
                'https://vscode.dev/redirect',
                'http://localhost',
                'http://127.0.0.1',
                `http://localhost:${DEFAULT_AUTH_FLOW_PORT}`,
                `http://127.0.0.1:${DEFAULT_AUTH_FLOW_PORT}`
            ]);
            // Verify response is processed correctly
            assert.deepStrictEqual(result, mockResponse);
        });
        test('fetchDynamicRegistration should throw error on non-OK response', async () => {
            fetchStub.resolves({
                ok: false,
                statusText: 'Bad Request',
                text: async () => 'Bad Request'
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Registration to https:\/\/auth\.example\.com\/register failed: Bad Request/);
        });
        test('fetchDynamicRegistration should throw error on invalid response format', async () => {
            fetchStub.resolves({
                ok: true,
                json: async () => ({ invalid: 'response' }) // Missing required fields
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Invalid authorization dynamic client registration response/);
        });
        test('fetchDynamicRegistration should filter grant types based on server metadata', async () => {
            // Setup successful response
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code'],
                grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'] // Mix of supported and unsupported
            };
            await fetchDynamicRegistration(serverMetadata, 'Test Client');
            // Verify fetch was called correctly
            assert.strictEqual(fetchStub.callCount, 1);
            const [, options] = fetchStub.firstCall.args;
            // Verify request body contains only the intersection of supported grant types
            const requestBody = JSON.parse(options.body);
            assert.deepStrictEqual(requestBody.grant_types, ['authorization_code', 'refresh_token']); // client_credentials should be filtered out
        });
        test('fetchDynamicRegistration should use default grant types when server metadata has none', async () => {
            // Setup successful response
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
                // No grant_types_supported specified
            };
            await fetchDynamicRegistration(serverMetadata, 'Test Client');
            // Verify fetch was called correctly
            assert.strictEqual(fetchStub.callCount, 1);
            const [, options] = fetchStub.firstCall.args;
            // Verify request body contains default grant types
            const requestBody = JSON.parse(options.body);
            assert.deepStrictEqual(requestBody.grant_types, ['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:device_code']);
        });
        test('fetchDynamicRegistration should throw error when registration endpoint is missing', async () => {
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                response_types_supported: ['code']
                // registration_endpoint is missing
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Server does not support dynamic registration/);
        });
        test('fetchDynamicRegistration should handle structured error response', async () => {
            const errorResponse = {
                error: 'invalid_client_metadata',
                error_description: 'The client metadata is invalid'
            };
            fetchStub.resolves({
                ok: false,
                text: async () => JSON.stringify(errorResponse)
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Registration to https:\/\/auth\.example\.com\/register failed: invalid_client_metadata: The client metadata is invalid/);
        });
        test('fetchDynamicRegistration should handle structured error response without description', async () => {
            const errorResponse = {
                error: 'invalid_redirect_uri'
            };
            fetchStub.resolves({
                ok: false,
                text: async () => JSON.stringify(errorResponse)
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Registration to https:\/\/auth\.example\.com\/register failed: invalid_redirect_uri/);
        });
        test('fetchDynamicRegistration should handle malformed JSON error response', async () => {
            fetchStub.resolves({
                ok: false,
                text: async () => 'Invalid JSON {'
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Registration to https:\/\/auth\.example\.com\/register failed: Invalid JSON \{/);
        });
        test('fetchDynamicRegistration should include scopes in request when provided', async () => {
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await fetchDynamicRegistration(serverMetadata, 'Test Client', ['read', 'write']);
            // Verify request includes scopes
            const [, options] = fetchStub.firstCall.args;
            const requestBody = JSON.parse(options.body);
            assert.strictEqual(requestBody.scope, 'read write');
        });
        test('fetchDynamicRegistration should omit scope from request when not provided', async () => {
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await fetchDynamicRegistration(serverMetadata, 'Test Client');
            // Verify request does not include scope when not provided
            const [, options] = fetchStub.firstCall.args;
            const requestBody = JSON.parse(options.body);
            assert.strictEqual(requestBody.scope, undefined);
        });
        test('fetchDynamicRegistration should handle empty scopes array', async () => {
            const mockResponse = {
                client_id: 'generated-client-id',
                client_name: 'Test Client'
            };
            fetchStub.resolves({
                ok: true,
                json: async () => mockResponse
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await fetchDynamicRegistration(serverMetadata, 'Test Client', []);
            // Verify request includes empty scope
            const [, options] = fetchStub.firstCall.args;
            const requestBody = JSON.parse(options.body);
            assert.strictEqual(requestBody.scope, '');
        });
        test('fetchDynamicRegistration should handle network fetch failure', async () => {
            fetchStub.rejects(new Error('Network error'));
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Network error/);
        });
        test('fetchDynamicRegistration should handle response.json() failure', async () => {
            fetchStub.resolves({
                ok: true,
                json: async () => {
                    throw new Error('JSON parsing failed');
                }
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /JSON parsing failed/);
        });
        test('fetchDynamicRegistration should handle response.text() failure for error cases', async () => {
            fetchStub.resolves({
                ok: false,
                text: async () => {
                    throw new Error('Text parsing failed');
                }
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Text parsing failed/);
        });
    });
    suite('getResourceServerBaseUrlFromDiscoveryUrl', () => {
        test('should extract base URL from discovery URL at root', () => {
            const discoveryUrl = 'https://mcp.example.com/.well-known/oauth-protected-resource';
            const result = getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl);
            assert.strictEqual(result, 'https://mcp.example.com/');
        });
        test('should extract base URL from discovery URL with subpath', () => {
            const discoveryUrl = 'https://mcp.example.com/.well-known/oauth-protected-resource/mcp';
            const result = getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl);
            assert.strictEqual(result, 'https://mcp.example.com/mcp');
        });
        test('should extract base URL from discovery URL with nested subpath', () => {
            const discoveryUrl = 'https://api.example.com/.well-known/oauth-protected-resource/v1/services/mcp';
            const result = getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl);
            assert.strictEqual(result, 'https://api.example.com/v1/services/mcp');
        });
        test('should handle discovery URL with port number', () => {
            const discoveryUrl = 'https://localhost:8443/.well-known/oauth-protected-resource/api';
            const result = getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl);
            assert.strictEqual(result, 'https://localhost:8443/api');
        });
        test('should handle discovery URL with query parameters', () => {
            const discoveryUrl = 'https://example.com/.well-known/oauth-protected-resource/api?version=1';
            const result = getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl);
            assert.strictEqual(result, 'https://example.com/api');
        });
        test('should handle discovery URL with fragment', () => {
            const discoveryUrl = 'https://example.com/.well-known/oauth-protected-resource/api#section';
            const result = getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl);
            assert.strictEqual(result, 'https://example.com/api');
        });
        test('should handle discovery URL ending with trailing slash', () => {
            const discoveryUrl = 'https://example.com/.well-known/oauth-protected-resource/api/';
            const result = getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl);
            assert.strictEqual(result, 'https://example.com/api/');
        });
        test('should handle HTTP URLs', () => {
            const discoveryUrl = 'http://localhost:3000/.well-known/oauth-protected-resource/dev';
            const result = getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl);
            assert.strictEqual(result, 'http://localhost:3000/dev');
        });
        test('should throw error for URL without discovery path', () => {
            const discoveryUrl = 'https://example.com/some/other/path';
            assert.throws(() => getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl), /Invalid discovery URL: expected path to start with \/\.well-known\/oauth-protected-resource/);
        });
        test('should throw error for URL with partial discovery path', () => {
            const discoveryUrl = 'https://example.com/.well-known/oauth';
            assert.throws(() => getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl), /Invalid discovery URL: expected path to start with \/\.well-known\/oauth-protected-resource/);
        });
        test('should throw error for URL with discovery path not at beginning', () => {
            const discoveryUrl = 'https://example.com/api/.well-known/oauth-protected-resource';
            assert.throws(() => getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl), /Invalid discovery URL: expected path to start with \/\.well-known\/oauth-protected-resource/);
        });
        test('should throw error for invalid URL format', () => {
            const discoveryUrl = 'not-a-valid-url';
            assert.throws(() => getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl), TypeError);
        });
        test('should handle empty path after discovery path', () => {
            const discoveryUrl = 'https://example.com/.well-known/oauth-protected-resource';
            const result = getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl);
            assert.strictEqual(result, 'https://example.com/');
        });
        test('should preserve URL encoding in subpath', () => {
            const discoveryUrl = 'https://example.com/.well-known/oauth-protected-resource/api%20v1';
            const result = getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl);
            assert.strictEqual(result, 'https://example.com/api%20v1');
        });
        test('should normalize hostname case consistently', () => {
            const discoveryUrl = 'https://MCP.EXAMPLE.COM/.well-known/oauth-protected-resource';
            const result = getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl);
            assert.strictEqual(result, 'https://mcp.example.com/');
        });
    });
    suite('Client ID Fallback Scenarios', () => {
        let sandbox;
        let fetchStub;
        setup(() => {
            sandbox = sinon.createSandbox();
            fetchStub = sandbox.stub(globalThis, 'fetch');
        });
        teardown(() => {
            sandbox.restore();
        });
        test('fetchDynamicRegistration should throw specific error for missing registration endpoint', async () => {
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                response_types_supported: ['code']
                // registration_endpoint is missing
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), {
                message: 'Server does not support dynamic registration'
            });
        });
        test('fetchDynamicRegistration should throw specific error for DCR failure', async () => {
            fetchStub.resolves({
                ok: false,
                text: async () => 'DCR not supported'
            });
            const serverMetadata = {
                issuer: 'https://auth.example.com',
                registration_endpoint: 'https://auth.example.com/register',
                response_types_supported: ['code']
            };
            await assert.rejects(async () => await fetchDynamicRegistration(serverMetadata, 'Test Client'), /Registration to https:\/\/auth\.example\.com\/register failed: DCR not supported/);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2F1dGgudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9vYXV0aC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQy9CLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsd0JBQXdCLEVBQ3hCLHdDQUF3QyxFQUN4QyxnQ0FBZ0MsRUFDaEMsNkJBQTZCLEVBQzdCLDRCQUE0QixFQUM1QixnREFBZ0QsRUFDaEQsd0NBQXdDLEVBQ3hDLDZCQUE2QixFQUM3Qiw0QkFBNEIsRUFDNUIsMEJBQTBCLEVBQzFCLHdCQUF3QixFQUd4QixzQkFBc0IsRUFDdEIsTUFBTSx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUVoRSxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtJQUNuQix1Q0FBdUMsRUFBRSxDQUFDO0lBQzFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLElBQUksQ0FBQyxnR0FBZ0csRUFBRSxHQUFHLEVBQUU7WUFDM0csaUJBQWlCO1lBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsd0NBQXdDLENBQUMsRUFBRSxRQUFRLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRXhHLGdCQUFnQjtZQUNoQixNQUFNLENBQUMsV0FBVyxDQUFDLHdDQUF3QyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFFLE1BQU0sQ0FB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