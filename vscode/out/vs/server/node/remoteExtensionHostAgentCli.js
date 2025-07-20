/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ConsoleLogger, getLogLevel, ILoggerService, ILogService } from '../../platform/log/common/log.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestService } from '../../platform/request/node/requestService.js';
import { NullTelemetryService } from '../../platform/telemetry/common/telemetryUtils.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { IAllowedExtensionsService, IExtensionGalleryService } from '../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionGalleryServiceWithNoStorageService } from '../../platform/extensionManagement/common/extensionGalleryService.js';
import { ExtensionManagementService, INativeServerExtensionManagementService } from '../../platform/extensionManagement/node/extensionManagementService.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService } from '../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import product from '../../platform/product/common/product.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { Schemas } from '../../base/common/network.js';
import { IFileService } from '../../platform/files/common/files.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IServerEnvironmentService, ServerEnvironmentService } from './serverEnvironmentService.js';
import { ExtensionManagementCLI } from '../../platform/extensionManagement/common/extensionManagementCLI.js';
import { ILanguagePackService } from '../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../platform/languagePacks/node/languagePacks.js';
import { getErrorMessage } from '../../base/common/errors.js';
import { URI } from '../../base/common/uri.js';
import { isAbsolute, join } from '../../base/common/path.js';
import { cwd } from '../../base/common/process.js';
import { DownloadService } from '../../platform/download/common/downloadService.js';
import { IDownloadService } from '../../platform/download/common/download.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { buildHelpMessage, buildVersionMessage } from '../../platform/environment/node/argv.js';
import { isWindows } from '../../base/common/platform.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from './extensionsScannerService.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { NullPolicyService } from '../../platform/policy/common/policy.js';
import { ServerUserDataProfilesService } from '../../platform/userDataProfile/node/userDataProfile.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { LoggerService } from '../../platform/log/node/loggerService.js';
import { localize } from '../../nls.js';
import { addUNCHostToAllowlist, disableUNCAccessRestrictions } from '../../base/node/unc.js';
import { AllowedExtensionsService } from '../../platform/extensionManagement/common/allowedExtensionsService.js';
import { IExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifestService.js';
class CliMain extends Disposable {
    constructor(args, remoteDataFolder) {
        super();
        this.args = args;
        this.remoteDataFolder = remoteDataFolder;
        this.registerListeners();
    }
    registerListeners() {
        process.once('exit', () => this.dispose()); // Dispose on exit
    }
    async run() {
        const instantiationService = await this.initServices();
        await instantiationService.invokeFunction(async (accessor) => {
            const configurationService = accessor.get(IConfigurationService);
            const logService = accessor.get(ILogService);
            // On Windows, configure the UNC allow list based on settings
            if (isWindows) {
                if (configurationService.getValue('security.restrictUNCAccess') === false) {
                    disableUNCAccessRestrictions();
                }
                else {
                    addUNCHostToAllowlist(configurationService.getValue('security.allowedUNCHosts'));
                }
            }
            try {
                await this.doRun(instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(logService.getLevel(), false)));
            }
            catch (error) {
                logService.error(error);
                console.error(getErrorMessage(error));
                throw error;
            }
        });
    }
    async initServices() {
        const services = new ServiceCollection();
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        const environmentService = new ServerEnvironmentService(this.args, productService);
        services.set(IServerEnvironmentService, environmentService);
        const loggerService = new LoggerService(getLogLevel(environmentService), environmentService.logsHome);
        services.set(ILoggerService, loggerService);
        const logService = new LogService(this._register(loggerService.createLogger('remoteCLI', { name: localize('remotecli', "Remote CLI") })));
        services.set(ILogService, logService);
        logService.trace(`Remote configuration data at ${this.remoteDataFolder}`);
        logService.trace('process arguments:', this.args);
        // Files
        const fileService = this._register(new FileService(logService));
        services.set(IFileService, fileService);
        fileService.registerProvider(Schemas.file, this._register(new DiskFileSystemProvider(logService)));
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const userDataProfilesService = this._register(new ServerUserDataProfilesService(uriIdentityService, environmentService, fileService, logService));
        services.set(IUserDataProfilesService, userDataProfilesService);
        // Configuration
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, new NullPolicyService(), logService));
        services.set(IConfigurationService, configurationService);
        // Initialize
        await Promise.all([
            configurationService.initialize(),
            userDataProfilesService.init()
        ]);
        services.set(IRequestService, new SyncDescriptor(RequestService, ['remote']));
        services.set(IDownloadService, new SyncDescriptor(DownloadService));
        services.set(ITelemetryService, NullTelemetryService);
        services.set(IExtensionGalleryManifestService, new SyncDescriptor(ExtensionGalleryManifestService));
        services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryServiceWithNoStorageService));
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService));
        services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService));
        services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService));
        services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService));
        services.set(ILanguagePackService, new SyncDescriptor(NativeLanguagePackService));
        return new InstantiationService(services);
    }
    async doRun(extensionManagementCLI) {
        // List Extensions
        if (this.args['list-extensions']) {
            return extensionManagementCLI.listExtensions(!!this.args['show-versions'], this.args['category']);
        }
        // Install Extension
        else if (this.args['install-extension'] || this.args['install-builtin-extension']) {
            const installOptions = { isMachineScoped: !!this.args['do-not-sync'], installPreReleaseVersion: !!this.args['pre-release'], donotIncludePackAndDependencies: !!this.args['do-not-include-pack-dependencies'] };
            return extensionManagementCLI.installExtensions(this.asExtensionIdOrVSIX(this.args['install-extension'] || []), this.asExtensionIdOrVSIX(this.args['install-builtin-extension'] || []), installOptions, !!this.args['force']);
        }
        // Uninstall Extension
        else if (this.args['uninstall-extension']) {
            return extensionManagementCLI.uninstallExtensions(this.asExtensionIdOrVSIX(this.args['uninstall-extension']), !!this.args['force']);
        }
        // Update the installed extensions
        else if (this.args['update-extensions']) {
            return extensionManagementCLI.updateExtensions();
        }
        // Locate Extension
        else if (this.args['locate-extension']) {
            return extensionManagementCLI.locateExtension(this.args['locate-extension']);
        }
    }
    asExtensionIdOrVSIX(inputs) {
        return inputs.map(input => /\.vsix$/i.test(input) ? URI.file(isAbsolute(input) ? input : join(cwd(), input)) : input);
    }
}
function eventuallyExit(code) {
    setTimeout(() => process.exit(code), 0);
}
export async function run(args, REMOTE_DATA_FOLDER, optionDescriptions) {
    if (args.help) {
        const executable = product.serverApplicationName + (isWindows ? '.cmd' : '');
        console.log(buildHelpMessage(product.nameLong, executable, product.version, optionDescriptions, { noInputFiles: true, noPipe: true }));
        return;
    }
    // Version Info
    if (args.version) {
        console.log(buildVersionMessage(product.version, product.commit));
        return;
    }
    const cliMain = new CliMain(args, REMOTE_DATA_FOLDER);
    try {
        await cliMain.run();
        eventuallyExit(0);
    }
    catch (err) {
        eventuallyExit(1);
    }
    finally {
        cliMain.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uSG9zdEFnZW50Q2xpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9yZW1vdGVFeHRlbnNpb25Ib3N0QWdlbnRDbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSx3QkFBd0IsRUFBa0IsTUFBTSxrRUFBa0UsQ0FBQztBQUN2SixPQUFPLEVBQUUsMkNBQTJDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUNuSSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUM1SixPQUFPLEVBQUUscUNBQXFDLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUNqTCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUVuRyxPQUFPLE9BQU8sTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSx3QkFBd0IsRUFBb0IsTUFBTSwrQkFBK0IsQ0FBQztBQUN0SCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM3RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ25ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQXNCLE1BQU0seUNBQXlDLENBQUM7QUFDcEgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzFELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVFQUF1RSxDQUFDO0FBQ2xILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDhFQUE4RSxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQzdILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN4QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUNqSCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUN6SCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQztBQUUvSCxNQUFNLE9BQVEsU0FBUSxVQUFVO0lBRS9CLFlBQTZCLElBQXNCLEVBQW1CLGdCQUF3QjtRQUM3RixLQUFLLEVBQUUsQ0FBQztRQURvQixTQUFJLEdBQUosSUFBSSxDQUFrQjtRQUFtQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVE7UUFHN0YsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjtJQUMvRCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUc7UUFDUixNQUFNLG9CQUFvQixHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3ZELE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBQyxRQUFRLEVBQUMsRUFBRTtZQUMxRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUNqRSxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRTdDLDZEQUE2RDtZQUM3RCxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLElBQUksb0JBQW9CLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7b0JBQzNFLDRCQUE0QixFQUFFLENBQUM7Z0JBQ2hDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDO2dCQUNsRixDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQztnQkFDSixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFLElBQUksYUFBYSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEksQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3hCLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ3RDLE1BQU0sS0FBSyxDQUFDO1lBQ2IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLEtBQUssQ0FBQyxZQUFZO1FBQ3pCLE1BQU0sUUFBUSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQztRQUV6QyxNQUFNLGNBQWMsR0FBRyxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLEVBQUUsQ0FBQztRQUNoRSxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUU5QyxNQUFNLGtCQUFrQixHQUFHLElBQUksd0JBQXdCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNuRixRQUFRLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFFNUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFNUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEMsVUFBVSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztRQUMxRSxVQUFVLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVsRCxRQUFRO1FBQ1IsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3hDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkcsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQy9ELFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUV0RCxxQkFBcUI7UUFDckIsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksNkJBQTZCLENBQUMsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbkosUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1FBRWhFLGdCQUFnQjtRQUNoQixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxvQkFBb0IsQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLElBQUksaUJBQWlCLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ2pMLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUUxRCxhQUFhO1FBQ2IsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2pCLG9CQUFvQixDQUFDLFVBQVUsRUFBRTtZQUNqQyx1QkFBdUIsQ0FBQyxJQUFJLEVBQUU7U0FDOUIsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxjQUFjLENBQUMsY0FBYyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlFLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUNwRSxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDdEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUM7UUFDcEcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLGNBQWMsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDLENBQUM7UUFDeEcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUM7UUFDcEcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFDdEYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsRUFBRSxJQUFJLGNBQWMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUM7UUFDaEgsUUFBUSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFDdEYsUUFBUSxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsRUFBRSxJQUFJLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUM7UUFDdEcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7UUFFbEYsT0FBTyxJQUFJLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFTyxLQUFLLENBQUMsS0FBSyxDQUFDLHNCQUE4QztRQUVqRSxrQkFBa0I7UUFDbEIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztZQUNsQyxPQUFPLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbkcsQ0FBQztRQUVELG9CQUFvQjthQUNmLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDO1lBQ25GLE1BQU0sY0FBYyxHQUFtQixFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSx3QkFBd0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSwrQkFBK0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFFLENBQUM7WUFDL04sT0FBTyxzQkFBc0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDL04sQ0FBQztRQUVELHNCQUFzQjthQUNqQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDO1lBQzNDLE9BQU8sc0JBQXNCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDckksQ0FBQztRQUVELGtDQUFrQzthQUM3QixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE9BQU8sc0JBQXNCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNsRCxDQUFDO1FBRUQsbUJBQW1CO2FBQ2QsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztZQUN4QyxPQUFPLHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztRQUM5RSxDQUFDO0lBQ0YsQ0FBQztJQUVPLG1CQUFtQixDQUFDLE1BQWdCO1FBQzNDLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2SCxDQUFDO0NBQ0Q7QUFFRCxTQUFTLGNBQWMsQ0FBQyxJQUFZO0lBQ25DLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLEdBQUcsQ0FBQyxJQUFzQixFQUFFLGtCQUEwQixFQUFFLGtCQUF3RDtJQUNySSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNmLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3RSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdkksT0FBTztJQUNSLENBQUM7SUFFRCxlQUFlO0lBQ2YsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLE9BQU87SUFDUixDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDdEQsSUFBSSxDQUFDO1FBQ0osTUFBTSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDcEIsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2QsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25CLENBQUM7WUFBUyxDQUFDO1FBQ1YsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ25CLENBQUM7QUFDRixDQUFDIn0=