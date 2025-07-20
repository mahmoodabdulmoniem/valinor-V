/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { URI } from '../../../../../base/common/uri.js';
import { AuthenticationAccessService } from '../../browser/authenticationAccessService.js';
import { AuthenticationService } from '../../browser/authenticationService.js';
import { TestEnvironmentService } from '../../../../test/browser/workbenchTestServices.js';
import { TestExtensionService, TestProductService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
function createSession() {
    return { id: 'session1', accessToken: 'token1', account: { id: 'account', label: 'Account' }, scopes: ['test'] };
}
function createProvider(overrides = {}) {
    return {
        supportsMultipleAccounts: false,
        onDidChangeSessions: new Emitter().event,
        id: 'test',
        label: 'Test',
        getSessions: async () => [],
        createSession: async () => createSession(),
        removeSession: async () => { },
        ...overrides
    };
}
suite('AuthenticationService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let authenticationService;
    setup(() => {
        const storageService = disposables.add(new TestStorageService());
        const authenticationAccessService = disposables.add(new AuthenticationAccessService(storageService, TestProductService));
        authenticationService = disposables.add(new AuthenticationService(new TestExtensionService(), authenticationAccessService, TestEnvironmentService, new NullLogService()));
    });
    teardown(() => {
        // Dispose the authentication service after each test
        authenticationService.dispose();
    });
    suite('declaredAuthenticationProviders', () => {
        test('registerDeclaredAuthenticationProvider', async () => {
            const changed = Event.toPromise(authenticationService.onDidChangeDeclaredProviders);
            const provider = {
                id: 'github',
                label: 'GitHub'
            };
            authenticationService.registerDeclaredAuthenticationProvider(provider);
            // Assert that the provider is added to the declaredProviders array and the event fires
            assert.equal(authenticationService.declaredProviders.length, 1);
            assert.deepEqual(authenticationService.declaredProviders[0], provider);
            await changed;
        });
        test('unregisterDeclaredAuthenticationProvider', async () => {
            const provider = {
                id: 'github',
                label: 'GitHub'
            };
            authenticationService.registerDeclaredAuthenticationProvider(provider);
            const changed = Event.toPromise(authenticationService.onDidChangeDeclaredProviders);
            authenticationService.unregisterDeclaredAuthenticationProvider(provider.id);
            // Assert that the provider is removed from the declaredProviders array and the event fires
            assert.equal(authenticationService.declaredProviders.length, 0);
            await changed;
        });
    });
    suite('authenticationProviders', () => {
        test('isAuthenticationProviderRegistered', async () => {
            const registered = Event.toPromise(authenticationService.onDidRegisterAuthenticationProvider);
            const provider = createProvider();
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), false);
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), true);
            const result = await registered;
            assert.deepEqual(result, { id: provider.id, label: provider.label });
        });
        test('unregisterAuthenticationProvider', async () => {
            const unregistered = Event.toPromise(authenticationService.onDidUnregisterAuthenticationProvider);
            const provider = createProvider();
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), true);
            authenticationService.unregisterAuthenticationProvider(provider.id);
            assert.equal(authenticationService.isAuthenticationProviderRegistered(provider.id), false);
            const result = await unregistered;
            assert.deepEqual(result, { id: provider.id, label: provider.label });
        });
        test('getProviderIds', () => {
            const provider1 = createProvider({
                id: 'provider1',
                label: 'Provider 1'
            });
            const provider2 = createProvider({
                id: 'provider2',
                label: 'Provider 2'
            });
            authenticationService.registerAuthenticationProvider(provider1.id, provider1);
            authenticationService.registerAuthenticationProvider(provider2.id, provider2);
            const providerIds = authenticationService.getProviderIds();
            // Assert that the providerIds array contains the registered provider ids
            assert.deepEqual(providerIds, [provider1.id, provider2.id]);
        });
        test('getProvider', () => {
            const provider = createProvider();
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const retrievedProvider = authenticationService.getProvider(provider.id);
            // Assert that the retrieved provider is the same as the registered provider
            assert.deepEqual(retrievedProvider, provider);
        });
        test('getOrActivateProviderIdForServer - should return undefined when no provider matches the authorization server', async () => {
            const authorizationServer = URI.parse('https://example.com');
            const result = await authenticationService.getOrActivateProviderIdForServer(authorizationServer);
            assert.strictEqual(result, undefined);
        });
        test('getOrActivateProviderIdForServer - should return provider id if authorizationServerGlobs matches and authorizationServers match', async () => {
            // Register a declared provider with an authorization server glob
            const provider = {
                id: 'github',
                label: 'GitHub',
                authorizationServerGlobs: ['https://github.com/*']
            };
            authenticationService.registerDeclaredAuthenticationProvider(provider);
            // Register an authentication provider with matching authorization servers
            const authProvider = createProvider({
                id: 'github',
                label: 'GitHub',
                authorizationServers: [URI.parse('https://github.com/login')]
            });
            authenticationService.registerAuthenticationProvider('github', authProvider);
            // Test with a matching URI
            const authorizationServer = URI.parse('https://github.com/login');
            const result = await authenticationService.getOrActivateProviderIdForServer(authorizationServer);
            // Verify the result
            assert.strictEqual(result, 'github');
        });
        test('getOrActivateProviderIdForServer - should return undefined if authorizationServerGlobs match but authorizationServers do not match', async () => {
            // Register a declared provider with an authorization server glob
            const provider = {
                id: 'github',
                label: 'GitHub',
                authorizationServerGlobs: ['https://github.com/*']
            };
            authenticationService.registerDeclaredAuthenticationProvider(provider);
            // Register an authentication provider with non-matching authorization servers
            const authProvider = createProvider({
                id: 'github',
                label: 'GitHub',
                authorizationServers: [URI.parse('https://github.com/different')]
            });
            authenticationService.registerAuthenticationProvider('github', authProvider);
            // Test with a non-matching URI
            const authorizationServer = URI.parse('https://github.com/login');
            const result = await authenticationService.getOrActivateProviderIdForServer(authorizationServer);
            // Verify the result
            assert.strictEqual(result, undefined);
        });
        test('getOrActivateProviderIdForAuthorizationServer - should check multiple providers and return the first match', async () => {
            // Register two declared providers with authorization server globs
            const provider1 = {
                id: 'github',
                label: 'GitHub',
                authorizationServerGlobs: ['https://github.com/*']
            };
            const provider2 = {
                id: 'microsoft',
                label: 'Microsoft',
                authorizationServerGlobs: ['https://login.microsoftonline.com/*']
            };
            authenticationService.registerDeclaredAuthenticationProvider(provider1);
            authenticationService.registerDeclaredAuthenticationProvider(provider2);
            // Register authentication providers
            const githubProvider = createProvider({
                id: 'github',
                label: 'GitHub',
                authorizationServers: [URI.parse('https://github.com/different')]
            });
            authenticationService.registerAuthenticationProvider('github', githubProvider);
            const microsoftProvider = createProvider({
                id: 'microsoft',
                label: 'Microsoft',
                authorizationServers: [URI.parse('https://login.microsoftonline.com/common')]
            });
            authenticationService.registerAuthenticationProvider('microsoft', microsoftProvider);
            // Test with a URI that should match the second provider
            const authorizationServer = URI.parse('https://login.microsoftonline.com/common');
            const result = await authenticationService.getOrActivateProviderIdForServer(authorizationServer);
            // Verify the result
            assert.strictEqual(result, 'microsoft');
        });
    });
    suite('authenticationSessions', () => {
        test('getSessions - base case', async () => {
            let isCalled = false;
            const provider = createProvider({
                getSessions: async () => {
                    isCalled = true;
                    return [createSession()];
                },
            });
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const sessions = await authenticationService.getSessions(provider.id);
            assert.equal(sessions.length, 1);
            assert.ok(isCalled);
        });
        test('getSessions - authorization server is not registered', async () => {
            let isCalled = false;
            const provider = createProvider({
                getSessions: async () => {
                    isCalled = true;
                    return [createSession()];
                },
            });
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            assert.rejects(() => authenticationService.getSessions(provider.id, [], { authorizationServer: URI.parse('https://example.com') }));
            assert.ok(!isCalled);
        });
        test('createSession', async () => {
            const emitter = new Emitter();
            const provider = createProvider({
                onDidChangeSessions: emitter.event,
                createSession: async () => {
                    const session = createSession();
                    emitter.fire({ added: [session], removed: [], changed: [] });
                    return session;
                },
            });
            const changed = Event.toPromise(authenticationService.onDidChangeSessions);
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const session = await authenticationService.createSession(provider.id, ['repo']);
            // Assert that the created session matches the expected session and the event fires
            assert.ok(session);
            const result = await changed;
            assert.deepEqual(result, {
                providerId: provider.id,
                label: provider.label,
                event: { added: [session], removed: [], changed: [] }
            });
        });
        test('removeSession', async () => {
            const emitter = new Emitter();
            const session = createSession();
            const provider = createProvider({
                onDidChangeSessions: emitter.event,
                removeSession: async () => emitter.fire({ added: [], removed: [session], changed: [] })
            });
            const changed = Event.toPromise(authenticationService.onDidChangeSessions);
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            await authenticationService.removeSession(provider.id, session.id);
            const result = await changed;
            assert.deepEqual(result, {
                providerId: provider.id,
                label: provider.label,
                event: { added: [], removed: [session], changed: [] }
            });
        });
        test('onDidChangeSessions', async () => {
            const emitter = new Emitter();
            const provider = createProvider({
                onDidChangeSessions: emitter.event,
                getSessions: async () => []
            });
            authenticationService.registerAuthenticationProvider(provider.id, provider);
            const changed = Event.toPromise(authenticationService.onDidChangeSessions);
            const session = createSession();
            emitter.fire({ added: [], removed: [], changed: [session] });
            const result = await changed;
            assert.deepEqual(result, {
                providerId: provider.id,
                label: provider.label,
                event: { added: [], removed: [], changed: [session] }
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hdXRoZW50aWNhdGlvbi90ZXN0L2Jyb3dzZXIvYXV0aGVudGljYXRpb25TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRS9FLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUzRSxTQUFTLGFBQWE7SUFDckIsT0FBTyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0FBQ2xILENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxZQUE4QyxFQUFFO0lBQ3ZFLE9BQU87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