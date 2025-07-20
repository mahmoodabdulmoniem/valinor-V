/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeBase64 } from './buffer.js';
const WELL_KNOWN_ROUTE = '/.well-known';
export const AUTH_PROTECTED_RESOURCE_METADATA_DISCOVERY_PATH = `${WELL_KNOWN_ROUTE}/oauth-protected-resource`;
export const AUTH_SERVER_METADATA_DISCOVERY_PATH = `${WELL_KNOWN_ROUTE}/oauth-authorization-server`;
export const OPENID_CONNECT_DISCOVERY_PATH = `${WELL_KNOWN_ROUTE}/openid-configuration`;
export const AUTH_SCOPE_SEPARATOR = ' ';
//#region types
/**
 * Base OAuth 2.0 error codes as specified in RFC 6749.
 */
export var AuthorizationErrorType;
(function (AuthorizationErrorType) {
    AuthorizationErrorType["InvalidRequest"] = "invalid_request";
    AuthorizationErrorType["InvalidClient"] = "invalid_client";
    AuthorizationErrorType["InvalidGrant"] = "invalid_grant";
    AuthorizationErrorType["UnauthorizedClient"] = "unauthorized_client";
    AuthorizationErrorType["UnsupportedGrantType"] = "unsupported_grant_type";
    AuthorizationErrorType["InvalidScope"] = "invalid_scope";
})(AuthorizationErrorType || (AuthorizationErrorType = {}));
/**
 * Device authorization grant specific error codes as specified in RFC 8628 section 3.5.
 */
export var AuthorizationDeviceCodeErrorType;
(function (AuthorizationDeviceCodeErrorType) {
    /**
     * The authorization request is still pending as the end user hasn't completed the user interaction steps.
     */
    AuthorizationDeviceCodeErrorType["AuthorizationPending"] = "authorization_pending";
    /**
     * A variant of "authorization_pending", polling should continue but interval must be increased by 5 seconds.
     */
    AuthorizationDeviceCodeErrorType["SlowDown"] = "slow_down";
    /**
     * The authorization request was denied.
     */
    AuthorizationDeviceCodeErrorType["AccessDenied"] = "access_denied";
    /**
     * The "device_code" has expired and the device authorization session has concluded.
     */
    AuthorizationDeviceCodeErrorType["ExpiredToken"] = "expired_token";
})(AuthorizationDeviceCodeErrorType || (AuthorizationDeviceCodeErrorType = {}));
/**
 * Dynamic client registration specific error codes as specified in RFC 7591.
 */
export var AuthorizationRegistrationErrorType;
(function (AuthorizationRegistrationErrorType) {
    /**
     * The value of one or more redirection URIs is invalid.
     */
    AuthorizationRegistrationErrorType["InvalidRedirectUri"] = "invalid_redirect_uri";
    /**
     * The value of one of the client metadata fields is invalid and the server has rejected this request.
     */
    AuthorizationRegistrationErrorType["InvalidClientMetadata"] = "invalid_client_metadata";
    /**
     * The software statement presented is invalid.
     */
    AuthorizationRegistrationErrorType["InvalidSoftwareStatement"] = "invalid_software_statement";
    /**
     * The software statement presented is not approved for use by this authorization server.
     */
    AuthorizationRegistrationErrorType["UnapprovedSoftwareStatement"] = "unapproved_software_statement";
})(AuthorizationRegistrationErrorType || (AuthorizationRegistrationErrorType = {}));
//#endregion
//#region is functions
export function isAuthorizationProtectedResourceMetadata(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const metadata = obj;
    return metadata.resource !== undefined;
}
export function isAuthorizationServerMetadata(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const metadata = obj;
    return metadata.issuer !== undefined;
}
export function isAuthorizationDynamicClientRegistrationResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.client_id !== undefined;
}
export function isAuthorizationAuthorizeResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.code !== undefined && response.state !== undefined;
}
export function isAuthorizationTokenResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.access_token !== undefined && response.token_type !== undefined;
}
export function isAuthorizationDeviceResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.device_code !== undefined && response.user_code !== undefined && response.verification_uri !== undefined && response.expires_in !== undefined;
}
export function isAuthorizationErrorResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.error !== undefined;
}
export function isAuthorizationRegistrationErrorResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.error !== undefined;
}
//#endregion
export function getDefaultMetadataForUrl(authorizationServer) {
    return {
        issuer: authorizationServer.toString(),
        authorization_endpoint: new URL('/authorize', authorizationServer).toString(),
        token_endpoint: new URL('/token', authorizationServer).toString(),
        registration_endpoint: new URL('/register', authorizationServer).toString(),
        // Default values for Dynamic OpenID Providers
        // https://openid.net/specs/openid-connect-discovery-1_0.html
        response_types_supported: ['code', 'id_token', 'id_token token'],
    };
}
/**
 * The grant types that we support
 */
const grantTypesSupported = ['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:device_code'];
/**
 * Default port for the authorization flow. We try to use this port so that
 * the redirect URI does not change when running on localhost. This is useful
 * for servers that only allow exact matches on the redirect URI. The spec
 * says that the port should not matter, but some servers do not follow
 * the spec and require an exact match.
 */
export const DEFAULT_AUTH_FLOW_PORT = 33418;
export async function fetchDynamicRegistration(serverMetadata, clientName, scopes) {
    if (!serverMetadata.registration_endpoint) {
        throw new Error('Server does not support dynamic registration');
    }
    const response = await fetch(serverMetadata.registration_endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_name: clientName,
            client_uri: 'https://code.visualstudio.com',
            grant_types: serverMetadata.grant_types_supported
                ? serverMetadata.grant_types_supported.filter(gt => grantTypesSupported.includes(gt))
                : grantTypesSupported,
            response_types: ['code'],
            redirect_uris: [
                'https://insiders.vscode.dev/redirect',
                'https://vscode.dev/redirect',
                'http://localhost',
                'http://127.0.0.1',
                // Added these for any server that might do
                // only exact match on the redirect URI even
                // though the spec says it should not care
                // about the port.
                `http://localhost:${DEFAULT_AUTH_FLOW_PORT}`,
                `http://127.0.0.1:${DEFAULT_AUTH_FLOW_PORT}`
            ],
            scope: scopes?.join(AUTH_SCOPE_SEPARATOR),
            token_endpoint_auth_method: 'none',
            // https://openid.net/specs/openid-connect-registration-1_0.html
            application_type: 'native'
        })
    });
    if (!response.ok) {
        const result = await response.text();
        let errorDetails = result;
        try {
            const errorResponse = JSON.parse(result);
            if (isAuthorizationRegistrationErrorResponse(errorResponse)) {
                errorDetails = `${errorResponse.error}${errorResponse.error_description ? `: ${errorResponse.error_description}` : ''}`;
            }
        }
        catch {
            // JSON parsing failed, use raw text
        }
        throw new Error(`Registration to ${serverMetadata.registration_endpoint} failed: ${errorDetails}`);
    }
    const registration = await response.json();
    if (isAuthorizationDynamicClientRegistrationResponse(registration)) {
        return registration;
    }
    throw new Error(`Invalid authorization dynamic client registration response: ${JSON.stringify(registration)}`);
}
export function parseWWWAuthenticateHeader(wwwAuthenticateHeaderValue) {
    const parts = wwwAuthenticateHeaderValue.split(' ');
    const scheme = parts[0];
    const params = {};
    if (parts.length > 1) {
        const attributes = parts.slice(1).join(' ').split(',');
        attributes.forEach(attr => {
            const [key, value] = attr.split('=').map(s => s.trim().replace(/"/g, ''));
            params[key] = value;
        });
    }
    return { scheme, params };
}
export function getClaimsFromJWT(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT token format: token must have three parts separated by dots');
    }
    const [header, payload, _signature] = parts;
    try {
        const decodedHeader = JSON.parse(decodeBase64(header).toString());
        if (typeof decodedHeader !== 'object') {
            throw new Error('Invalid JWT token format: header is not a JSON object');
        }
        const decodedPayload = JSON.parse(decodeBase64(payload).toString());
        if (typeof decodedPayload !== 'object') {
            throw new Error('Invalid JWT token format: payload is not a JSON object');
        }
        return decodedPayload;
    }
    catch (e) {
        if (e instanceof Error) {
            throw new Error(`Failed to parse JWT token: ${e.message}`);
        }
        throw new Error('Failed to parse JWT token');
    }
}
/**
 * Extracts the resource server base URL from an OAuth protected resource metadata discovery endpoint URL.
 *
 * @param discoveryUrl The full URL to the OAuth protected resource metadata discovery endpoint
 * @returns The base URL of the resource server
 *
 * @example
 * ```typescript
 * getResourceServerBaseUrlFromDiscoveryUrl('https://mcp.example.com/.well-known/oauth-protected-resource')
 * // Returns: 'https://mcp.example.com/'
 *
 * getResourceServerBaseUrlFromDiscoveryUrl('https://mcp.example.com/.well-known/oauth-protected-resource/mcp')
 * // Returns: 'https://mcp.example.com/mcp'
 * ```
 */
export function getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl) {
    const url = new URL(discoveryUrl);
    // Remove the well-known discovery path only if it appears at the beginning
    if (!url.pathname.startsWith(AUTH_PROTECTED_RESOURCE_METADATA_DISCOVERY_PATH)) {
        throw new Error(`Invalid discovery URL: expected path to start with ${AUTH_PROTECTED_RESOURCE_METADATA_DISCOVERY_PATH}`);
    }
    const pathWithoutDiscovery = url.pathname.substring(AUTH_PROTECTED_RESOURCE_METADATA_DISCOVERY_PATH.length);
    // Construct the base URL
    const baseUrl = new URL(url.origin);
    baseUrl.pathname = pathWithoutDiscovery || '/';
    return baseUrl.toString();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2F1dGguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29hdXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFFM0MsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLENBQUM7QUFDeEMsTUFBTSxDQUFDLE1BQU0sK0NBQStDLEdBQUcsR0FBRyxnQkFBZ0IsMkJBQTJCLENBQUM7QUFDOUcsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQUcsR0FBRyxnQkFBZ0IsNkJBQTZCLENBQUM7QUFDcEcsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsR0FBRyxnQkFBZ0IsdUJBQXVCLENBQUM7QUFDeEYsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0FBRXhDLGVBQWU7QUFFZjs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQixzQkFPakI7QUFQRCxXQUFrQixzQkFBc0I7SUFDdkMsNERBQWtDLENBQUE7SUFDbEMsMERBQWdDLENBQUE7SUFDaEMsd0RBQThCLENBQUE7SUFDOUIsb0VBQTBDLENBQUE7SUFDMUMseUVBQStDLENBQUE7SUFDL0Msd0RBQThCLENBQUE7QUFDL0IsQ0FBQyxFQVBpQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBT3ZDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsZ0NBaUJqQjtBQWpCRCxXQUFrQixnQ0FBZ0M7SUFDakQ7O09BRUc7SUFDSCxrRkFBOEMsQ0FBQTtJQUM5Qzs7T0FFRztJQUNILDBEQUFzQixDQUFBO0lBQ3RCOztPQUVHO0lBQ0gsa0VBQThCLENBQUE7SUFDOUI7O09BRUc7SUFDSCxrRUFBOEIsQ0FBQTtBQUMvQixDQUFDLEVBakJpQixnQ0FBZ0MsS0FBaEMsZ0NB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