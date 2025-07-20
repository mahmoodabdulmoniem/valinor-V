/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hostname, release } from 'os';
import { Emitter } from '../../base/common/event.js';
import { toDisposable } from '../../base/common/lifecycle.js';
import { Schemas } from '../../base/common/network.js';
import * as path from '../../base/common/path.js';
import { getMachineId, getSqmMachineId, getdevDeviceId } from '../../base/node/id.js';
import { Promises } from '../../base/node/pfs.js';
import { IPCServer, StaticRouter } from '../../base/parts/ipc/common/ipc.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { ExtensionHostDebugBroadcastChannel } from '../../platform/debug/common/extensionHostDebugIpc.js';
import { IDownloadService } from '../../platform/download/common/download.js';
import { DownloadServiceChannelClient } from '../../platform/download/common/downloadIpc.js';
import { IEnvironmentService, INativeEnvironmentService } from '../../platform/environment/common/environment.js';
import { ExtensionGalleryServiceWithNoStorageService } from '../../platform/extensionManagement/common/extensionGalleryService.js';
import { IAllowedExtensionsService, IExtensionGalleryService } from '../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService } from '../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { ExtensionManagementCLI } from '../../platform/extensionManagement/common/extensionManagementCLI.js';
import { ExtensionManagementChannel } from '../../platform/extensionManagement/common/extensionManagementIpc.js';
import { ExtensionManagementService, INativeServerExtensionManagementService } from '../../platform/extensionManagement/node/extensionManagementService.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILanguagePackService } from '../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../platform/languagePacks/node/languagePacks.js';
import { AbstractLogger, DEFAULT_LOG_LEVEL, getLogLevel, ILoggerService, ILogService, log, LogLevel, LogLevelToString } from '../../platform/log/common/log.js';
import product from '../../platform/product/common/product.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestChannel } from '../../platform/request/common/requestIpc.js';
import { RequestService } from '../../platform/request/node/requestService.js';
import { resolveCommonProperties } from '../../platform/telemetry/common/commonProperties.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { getPiiPathsFromEnvironment, isInternalTelemetry, isLoggingOnly, NullAppender, supportsTelemetry } from '../../platform/telemetry/common/telemetryUtils.js';
import ErrorTelemetry from '../../platform/telemetry/node/errorTelemetry.js';
import { IPtyService } from '../../platform/terminal/common/terminal.js';
import { PtyHostService } from '../../platform/terminal/node/ptyHostService.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { RemoteAgentEnvironmentChannel } from './remoteAgentEnvironmentImpl.js';
import { RemoteAgentFileSystemProviderChannel } from './remoteFileSystemProviderServer.js';
import { ServerTelemetryChannel } from '../../platform/telemetry/common/remoteTelemetryChannel.js';
import { IServerTelemetryService, ServerNullTelemetryService, ServerTelemetryService } from '../../platform/telemetry/common/serverTelemetryService.js';
import { RemoteTerminalChannel } from './remoteTerminalChannel.js';
import { createURITransformer } from '../../workbench/api/node/uriTransformer.js';
import { ServerEnvironmentService } from './serverEnvironmentService.js';
import { REMOTE_TERMINAL_CHANNEL_NAME } from '../../workbench/contrib/terminal/common/remote/remoteTerminalChannel.js';
import { REMOTE_FILE_SYSTEM_CHANNEL_NAME } from '../../workbench/services/remote/common/remoteFileSystemProviderClient.js';
import { ExtensionHostStatusService, IExtensionHostStatusService } from './extensionHostStatusService.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from './extensionsScannerService.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
import { NullPolicyService } from '../../platform/policy/common/policy.js';
import { OneDataSystemAppender } from '../../platform/telemetry/node/1dsAppender.js';
import { LoggerService } from '../../platform/log/node/loggerService.js';
import { ServerUserDataProfilesService } from '../../platform/userDataProfile/node/userDataProfile.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { LoggerChannel } from '../../platform/log/common/logIpc.js';
import { localize } from '../../nls.js';
import { RemoteExtensionsScannerChannel, RemoteExtensionsScannerService } from './remoteExtensionsScanner.js';
import { RemoteExtensionsScannerChannelName } from '../../platform/remote/common/remoteExtensionsScanner.js';
import { RemoteUserDataProfilesServiceChannel } from '../../platform/userDataProfile/common/userDataProfileIpc.js';
import { NodePtyHostStarter } from '../../platform/terminal/node/nodePtyHostStarter.js';
import { CSSDevelopmentService, ICSSDevelopmentService } from '../../platform/cssDev/node/cssDevService.js';
import { AllowedExtensionsService } from '../../platform/extensionManagement/common/allowedExtensionsService.js';
import { TelemetryLogAppender } from '../../platform/telemetry/common/telemetryLogAppender.js';
import { INativeMcpDiscoveryHelperService, NativeMcpDiscoveryHelperChannelName } from '../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { NativeMcpDiscoveryHelperChannel } from '../../platform/mcp/node/nativeMcpDiscoveryHelperChannel.js';
import { NativeMcpDiscoveryHelperService } from '../../platform/mcp/node/nativeMcpDiscoveryHelperService.js';
import { IExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestIPCService } from '../../platform/extensionManagement/common/extensionGalleryManifestServiceIpc.js';
import { IAllowedMcpServersService, IMcpGalleryService, IMcpManagementService } from '../../platform/mcp/common/mcpManagement.js';
import { McpManagementService } from '../../platform/mcp/node/mcpManagementService.js';
import { McpGalleryService } from '../../platform/mcp/common/mcpGalleryService.js';
import { IMcpResourceScannerService, McpResourceScannerService } from '../../platform/mcp/common/mcpResourceScannerService.js';
import { McpManagementChannel } from '../../platform/mcp/common/mcpManagementIpc.js';
import { AllowedMcpServersService } from '../../platform/mcp/common/allowedMcpServersService.js';
const eventPrefix = 'monacoworkbench';
export async function setupServerServices(connectionToken, args, REMOTE_DATA_FOLDER, disposables) {
    const services = new ServiceCollection();
    const socketServer = new SocketServer();
    const productService = { _serviceBrand: undefined, ...product };
    services.set(IProductService, productService);
    const environmentService = new ServerEnvironmentService(args, productService);
    services.set(IEnvironmentService, environmentService);
    services.set(INativeEnvironmentService, environmentService);
    const loggerService = new LoggerService(getLogLevel(environmentService), environmentService.logsHome);
    services.set(ILoggerService, loggerService);
    socketServer.registerChannel('logger', new LoggerChannel(loggerService, (ctx) => getUriTransformer(ctx.remoteAuthority)));
    const logger = loggerService.createLogger('remoteagent', { name: localize('remoteExtensionLog', "Server") });
    const logService = new LogService(logger, [new ServerLogger(getLogLevel(environmentService))]);
    services.set(ILogService, logService);
    setTimeout(() => cleanupOlderLogs(environmentService.logsHome.with({ scheme: Schemas.file }).fsPath).then(null, err => logService.error(err)), 10000);
    logService.onDidChangeLogLevel(logLevel => log(logService, logLevel, `Log level changed to ${LogLevelToString(logService.getLevel())}`));
    logService.trace(`Remote configuration data at ${REMOTE_DATA_FOLDER}`);
    logService.trace('process arguments:', environmentService.args);
    if (Array.isArray(productService.serverGreeting)) {
        logService.info(`\n\n${productService.serverGreeting.join('\n')}\n\n`);
    }
    // ExtensionHost Debug broadcast service
    socketServer.registerChannel(ExtensionHostDebugBroadcastChannel.ChannelName, new ExtensionHostDebugBroadcastChannel());
    // TODO: @Sandy @Joao need dynamic context based router
    const router = new StaticRouter(ctx => ctx.clientId === 'renderer');
    // Files
    const fileService = disposables.add(new FileService(logService));
    services.set(IFileService, fileService);
    fileService.registerProvider(Schemas.file, disposables.add(new DiskFileSystemProvider(logService)));
    // URI Identity
    const uriIdentityService = new UriIdentityService(fileService);
    services.set(IUriIdentityService, uriIdentityService);
    // Configuration
    const configurationService = new ConfigurationService(environmentService.machineSettingsResource, fileService, new NullPolicyService(), logService);
    services.set(IConfigurationService, configurationService);
    // User Data Profiles
    const userDataProfilesService = new ServerUserDataProfilesService(uriIdentityService, environmentService, fileService, logService);
    services.set(IUserDataProfilesService, userDataProfilesService);
    socketServer.registerChannel('userDataProfiles', new RemoteUserDataProfilesServiceChannel(userDataProfilesService, (ctx) => getUriTransformer(ctx.remoteAuthority)));
    // Dev Only: CSS service (for ESM)
    services.set(ICSSDevelopmentService, new SyncDescriptor(CSSDevelopmentService, undefined, true));
    // Initialize
    const [, , machineId, sqmId, devDeviceId] = await Promise.all([
        configurationService.initialize(),
        userDataProfilesService.init(),
        getMachineId(logService.error.bind(logService)),
        getSqmMachineId(logService.error.bind(logService)),
        getdevDeviceId(logService.error.bind(logService))
    ]);
    const extensionHostStatusService = new ExtensionHostStatusService();
    services.set(IExtensionHostStatusService, extensionHostStatusService);
    // Request
    const requestService = new RequestService('remote', configurationService, environmentService, logService);
    services.set(IRequestService, requestService);
    let oneDsAppender = NullAppender;
    const isInternal = isInternalTelemetry(productService, configurationService);
    if (supportsTelemetry(productService, environmentService)) {
        if (!isLoggingOnly(productService, environmentService) && productService.aiConfig?.ariaKey) {
            oneDsAppender = new OneDataSystemAppender(requestService, isInternal, eventPrefix, null, productService.aiConfig.ariaKey);
            disposables.add(toDisposable(() => oneDsAppender?.flush())); // Ensure the AI appender is disposed so that it flushes remaining data
        }
        const config = {
            appenders: [oneDsAppender, new TelemetryLogAppender('', true, loggerService, environmentService, productService)],
            commonProperties: resolveCommonProperties(release(), hostname(), process.arch, productService.commit, productService.version + '-remote', machineId, sqmId, devDeviceId, isInternal, productService.date, 'remoteAgent'),
            piiPaths: getPiiPathsFromEnvironment(environmentService)
        };
        const initialTelemetryLevelArg = environmentService.args['telemetry-level'];
        let injectedTelemetryLevel = 3 /* TelemetryLevel.USAGE */;
        // Convert the passed in CLI argument into a telemetry level for the telemetry service
        if (initialTelemetryLevelArg === 'all') {
            injectedTelemetryLevel = 3 /* TelemetryLevel.USAGE */;
        }
        else if (initialTelemetryLevelArg === 'error') {
            injectedTelemetryLevel = 2 /* TelemetryLevel.ERROR */;
        }
        else if (initialTelemetryLevelArg === 'crash') {
            injectedTelemetryLevel = 1 /* TelemetryLevel.CRASH */;
        }
        else if (initialTelemetryLevelArg !== undefined) {
            injectedTelemetryLevel = 0 /* TelemetryLevel.NONE */;
        }
        services.set(IServerTelemetryService, new SyncDescriptor(ServerTelemetryService, [config, injectedTelemetryLevel]));
    }
    else {
        services.set(IServerTelemetryService, ServerNullTelemetryService);
    }
    services.set(IExtensionGalleryManifestService, new ExtensionGalleryManifestIPCService(socketServer, productService));
    services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryServiceWithNoStorageService));
    const downloadChannel = socketServer.getChannel('download', router);
    services.set(IDownloadService, new DownloadServiceChannelClient(downloadChannel, () => getUriTransformer('renderer') /* TODO: @Sandy @Joao need dynamic context based router */));
    services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService));
    services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService));
    services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService));
    services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService));
    services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService));
    services.set(INativeMcpDiscoveryHelperService, new SyncDescriptor(NativeMcpDiscoveryHelperService));
    const instantiationService = new InstantiationService(services);
    services.set(ILanguagePackService, instantiationService.createInstance(NativeLanguagePackService));
    const ptyHostStarter = instantiationService.createInstance(NodePtyHostStarter, {
        graceTime: 10800000 /* ProtocolConstants.ReconnectionGraceTime */,
        shortGraceTime: 300000 /* ProtocolConstants.ReconnectionShortGraceTime */,
        scrollback: configurationService.getValue("terminal.integrated.persistentSessionScrollback" /* TerminalSettingId.PersistentSessionScrollback */) ?? 100
    });
    const ptyHostService = instantiationService.createInstance(PtyHostService, ptyHostStarter);
    services.set(IPtyService, ptyHostService);
    services.set(IAllowedMcpServersService, new SyncDescriptor(AllowedMcpServersService));
    services.set(IMcpResourceScannerService, new SyncDescriptor(McpResourceScannerService));
    services.set(IMcpGalleryService, new SyncDescriptor(McpGalleryService));
    services.set(IMcpManagementService, new SyncDescriptor(McpManagementService));
    instantiationService.invokeFunction(accessor => {
        const mcpManagementService = accessor.get(IMcpManagementService);
        const extensionManagementService = accessor.get(INativeServerExtensionManagementService);
        const extensionsScannerService = accessor.get(IExtensionsScannerService);
        const extensionGalleryService = accessor.get(IExtensionGalleryService);
        const languagePackService = accessor.get(ILanguagePackService);
        const remoteExtensionEnvironmentChannel = new RemoteAgentEnvironmentChannel(connectionToken, environmentService, userDataProfilesService, extensionHostStatusService);
        socketServer.registerChannel('remoteextensionsenvironment', remoteExtensionEnvironmentChannel);
        const telemetryChannel = new ServerTelemetryChannel(accessor.get(IServerTelemetryService), oneDsAppender);
        socketServer.registerChannel('telemetry', telemetryChannel);
        socketServer.registerChannel(REMOTE_TERMINAL_CHANNEL_NAME, new RemoteTerminalChannel(environmentService, logService, ptyHostService, productService, extensionManagementService, configurationService));
        const remoteExtensionsScanner = new RemoteExtensionsScannerService(instantiationService.createInstance(ExtensionManagementCLI, logService), environmentService, userDataProfilesService, extensionsScannerService, logService, extensionGalleryService, languagePackService, extensionManagementService);
        socketServer.registerChannel(RemoteExtensionsScannerChannelName, new RemoteExtensionsScannerChannel(remoteExtensionsScanner, (ctx) => getUriTransformer(ctx.remoteAuthority)));
        socketServer.registerChannel(NativeMcpDiscoveryHelperChannelName, instantiationService.createInstance(NativeMcpDiscoveryHelperChannel, (ctx) => getUriTransformer(ctx.remoteAuthority)));
        const remoteFileSystemChannel = disposables.add(new RemoteAgentFileSystemProviderChannel(logService, environmentService, configurationService));
        socketServer.registerChannel(REMOTE_FILE_SYSTEM_CHANNEL_NAME, remoteFileSystemChannel);
        socketServer.registerChannel('request', new RequestChannel(accessor.get(IRequestService)));
        const channel = new ExtensionManagementChannel(extensionManagementService, (ctx) => getUriTransformer(ctx.remoteAuthority));
        socketServer.registerChannel('extensions', channel);
        socketServer.registerChannel('mcpManagement', new McpManagementChannel(mcpManagementService, (ctx) => getUriTransformer(ctx.remoteAuthority)));
        // clean up extensions folder
        remoteExtensionsScanner.whenExtensionsReady().then(() => extensionManagementService.cleanUp());
        disposables.add(new ErrorTelemetry(accessor.get(ITelemetryService)));
        return {
            telemetryService: accessor.get(ITelemetryService)
        };
    });
    return { socketServer, instantiationService };
}
const _uriTransformerCache = Object.create(null);
function getUriTransformer(remoteAuthority) {
    if (!_uriTransformerCache[remoteAuthority]) {
        _uriTransformerCache[remoteAuthority] = createURITransformer(remoteAuthority);
    }
    return _uriTransformerCache[remoteAuthority];
}
export class SocketServer extends IPCServer {
    constructor() {
        const emitter = new Emitter();
        super(emitter.event);
        this._onDidConnectEmitter = emitter;
    }
    acceptConnection(protocol, onDidClientDisconnect) {
        this._onDidConnectEmitter.fire({ protocol, onDidClientDisconnect });
    }
}
class ServerLogger extends AbstractLogger {
    constructor(logLevel = DEFAULT_LOG_LEVEL) {
        super();
        this.setLevel(logLevel);
        this.useColors = Boolean(process.stdout.isTTY);
    }
    trace(message, ...args) {
        if (this.canLog(LogLevel.Trace)) {
            if (this.useColors) {
                console.log(`\x1b[90m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[${now()}]`, message, ...args);
            }
        }
    }
    debug(message, ...args) {
        if (this.canLog(LogLevel.Debug)) {
            if (this.useColors) {
                console.log(`\x1b[90m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[${now()}]`, message, ...args);
            }
        }
    }
    info(message, ...args) {
        if (this.canLog(LogLevel.Info)) {
            if (this.useColors) {
                console.log(`\x1b[90m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.log(`[${now()}]`, message, ...args);
            }
        }
    }
    warn(message, ...args) {
        if (this.canLog(LogLevel.Warning)) {
            if (this.useColors) {
                console.warn(`\x1b[93m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.warn(`[${now()}]`, message, ...args);
            }
        }
    }
    error(message, ...args) {
        if (this.canLog(LogLevel.Error)) {
            if (this.useColors) {
                console.error(`\x1b[91m[${now()}]\x1b[0m`, message, ...args);
            }
            else {
                console.error(`[${now()}]`, message, ...args);
            }
        }
    }
    flush() {
        // noop
    }
}
function now() {
    const date = new Date();
    return `${twodigits(date.getHours())}:${twodigits(date.getMinutes())}:${twodigits(date.getSeconds())}`;
}
function twodigits(n) {
    if (n < 10) {
        return `0${n}`;
    }
    return String(n);
}
/**
 * Cleans up older logs, while keeping the 10 most recent ones.
 */
async function cleanupOlderLogs(logsPath) {
    const currentLog = path.basename(logsPath);
    const logsRoot = path.dirname(logsPath);
    const children = await Promises.readdir(logsRoot);
    const allSessions = children.filter(name => /^\d{8}T\d{6}$/.test(name));
    const oldSessions = allSessions.sort().filter((d) => d !== currentLog);
    const toDelete = oldSessions.slice(0, Math.max(0, oldSessions.length - 9));
    await Promise.all(toDelete.map(name => Promises.rm(path.join(logsRoot, name))));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyU2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci9ub2RlL3NlcnZlclNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSw0QkFBNEIsQ0FBQztBQUM1RCxPQUFPLEVBQW1CLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RCxPQUFPLEtBQUssSUFBSSxNQUFNLDJCQUEyQixDQUFDO0FBRWxELE9BQU8sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNsRCxPQUFPLEVBQWtELFNBQVMsRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU3SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsSCxPQUFPLEVBQUUsMkNBQTJDLEVBQUUsTUFBTSxzRUFB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