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
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { createServices } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import product from '../../../../../platform/product/common/product.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { RemoteAuthorityResolverService } from '../../../../../platform/remote/browser/remoteAuthorityResolverService.js';
import { IRemoteAuthorityResolverService } from '../../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../../platform/remote/common/remoteExtensionsScanner.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { IUserDataProfilesService, UserDataProfilesService } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustEnablementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchEnvironmentService } from '../../../environment/common/environmentService.js';
import { IWebExtensionsScannerService, IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService } from '../../../extensionManagement/common/extensionManagement.js';
import { BrowserExtensionHostKindPicker } from '../../browser/extensionService.js';
import { AbstractExtensionService } from '../../common/abstractExtensionService.js';
import { ExtensionManifestPropertiesService, IExtensionManifestPropertiesService } from '../../common/extensionManifestPropertiesService.js';
import { IExtensionService } from '../../common/extensions.js';
import { ExtensionsProposedApi } from '../../common/extensionsProposedApi.js';
import { ILifecycleService } from '../../../lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../../remote/common/remoteAgentService.js';
import { IUserDataProfileService } from '../../../userDataProfile/common/userDataProfile.js';
import { WorkspaceTrustEnablementService } from '../../../workspaces/common/workspaceTrust.js';
import { TestEnvironmentService, TestFileService, TestLifecycleService, TestRemoteAgentService, TestRemoteExtensionsScannerService, TestUserDataProfileService, TestWebExtensionsScannerService, TestWorkbenchExtensionEnablementService, TestWorkbenchExtensionManagementService } from '../../../../test/browser/workbenchTestServices.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
suite('BrowserExtensionService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('pickRunningLocation', () => {
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], false, true, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation([], true, true, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'web', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['ui', 'workspace', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'ui', 'workspace'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['web', 'workspace', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'ui', 'web'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], false, false, 0 /* ExtensionRunningPreference.None */), null);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], false, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], true, false, 0 /* ExtensionRunningPreference.None */), 2 /* ExtensionHostKind.LocalWebWorker */);
        assert.deepStrictEqual(BrowserExtensionHostKindPicker.pickRunningLocation(['workspace', 'web', 'ui'], true, true, 0 /* ExtensionRunningPreference.None */), 3 /* ExtensionHostKind.Remote */);
    });
});
suite('ExtensionService', () => {
    let MyTestExtensionService = class MyTestExtensionService extends AbstractExtensionService {
        constructor(instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService) {
            const extensionsProposedApi = instantiationService.createInstance(ExtensionsProposedApi);
            const extensionHostFactory = new class {
                createExtensionHost(runningLocations, runningLocation, isInitialStart) {
                    return new class extends mock() {
                        constructor() {
                            super(...arguments);
                            this.runningLocation = runningLocation;
                        }
                    };
                }
            };
            super({ allowRemoteExtensionsInLocalWebWorker: false, hasLocalProcess: true }, extensionsProposedApi, extensionHostFactory, null, instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, new TestDialogService());
            this._extHostId = 0;
            this.order = [];
        }
        _pickExtensionHostKind(extensionId, extensionKinds, isInstalledLocally, isInstalledRemotely, preference) {
            throw new Error('Method not implemented.');
        }
        _doCreateExtensionHostManager(extensionHost, initialActivationEvents) {
            const order = this.order;
            const extensionHostId = ++this._extHostId;
            order.push(`create ${extensionHostId}`);
            return new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidExit = Event.None;
                    this.onDidChangeResponsiveState = Event.None;
                }
                disconnect() {
                    return Promise.resolve();
                }
                start() {
                    return Promise.resolve();
                }
                dispose() {
                    order.push(`dispose ${extensionHostId}`);
                }
                representsRunningLocation(runningLocation) {
                    return extensionHost.runningLocation.equals(runningLocation);
                }
            };
        }
        _resolveExtensions() {
            throw new Error('Method not implemented.');
        }
        _scanSingleExtension(extension) {
            throw new Error('Method not implemented.');
        }
        _onExtensionHostExit(code) {
            throw new Error('Method not implemented.');
        }
        _resolveAuthority(remoteAuthority) {
            throw new Error('Method not implemented.');
        }
    };
    MyTestExtensionService = __decorate([
        __param(0, IInstantiationService),
        __param(1, INotificationService),
        __param(2, IWorkbenchEnvironmentService),
        __param(3, ITelemetryService),
        __param(4, IWorkbenchExtensionEnablementService),
        __param(5, IFileService),
        __param(6, IProductService),
        __param(7, IWorkbenchExtensionManagementService),
        __param(8, IWorkspaceContextService),
        __param(9, IConfigurationService),
        __param(10, IExtensionManifestPropertiesService),
        __param(11, ILogService),
        __param(12, IRemoteAgentService),
        __param(13, IRemoteExtensionsScannerService),
        __param(14, ILifecycleService),
        __param(15, IRemoteAuthorityResolverService)
    ], MyTestExtensionService);
    let disposables;
    let instantiationService;
    let extService;
    setup(() => {
        disposables = new DisposableStore();
        const testProductService = { _serviceBrand: undefined, ...product };
        disposables.add(instantiationService = createServices(disposables, [
            // custom
            [IExtensionService, MyTestExtensionService],
            // default
            [ILifecycleService, TestLifecycleService],
            [IWorkbenchExtensionManagementService, TestWorkbenchExtensionManagementService],
            [INotificationService, TestNotificationService],
            [IRemoteAgentService, TestRemoteAgentService],
            [ILogService, NullLogService],
            [IWebExtensionsScannerService, TestWebExtensionsScannerService],
            [IExtensionManifestPropertiesService, ExtensionManifestPropertiesService],
            [IConfigurationService, TestConfigurationService],
            [IWorkspaceContextService, TestContextService],
            [IProductService, testProductService],
            [IFileService, TestFileService],
            [IWorkbenchExtensionEnablementService, TestWorkbenchExtensionEnablementService],
            [ITelemetryService, NullTelemetryService],
            [IEnvironmentService, TestEnvironmentService],
            [IWorkspaceTrustEnablementService, WorkspaceTrustEnablementService],
            [IUserDataProfilesService, UserDataProfilesService],
            [IUserDataProfileService, TestUserDataProfileService],
            [IUriIdentityService, UriIdentityService],
            [IRemoteExtensionsScannerService, TestRemoteExtensionsScannerService],
            [IRemoteAuthorityResolverService, new RemoteAuthorityResolverService(false, undefined, undefined, undefined, testProductService, new NullLogService())]
        ]));
        extService = instantiationService.get(IExtensionService);
    });
    teardown(async () => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #152204: Remote extension host not disposed after closing vscode client', async () => {
        await extService.startExtensionHosts();
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, (['create 1', 'create 2', 'create 3', 'dispose 3', 'dispose 2', 'dispose 1']));
    });
    test('Extension host disposed when awaited', async () => {
        await extService.startExtensionHosts();
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, (['create 1', 'create 2', 'create 3', 'dispose 3', 'dispose 2', 'dispose 1']));
    });
    test('Extension host not disposed when vetoed (sync)', async () => {
        await extService.startExtensionHosts();
        disposables.add(extService.onWillStop(e => e.veto(true, 'test 1')));
        disposables.add(extService.onWillStop(e => e.veto(false, 'test 2')));
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, (['create 1', 'create 2', 'create 3']));
    });
    test('Extension host not disposed when vetoed (async)', async () => {
        await extService.startExtensionHosts();
        disposables.add(extService.onWillStop(e => e.veto(false, 'test 1')));
        disposables.add(extService.onWillStop(e => e.veto(Promise.resolve(true), 'test 2')));
        disposables.add(extService.onWillStop(e => e.veto(Promise.resolve(false), 'test 3')));
        await extService.stopExtensionHosts('foo');
        assert.deepStrictEqual(extService.order, (['create 1', 'create 2', 'create 3']));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy90ZXN0L2Jyb3dzZXIvZXh0ZW5zaW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNyRyxPQUFPLEVBQWlCLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFL0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBNEIsY0FBYyxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekksT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUs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