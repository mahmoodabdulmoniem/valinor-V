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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IExtensionGalleryManifestService, ExtensionGalleryServiceUrlConfigKey } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestService as ExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifestService.js';
import { resolveMarketplaceHeaders } from '../../../../platform/externalServices/common/marketplace.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-browser/services.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asJson, IRequestService } from '../../../../platform/request/common/request.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IDefaultAccountService } from '../../accounts/common/defaultAccount.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IHostService } from '../../host/browser/host.js';
let WorkbenchExtensionGalleryManifestService = class WorkbenchExtensionGalleryManifestService extends ExtensionGalleryManifestService {
    get extensionGalleryManifestStatus() { return this.currentStatus; }
    constructor(productService, environmentService, fileService, telemetryService, storageService, remoteAgentService, sharedProcessService, configurationService, requestService, defaultAccountService, logService, dialogService, hostService) {
        super(productService);
        this.configurationService = configurationService;
        this.requestService = requestService;
        this.defaultAccountService = defaultAccountService;
        this.logService = logService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        this.extensionGalleryManifest = null;
        this._onDidChangeExtensionGalleryManifest = this._register(new Emitter());
        this.onDidChangeExtensionGalleryManifest = this._onDidChangeExtensionGalleryManifest.event;
        this.currentStatus = "unavailable" /* ExtensionGalleryManifestStatus.Unavailable */;
        this._onDidChangeExtensionGalleryManifestStatus = this._register(new Emitter());
        this.onDidChangeExtensionGalleryManifestStatus = this._onDidChangeExtensionGalleryManifestStatus.event;
        this.commonHeadersPromise = resolveMarketplaceHeaders(productService.version, productService, environmentService, configurationService, fileService, storageService, telemetryService);
        const channels = [sharedProcessService.getChannel('extensionGalleryManifest')];
        const remoteConnection = remoteAgentService.getConnection();
        if (remoteConnection) {
            channels.push(remoteConnection.getChannel('extensionGalleryManifest'));
        }
        this.getExtensionGalleryManifest().then(manifest => {
            channels.forEach(channel => channel.call('setExtensionGalleryManifest', [manifest]));
        });
    }
    async getExtensionGalleryManifest() {
        if (!this.extensionGalleryManifestPromise) {
            this.extensionGalleryManifestPromise = this.doGetExtensionGalleryManifest();
        }
        await this.extensionGalleryManifestPromise;
        return this.extensionGalleryManifest;
    }
    async doGetExtensionGalleryManifest() {
        const defaultServiceUrl = this.productService.extensionsGallery?.serviceUrl;
        if (!defaultServiceUrl) {
            return;
        }
        const configuredServiceUrl = this.configurationService.getValue(ExtensionGalleryServiceUrlConfigKey);
        if (configuredServiceUrl) {
            await this.handleDefaultAccountAccess(configuredServiceUrl);
            this._register(this.defaultAccountService.onDidChangeDefaultAccount(() => this.handleDefaultAccountAccess(configuredServiceUrl)));
        }
        else {
            const defaultExtensionGalleryManifest = await super.getExtensionGalleryManifest();
            this.update(defaultExtensionGalleryManifest);
        }
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (!e.affectsConfiguration(ExtensionGalleryServiceUrlConfigKey)) {
                return;
            }
            this.requestRestart();
        }));
    }
    async handleDefaultAccountAccess(configuredServiceUrl) {
        const account = await this.defaultAccountService.getDefaultAccount();
        if (!account) {
            this.logService.debug('[Marketplace] Enterprise marketplace configured but user not signed in');
            this.update(null, "requiresSignIn" /* ExtensionGalleryManifestStatus.RequiresSignIn */);
        }
        else if (!this.checkAccess(account)) {
            this.logService.debug('[Marketplace] User signed in but lacks access to enterprise marketplace');
            this.update(null, "accessDenied" /* ExtensionGalleryManifestStatus.AccessDenied */);
        }
        else if (this.currentStatus !== "available" /* ExtensionGalleryManifestStatus.Available */) {
            try {
                const manifest = await this.getExtensionGalleryManifestFromServiceUrl(configuredServiceUrl);
                this.update(manifest);
            }
            catch (error) {
                this.logService.error('[Marketplace] Error retrieving enterprise gallery manifest', error);
                this.update(null, "accessDenied" /* ExtensionGalleryManifestStatus.AccessDenied */);
            }
        }
    }
    update(manifest, status) {
        if (this.extensionGalleryManifest !== manifest) {
            this.extensionGalleryManifest = manifest;
            this._onDidChangeExtensionGalleryManifest.fire(manifest);
        }
        this.updateStatus(status ?? (this.extensionGalleryManifest ? "available" /* ExtensionGalleryManifestStatus.Available */ : "unavailable" /* ExtensionGalleryManifestStatus.Unavailable */));
    }
    updateStatus(status) {
        if (this.currentStatus !== status) {
            this.currentStatus = status;
            this._onDidChangeExtensionGalleryManifestStatus.fire(status);
        }
    }
    checkAccess(account) {
        this.logService.debug('[Marketplace] Checking Account SKU access for configured gallery', account.access_type_sku);
        if (account.access_type_sku && this.productService.extensionsGallery?.accessSKUs?.includes(account.access_type_sku)) {
            this.logService.debug('[Marketplace] Account has access to configured gallery');
            return true;
        }
        this.logService.debug('[Marketplace] Checking enterprise account access for configured gallery', account.enterprise);
        return account.enterprise;
    }
    async requestRestart() {
        const confirmation = await this.dialogService.confirm({
            message: localize('extensionGalleryManifestService.accountChange', "{0} is now configured to a different Marketplace. Please restart to apply the changes.", this.productService.nameLong),
            primaryButton: localize({ key: 'restart', comment: ['&& denotes a mnemonic'] }, "&&Restart")
        });
        if (confirmation.confirmed) {
            return this.hostService.restart();
        }
    }
    async getExtensionGalleryManifestFromServiceUrl(url) {
        const commonHeaders = await this.commonHeadersPromise;
        const headers = {
            ...commonHeaders,
            'Content-Type': 'application/json',
            'Accept-Encoding': 'gzip',
        };
        try {
            const context = await this.requestService.request({
                type: 'GET',
                url,
                headers,
            }, CancellationToken.None);
            const extensionGalleryManifest = await asJson(context);
            if (!extensionGalleryManifest) {
                throw new Error('Unable to retrieve extension gallery manifest.');
            }
            return extensionGalleryManifest;
        }
        catch (error) {
            this.logService.error('[Marketplace] Error retrieving extension gallery manifest', error);
            throw error;
        }
    }
};
WorkbenchExtensionGalleryManifestService = __decorate([
    __param(0, IProductService),
    __param(1, IEnvironmentService),
    __param(2, IFileService),
    __param(3, ITelemetryService),
    __param(4, IStorageService),
    __param(5, IRemoteAgentService),
    __param(6, ISharedProcessService),
    __param(7, IConfigurationService),
    __param(8, IRequestService),
    __param(9, IDefaultAccountService),
    __param(10, ILogService),
    __param(11, IDialogService),
    __param(12, IHostService)
], WorkbenchExtensionGalleryManifestService);
export { WorkbenchExtensionGalleryManifestService };
registerSingleton(IExtensionGalleryManifestService, WorkbenchExtensionGalleryManifestService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeU1hbmlmZXN0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvZWxlY3Ryb24tYnJvd3Nlci9leHRlbnNpb25HYWxsZXJ5TWFuaWZlc3RTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLGdDQUFnQyxFQUE2QixtQ0FBbUMsRUFBa0MsTUFBTSw2RUFBNkUsQ0FBQztBQUMvTixPQUFPLEVBQUUsK0JBQStCLElBQUksK0JBQStCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQztBQUN4SyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FB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