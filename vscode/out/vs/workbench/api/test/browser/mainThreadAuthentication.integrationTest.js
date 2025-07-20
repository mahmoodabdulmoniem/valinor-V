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
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { MainThreadAuthentication } from '../../browser/mainThreadAuthentication.js';
import { ExtHostContext, MainContext } from '../../common/extHost.protocol.js';
import { IActivityService } from '../../../services/activity/common/activity.js';
import { AuthenticationService } from '../../../services/authentication/browser/authenticationService.js';
import { IAuthenticationExtensionsService, IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { TestEnvironmentService, TestHostService, TestQuickInputService, TestRemoteAgentService } from '../../../test/browser/workbenchTestServices.js';
import { TestActivityService, TestExtensionService, TestProductService, TestStorageService } from '../../../test/common/workbenchTestServices.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { AuthenticationAccessService, IAuthenticationAccessService } from '../../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationUsageService } from '../../../services/authentication/browser/authenticationUsageService.js';
import { AuthenticationExtensionsService } from '../../../services/authentication/browser/authenticationExtensionsService.js';
import { ILogService, NullLogService } from '../../../../platform/log/common/log.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IUserActivityService, UserActivityService } from '../../../services/userActivity/common/userActivityService.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { TestSecretStorageService } from '../../../../platform/secrets/test/common/testSecretStorageService.js';
import { IDynamicAuthenticationProviderStorageService } from '../../../services/authentication/common/dynamicAuthenticationProviderStorage.js';
import { DynamicAuthenticationProviderStorageService } from '../../../services/authentication/browser/dynamicAuthenticationProviderStorageService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
class TestAuthUsageService {
    initializeExtensionUsageCache() { return Promise.resolve(); }
    extensionUsesAuth(extensionId) { return Promise.resolve(false); }
    readAccountUsages(providerId, accountName) { return []; }
    removeAccountUsage(providerId, accountName) { }
    addAccountUsage(providerId, accountName, scopes, extensionId, extensionName) { }
}
suite('MainThreadAuthentication', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let mainThreadAuthentication;
    let instantiationService;
    let rpcProtocol;
    setup(async () => {
        // services
        const services = new ServiceCollection();
        services.set(ILogService, new SyncDescriptor(NullLogService));
        services.set(IDialogService, new SyncDescriptor(TestDialogService, [{ confirmed: true }]));
        services.set(IStorageService, new SyncDescriptor(TestStorageService));
        services.set(ISecretStorageService, new SyncDescriptor(TestSecretStorageService));
        services.set(IDynamicAuthenticationProviderStorageService, new SyncDescriptor(DynamicAuthenticationProviderStorageService));
        services.set(IQuickInputService, new SyncDescriptor(TestQuickInputService));
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
        instantiationService = disposables.add(new TestInstantiationService(services, undefined, undefined, true));
        // stubs
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        instantiationService.stub(IOpenerService, {});
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(IBrowserWorkbenchEnvironmentService, TestEnvironmentService);
        instantiationService.stub(IProductService, TestProductService);
        rpcProtocol = disposables.add(new TestRPCProtocol());
        mainThreadAuthentication = disposables.add(instantiationService.createInstance(MainThreadAuthentication, rpcProtocol));
        rpcProtocol.set(MainContext.MainThreadAuthentication, mainThreadAuthentication);
    });
    test('provider registration completes without errors', async () => {
        // Test basic registration - this should complete without throwing
        await mainThreadAuthentication.$registerAuthenticationProvider('test-provider', 'Test Provider', false);
        // Test unregistration - this should also complete without throwing
        await mainThreadAuthentication.$unregisterAuthenticationProvider('test-provider');
        // Success if we reach here without timeout
        assert.ok(true, 'Registration and unregistration completed successfully');
    });
    test('event suppression during explicit unregistration', async () => {
        let unregisterEventFired = false;
        let eventProviderId;
        // Mock the ext host to capture unregister events
        const mockExtHost = {
            $onDidUnregisterAuthenticationProvider: (id) => {
                unregisterEventFired = true;
                eventProviderId = id;
                return Promise.resolve();
            },
            $getSessions: () => Promise.resolve([]),
            $createSession: () => Promise.resolve({}),
            $removeSession: () => Promise.resolve(),
            $onDidChangeAuthenticationSessions: () => Promise.resolve(),
            $registerDynamicAuthProvider: () => Promise.resolve('test'),
            $onDidChangeDynamicAuthProviderTokens: () => Promise.resolve()
        };
        rpcProtocol.set(ExtHostContext.ExtHostAuthentication, mockExtHost);
        // Register a provider
        await mainThreadAuthentication.$registerAuthenticationProvider('test-suppress', 'Test Suppress', false);
        // Reset the flag
        unregisterEventFired = false;
        eventProviderId = undefined;
        // Unregister the provider - this should NOT fire the event due to suppression
        await mainThreadAuthentication.$unregisterAuthenticationProvider('test-suppress');
        // Verify the event was suppressed
        assert.strictEqual(unregisterEventFired, false, 'Unregister event should be suppressed during explicit unregistration');
        assert.strictEqual(eventProviderId, undefined, 'No provider ID should be captured from suppressed event');
    });
    test('concurrent provider registrations complete without errors', async () => {
        // Register multiple providers simultaneously
        const registrationPromises = [
            mainThreadAuthentication.$registerAuthenticationProvider('concurrent-1', 'Concurrent 1', false),
            mainThreadAuthentication.$registerAuthenticationProvider('concurrent-2', 'Concurrent 2', false),
            mainThreadAuthentication.$registerAuthenticationProvider('concurrent-3', 'Concurrent 3', false)
        ];
        await Promise.all(registrationPromises);
        // Unregister all providers
        const unregistrationPromises = [
            mainThreadAuthentication.$unregisterAuthenticationProvider('concurrent-1'),
            mainThreadAuthentication.$unregisterAuthenticationProvider('concurrent-2'),
            mainThreadAuthentication.$unregisterAuthenticationProvider('concurrent-3')
        ];
        await Promise.all(unregistrationPromises);
        // Success if we reach here without timeout
        assert.ok(true, 'Concurrent registrations and unregistrations completed successfully');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEF1dGhlbnRpY2F0aW9uLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZEF1dGhlbnRpY2F0aW9uLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ3RILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNyRixPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQzFHLE9BQU8s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