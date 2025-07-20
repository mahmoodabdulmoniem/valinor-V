/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
/**
 * Helper function to create a mock authentication provider
 */
export function createProvider(overrides = {}) {
    return {
        id: 'test-provider',
        label: 'Test Provider',
        supportsMultipleAccounts: true,
        createSession: () => Promise.resolve(createSession()),
        removeSession: () => Promise.resolve(),
        getSessions: () => Promise.resolve([]),
        onDidChangeSessions: new Emitter().event,
        ...overrides
    };
}
/**
 * Helper function to create a mock authentication session
 */
export function createSession() {
    return {
        id: 'test-session',
        accessToken: 'test-token',
        account: { id: 'test-account', label: 'Test Account' },
        scopes: ['read', 'write'],
        idToken: undefined
    };
}
/**
 * Base class for test services with common functionality and call tracking
 */
export class BaseTestService extends Disposable {
    constructor() {
        super(...arguments);
        this.data = new Map();
        this._methodCalls = [];
    }
    getKey(...parts) {
        return parts.join('::');
    }
    /**
     * Track a method call for verification in tests
     */
    trackCall(method, ...args) {
        this._methodCalls.push({
            method,
            args: [...args],
            timestamp: Date.now()
        });
    }
    /**
     * Get all method calls for verification
     */
    getMethodCalls() {
        return [...this._methodCalls];
    }
    /**
     * Get calls for a specific method
     */
    getCallsFor(method) {
        return this._methodCalls.filter(call => call.method === method);
    }
    /**
     * Clear method call history
     */
    clearCallHistory() {
        this._methodCalls.length = 0;
    }
    /**
     * Get the last call for a specific method
     */
    getLastCallFor(method) {
        const calls = this.getCallsFor(method);
        return calls[calls.length - 1];
    }
}
/**
 * Test implementation that actually stores and retrieves data
 */
export class TestUsageService extends BaseTestService {
    readAccountUsages(providerId, accountName) {
        this.trackCall('readAccountUsages', providerId, accountName);
        return this.data.get(this.getKey(providerId, accountName)) || [];
    }
    addAccountUsage(providerId, accountName, scopes, extensionId, extensionName) {
        this.trackCall('addAccountUsage', providerId, accountName, scopes, extensionId, extensionName);
        const key = this.getKey(providerId, accountName);
        const usages = this.data.get(key) || [];
        usages.push({ extensionId, extensionName, scopes: [...scopes], lastUsed: Date.now() });
        this.data.set(key, usages);
    }
    removeAccountUsage(providerId, accountName) {
        this.trackCall('removeAccountUsage', providerId, accountName);
        this.data.delete(this.getKey(providerId, accountName));
    }
    // Stub implementations for missing methods
    async initializeExtensionUsageCache() { }
    async extensionUsesAuth(extensionId) { return false; }
}
export class TestMcpUsageService extends BaseTestService {
    readAccountUsages(providerId, accountName) {
        this.trackCall('readAccountUsages', providerId, accountName);
        return this.data.get(this.getKey(providerId, accountName)) || [];
    }
    addAccountUsage(providerId, accountName, scopes, mcpServerId, mcpServerName) {
        this.trackCall('addAccountUsage', providerId, accountName, scopes, mcpServerId, mcpServerName);
        const key = this.getKey(providerId, accountName);
        const usages = this.data.get(key) || [];
        usages.push({ mcpServerId, mcpServerName, scopes: [...scopes], lastUsed: Date.now() });
        this.data.set(key, usages);
    }
    removeAccountUsage(providerId, accountName) {
        this.trackCall('removeAccountUsage', providerId, accountName);
        this.data.delete(this.getKey(providerId, accountName));
    }
    // Stub implementations for missing methods
    async initializeUsageCache() { }
    async hasUsedAuth(mcpServerId) { return false; }
}
export class TestAccessService extends BaseTestService {
    constructor() {
        super(...arguments);
        this._onDidChangeExtensionSessionAccess = this._register(new Emitter());
        this.onDidChangeExtensionSessionAccess = this._onDidChangeExtensionSessionAccess.event;
    }
    isAccessAllowed(providerId, accountName, extensionId) {
        this.trackCall('isAccessAllowed', providerId, accountName, extensionId);
        const extensions = this.data.get(this.getKey(providerId, accountName)) || [];
        const extension = extensions.find((e) => e.id === extensionId);
        return extension?.allowed;
    }
    readAllowedExtensions(providerId, accountName) {
        this.trackCall('readAllowedExtensions', providerId, accountName);
        return this.data.get(this.getKey(providerId, accountName)) || [];
    }
    updateAllowedExtensions(providerId, accountName, extensions) {
        this.trackCall('updateAllowedExtensions', providerId, accountName, extensions);
        const key = this.getKey(providerId, accountName);
        const existing = this.data.get(key) || [];
        // Merge with existing data, updating or adding extensions
        const merged = [...existing];
        for (const ext of extensions) {
            const existingIndex = merged.findIndex(e => e.id === ext.id);
            if (existingIndex >= 0) {
                merged[existingIndex] = ext;
            }
            else {
                merged.push(ext);
            }
        }
        this.data.set(key, merged);
        this._onDidChangeExtensionSessionAccess.fire({ providerId, accountName });
    }
    removeAllowedExtensions(providerId, accountName) {
        this.trackCall('removeAllowedExtensions', providerId, accountName);
        this.data.delete(this.getKey(providerId, accountName));
    }
}
export class TestMcpAccessService extends BaseTestService {
    constructor() {
        super(...arguments);
        this._onDidChangeMcpSessionAccess = this._register(new Emitter());
        this.onDidChangeMcpSessionAccess = this._onDidChangeMcpSessionAccess.event;
    }
    isAccessAllowed(providerId, accountName, mcpServerId) {
        this.trackCall('isAccessAllowed', providerId, accountName, mcpServerId);
        const servers = this.data.get(this.getKey(providerId, accountName)) || [];
        const server = servers.find((s) => s.id === mcpServerId);
        return server?.allowed;
    }
    readAllowedMcpServers(providerId, accountName) {
        this.trackCall('readAllowedMcpServers', providerId, accountName);
        return this.data.get(this.getKey(providerId, accountName)) || [];
    }
    updateAllowedMcpServers(providerId, accountName, mcpServers) {
        this.trackCall('updateAllowedMcpServers', providerId, accountName, mcpServers);
        const key = this.getKey(providerId, accountName);
        const existing = this.data.get(key) || [];
        // Merge with existing data, updating or adding MCP servers
        const merged = [...existing];
        for (const server of mcpServers) {
            const existingIndex = merged.findIndex(s => s.id === server.id);
            if (existingIndex >= 0) {
                merged[existingIndex] = server;
            }
            else {
                merged.push(server);
            }
        }
        this.data.set(key, merged);
        this._onDidChangeMcpSessionAccess.fire({ providerId, accountName });
    }
    removeAllowedMcpServers(providerId, accountName) {
        this.trackCall('removeAllowedMcpServers', providerId, accountName);
        this.data.delete(this.getKey(providerId, accountName));
        this._onDidChangeMcpSessionAccess.fire({ providerId, accountName });
    }
}
export class TestPreferencesService extends BaseTestService {
    constructor() {
        super(...arguments);
        this._onDidChangeAccountPreference = this._register(new Emitter());
        this.onDidChangeAccountPreference = this._onDidChangeAccountPreference.event;
    }
    getAccountPreference(clientId, providerId) {
        return this.data.get(this.getKey(clientId, providerId));
    }
    updateAccountPreference(clientId, providerId, account) {
        this.data.set(this.getKey(clientId, providerId), account.label);
    }
    removeAccountPreference(clientId, providerId) {
        this.data.delete(this.getKey(clientId, providerId));
    }
}
export class TestExtensionsService extends TestPreferencesService {
    // Stub implementations for methods we don't test
    updateSessionPreference() { }
    getSessionPreference() { return undefined; }
    removeSessionPreference() { }
    selectSession() { return Promise.resolve(createSession()); }
    requestSessionAccess() { }
    requestNewSession() { return Promise.resolve(); }
}
export class TestMcpService extends TestPreferencesService {
    // Stub implementations for methods we don't test
    updateSessionPreference() { }
    getSessionPreference() { return undefined; }
    removeSessionPreference() { }
    selectSession() { return Promise.resolve(createSession()); }
    requestSessionAccess() { }
    requestNewSession() { return Promise.resolve(); }
}
/**
 * Minimal authentication service mock that only implements what we need
 */
export class TestAuthenticationService extends BaseTestService {
    constructor() {
        super(...arguments);
        this._onDidChangeSessions = this._register(new Emitter());
        this._onDidRegisterAuthenticationProvider = this._register(new Emitter());
        this._onDidUnregisterAuthenticationProvider = this._register(new Emitter());
        this._onDidChangeDeclaredProviders = this._register(new Emitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this.onDidRegisterAuthenticationProvider = this._onDidRegisterAuthenticationProvider.event;
        this.onDidUnregisterAuthenticationProvider = this._onDidUnregisterAuthenticationProvider.event;
        this.onDidChangeDeclaredProviders = this._onDidChangeDeclaredProviders.event;
        this.accountsMap = new Map();
    }
    registerAuthenticationProvider(id, provider) {
        this.data.set(id, provider);
        this._onDidRegisterAuthenticationProvider.fire({ id, label: provider.label });
    }
    getProviderIds() {
        return Array.from(this.data.keys());
    }
    isAuthenticationProviderRegistered(id) {
        return this.data.has(id);
    }
    getProvider(id) {
        return this.data.get(id);
    }
    addAccounts(providerId, accounts) {
        this.accountsMap.set(providerId, accounts);
    }
    async getAccounts(providerId) {
        return this.accountsMap.get(providerId) || [];
    }
    // All other methods are stubs since we don't test them
    get declaredProviders() { return []; }
    isDynamicAuthenticationProvider() { return false; }
    async getSessions() { return []; }
    async createSession() { return createSession(); }
    async removeSession() { }
    manageTrustedExtensionsForAccount() { }
    async removeAccountSessions() { }
    registerDeclaredAuthenticationProvider() { }
    unregisterDeclaredAuthenticationProvider() { }
    unregisterAuthenticationProvider() { }
    registerAuthenticationProviderHostDelegate() { return { dispose: () => { } }; }
    createDynamicAuthenticationProvider() { return Promise.resolve(undefined); }
    async requestNewSession() { return createSession(); }
    async getSession() { return createSession(); }
    getOrActivateProviderIdForServer() { return Promise.resolve(undefined); }
    supportsHeimdallConnection() { return false; }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25RdWVyeVNlcnZpY2VNb2Nrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2F1dGhlbnRpY2F0aW9uL3Rlc3QvYnJvd3Nlci9hdXRoZW50aWNhdGlvblF1ZXJ5U2VydmljZU1vY2tzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFRbEY7O0dBRUc7QUFDSCxNQUFNLFVBQVUsY0FBYyxDQUFDLFlBQThDLEVBQUU7SUFDOUUsT0FBTztRQUNOLEVBQUUsRUFBRSxlQUFlO1FBQ25CLEtBQUssRUFBRSxlQUFlO1FBQ3RCLHdCQUF3QixFQUFFLElBQUk7UUFDOUIsYUFBYSxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDckQsYUFBYSxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7UUFDdEMsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ3RDLG1CQUFtQixFQUFFLElBQUksT0FBTyxFQUFPLENBQUMsS0FBSztRQUM3QyxHQUFHLFNBQVM7S0FDWixDQUFDO0FBQ0gsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGFBQWE7SUFDNUIsT0FBTztRQUNOLEVBQUUsRUFBRSxjQUFjO1FBQ2xCLFdBQVcsRUFBRSxZQUFZO1FBQ3pCLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRTtRQUN0RCxNQUFNLEVBQUUsQ0FB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