/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hostname, release } from 'os';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { onUnexpectedError, setUnexpectedErrorHandler } from '../../../base/common/errors.js';
import { combinedDisposable, Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { Emitter } from '../../../base/common/event.js';
import { ProxyChannel, StaticRouter } from '../../../base/parts/ipc/common/ipc.js';
import { Server as UtilityProcessMessagePortServer, once } from '../../../base/parts/ipc/node/ipc.mp.js';
import { CodeCacheCleaner } from './contrib/codeCacheCleaner.js';
import { LanguagePackCachedDataCleaner } from './contrib/languagePackCachedDataCleaner.js';
import { LocalizationsUpdater } from './contrib/localizationsUpdater.js';
import { LogsDataCleaner } from './contrib/logsDataCleaner.js';
import { UnusedWorkspaceStorageDataCleaner } from './contrib/storageDataCleaner.js';
import { IChecksumService } from '../../../platform/checksum/common/checksumService.js';
import { ChecksumService } from '../../../platform/checksum/node/checksumService.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../../platform/configuration/common/configurationService.js';
import { IDiagnosticsService } from '../../../platform/diagnostics/common/diagnostics.js';
import { DiagnosticsService } from '../../../platform/diagnostics/node/diagnosticsService.js';
import { IDownloadService } from '../../../platform/download/common/download.js';
import { DownloadService } from '../../../platform/download/common/downloadService.js';
import { INativeEnvironmentService } from '../../../platform/environment/common/environment.js';
import { GlobalExtensionEnablementService } from '../../../platform/extensionManagement/common/extensionEnablementService.js';
import { ExtensionGalleryService } from '../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IAllowedExtensionsService, IExtensionGalleryService, IExtensionManagementService, IExtensionTipsService, IGlobalExtensionEnablementService } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService } from '../../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { ExtensionManagementChannel, ExtensionTipsChannel } from '../../../platform/extensionManagement/common/extensionManagementIpc.js';
import { ExtensionManagementService, INativeServerExtensionManagementService } from '../../../platform/extensionManagement/node/extensionManagementService.js';
import { IExtensionRecommendationNotificationService } from '../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { InstantiationService } from '../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { ILanguagePackService } from '../../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../../platform/languagePacks/node/languagePacks.js';
import { ConsoleLogger, ILoggerService, ILogService } from '../../../platform/log/common/log.js';
import { LoggerChannelClient } from '../../../platform/log/common/logIpc.js';
import product from '../../../platform/product/common/product.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { IRequestService } from '../../../platform/request/common/request.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { resolveCommonProperties } from '../../../platform/telemetry/common/commonProperties.js';
import { ICustomEndpointTelemetryService, ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { TelemetryAppenderChannel } from '../../../platform/telemetry/common/telemetryIpc.js';
import { TelemetryLogAppender } from '../../../platform/telemetry/common/telemetryLogAppender.js';
import { TelemetryService } from '../../../platform/telemetry/common/telemetryService.js';
import { supportsTelemetry, NullAppender, NullTelemetryService, getPiiPathsFromEnvironment, isInternalTelemetry, isLoggingOnly } from '../../../platform/telemetry/common/telemetryUtils.js';
import { CustomEndpointTelemetryService } from '../../../platform/telemetry/node/customEndpointTelemetryService.js';
import { ExtensionStorageService, IExtensionStorageService } from '../../../platform/extensionManagement/common/extensionStorage.js';
import { IgnoredExtensionsManagementService, IIgnoredExtensionsManagementService } from '../../../platform/userDataSync/common/ignoredExtensions.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService, IUserDataSyncUtilService, registerConfiguration as registerUserDataSyncConfiguration, IUserDataSyncResourceProviderService } from '../../../platform/userDataSync/common/userDataSync.js';
import { IUserDataSyncAccountService, UserDataSyncAccountService } from '../../../platform/userDataSync/common/userDataSyncAccount.js';
import { UserDataSyncLocalStoreService } from '../../../platform/userDataSync/common/userDataSyncLocalStoreService.js';
import { UserDataSyncAccountServiceChannel, UserDataSyncStoreManagementServiceChannel } from '../../../platform/userDataSync/common/userDataSyncIpc.js';
import { UserDataSyncLogService } from '../../../platform/userDataSync/common/userDataSyncLog.js';
import { IUserDataSyncMachinesService, UserDataSyncMachinesService } from '../../../platform/userDataSync/common/userDataSyncMachines.js';
import { UserDataSyncEnablementService } from '../../../platform/userDataSync/common/userDataSyncEnablementService.js';
import { UserDataSyncService } from '../../../platform/userDataSync/common/userDataSyncService.js';
import { UserDataSyncServiceChannel } from '../../../platform/userDataSync/common/userDataSyncServiceIpc.js';
import { UserDataSyncStoreManagementService, UserDataSyncStoreService } from '../../../platform/userDataSync/common/userDataSyncStoreService.js';
import { IUserDataProfileStorageService } from '../../../platform/userDataProfile/common/userDataProfileStorageService.js';
import { SharedProcessUserDataProfileStorageService } from '../../../platform/userDataProfile/node/userDataProfileStorageService.js';
import { ActiveWindowManager } from '../../../platform/windows/node/windowTracker.js';
import { ISignService } from '../../../platform/sign/common/sign.js';
import { SignService } from '../../../platform/sign/node/signService.js';
import { ISharedTunnelsService } from '../../../platform/tunnel/common/tunnel.js';
import { SharedTunnelsService } from '../../../platform/tunnel/node/tunnelService.js';
import { ipcSharedProcessTunnelChannelName, ISharedProcessTunnelService } from '../../../platform/remote/common/sharedProcessTunnelService.js';
import { SharedProcessTunnelService } from '../../../platform/tunnel/node/sharedProcessTunnelService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { isLinux } from '../../../base/common/platform.js';
import { FileUserDataProvider } from '../../../platform/userData/common/fileUserDataProvider.js';
import { DiskFileSystemProviderClient, LOCAL_FILE_SYSTEM_CHANNEL_NAME } from '../../../platform/files/common/diskFileSystemProviderClient.js';
import { InspectProfilingService as V8InspectProfilingService } from '../../../platform/profiling/node/profilingService.js';
import { IV8InspectProfilingService } from '../../../platform/profiling/common/profiling.js';
import { IExtensionsScannerService } from '../../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from '../../../platform/extensionManagement/node/extensionsScannerService.js';
import { IUserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfile.js';
import { IExtensionsProfileScannerService } from '../../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { PolicyChannelClient } from '../../../platform/policy/common/policyIpc.js';
import { IPolicyService, NullPolicyService } from '../../../platform/policy/common/policy.js';
import { UserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfileIpc.js';
import { OneDataSystemAppender } from '../../../platform/telemetry/node/1dsAppender.js';
import { UserDataProfilesCleaner } from './contrib/userDataProfilesCleaner.js';
import { IRemoteTunnelService } from '../../../platform/remoteTunnel/common/remoteTunnel.js';
import { UserDataSyncResourceProviderService } from '../../../platform/userDataSync/common/userDataSyncResourceProvider.js';
import { ExtensionsContributions } from './contrib/extensions.js';
import { localize } from '../../../nls.js';
import { LogService } from '../../../platform/log/common/logService.js';
import { ISharedProcessLifecycleService, SharedProcessLifecycleService } from '../../../platform/lifecycle/node/sharedProcessLifecycleService.js';
import { RemoteTunnelService } from '../../../platform/remoteTunnel/node/remoteTunnelService.js';
import { ExtensionsProfileScannerService } from '../../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { ExtensionRecommendationNotificationServiceChannelClient } from '../../../platform/extensionRecommendations/common/extensionRecommendationsIpc.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { NativeHostService } from '../../../platform/native/common/nativeHostService.js';
import { UserDataAutoSyncService } from '../../../platform/userDataSync/node/userDataAutoSyncService.js';
import { ExtensionTipsService } from '../../../platform/extensionManagement/node/extensionTipsService.js';
import { IMainProcessService, MainProcessService } from '../../../platform/ipc/common/mainProcessService.js';
import { RemoteStorageService } from '../../../platform/storage/common/storageService.js';
import { IRemoteSocketFactoryService, RemoteSocketFactoryService } from '../../../platform/remote/common/remoteSocketFactoryService.js';
import { nodeSocketFactory } from '../../../platform/remote/node/nodeSocketFactory.js';
import { NativeEnvironmentService } from '../../../platform/environment/node/environmentService.js';
import { SharedProcessRawConnection, SharedProcessLifecycle } from '../../../platform/sharedProcess/common/sharedProcess.js';
import { getOSReleaseInfo } from '../../../base/node/osReleaseInfo.js';
import { getDesktopEnvironment } from '../../../base/common/desktopEnvironmentInfo.js';
import { getCodeDisplayProtocol, getDisplayProtocol } from '../../../base/node/osDisplayProtocolInfo.js';
import { RequestService } from '../../../platform/request/electron-utility/requestService.js';
import { DefaultExtensionsInitializer } from './contrib/defaultExtensionsInitializer.js';
import { AllowedExtensionsService } from '../../../platform/extensionManagement/common/allowedExtensionsService.js';
import { IExtensionGalleryManifestService } from '../../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestIPCService } from '../../../platform/extensionManagement/common/extensionGalleryManifestServiceIpc.js';
import { ISharedWebContentExtractorService } from '../../../platform/webContentExtractor/common/webContentExtractor.js';
import { SharedWebContentExtractorService } from '../../../platform/webContentExtractor/node/sharedWebContentExtractorService.js';
import { McpManagementService } from '../../../platform/mcp/node/mcpManagementService.js';
import { IAllowedMcpServersService, IMcpGalleryService, IMcpManagementService } from '../../../platform/mcp/common/mcpManagement.js';
import { IMcpResourceScannerService, McpResourceScannerService } from '../../../platform/mcp/common/mcpResourceScannerService.js';
import { McpGalleryService } from '../../../platform/mcp/common/mcpGalleryService.js';
import { McpManagementChannel } from '../../../platform/mcp/common/mcpManagementIpc.js';
import { AllowedMcpServersService } from '../../../platform/mcp/common/allowedMcpServersService.js';
class SharedProcessMain extends Disposable {
    constructor(configuration) {
        super();
        this.configuration = configuration;
        this.server = this._register(new UtilityProcessMessagePortServer(this));
        this.lifecycleService = undefined;
        this.onDidWindowConnectRaw = this._register(new Emitter());
        this.registerListeners();
    }
    registerListeners() {
        // Shared process lifecycle
        let didExit = false;
        const onExit = () => {
            if (!didExit) {
                didExit = true;
                this.lifecycleService?.fireOnWillShutdown();
                this.dispose();
            }
        };
        process.once('exit', onExit);
        once(process.parentPort, SharedProcessLifecycle.exit, onExit);
    }
    async init() {
        // Services
        const instantiationService = await this.initServices();
        // Config
        registerUserDataSyncConfiguration();
        instantiationService.invokeFunction(accessor => {
            const logService = accessor.get(ILogService);
            const telemetryService = accessor.get(ITelemetryService);
            // Log info
            logService.trace('sharedProcess configuration', JSON.stringify(this.configuration));
            // Channels
            this.initChannels(accessor);
            // Error handler
            this.registerErrorHandler(logService);
            // Report Client OS/DE Info
            this.reportClientOSInfo(telemetryService, logService);
        });
        // Instantiate Contributions
        this._register(combinedDisposable(instantiationService.createInstance(CodeCacheCleaner, this.configuration.codeCachePath), instantiationService.createInstance(LanguagePackCachedDataCleaner), instantiationService.createInstance(UnusedWorkspaceStorageDataCleaner), instantiationService.createInstance(LogsDataCleaner), instantiationService.createInstance(LocalizationsUpdater), instantiationService.createInstance(ExtensionsContributions), instantiationService.createInstance(UserDataProfilesCleaner), instantiationService.createInstance(DefaultExtensionsInitializer)));
    }
    async initServices() {
        const services = new ServiceCollection();
        // Product
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        // Main Process
        const mainRouter = new StaticRouter(ctx => ctx === 'main');
        const mainProcessService = new MainProcessService(this.server, mainRouter);
        services.set(IMainProcessService, mainProcessService);
        // Policies
        const policyService = this.configuration.policiesData ? new PolicyChannelClient(this.configuration.policiesData, mainProcessService.getChannel('policy')) : new NullPolicyService();
        services.set(IPolicyService, policyService);
        // Environment
        const environmentService = new NativeEnvironmentService(this.configuration.args, productService);
        services.set(INativeEnvironmentService, environmentService);
        // Logger
        const loggerService = new LoggerChannelClient(undefined, this.configuration.logLevel, environmentService.logsHome, this.configuration.loggers.map(loggerResource => ({ ...loggerResource, resource: URI.revive(loggerResource.resource) })), mainProcessService.getChannel('logger'));
        services.set(ILoggerService, loggerService);
        // Log
        const sharedLogGroup = { id: 'shared', name: localize('sharedLog', "Shared") };
        const logger = this._register(loggerService.createLogger('sharedprocess', { name: localize('sharedLog', "Shared"), group: sharedLogGroup }));
        const consoleLogger = this._register(new ConsoleLogger(logger.getLevel()));
        const logService = this._register(new LogService(logger, [consoleLogger]));
        services.set(ILogService, logService);
        // Lifecycle
        this.lifecycleService = this._register(new SharedProcessLifecycleService(logService));
        services.set(ISharedProcessLifecycleService, this.lifecycleService);
        // Files
        const fileService = this._register(new FileService(logService));
        services.set(IFileService, fileService);
        const diskFileSystemProvider = this._register(new DiskFileSystemProvider(logService));
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
        // URI Identity
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const userDataProfilesService = this._register(new UserDataProfilesService(this.configuration.profiles.all, URI.revive(this.configuration.profiles.home).with({ scheme: environmentService.userRoamingDataHome.scheme }), mainProcessService.getChannel('userDataProfiles')));
        services.set(IUserDataProfilesService, userDataProfilesService);
        const userDataFileSystemProvider = this._register(new FileUserDataProvider(Schemas.file, 
        // Specifically for user data, use the disk file system provider
        // from the main process to enable atomic read/write operations.
        // Since user data can change very frequently across multiple
        // processes, we want a single process handling these operations.
        this._register(new DiskFileSystemProviderClient(mainProcessService.getChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME), { pathCaseSensitive: isLinux })), Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService));
        fileService.registerProvider(Schemas.vscodeUserData, userDataFileSystemProvider);
        // Configuration
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, policyService, logService));
        services.set(IConfigurationService, configurationService);
        // Storage (global access only)
        const storageService = new RemoteStorageService(undefined, { defaultProfile: userDataProfilesService.defaultProfile, currentProfile: userDataProfilesService.defaultProfile }, mainProcessService, environmentService);
        services.set(IStorageService, storageService);
        this._register(toDisposable(() => storageService.flush()));
        // Initialize config & storage in parallel
        await Promise.all([
            configurationService.initialize(),
            storageService.initialize()
        ]);
        // Request
        const networkLogger = this._register(loggerService.createLogger(`network-shared`, { name: localize('networkk', "Network"), group: sharedLogGroup }));
        const requestService = new RequestService(configurationService, environmentService, this._register(new LogService(networkLogger)));
        services.set(IRequestService, requestService);
        // Checksum
        services.set(IChecksumService, new SyncDescriptor(ChecksumService, undefined, false /* proxied to other processes */));
        // V8 Inspect profiler
        services.set(IV8InspectProfilingService, new SyncDescriptor(V8InspectProfilingService, undefined, false /* proxied to other processes */));
        // Native Host
        const nativeHostService = new NativeHostService(-1 /* we are not running in a browser window context */, mainProcessService);
        services.set(INativeHostService, nativeHostService);
        // Download
        services.set(IDownloadService, new SyncDescriptor(DownloadService, undefined, true));
        // Extension recommendations
        const activeWindowManager = this._register(new ActiveWindowManager(nativeHostService));
        const activeWindowRouter = new StaticRouter(ctx => activeWindowManager.getActiveClientId().then(id => ctx === id));
        services.set(IExtensionRecommendationNotificationService, new ExtensionRecommendationNotificationServiceChannelClient(this.server.getChannel('extensionRecommendationNotification', activeWindowRouter)));
        // Telemetry
        let telemetryService;
        const appenders = [];
        const internalTelemetry = isInternalTelemetry(productService, configurationService);
        if (supportsTelemetry(productService, environmentService)) {
            const logAppender = new TelemetryLogAppender('', false, loggerService, environmentService, productService);
            appenders.push(logAppender);
            if (!isLoggingOnly(productService, environmentService) && productService.aiConfig?.ariaKey) {
                const collectorAppender = new OneDataSystemAppender(requestService, internalTelemetry, 'monacoworkbench', null, productService.aiConfig.ariaKey);
                this._register(toDisposable(() => collectorAppender.flush())); // Ensure the 1DS appender is disposed so that it flushes remaining data
                appenders.push(collectorAppender);
            }
            telemetryService = new TelemetryService({
                appenders,
                commonProperties: resolveCommonProperties(release(), hostname(), process.arch, productService.commit, productService.version, this.configuration.machineId, this.configuration.sqmId, this.configuration.devDeviceId, internalTelemetry, productService.date),
                sendErrorTelemetry: true,
                piiPaths: getPiiPathsFromEnvironment(environmentService),
            }, configurationService, productService);
        }
        else {
            telemetryService = NullTelemetryService;
            const nullAppender = NullAppender;
            appenders.push(nullAppender);
        }
        this.server.registerChannel('telemetryAppender', new TelemetryAppenderChannel(appenders));
        services.set(ITelemetryService, telemetryService);
        // Custom Endpoint Telemetry
        const customEndpointTelemetryService = new CustomEndpointTelemetryService(configurationService, telemetryService, loggerService, environmentService, productService);
        services.set(ICustomEndpointTelemetryService, customEndpointTelemetryService);
        // Extension Management
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));
        services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService, undefined, true));
        services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService, undefined, true));
        services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService, undefined, true));
        // MCP Management
        services.set(IAllowedMcpServersService, new SyncDescriptor(AllowedMcpServersService, undefined, true));
        services.set(IMcpGalleryService, new SyncDescriptor(McpGalleryService, undefined, true));
        services.set(IMcpResourceScannerService, new SyncDescriptor(McpResourceScannerService, undefined, true));
        services.set(IMcpManagementService, new SyncDescriptor(McpManagementService, undefined, true));
        // Extension Gallery
        services.set(IExtensionGalleryManifestService, new ExtensionGalleryManifestIPCService(this.server, productService));
        services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryService, undefined, true));
        // Extension Tips
        services.set(IExtensionTipsService, new SyncDescriptor(ExtensionTipsService, undefined, false /* Eagerly scans and computes exe based recommendations */));
        // Localizations
        services.set(ILanguagePackService, new SyncDescriptor(NativeLanguagePackService, undefined, false /* proxied to other processes */));
        // Diagnostics
        services.set(IDiagnosticsService, new SyncDescriptor(DiagnosticsService, undefined, false /* proxied to other processes */));
        // Settings Sync
        services.set(IUserDataSyncAccountService, new SyncDescriptor(UserDataSyncAccountService, undefined, true));
        services.set(IUserDataSyncLogService, new SyncDescriptor(UserDataSyncLogService, undefined, true));
        services.set(IUserDataSyncUtilService, ProxyChannel.toService(this.server.getChannel('userDataSyncUtil', client => client.ctx !== 'main')));
        services.set(IGlobalExtensionEnablementService, new SyncDescriptor(GlobalExtensionEnablementService, undefined, false /* Eagerly resets installed extensions */));
        services.set(IIgnoredExtensionsManagementService, new SyncDescriptor(IgnoredExtensionsManagementService, undefined, true));
        services.set(IExtensionStorageService, new SyncDescriptor(ExtensionStorageService));
        services.set(IUserDataSyncStoreManagementService, new SyncDescriptor(UserDataSyncStoreManagementService, undefined, true));
        services.set(IUserDataSyncStoreService, new SyncDescriptor(UserDataSyncStoreService, undefined, true));
        services.set(IUserDataSyncMachinesService, new SyncDescriptor(UserDataSyncMachinesService, undefined, true));
        services.set(IUserDataSyncLocalStoreService, new SyncDescriptor(UserDataSyncLocalStoreService, undefined, false /* Eagerly cleans up old backups */));
        services.set(IUserDataSyncEnablementService, new SyncDescriptor(UserDataSyncEnablementService, undefined, true));
        services.set(IUserDataSyncService, new SyncDescriptor(UserDataSyncService, undefined, false /* Initializes the Sync State */));
        services.set(IUserDataProfileStorageService, new SyncDescriptor(SharedProcessUserDataProfileStorageService, undefined, true));
        services.set(IUserDataSyncResourceProviderService, new SyncDescriptor(UserDataSyncResourceProviderService, undefined, true));
        // Signing
        services.set(ISignService, new SyncDescriptor(SignService, undefined, false /* proxied to other processes */));
        // Tunnel
        const remoteSocketFactoryService = new RemoteSocketFactoryService();
        services.set(IRemoteSocketFactoryService, remoteSocketFactoryService);
        remoteSocketFactoryService.register(0 /* RemoteConnectionType.WebSocket */, nodeSocketFactory);
        services.set(ISharedTunnelsService, new SyncDescriptor(SharedTunnelsService));
        services.set(ISharedProcessTunnelService, new SyncDescriptor(SharedProcessTunnelService));
        // Remote Tunnel
        services.set(IRemoteTunnelService, new SyncDescriptor(RemoteTunnelService));
        // Web Content Extractor
        services.set(ISharedWebContentExtractorService, new SyncDescriptor(SharedWebContentExtractorService));
        return new InstantiationService(services);
    }
    initChannels(accessor) {
        // Extensions Management
        const channel = new ExtensionManagementChannel(accessor.get(IExtensionManagementService), () => null);
        this.server.registerChannel('extensions', channel);
        // Mcp Management
        const mcpManagementChannel = new McpManagementChannel(accessor.get(IMcpManagementService), () => null);
        this.server.registerChannel('mcpManagement', mcpManagementChannel);
        // Language Packs
        const languagePacksChannel = ProxyChannel.fromService(accessor.get(ILanguagePackService), this._store);
        this.server.registerChannel('languagePacks', languagePacksChannel);
        // Diagnostics
        const diagnosticsChannel = ProxyChannel.fromService(accessor.get(IDiagnosticsService), this._store);
        this.server.registerChannel('diagnostics', diagnosticsChannel);
        // Extension Tips
        const extensionTipsChannel = new ExtensionTipsChannel(accessor.get(IExtensionTipsService));
        this.server.registerChannel('extensionTipsService', extensionTipsChannel);
        // Checksum
        const checksumChannel = ProxyChannel.fromService(accessor.get(IChecksumService), this._store);
        this.server.registerChannel('checksum', checksumChannel);
        // Profiling
        const profilingChannel = ProxyChannel.fromService(accessor.get(IV8InspectProfilingService), this._store);
        this.server.registerChannel('v8InspectProfiling', profilingChannel);
        // Settings Sync
        const userDataSyncMachineChannel = ProxyChannel.fromService(accessor.get(IUserDataSyncMachinesService), this._store);
        this.server.registerChannel('userDataSyncMachines', userDataSyncMachineChannel);
        // Custom Endpoint Telemetry
        const customEndpointTelemetryChannel = ProxyChannel.fromService(accessor.get(ICustomEndpointTelemetryService), this._store);
        this.server.registerChannel('customEndpointTelemetry', customEndpointTelemetryChannel);
        const userDataSyncAccountChannel = new UserDataSyncAccountServiceChannel(accessor.get(IUserDataSyncAccountService));
        this.server.registerChannel('userDataSyncAccount', userDataSyncAccountChannel);
        const userDataSyncStoreManagementChannel = new UserDataSyncStoreManagementServiceChannel(accessor.get(IUserDataSyncStoreManagementService));
        this.server.registerChannel('userDataSyncStoreManagement', userDataSyncStoreManagementChannel);
        const userDataSyncChannel = new UserDataSyncServiceChannel(accessor.get(IUserDataSyncService), accessor.get(IUserDataProfilesService), accessor.get(ILogService));
        this.server.registerChannel('userDataSync', userDataSyncChannel);
        const userDataAutoSync = this._register(accessor.get(IInstantiationService).createInstance(UserDataAutoSyncService));
        this.server.registerChannel('userDataAutoSync', ProxyChannel.fromService(userDataAutoSync, this._store));
        this.server.registerChannel('IUserDataSyncResourceProviderService', ProxyChannel.fromService(accessor.get(IUserDataSyncResourceProviderService), this._store));
        // Tunnel
        const sharedProcessTunnelChannel = ProxyChannel.fromService(accessor.get(ISharedProcessTunnelService), this._store);
        this.server.registerChannel(ipcSharedProcessTunnelChannelName, sharedProcessTunnelChannel);
        // Remote Tunnel
        const remoteTunnelChannel = ProxyChannel.fromService(accessor.get(IRemoteTunnelService), this._store);
        this.server.registerChannel('remoteTunnel', remoteTunnelChannel);
        // Web Content Extractor
        const webContentExtractorChannel = ProxyChannel.fromService(accessor.get(ISharedWebContentExtractorService), this._store);
        this.server.registerChannel('sharedWebContentExtractor', webContentExtractorChannel);
    }
    registerErrorHandler(logService) {
        // Listen on global error events
        process.on('uncaughtException', error => onUnexpectedError(error));
        process.on('unhandledRejection', (reason) => onUnexpectedError(reason));
        // Install handler for unexpected errors
        setUnexpectedErrorHandler(error => {
            const message = toErrorMessage(error, true);
            if (!message) {
                return;
            }
            logService.error(`[uncaught exception in sharedProcess]: ${message}`);
        });
    }
    async reportClientOSInfo(telemetryService, logService) {
        if (isLinux) {
            const [releaseInfo, displayProtocol] = await Promise.all([
                getOSReleaseInfo(logService.error.bind(logService)),
                getDisplayProtocol(logService.error.bind(logService))
            ]);
            const desktopEnvironment = getDesktopEnvironment();
            const codeSessionType = getCodeDisplayProtocol(displayProtocol, this.configuration.args['ozone-platform']);
            if (releaseInfo) {
                telemetryService.publicLog2('clientPlatformInfo', {
                    platformId: releaseInfo.id,
                    platformVersionId: releaseInfo.version_id,
                    platformIdLike: releaseInfo.id_like,
                    desktopEnvironment: desktopEnvironment,
                    displayProtocol: displayProtocol,
                    codeDisplayProtocol: codeSessionType
                });
            }
        }
    }
    handledClientConnection(e) {
        // This filter on message port messages will look for
        // attempts of a window to connect raw to the shared
        // process to handle these connections separate from
        // our IPC based protocol.
        if (e.data !== SharedProcessRawConnection.response) {
            return false;
        }
        const port = e.ports.at(0);
        if (port) {
            this.onDidWindowConnectRaw.fire(port);
            return true;
        }
        return false;
    }
}
export async function main(configuration) {
    // create shared process and signal back to main that we are
    // ready to accept message ports as client connections
    try {
        const sharedProcess = new SharedProcessMain(configuration);
        process.parentPort.postMessage(SharedProcessLifecycle.ipcReady);
        // await initialization and signal this back to electron-main
        await sharedProcess.init();
        process.parentPort.postMessage(SharedProcessLifecycle.initDone);
    }
    catch (error) {
        process.parentPort.postMessage({ error: error.toString() });
    }
}
const handle = setTimeout(() => {
    process.parentPort.postMessage({ warning: '[SharedProcess] did not receive configuration within 30s...' });
}, 30000);
process.parentPort.once('message', (e) => {
    clearTimeout(handle);
    main(e.data);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzc01haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tdXRpbGl0eS9zaGFyZWRQcm9jZXNzL3NoYXJlZFByb2Nlc3NNYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBRXZDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkYsT0FBTyxFQUEyQixNQUFNLElBQUksK0JBQStCLEVBQUUsSUFBSSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbEksT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxpQ0FBaUMsRUFB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