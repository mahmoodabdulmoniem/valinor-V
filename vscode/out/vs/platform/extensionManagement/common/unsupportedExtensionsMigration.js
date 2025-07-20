/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../base/common/cancellation.js';
import { EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT } from './extensionManagement.js';
import { areSameExtensions, getExtensionId } from './extensionManagementUtil.js';
import * as semver from '../../../base/common/semver/semver.js';
/**
 * Migrates the installed unsupported nightly extension to a supported pre-release extension. It includes following:
 * 	- Uninstall the Unsupported extension
 * 	- Install (with optional storage migration) the Pre-release extension only if
 * 		- the extension is not installed
 * 		- or it is a release version and the unsupported extension is enabled.
 */
export async function migrateUnsupportedExtensions(extensionManagementService, galleryService, extensionStorageService, extensionEnablementService, logService) {
    try {
        const extensionsControlManifest = await extensionManagementService.getExtensionsControlManifest();
        if (!extensionsControlManifest.deprecated) {
            return;
        }
        const installed = await extensionManagementService.getInstalled(1 /* ExtensionType.User */);
        for (const [unsupportedExtensionId, deprecated] of Object.entries(extensionsControlManifest.deprecated)) {
            if (!deprecated?.extension) {
                continue;
            }
            const { id: preReleaseExtensionId, autoMigrate, preRelease } = deprecated.extension;
            if (!autoMigrate) {
                continue;
            }
            const unsupportedExtension = installed.find(i => areSameExtensions(i.identifier, { id: unsupportedExtensionId }));
            // Unsupported Extension is not installed
            if (!unsupportedExtension) {
                continue;
            }
            const gallery = (await galleryService.getExtensions([{ id: preReleaseExtensionId, preRelease }], { targetPlatform: await extensionManagementService.getTargetPlatform(), compatible: true }, CancellationToken.None))[0];
            if (!gallery) {
                logService.info(`Skipping migrating '${unsupportedExtension.identifier.id}' extension because, the comaptible target '${preReleaseExtensionId}' extension is not found`);
                continue;
            }
            try {
                logService.info(`Migrating '${unsupportedExtension.identifier.id}' extension to '${preReleaseExtensionId}' extension...`);
                const isUnsupportedExtensionEnabled = !extensionEnablementService.getDisabledExtensions().some(e => areSameExtensions(e, unsupportedExtension.identifier));
                await extensionManagementService.uninstall(unsupportedExtension);
                logService.info(`Uninstalled the unsupported extension '${unsupportedExtension.identifier.id}'`);
                let preReleaseExtension = installed.find(i => areSameExtensions(i.identifier, { id: preReleaseExtensionId }));
                if (!preReleaseExtension || (!preReleaseExtension.isPreReleaseVersion && isUnsupportedExtensionEnabled)) {
                    preReleaseExtension = await extensionManagementService.installFromGallery(gallery, { installPreReleaseVersion: true, isMachineScoped: unsupportedExtension.isMachineScoped, operation: 4 /* InstallOperation.Migrate */, context: { [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true } });
                    logService.info(`Installed the pre-release extension '${preReleaseExtension.identifier.id}'`);
                    if (!isUnsupportedExtensionEnabled) {
                        await extensionEnablementService.disableExtension(preReleaseExtension.identifier);
                        logService.info(`Disabled the pre-release extension '${preReleaseExtension.identifier.id}' because the unsupported extension '${unsupportedExtension.identifier.id}' is disabled`);
                    }
                    if (autoMigrate.storage) {
                        extensionStorageService.addToMigrationList(getExtensionId(unsupportedExtension.manifest.publisher, unsupportedExtension.manifest.name), getExtensionId(preReleaseExtension.manifest.publisher, preReleaseExtension.manifest.name));
                        logService.info(`Added pre-release extension to the storage migration list`);
                    }
                }
                logService.info(`Migrated '${unsupportedExtension.identifier.id}' extension to '${preReleaseExtensionId}' extension.`);
            }
            catch (error) {
                logService.error(error);
            }
        }
        if (extensionsControlManifest.autoUpdate) {
            for (const [extensionId, version] of Object.entries(extensionsControlManifest.autoUpdate)) {
                try {
                    const extensionToAutoUpdate = installed.find(i => areSameExtensions(i.identifier, { id: extensionId }) && semver.lte(i.manifest.version, version));
                    if (!extensionToAutoUpdate) {
                        continue;
                    }
                    const gallery = (await galleryService.getExtensions([{ id: extensionId, preRelease: extensionToAutoUpdate.preRelease }], { targetPlatform: await extensionManagementService.getTargetPlatform(), compatible: true }, CancellationToken.None))[0];
                    if (!gallery) {
                        logService.info(`Skipping updating '${extensionToAutoUpdate.identifier.id}' extension because, the compatible target '${extensionId}' extension is not found`);
                        continue;
                    }
                    await extensionManagementService.installFromGallery(gallery, { installPreReleaseVersion: extensionToAutoUpdate.preRelease, isMachineScoped: extensionToAutoUpdate.isMachineScoped, operation: 3 /* InstallOperation.Update */, context: { [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true } });
                    logService.info(`Autoupdated '${extensionToAutoUpdate.identifier.id}' extension to '${gallery.version}' extension.`);
                }
                catch (error) {
                    logService.error(error);
                }
            }
        }
    }
    catch (error) {
        logService.error(error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5zdXBwb3J0ZWRFeHRlbnNpb25zTWlncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi91bnN1cHBvcnRlZEV4dGVuc2lvbnNNaWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLDhDQUE4QyxFQUE4RyxNQUFNLDBCQUEwQixDQUFDO0FBQ3RNLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUlqRixPQUFPLEtBQUssTUFBTSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhFOzs7Ozs7R0FNRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsNEJBQTRCLENBQUMsMEJBQXVELEVBQUUsY0FBd0MsRUFBRSx1QkFBaUQsRUFBRSwwQkFBNkQsRUFBRSxVQUF1QjtJQUM5UixJQUFJLENBQUM7UUFDSixNQUFNLHlCQUF5QixHQUFHLE1BQU0sMEJBQTBCLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztRQUNsRyxJQUFJLENBQUMseUJBQXlCLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDM0MsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLFNBQVMsR0FBRyxNQUFNLDBCQUEwQixDQUFDLFlBQVksNEJBQW9CLENBQUM7UUFDcEYsS0FBSyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsVUFBVSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3pHLElBQUksQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLENBQUM7Z0JBQzVCLFNBQVM7WUFDVixDQUFD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