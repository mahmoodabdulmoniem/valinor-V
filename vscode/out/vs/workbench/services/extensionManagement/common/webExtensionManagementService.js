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
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IExtensionGalleryService, IAllowedExtensionsService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { URI } from '../../../../base/common/uri.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { areSameExtensions, getGalleryExtensionId } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IWebExtensionsScannerService } from './extensionManagement.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractExtensionManagementService, AbstractExtensionTask, toExtensionManagementError } from '../../../../platform/extensionManagement/common/abstractExtensionManagementService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { isBoolean, isUndefined } from '../../../../base/common/types.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { delta } from '../../../../base/common/arrays.js';
import { compare } from '../../../../base/common/strings.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
let WebExtensionManagementService = class WebExtensionManagementService extends AbstractExtensionManagementService {
    get onProfileAwareInstallExtension() { return super.onInstallExtension; }
    get onInstallExtension() { return Event.filter(this.onProfileAwareInstallExtension, e => this.filterEvent(e), this.disposables); }
    get onProfileAwareDidInstallExtensions() { return super.onDidInstallExtensions; }
    get onDidInstallExtensions() {
        return Event.filter(Event.map(this.onProfileAwareDidInstallExtensions, results => results.filter(e => this.filterEvent(e)), this.disposables), results => results.length > 0, this.disposables);
    }
    get onProfileAwareUninstallExtension() { return super.onUninstallExtension; }
    get onUninstallExtension() { return Event.filter(this.onProfileAwareUninstallExtension, e => this.filterEvent(e), this.disposables); }
    get onProfileAwareDidUninstallExtension() { return super.onDidUninstallExtension; }
    get onDidUninstallExtension() { return Event.filter(this.onProfileAwareDidUninstallExtension, e => this.filterEvent(e), this.disposables); }
    get onProfileAwareDidUpdateExtensionMetadata() { return super.onDidUpdateExtensionMetadata; }
    constructor(extensionGalleryService, telemetryService, logService, webExtensionsScannerService, extensionManifestPropertiesService, userDataProfileService, productService, allowedExtensionsService, userDataProfilesService, uriIdentityService) {
        super(extensionGalleryService, telemetryService, uriIdentityService, logService, productService, allowedExtensionsService, userDataProfilesService);
        this.webExtensionsScannerService = webExtensionsScannerService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.userDataProfileService = userDataProfileService;
        this.disposables = this._register(new DisposableStore());
        this._onDidChangeProfile = this._register(new Emitter());
        this.onDidChangeProfile = this._onDidChangeProfile.event;
        this._register(userDataProfileService.onDidChangeCurrentProfile(e => {
            if (!this.uriIdentityService.extUri.isEqual(e.previous.extensionsResource, e.profile.extensionsResource)) {
                e.join(this.whenProfileChanged(e));
            }
        }));
    }
    filterEvent({ profileLocation, applicationScoped }) {
        profileLocation = profileLocation ?? this.userDataProfileService.currentProfile.extensionsResource;
        return applicationScoped || this.uriIdentityService.extUri.isEqual(this.userDataProfileService.currentProfile.extensionsResource, profileLocation);
    }
    async getTargetPlatform() {
        return "web" /* TargetPlatform.WEB */;
    }
    async isExtensionPlatformCompatible(extension) {
        if (this.isConfiguredToExecuteOnWeb(extension)) {
            return true;
        }
        return super.isExtensionPlatformCompatible(extension);
    }
    async getInstalled(type, profileLocation) {
        const extensions = [];
        if (type === undefined || type === 0 /* ExtensionType.System */) {
            const systemExtensions = await this.webExtensionsScannerService.scanSystemExtensions();
            extensions.push(...systemExtensions);
        }
        if (type === undefined || type === 1 /* ExtensionType.User */) {
            const userExtensions = await this.webExtensionsScannerService.scanUserExtensions(profileLocation ?? this.userDataProfileService.currentProfile.extensionsResource);
            extensions.push(...userExtensions);
        }
        return extensions.map(e => toLocalExtension(e));
    }
    async install(location, options = {}) {
        this.logService.trace('ExtensionManagementService#install', location.toString());
        const manifest = await this.webExtensionsScannerService.scanExtensionManifest(location);
        if (!manifest || !manifest.name || !manifest.version) {
            throw new Error(`Cannot find a valid extension from the location ${location.toString()}`);
        }
        const result = await this.installExtensions([{ manifest, extension: location, options }]);
        if (result[0]?.local) {
            return result[0]?.local;
        }
        if (result[0]?.error) {
            throw result[0].error;
        }
        throw toExtensionManagementError(new Error(`Unknown error while installing extension ${getGalleryExtensionId(manifest.publisher, manifest.name)}`));
    }
    installFromLocation(location, profileLocation) {
        return this.install(location, { profileLocation });
    }
    async deleteExtension(extension) {
        // do nothing
    }
    async copyExtension(extension, fromProfileLocation, toProfileLocation, metadata) {
        const target = await this.webExtensionsScannerService.scanExistingExtension(extension.location, extension.type, toProfileLocation);
        const source = await this.webExtensionsScannerService.scanExistingExtension(extension.location, extension.type, fromProfileLocation);
        metadata = { ...source?.metadata, ...metadata };
        let scanned;
        if (target) {
            scanned = await this.webExtensionsScannerService.updateMetadata(extension, { ...target.metadata, ...metadata }, toProfileLocation);
        }
        else {
            scanned = await this.webExtensionsScannerService.addExtension(extension.location, metadata, toProfileLocation);
        }
        return toLocalExtension(scanned);
    }
    async moveExtension(extension, fromProfileLocation, toProfileLocation, metadata) {
        const target = await this.webExtensionsScannerService.scanExistingExtension(extension.location, extension.type, toProfileLocation);
        const source = await this.webExtensionsScannerService.scanExistingExtension(extension.location, extension.type, fromProfileLocation);
        metadata = { ...source?.metadata, ...metadata };
        let scanned;
        if (target) {
            scanned = await this.webExtensionsScannerService.updateMetadata(extension, { ...target.metadata, ...metadata }, toProfileLocation);
        }
        else {
            scanned = await this.webExtensionsScannerService.addExtension(extension.location, metadata, toProfileLocation);
            if (source) {
                await this.webExtensionsScannerService.removeExtension(source, fromProfileLocation);
            }
        }
        return toLocalExtension(scanned);
    }
    async removeExtension(extension, fromProfileLocation) {
        const source = await this.webExtensionsScannerService.scanExistingExtension(extension.location, extension.type, fromProfileLocation);
        if (source) {
            await this.webExtensionsScannerService.removeExtension(source, fromProfileLocation);
        }
    }
    async installExtensionsFromProfile(extensions, fromProfileLocation, toProfileLocation) {
        const result = [];
        const extensionsToInstall = (await this.webExtensionsScannerService.scanUserExtensions(fromProfileLocation))
            .filter(e => extensions.some(id => areSameExtensions(id, e.identifier)));
        if (extensionsToInstall.length) {
            await Promise.allSettled(extensionsToInstall.map(async (e) => {
                let local = await this.installFromLocation(e.location, toProfileLocation);
                if (e.metadata) {
                    local = await this.updateMetadata(local, e.metadata, fromProfileLocation);
                }
                result.push(local);
            }));
        }
        return result;
    }
    async updateMetadata(local, metadata, profileLocation) {
        // unset if false
        if (metadata.isMachineScoped === false) {
            metadata.isMachineScoped = undefined;
        }
        if (metadata.isBuiltin === false) {
            metadata.isBuiltin = undefined;
        }
        if (metadata.pinned === false) {
            metadata.pinned = undefined;
        }
        const updatedExtension = await this.webExtensionsScannerService.updateMetadata(local, metadata, profileLocation);
        const updatedLocalExtension = toLocalExtension(updatedExtension);
        this._onDidUpdateExtensionMetadata.fire({ local: updatedLocalExtension, profileLocation });
        return updatedLocalExtension;
    }
    async copyExtensions(fromProfileLocation, toProfileLocation) {
        await this.webExtensionsScannerService.copyExtensions(fromProfileLocation, toProfileLocation, e => !e.metadata?.isApplicationScoped);
    }
    async getCompatibleVersion(extension, sameVersion, includePreRelease, productVersion) {
        const compatibleExtension = await super.getCompatibleVersion(extension, sameVersion, includePreRelease, productVersion);
        if (compatibleExtension) {
            return compatibleExtension;
        }
        if (this.isConfiguredToExecuteOnWeb(extension)) {
            return extension;
        }
        return null;
    }
    isConfiguredToExecuteOnWeb(gallery) {
        const configuredExtensionKind = this.extensionManifestPropertiesService.getUserConfiguredExtensionKind(gallery.identifier);
        return !!configuredExtensionKind && configuredExtensionKind.includes('web');
    }
    getCurrentExtensionsManifestLocation() {
        return this.userDataProfileService.currentProfile.extensionsResource;
    }
    createInstallExtensionTask(manifest, extension, options) {
        return new InstallExtensionTask(manifest, extension, options, this.webExtensionsScannerService, this.userDataProfilesService);
    }
    createUninstallExtensionTask(extension, options) {
        return new UninstallExtensionTask(extension, options, this.webExtensionsScannerService);
    }
    zip(extension) { throw new Error('unsupported'); }
    getManifest(vsix) { throw new Error('unsupported'); }
    download() { throw new Error('unsupported'); }
    async cleanUp() { }
    async whenProfileChanged(e) {
        const previousProfileLocation = e.previous.extensionsResource;
        const currentProfileLocation = e.profile.extensionsResource;
        if (!previousProfileLocation || !currentProfileLocation) {
            throw new Error('This should not happen');
        }
        const oldExtensions = await this.webExtensionsScannerService.scanUserExtensions(previousProfileLocation);
        const newExtensions = await this.webExtensionsScannerService.scanUserExtensions(currentProfileLocation);
        const { added, removed } = delta(oldExtensions, newExtensions, (a, b) => compare(`${ExtensionIdentifier.toKey(a.identifier.id)}@${a.manifest.version}`, `${ExtensionIdentifier.toKey(b.identifier.id)}@${b.manifest.version}`));
        this._onDidChangeProfile.fire({ added: added.map(e => toLocalExtension(e)), removed: removed.map(e => toLocalExtension(e)) });
    }
};
WebExtensionManagementService = __decorate([
    __param(0, IExtensionGalleryService),
    __param(1, ITelemetryService),
    __param(2, ILogService),
    __param(3, IWebExtensionsScannerService),
    __param(4, IExtensionManifestPropertiesService),
    __param(5, IUserDataProfileService),
    __param(6, IProductService),
    __param(7, IAllowedExtensionsService),
    __param(8, IUserDataProfilesService),
    __param(9, IUriIdentityService)
], WebExtensionManagementService);
export { WebExtensionManagementService };
function toLocalExtension(extension) {
    const metadata = getMetadata(undefined, extension);
    return {
        ...extension,
        identifier: { id: extension.identifier.id, uuid: metadata.id ?? extension.identifier.uuid },
        isMachineScoped: !!metadata.isMachineScoped,
        isApplicationScoped: !!metadata.isApplicationScoped,
        publisherId: metadata.publisherId || null,
        publisherDisplayName: metadata.publisherDisplayName,
        installedTimestamp: metadata.installedTimestamp,
        isPreReleaseVersion: !!metadata.isPreReleaseVersion,
        hasPreReleaseVersion: !!metadata.hasPreReleaseVersion,
        preRelease: extension.preRelease,
        targetPlatform: "web" /* TargetPlatform.WEB */,
        updated: !!metadata.updated,
        pinned: !!metadata?.pinned,
        private: !!metadata.private,
        isWorkspaceScoped: false,
        source: metadata?.source ?? (extension.identifier.uuid ? 'gallery' : 'resource'),
        size: metadata.size ?? 0,
    };
}
function getMetadata(options, existingExtension) {
    const metadata = { ...(existingExtension?.metadata || {}) };
    metadata.isMachineScoped = options?.isMachineScoped || metadata.isMachineScoped;
    return metadata;
}
class InstallExtensionTask extends AbstractExtensionTask {
    get profileLocation() { return this._profileLocation; }
    get operation() { return isUndefined(this.options.operation) ? this._operation : this.options.operation; }
    constructor(manifest, extension, options, webExtensionsScannerService, userDataProfilesService) {
        super();
        this.manifest = manifest;
        this.extension = extension;
        this.options = options;
        this.webExtensionsScannerService = webExtensionsScannerService;
        this.userDataProfilesService = userDataProfilesService;
        this._operation = 2 /* InstallOperation.Install */;
        this._profileLocation = options.profileLocation;
        this.identifier = URI.isUri(extension) ? { id: getGalleryExtensionId(manifest.publisher, manifest.name) } : extension.identifier;
        this.source = extension;
    }
    async doRun(token) {
        const userExtensions = await this.webExtensionsScannerService.scanUserExtensions(this.options.profileLocation);
        const existingExtension = userExtensions.find(e => areSameExtensions(e.identifier, this.identifier));
        if (existingExtension) {
            this._operation = 3 /* InstallOperation.Update */;
        }
        const metadata = getMetadata(this.options, existingExtension);
        if (!URI.isUri(this.extension)) {
            metadata.id = this.extension.identifier.uuid;
            metadata.publisherDisplayName = this.extension.publisherDisplayName;
            metadata.publisherId = this.extension.publisherId;
            metadata.installedTimestamp = Date.now();
            metadata.isPreReleaseVersion = this.extension.properties.isPreReleaseVersion;
            metadata.hasPreReleaseVersion = metadata.hasPreReleaseVersion || this.extension.properties.isPreReleaseVersion;
            metadata.isBuiltin = this.options.isBuiltin || existingExtension?.isBuiltin;
            metadata.isSystem = existingExtension?.type === 0 /* ExtensionType.System */ ? true : undefined;
            metadata.updated = !!existingExtension;
            metadata.isApplicationScoped = this.options.isApplicationScoped || metadata.isApplicationScoped;
            metadata.private = this.extension.private;
            metadata.preRelease = isBoolean(this.options.preRelease)
                ? this.options.preRelease
                : this.options.installPreReleaseVersion || this.extension.properties.isPreReleaseVersion || metadata.preRelease;
            metadata.source = URI.isUri(this.extension) ? 'resource' : 'gallery';
        }
        metadata.pinned = this.options.installGivenVersion ? true : (this.options.pinned ?? metadata.pinned);
        this._profileLocation = metadata.isApplicationScoped ? this.userDataProfilesService.defaultProfile.extensionsResource : this.options.profileLocation;
        const scannedExtension = URI.isUri(this.extension) ? await this.webExtensionsScannerService.addExtension(this.extension, metadata, this.profileLocation)
            : await this.webExtensionsScannerService.addExtensionFromGallery(this.extension, metadata, this.profileLocation);
        return toLocalExtension(scannedExtension);
    }
}
class UninstallExtensionTask extends AbstractExtensionTask {
    constructor(extension, options, webExtensionsScannerService) {
        super();
        this.extension = extension;
        this.options = options;
        this.webExtensionsScannerService = webExtensionsScannerService;
    }
    doRun(token) {
        return this.webExtensionsScannerService.removeExtension(this.extension, this.options.profileLocation);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi93ZWJFeHRlbnNpb25NYW5hZ2VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQXVGLE1BQU0sc0RBQXNELENBQUM7QUFDaEwsT0FBTyxFQUF3RCx3QkFBd0IsRUFBNkMseUJBQXlCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUM5TyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUN0SSxPQUFPLEVBQThELDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEksT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxxQkFBcUIsRUFBK0UsMEJBQTBCLEVBQWlDLE1BQU0sdUZBQXVGLENBQUM7QUFDMVMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUUsT0FBTyxFQUFpQyx1QkFB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