/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../../platform/dialogs/test/common/testDialogService.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../../platform/notification/test/common/testNotificationService.js';
import { IQuickInputService, QuickInputHideReason } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { MainThreadAuthentication } from '../../browser/mainThreadAuthentication.js';
import { ExtHostContext, MainContext } from '../../common/extHost.protocol.js';
import { ExtHostAuthentication } from '../../common/extHostAuthentication.js';
import { IActivityService } from '../../../services/activity/common/activity.js';
import { AuthenticationService } from '../../../services/authentication/browser/authenticationService.js';
import { IAuthenticationExtensionsService, IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IExtensionService, nullExtensionDescription as extensionDescription } from '../../../services/extensions/common/extensions.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { TestEnvironmentService, TestHostService, TestQuickInputService, TestRemoteAgentService } from '../../../test/browser/workbenchTestServices.js';
import { TestActivityService, TestExtensionService, TestLoggerService, TestProductService, TestStorageService } from '../../../test/common/workbenchTestServices.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { AuthenticationAccessService, IAuthenticationAccessService } from '../../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationUsageService } from '../../../services/authentication/browser/authenticationUsageService.js';
import { AuthenticationExtensionsService } from '../../../services/authentication/browser/authenticationExtensionsService.js';
import { ILogService, NullLogService } from '../../../../platform/log/common/log.js';
import { ExtHostWindow } from '../../common/extHostWindow.js';
import { MainThreadWindow } from '../../browser/mainThreadWindow.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IUserActivityService, UserActivityService } from '../../../services/userActivity/common/userActivityService.js';
import { ExtHostUrls } from '../../common/extHostUrls.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { TestSecretStorageService } from '../../../../platform/secrets/test/common/testSecretStorageService.js';
import { IDynamicAuthenticationProviderStorageService } from '../../../services/authentication/common/dynamicAuthenticationProviderStorage.js';
import { DynamicAuthenticationProviderStorageService } from '../../../services/authentication/browser/dynamicAuthenticationProviderStorageService.js';
import { ExtHostProgress } from '../../common/extHostProgress.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
class AuthQuickPick {
    constructor() {
        this.items = [];
    }
    get selectedItems() {
        return this.items;
    }
    onDidAccept(listener) {
        this.accept = listener;
    }
    onDidHide(listener) {
        this.hide = listener;
    }
    dispose() {
    }
    show() {
        this.accept?.({ inBackground: false });
        this.hide?.({ reason: QuickInputHideReason.Other });
    }
}
class AuthTestQuickInputService extends TestQuickInputService {
    createQuickPick() {
        return new AuthQuickPick();
    }
}
class TestAuthUsageService {
    initializeExtensionUsageCache() { return Promise.resolve(); }
    extensionUsesAuth(extensionId) { return Promise.resolve(false); }
    readAccountUsages(providerId, accountName) { return []; }
    removeAccountUsage(providerId, accountName) { }
    addAccountUsage(providerId, accountName, scopes, extensionId, extensionName) { }
}
class TestAuthProvider {
    constructor(authProviderName) {
        this.authProviderName = authProviderName;
        this.id = 1;
        this.sessions = new Map();
        this.onDidChangeSessions = () => { return { dispose() { } }; };
    }
    async getSessions(scopes) {
        if (!scopes) {
            return [...this.sessions.values()];
        }
        if (scopes[0] === 'return multiple') {
            return [...this.sessions.values()];
        }
        const sessions = this.sessions.get(scopes.join(' '));
        return sessions ? [sessions] : [];
    }
    async createSession(scopes) {
        const scopesStr = scopes.join(' ');
        const session = {
            scopes,
            id: `${this.id}`,
            account: {
                label: this.authProviderName,
                id: `${this.id}`,
            },
            accessToken: Math.random() + '',
        };
        this.sessions.set(scopesStr, session);
        this.id++;
        return session;
    }
    async removeSession(sessionId) {
        this.sessions.delete(sessionId);
    }
}
suite('ExtHostAuthentication', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let extHostAuthentication;
    let mainInstantiationService;
    setup(async () => {
        // services
        const services = new ServiceCollection();
        services.set(ILogService, new SyncDescriptor(NullLogService));
        services.set(IDialogService, new SyncDescriptor(TestDialogService, [{ confirmed: true }]));
        services.set(IStorageService, new SyncDescriptor(TestStorageService));
        services.set(ISecretStorageService, new SyncDescriptor(TestSecretStorageService));
        services.set(IDynamicAuthenticationProviderStorageService, new SyncDescriptor(DynamicAuthenticationProviderStorageService));
        services.set(IQuickInputService, new SyncDescriptor(AuthTestQuickInputService));
        services.set(IExtensionService, new SyncDescriptor(TestExtensionService));
        services.set(IActivityService, new SyncDescriptor(TestActivityService));
        services.set(IRemoteAgentService, new SyncDescriptor(TestRemoteAgentService));
        services.set(INotificationService, new SyncDescriptor(TestNotificationService));
        services.set(IHostService, new SyncDescriptor(TestHostService));
        services.set(IUserActivityService, new SyncDescriptor(UserActivityService));
        services.set(IAuthenticationAccessService, new SyncDescriptor(AuthenticationAccessService));
        services.set(IAuthenticationService, new SyncDescriptor(AuthenticationService));
        services.set(IAuthenticationUsageService, new SyncDescriptor(TestAuthUsageService));
        services.set(IAuthenticationExtensionsService, new SyncDescriptor(AuthenticationExtensionsService));
        mainInstantiationService = disposables.add(new TestInstantiationService(services, undefined, undefined, true));
        // stubs
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        mainInstantiationService.stub(IOpenerService, {});
        mainInstantiationService.stub(ITelemetryService, NullTelemetryService);
        mainInstantiationService.stub(IBrowserWorkbenchEnvironmentService, TestEnvironmentService);
        mainInstantiationService.stub(IProductService, TestProductService);
        const rpcProtocol = disposables.add(new TestRPCProtocol());
        rpcProtocol.set(MainContext.MainThreadAuthentication, disposables.add(mainInstantiationService.createInstance(MainThreadAuthentication, rpcProtocol)));
        rpcProtocol.set(MainContext.MainThreadWindow, disposables.add(mainInstantiationService.createInstance(MainThreadWindow, rpcProtocol)));
        const initData = {
            environment: {
                appUriScheme: 'test',
                appName: 'Test'
            }
        };
        extHostAuthentication = new ExtHostAuthentication(rpcProtocol, {
            environment: {
                appUriScheme: 'test',
                appName: 'Test'
            }
        }, new ExtHostWindow(initData, rpcProtocol), new ExtHostUrls(rpcProtocol), new ExtHostProgress(rpcProtocol), disposables.add(new TestLoggerService()), new NullLogService());
        rpcProtocol.set(ExtHostContext.ExtHostAuthentication, extHostAuthentication);
        disposables.add(extHostAuthentication.registerAuthenticationProvider('test', 'test provider', new TestAuthProvider('test')));
        disposables.add(extHostAuthentication.registerAuthenticationProvider('test-multiple', 'test multiple provider', new TestAuthProvider('test-multiple'), { supportsMultipleAccounts: true }));
    });
    test('createIfNone - true', async () => {
        const scopes = ['foo'];
        const session = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            createIfNone: true
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
    });
    test('createIfNone - false', async () => {
        const scopes = ['foo'];
        const nosession = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {});
        assert.strictEqual(nosession, undefined);
        // Now create the session
        const session = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            createIfNone: true
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {});
        assert.strictEqual(session2?.id, session.id);
        assert.strictEqual(session2?.scopes[0], session.scopes[0]);
        assert.strictEqual(session2?.accessToken, session.accessToken);
    });
    // should behave the same as createIfNone: false
    test('silent - true', async () => {
        const scopes = ['foo'];
        const nosession = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            silent: true
        });
        assert.strictEqual(nosession, undefined);
        // Now create the session
        const session = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            createIfNone: true
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            silent: true
        });
        assert.strictEqual(session.id, session2?.id);
        assert.strictEqual(session.scopes[0], session2?.scopes[0]);
    });
    test('forceNewSession - true - existing session', async () => {
        const scopes = ['foo'];
        const session1 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            createIfNone: true
        });
        // Now create the session
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            forceNewSession: true
        });
        assert.strictEqual(session2?.id, '2');
        assert.strictEqual(session2?.scopes[0], 'foo');
        assert.notStrictEqual(session1.accessToken, session2?.accessToken);
    });
    // Should behave like createIfNone: true
    test('forceNewSession - true - no existing session', async () => {
        const scopes = ['foo'];
        const session = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            forceNewSession: true
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
    });
    test('forceNewSession - detail', async () => {
        const scopes = ['foo'];
        const session1 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            createIfNone: true
        });
        // Now create the session
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test', scopes, {
            forceNewSession: { detail: 'bar' }
        });
        assert.strictEqual(session2?.id, '2');
        assert.strictEqual(session2?.scopes[0], 'foo');
        assert.notStrictEqual(session1.accessToken, session2?.accessToken);
    });
    //#region Multi-Account AuthProvider
    test('clearSessionPreference - true', async () => {
        const scopes = ['foo'];
        // Now create the session
        const session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes, {
            createIfNone: true
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], scopes[0]);
        const scopes2 = ['bar'];
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes2, {
            createIfNone: true
        });
        assert.strictEqual(session2?.id, '2');
        assert.strictEqual(session2?.scopes[0], scopes2[0]);
        const session3 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['return multiple'], {
            clearSessionPreference: true,
            createIfNone: true
        });
        // clearing session preference causes us to get the first session
        // because it would normally show a quick pick for the user to choose
        assert.strictEqual(session3?.id, session.id);
        assert.strictEqual(session3?.scopes[0], session.scopes[0]);
        assert.strictEqual(session3?.accessToken, session.accessToken);
    });
    test('silently getting session should return a session (if any) regardless of preference - fixes #137819', async () => {
        const scopes = ['foo'];
        // Now create the session
        const session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes, {
            createIfNone: true
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], scopes[0]);
        const scopes2 = ['bar'];
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes2, {
            createIfNone: true
        });
        assert.strictEqual(session2?.id, '2');
        assert.strictEqual(session2?.scopes[0], scopes2[0]);
        const shouldBeSession1 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes, {});
        assert.strictEqual(shouldBeSession1?.id, session.id);
        assert.strictEqual(shouldBeSession1?.scopes[0], session.scopes[0]);
        assert.strictEqual(shouldBeSession1?.accessToken, session.accessToken);
        const shouldBeSession2 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', scopes2, {});
        assert.strictEqual(shouldBeSession2?.id, session2.id);
        assert.strictEqual(shouldBeSession2?.scopes[0], session2.scopes[0]);
        assert.strictEqual(shouldBeSession2?.accessToken, session2.accessToken);
    });
    //#endregion
    //#region error cases
    test('createIfNone and forceNewSession', async () => {
        try {
            await extHostAuthentication.getSession(extensionDescription, 'test', ['foo'], {
                createIfNone: true,
                forceNewSession: true
            });
            assert.fail('should have thrown an Error.');
        }
        catch (e) {
            assert.ok(e);
        }
    });
    test('forceNewSession and silent', async () => {
        try {
            await extHostAuthentication.getSession(extensionDescription, 'test', ['foo'], {
                forceNewSession: true,
                silent: true
            });
            assert.fail('should have thrown an Error.');
        }
        catch (e) {
            assert.ok(e);
        }
    });
    test('createIfNone and silent', async () => {
        try {
            await extHostAuthentication.getSession(extensionDescription, 'test', ['foo'], {
                createIfNone: true,
                silent: true
            });
            assert.fail('should have thrown an Error.');
        }
        catch (e) {
            assert.ok(e);
        }
    });
    test('Can get multiple sessions (with different scopes) in one extension', async () => {
        let session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['foo'], {
            createIfNone: true
        });
        session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['bar'], {
            createIfNone: true
        });
        assert.strictEqual(session?.id, '2');
        assert.strictEqual(session?.scopes[0], 'bar');
        session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['foo'], {
            createIfNone: false
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
    });
    test('Can get multiple sessions (from different providers) in one extension', async () => {
        let session = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['foo'], {
            createIfNone: true
        });
        session = await extHostAuthentication.getSession(extensionDescription, 'test', ['foo'], {
            createIfNone: true
        });
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
        assert.strictEqual(session?.account.label, 'test');
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['foo'], {
            createIfNone: false
        });
        assert.strictEqual(session2?.id, '1');
        assert.strictEqual(session2?.scopes[0], 'foo');
        assert.strictEqual(session2?.account.label, 'test-multiple');
    });
    test('Can get multiple sessions (from different providers) in one extension at the same time', async () => {
        const sessionP = extHostAuthentication.getSession(extensionDescription, 'test', ['foo'], {
            createIfNone: true
        });
        const session2P = extHostAuthentication.getSession(extensionDescription, 'test-multiple', ['foo'], {
            createIfNone: true
        });
        const session = await sessionP;
        assert.strictEqual(session?.id, '1');
        assert.strictEqual(session?.scopes[0], 'foo');
        assert.strictEqual(session?.account.label, 'test');
        const session2 = await session2P;
        assert.strictEqual(session2?.id, '1');
        assert.strictEqual(session2?.scopes[0], 'foo');
        assert.strictEqual(session2?.account.label, 'test-multiple');
    });
    //#endregion
    //#region Race Condition and Sequencing Tests
    test('concurrent operations on same provider are serialized', async () => {
        const provider = new TestAuthProvider('concurrent-test');
        const operationOrder = [];
        // Mock the provider methods to track operation order
        const originalCreateSession = provider.createSession.bind(provider);
        const originalGetSessions = provider.getSessions.bind(provider);
        provider.createSession = async (scopes) => {
            operationOrder.push(`create-start-${scopes[0]}`);
            await new Promise(resolve => setTimeout(resolve, 20)); // Simulate async work
            const result = await originalCreateSession(scopes);
            operationOrder.push(`create-end-${scopes[0]}`);
            return result;
        };
        provider.getSessions = async (scopes) => {
            const scopeKey = scopes ? scopes[0] : 'all';
            operationOrder.push(`get-start-${scopeKey}`);
            await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async work
            const result = await originalGetSessions(scopes);
            operationOrder.push(`get-end-${scopeKey}`);
            return result;
        };
        const disposable = extHostAuthentication.registerAuthenticationProvider('concurrent-test', 'Concurrent Test', provider);
        disposables.add(disposable);
        // Start multiple operations simultaneously on the same provider
        const promises = [
            extHostAuthentication.getSession(extensionDescription, 'concurrent-test', ['scope1'], { createIfNone: true }),
            extHostAuthentication.getSession(extensionDescription, 'concurrent-test', ['scope2'], { createIfNone: true }),
            extHostAuthentication.getSession(extensionDescription, 'concurrent-test', ['scope1'], {}) // This should get the existing session
        ];
        await Promise.all(promises);
        // Verify that operations were serialized - no overlapping operations
        // Build a map of operation starts to their corresponding ends
        const operationPairs = [];
        for (let i = 0; i < operationOrder.length; i++) {
            const current = operationOrder[i];
            if (current.includes('-start-')) {
                const scope = current.split('-start-')[1];
                const operationType = current.split('-start-')[0];
                const endOperation = `${operationType}-end-${scope}`;
                const endIndex = operationOrder.indexOf(endOperation, i + 1);
                if (endIndex !== -1) {
                    operationPairs.push({
                        start: i,
                        end: endIndex,
                        operation: `${operationType}-${scope}`
                    });
                }
            }
        }
        // Verify no operations overlap (serialization)
        for (let i = 0; i < operationPairs.length; i++) {
            for (let j = i + 1; j < operationPairs.length; j++) {
                const op1 = operationPairs[i];
                const op2 = operationPairs[j];
                // Operations should not overlap - one should completely finish before the other starts
                const op1EndsBeforeOp2Starts = op1.end < op2.start;
                const op2EndsBeforeOp1Starts = op2.end < op1.start;
                assert.ok(op1EndsBeforeOp2Starts || op2EndsBeforeOp1Starts, `Operations ${op1.operation} and ${op2.operation} should not overlap. ` +
                    `Op1: ${op1.start}-${op1.end}, Op2: ${op2.start}-${op2.end}. ` +
                    `Order: [${operationOrder.join(', ')}]`);
            }
        }
        // Verify we have the expected operations
        assert.ok(operationOrder.includes('create-start-scope1'), 'Should have created session for scope1');
        assert.ok(operationOrder.includes('create-end-scope1'), 'Should have completed creating session for scope1');
        assert.ok(operationOrder.includes('create-start-scope2'), 'Should have created session for scope2');
        assert.ok(operationOrder.includes('create-end-scope2'), 'Should have completed creating session for scope2');
        // The third call should use getSessions to find the existing scope1 session
        assert.ok(operationOrder.includes('get-start-scope1'), 'Should have called getSessions for existing scope1 session');
        assert.ok(operationOrder.includes('get-end-scope1'), 'Should have completed getSessions for existing scope1 session');
    });
    test('provider registration and immediate disposal race condition', async () => {
        const provider = new TestAuthProvider('race-test');
        // Register and immediately dispose
        const disposable = extHostAuthentication.registerAuthenticationProvider('race-test', 'Race Test', provider);
        disposable.dispose();
        // Try to use the provider after disposal - should fail gracefully
        try {
            await extHostAuthentication.getSession(extensionDescription, 'race-test', ['scope'], { createIfNone: true });
            assert.fail('Should have thrown an error for non-existent provider');
        }
        catch (error) {
            // Expected - provider should be unavailable
            assert.ok(error);
        }
    });
    test('provider re-registration after proper disposal', async () => {
        const provider1 = new TestAuthProvider('reregister-test-1');
        const provider2 = new TestAuthProvider('reregister-test-2');
        // First registration
        const disposable1 = extHostAuthentication.registerAuthenticationProvider('reregister-test', 'Provider 1', provider1);
        // Create a session with first provider
        const session1 = await extHostAuthentication.getSession(extensionDescription, 'reregister-test', ['scope'], { createIfNone: true });
        assert.strictEqual(session1?.account.label, 'reregister-test-1');
        // Dispose first provider
        disposable1.dispose();
        // Re-register with different provider
        const disposable2 = extHostAuthentication.registerAuthenticationProvider('reregister-test', 'Provider 2', provider2);
        disposables.add(disposable2);
        // Create session with second provider
        const session2 = await extHostAuthentication.getSession(extensionDescription, 'reregister-test', ['scope'], { createIfNone: true });
        assert.strictEqual(session2?.account.label, 'reregister-test-2');
        assert.notStrictEqual(session1?.accessToken, session2?.accessToken);
    });
    test('session operations during provider lifecycle changes', async () => {
        const provider = new TestAuthProvider('lifecycle-test');
        const disposable = extHostAuthentication.registerAuthenticationProvider('lifecycle-test', 'Lifecycle Test', provider);
        // Start a session creation
        const sessionPromise = extHostAuthentication.getSession(extensionDescription, 'lifecycle-test', ['scope'], { createIfNone: true });
        // Don't dispose immediately - let the session creation start
        await new Promise(resolve => setTimeout(resolve, 5));
        // Dispose the provider while the session creation is likely still in progress
        disposable.dispose();
        // The session creation should complete successfully even if we dispose during the operation
        const session = await sessionPromise;
        assert.ok(session);
        assert.strictEqual(session.account.label, 'lifecycle-test');
    });
    test('operations on different providers run concurrently', async () => {
        const provider1 = new TestAuthProvider('concurrent-1');
        const provider2 = new TestAuthProvider('concurrent-2');
        let provider1Started = false;
        let provider2Started = false;
        let provider1Finished = false;
        let provider2Finished = false;
        let concurrencyVerified = false;
        // Override createSession to track timing
        const originalCreate1 = provider1.createSession.bind(provider1);
        const originalCreate2 = provider2.createSession.bind(provider2);
        provider1.createSession = async (scopes) => {
            provider1Started = true;
            await new Promise(resolve => setTimeout(resolve, 20));
            const result = await originalCreate1(scopes);
            provider1Finished = true;
            return result;
        };
        provider2.createSession = async (scopes) => {
            provider2Started = true;
            // Provider 2 should start before provider 1 finishes (concurrent execution)
            if (provider1Started && !provider1Finished) {
                concurrencyVerified = true;
            }
            await new Promise(resolve => setTimeout(resolve, 10));
            const result = await originalCreate2(scopes);
            provider2Finished = true;
            return result;
        };
        const disposable1 = extHostAuthentication.registerAuthenticationProvider('concurrent-1', 'Concurrent 1', provider1);
        const disposable2 = extHostAuthentication.registerAuthenticationProvider('concurrent-2', 'Concurrent 2', provider2);
        disposables.add(disposable1);
        disposables.add(disposable2);
        // Start operations on both providers simultaneously
        const [session1, session2] = await Promise.all([
            extHostAuthentication.getSession(extensionDescription, 'concurrent-1', ['scope'], { createIfNone: true }),
            extHostAuthentication.getSession(extensionDescription, 'concurrent-2', ['scope'], { createIfNone: true })
        ]);
        // Verify both operations completed successfully
        assert.ok(session1);
        assert.ok(session2);
        assert.ok(provider1Started, 'Provider 1 should have started');
        assert.ok(provider2Started, 'Provider 2 should have started');
        assert.ok(provider1Finished, 'Provider 1 should have finished');
        assert.ok(provider2Finished, 'Provider 2 should have finished');
        assert.strictEqual(session1.account.label, 'concurrent-1');
        assert.strictEqual(session2.account.label, 'concurrent-2');
        // Verify that operations ran concurrently (provider 2 started while provider 1 was still running)
        assert.ok(concurrencyVerified, 'Operations should have run concurrently - provider 2 should start while provider 1 is still running');
    });
    //#endregion
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEF1dGhlbnRpY2F0aW9uLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdEF1dGhlbnRpY2F0aW9uLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ3RILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ25ILE9BQU8sRUFBd0Isa0JBQWtCLEVBQTRDLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDaEwsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDMUcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDckksT0FBTyxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixJQUFJLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDeEksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4SixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUVySyxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLDRCQUE0QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDcEosT0FBTyxFQUFpQiwyQkFBMkIsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQ3BJLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBQzlILE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzlELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDekgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQ2hILE9BQU8sRUFBRSw0Q0FBNEMsRUFBRSxNQUFNLGlGQUFpRixDQUFDO0FBQy9JLE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLHlGQUF5RixDQUFDO0FBQ3RKLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFMUYsTUFBTSxhQUFhO0lBQW5CO1FBR1EsVUFBSyxHQUFHLEVBQUUsQ0FBQztJQW1CbkIsQ0FBQztJQWxCQSxJQUFXLGFBQWE7UUFDdkIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ25CLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBOEM7UUFDekQsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7SUFDeEIsQ0FBQztJQUNELFNBQVMsQ0FBQyxRQUEwQztRQUNuRCxJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQztJQUN0QixDQUFDO0lBRUQsT0FBTztJQUVQLENBQUM7SUFDRCxJQUFJO1FBQ0gsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDckQsQ0FBQztDQUNEO0FBQ0QsTUFBTSx5QkFBMEIsU0FBUSxxQkFBcUI7SUFDbkQsZUFBZTtRQUN2QixPQUFZLElBQUksYUFBYSxFQUFFLENBQUM7SUFDakMsQ0FBQztDQUNEO0FBRUQsTUFBTSxvQkFBb0I7SUFFekIsNkJBQTZCLEtBQW9CLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1RSxpQkFBaUIsQ0FBQyxXQUFtQixJQUFzQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNGLGlCQUFpQixDQUFDLFVBQWtCLEVBQUUsV0FBbUIsSUFBcUIsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzFGLGtCQUFrQixDQUFDLFVBQWtCLEVBQUUsV0FBbUIsSUFBVSxDQUFDO0lBQ3JFLGVBQWUsQ0FBQyxVQUFrQixFQUFFLFdBQW1CLEVBQUUsTUFBNkIsRUFBRSxXQUFtQixFQUFFLGFBQXFCLElBQVUsQ0FBQztDQUM3STtBQUVELE1BQU0sZ0JBQWdCO0lBSXJCLFlBQTZCLGdCQUF3QjtRQUF4QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVE7UUFIN0MsT0FBRSxHQUFHLENBQUMsQ0FBQztRQUNQLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBaUMsQ0FBQztRQUM1RCx3QkFBbUIsR0FBRyxHQUFHLEVBQUUsR0FBRyxPQUFPLEVBQUUsT0FBTyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0QsQ0FBQztJQUMxRCxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQTBCO1FBQzNDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssaUJBQWlCLEVBQUUsQ0FBQztZQUNyQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDcEMsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNyRCxPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFDRCxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQXlCO1FBQzVDLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkMsTUFBTSxPQUFPLEdBQUc7WUFDZixNQUFNO1lBQ04sRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUNoQixPQUFPLEVBQUU7Z0JBQ1IsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7Z0JBQzVCLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUU7YUFDaEI7WUFDRCxXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7U0FDL0IsQ0FBQztRQUNGLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDVixPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBQ0QsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFpQjtRQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNqQyxDQUFDO0NBRUQ7QUFFRCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFOUQsSUFBSSxxQkFBNEMsQ0FBQztJQUNqRCxJQUFJLHdCQUFrRCxDQUFDO0lBRXZELEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixXQUFXO1FBQ1gsTUFBTSxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pDLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLElBQUksY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDOUQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxjQUFjLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRixRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxJQUFJLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDdEUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFDbEYsUUFBUSxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsRUFBRSxJQUFJLGNBQWMsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDLENBQUM7UUFDNUgsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7UUFDaEYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFDMUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDeEUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7UUFDOUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7UUFDaEYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUNoRSxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLElBQUksY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztRQUM1RSxRQUFRLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLElBQUksY0FBYyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQztRQUM1RixRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLElBQUksY0FBYyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUNoRixRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixFQUFFLElBQUksY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztRQUNwRixRQUFRLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxFQUFFLElBQUksY0FBYyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQztRQUNwRyx3QkFBd0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksd0JBQXdCLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUUvRyxRQUFRO1FBQ1IsbUVBQW1FO1FBQ25FLHdCQUF3QixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBNkIsQ0FBQyxDQUFDO1FBQzdFLHdCQUF3QixDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3ZFLHdCQUF3QixDQUFDLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBQzNGLHdCQUF3QixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUVuRSxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUUzRCxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkosV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZJLE1BQU0sUUFBUSxHQUE0QjtZQUN6QyxXQUFXLEVBQUU7Z0JBQ1osWUFBWSxFQUFFLE1BQU07Z0JBQ3BCLE9BQU8sRUFBRSxNQUFNO2FBQ2Y7U0FDTSxDQUFDO1FBQ1QscUJBQXFCLEdBQUcsSUFBSSxxQkFBcUIsQ0FDaEQsV0FBVyxFQUNYO1lBQ0MsV0FBVyxFQUFFO2dCQUNaLFlBQVksRUFBRSxNQUFNO2dCQUNwQixPQUFPLEVBQUUsTUFBTTthQUNmO1NBQ00sRUFDUixJQUFJLGFBQWEsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLEVBQ3hDLElBQUksV0FBVyxDQUFDLFdBQVcsQ0FBQyxFQUM1QixJQUFJLGVBQWUsQ0FBQyxXQUFXLENBQUMsRUFDaEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsRUFDeEMsSUFBSSxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztRQUNGLFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLHFCQUFxQixFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDN0UsV0FBVyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLEVBQUUsZUFBZSxFQUFFLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdILFdBQVcsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsOEJBQThCLENBQ25FLGVBQWUsRUFDZix3QkFBd0IsRUFDeEIsSUFBSSxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsRUFDckMsRUFBRSx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUJBQXFCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixNQUFNLE9BQU8sR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDckQsb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixNQUFNLEVBQ047WUFDQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUM7UUFDSixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQy9DLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkIsTUFBTSxTQUFTLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3ZELG9CQUFvQixFQUNwQixNQUFNLEVBQ04sTUFBTSxFQUNOLEVBQUUsQ0FBQyxDQUFDO1FBQ0wsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFekMseUJBQXlCO1FBQ3pCLE1BQU0sT0FBTyxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUNyRCxvQkFBb0IsRUFDcEIsTUFBTSxFQUNOLE1BQU0sRUFDTjtZQUNDLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQztRQUVKLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFOUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3RELG9CQUFvQixFQUNwQixNQUFNLEVBQ04sTUFBTSxFQUNOLEVBQUUsQ0FBQyxDQUFDO1FBRUwsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDaEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxnREFBZ0Q7SUFDaEQsSUFBSSxDQUFDLGVBQWUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoQyxNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sU0FBUyxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUN2RCxvQkFBb0IsRUFDcEIsTUFBTSxFQUNOLE1BQU0sRUFDTjtZQUNDLE1BQU0sRUFBRSxJQUFJO1NBQ1osQ0FBQyxDQUFDO1FBQ0osTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFekMseUJBQXlCO1FBQ3pCLE1BQU0sT0FBTyxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUNyRCxvQkFBb0IsRUFDcEIsTUFBTSxFQUNOLE1BQU0sRUFDTjtZQUNDLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQztRQUVKLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFOUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3RELG9CQUFvQixFQUNwQixNQUFNLEVBQ04sTUFBTSxFQUNOO1lBQ0MsTUFBTSxFQUFFLElBQUk7U0FDWixDQUFDLENBQUM7UUFFSixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixNQUFNLFFBQVEsR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDdEQsb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixNQUFNLEVBQ047WUFDQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUM7UUFFSix5QkFBeUI7UUFDekIsTUFBTSxRQUFRLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3RELG9CQUFvQixFQUNwQixNQUFNLEVBQ04sTUFBTSxFQUNOO1lBQ0MsZUFBZSxFQUFFLElBQUk7U0FDckIsQ0FBQyxDQUFDO1FBRUosTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUFDO0lBRUgsd0NBQXdDO0lBQ3hDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvRCxNQUFNLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUNyRCxvQkFBb0IsRUFDcEIsTUFBTSxFQUNOLE1BQU0sRUFDTjtZQUNDLGVBQWUsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQztRQUNKLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDL0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0MsTUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixNQUFNLFFBQVEsR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDdEQsb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixNQUFNLEVBQ047WUFDQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUM7UUFFSix5QkFBeUI7UUFDekIsTUFBTSxRQUFRLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3RELG9CQUFvQixFQUNwQixNQUFNLEVBQ04sTUFBTSxFQUNOO1lBQ0MsZUFBZSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTtTQUNsQyxDQUFDLENBQUM7UUFFSixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDcEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxvQ0FBb0M7SUFFcEMsSUFBSSxDQUFDLCtCQUErQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2hELE1BQU0sTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkIseUJBQXlCO1FBQ3pCLE1BQU0sT0FBTyxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUNyRCxvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLE1BQU0sRUFDTjtZQUNDLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQztRQUVKLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbEQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixNQUFNLFFBQVEsR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDdEQsb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixPQUFPLEVBQ1A7WUFDQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUM7UUFDSixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBELE1BQU0sUUFBUSxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUN0RCxvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLENBQUMsaUJBQWlCLENBQUMsRUFDbkI7WUFDQyxzQkFBc0IsRUFBRSxJQUFJO1lBQzVCLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQztRQUVKLGlFQUFpRTtRQUNqRSxxRUFBcUU7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDaEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsb0dBQW9HLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckgsTUFBTSxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2Qix5QkFBeUI7UUFDekIsTUFBTSxPQUFPLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3JELG9CQUFvQixFQUNwQixlQUFlLEVBQ2YsTUFBTSxFQUNOO1lBQ0MsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFDO1FBRUosTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVsRCxNQUFNLE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sUUFBUSxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUN0RCxvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLE9BQU8sRUFDUDtZQUNDLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQztRQUNKLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEQsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDOUQsb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixNQUFNLEVBQ04sRUFBRSxDQUFDLENBQUM7UUFDTCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV2RSxNQUFNLGdCQUFnQixHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUM5RCxvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLE9BQU8sRUFDUCxFQUFFLENBQUMsQ0FBQztRQUNMLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3pFLENBQUMsQ0FBQyxDQUFDO0lBRUgsWUFBWTtJQUVaLHFCQUFxQjtJQUVyQixJQUFJLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkQsSUFBSSxDQUFDO1lBQ0osTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3JDLG9CQUFvQixFQUNwQixNQUFNLEVBQ04sQ0FBQyxLQUFLLENBQUMsRUFDUDtnQkFDQyxZQUFZLEVBQUUsSUFBSTtnQkFDbEIsZUFBZSxFQUFFLElBQUk7YUFDckIsQ0FBQyxDQUFDO1lBQ0osTUFBTSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3QyxJQUFJLENBQUM7WUFDSixNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDckMsb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixDQUFDLEtBQUssQ0FBQyxFQUNQO2dCQUNDLGVBQWUsRUFBRSxJQUFJO2dCQUNyQixNQUFNLEVBQUUsSUFBSTthQUNaLENBQUMsQ0FBQztZQUNKLE1BQU0sQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZCxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUMsSUFBSSxDQUFDO1lBQ0osTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3JDLG9CQUFvQixFQUNwQixNQUFNLEVBQ04sQ0FBQyxLQUFLLENBQUMsRUFDUDtnQkFDQyxZQUFZLEVBQUUsSUFBSTtnQkFDbEIsTUFBTSxFQUFFLElBQUk7YUFDWixDQUFDLENBQUM7WUFDSixNQUFNLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDN0MsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9FQUFvRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JGLElBQUksT0FBTyxHQUFzQyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDdEYsb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixDQUFDLEtBQUssQ0FBQyxFQUNQO1lBQ0MsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFDO1FBQ0osT0FBTyxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUMvQyxvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLENBQUMsS0FBSyxDQUFDLEVBQ1A7WUFDQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUM7UUFDSixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTlDLE9BQU8sR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDL0Msb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixDQUFDLEtBQUssQ0FBQyxFQUNQO1lBQ0MsWUFBWSxFQUFFLEtBQUs7U0FDbkIsQ0FBQyxDQUFDO1FBQ0osTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMvQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1RUFBdUUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4RixJQUFJLE9BQU8sR0FBc0MsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQ3RGLG9CQUFvQixFQUNwQixlQUFlLEVBQ2YsQ0FBQyxLQUFLLENBQUMsRUFDUDtZQUNDLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQztRQUNKLE9BQU8sR0FBRyxNQUFNLHFCQUFxQixDQUFDLFVBQVUsQ0FDL0Msb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixDQUFDLEtBQUssQ0FBQyxFQUNQO1lBQ0MsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFDO1FBQ0osTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRW5ELE1BQU0sUUFBUSxHQUFHLE1BQU0scUJBQXFCLENBQUMsVUFBVSxDQUN0RCxvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLENBQUMsS0FBSyxDQUFDLEVBQ1A7WUFDQyxZQUFZLEVBQUUsS0FBSztTQUNuQixDQUFDLENBQUM7UUFDSixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDOUQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsd0ZBQXdGLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekcsTUFBTSxRQUFRLEdBQStDLHFCQUFxQixDQUFDLFVBQVUsQ0FDNUYsb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixDQUFDLEtBQUssQ0FBQyxFQUNQO1lBQ0MsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFDO1FBQ0osTUFBTSxTQUFTLEdBQStDLHFCQUFxQixDQUFDLFVBQVUsQ0FDN0Ysb0JBQW9CLEVBQ3BCLGVBQWUsRUFDZixDQUFDLEtBQUssQ0FBQyxFQUNQO1lBQ0MsWUFBWSxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFDO1FBQ0osTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUM7UUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRW5ELE1BQU0sUUFBUSxHQUFHLE1BQU0sU0FBUyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQztJQUM5RCxDQUFDLENBQUMsQ0FBQztJQUdILFlBQVk7SUFFWiw2Q0FBNkM7SUFFN0MsSUFBSSxDQUFDLHVEQUF1RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hFLE1BQU0sUUFBUSxHQUFHLElBQUksZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN6RCxNQUFNLGNBQWMsR0FBYSxFQUFFLENBQUM7UUFFcEMscURBQXFEO1FBQ3JELE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEUsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVoRSxRQUFRLENBQUMsYUFBYSxHQUFHLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN6QyxjQUFjLENBQUMsSUFBSSxDQUFDLGdCQUFnQixNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0I7WUFDN0UsTUFBTSxNQUFNLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuRCxjQUFjLENBQUMsSUFBSSxDQUFDLGNBQWMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMvQyxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQztRQUVGLFFBQVEsQ0FBQyxXQUFXLEdBQUcsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3ZDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDNUMsY0FBYyxDQUFDLElBQUksQ0FBQyxhQUFhLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDN0MsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQjtZQUM3RSxNQUFNLE1BQU0sR0FBRyxNQUFNLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pELGNBQWMsQ0FBQyxJQUFJLENBQUMsV0FBVyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQyxDQUFDO1FBRUYsTUFBTSxVQUFVLEdBQUcscUJBQXFCLENBQUMsOEJBQThCLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDeEgsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUU1QixnRUFBZ0U7UUFDaEUsTUFBTSxRQUFRLEdBQUc7WUFDaEIscUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDN0cscUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDN0cscUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsdUNBQXVDO1NBQ2pJLENBQUM7UUFFRixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFNUIscUVBQXFFO1FBQ3JFLDhEQUE4RDtRQUM5RCxNQUFNLGNBQWMsR0FBNkQsRUFBRSxDQUFDO1FBRXBGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEQsTUFBTSxPQUFPLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsRCxNQUFNLFlBQVksR0FBRyxHQUFHLGFBQWEsUUFBUSxLQUFLLEVBQUUsQ0FBQztnQkFDckQsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUU3RCxJQUFJLFFBQVEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNyQixjQUFjLENBQUMsSUFBSSxDQUFDO3dCQUNuQixLQUFLLEVBQUUsQ0FBQzt3QkFDUixHQUFHLEVBQUUsUUFBUTt3QkFDYixTQUFTLEVBQUUsR0FBRyxhQUFhLElBQUksS0FBSyxFQUFFO3FCQUN0QyxDQUFDLENBQUM7Z0JBQ0osQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsK0NBQStDO1FBQy9DLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDaEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3BELE1BQU0sR0FBRyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUIsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUU5Qix1RkFBdUY7Z0JBQ3ZGLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO2dCQUNuRCxNQUFNLHNCQUFzQixHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztnQkFFbkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxzQkFBc0IsSUFBSSxzQkFBc0IsRUFDekQsY0FBYyxHQUFHLENBQUMsU0FBUyxRQUFRLEdBQUcsQ0FBQyxTQUFTLHVCQUF1QjtvQkFDdkUsUUFBUSxHQUFHLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxHQUFHLFVBQVUsR0FBRyxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJO29CQUM5RCxXQUFXLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNDLENBQUM7UUFDRixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLHdDQUF3QyxDQUFDLENBQUM7UUFDcEcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsbURBQW1ELENBQUMsQ0FBQztRQUM3RyxNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO1FBQ3BHLE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLG1EQUFtRCxDQUFDLENBQUM7UUFFN0csNEVBQTRFO1FBQzVFLE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLDREQUE0RCxDQUFDLENBQUM7UUFDckgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsK0RBQStELENBQUMsQ0FBQztJQUN2SCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2REFBNkQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM5RSxNQUFNLFFBQVEsR0FBRyxJQUFJLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRW5ELG1DQUFtQztRQUNuQyxNQUFNLFVBQVUsR0FBRyxxQkFBcUIsQ0FBQyw4QkFBOEIsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQzVHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUVyQixrRUFBa0U7UUFDbEUsSUFBSSxDQUFDO1lBQ0osTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUM3RyxNQUFNLENBQUMsSUFBSSxDQUFDLHVEQUF1RCxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsNENBQTRDO1lBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ2pFLE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQWdCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM1RCxNQUFNLFNBQVMsR0FBRyxJQUFJLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFNUQscUJBQXFCO1FBQ3JCLE1BQU0sV0FBVyxHQUFHLHFCQUFxQixDQUFDLDhCQUE4QixDQUFDLGlCQUFpQixFQUFFLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVySCx1Q0FBdUM7UUFDdkMsTUFBTSxRQUFRLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3BJLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUVqRSx5QkFBeUI7UUFDekIsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRXRCLHNDQUFzQztRQUN0QyxNQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyw4QkFBOEIsQ0FBQyxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckgsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUU3QixzQ0FBc0M7UUFDdEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3BJLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNqRSxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3JFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZFLE1BQU0sUUFBUSxHQUFHLElBQUksZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN4RCxNQUFNLFVBQVUsR0FBRyxxQkFBcUIsQ0FBQyw4QkFBOEIsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUV0SCwyQkFBMkI7UUFDM0IsTUFBTSxjQUFjLEdBQUcscUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUVuSSw2REFBNkQ7UUFDN0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVyRCw4RUFBOEU7UUFDOUUsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRXJCLDRGQUE0RjtRQUM1RixNQUFNLE9BQU8sR0FBRyxNQUFNLGNBQWMsQ0FBQztRQUNyQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25CLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUM3RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxvREFBb0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNyRSxNQUFNLFNBQVMsR0FBRyxJQUFJLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFdkQsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDN0IsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDN0IsSUFBSSxpQkFBaUIsR0FBRyxLQUFLLENBQUM7UUFDOUIsSUFBSSxpQkFBaUIsR0FBRyxLQUFLLENBQUM7UUFDOUIsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUM7UUFFaEMseUNBQXlDO1FBQ3pDLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRWhFLFNBQVMsQ0FBQyxhQUFhLEdBQUcsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztZQUN4QixNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3RELE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdDLGlCQUFpQixHQUFHLElBQUksQ0FBQztZQUN6QixPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQztRQUVGLFNBQVMsQ0FBQyxhQUFhLEdBQUcsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztZQUN4Qiw0RUFBNEU7WUFDNUUsSUFBSSxnQkFBZ0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQzVDLG1CQUFtQixHQUFHLElBQUksQ0FBQztZQUM1QixDQUFDO1lBQ0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0RCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3QyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7WUFDekIsT0FBTyxNQUFNLENBQUM7UUFDZixDQUFDLENBQUM7UUFFRixNQUFNLFdBQVcsR0FBRyxxQkFBcUIsQ0FBQyw4QkFBOEIsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3BILE1BQU0sV0FBVyxHQUFHLHFCQUFxQixDQUFDLDhCQUE4QixDQUFDLGNBQWMsRUFBRSxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDcEgsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM3QixXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTdCLG9EQUFvRDtRQUNwRCxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUM5QyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLEVBQUUsY0FBYyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDekcscUJBQXFCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLGNBQWMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDO1NBQ3pHLENBQUMsQ0FBQztRQUVILGdEQUFnRDtRQUNoRCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDcEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQzlELE1BQU0sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztRQUM5RCxNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDaEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQztRQUUzRCxrR0FBa0c7UUFDbEcsTUFBTSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxxR0FBcUcsQ0FBQyxDQUFDO0lBQ3ZJLENBQUMsQ0FBQyxDQUFDO0lBRUgsWUFBWTtBQUNiLENBQUMsQ0FBQyxDQUFDIn0=