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
import * as platform from '../../../../base/common/platform.js';
import { dedupExtensions } from '../common/extensionsUtil.js';
import { IExtensionsScannerService, toExtensionDescription as toExtensionDescriptionFromScannedExtension } from '../../../../platform/extensionManagement/common/extensionsScannerService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import Severity from '../../../../base/common/severity.js';
import { localize } from '../../../../nls.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IHostService } from '../../host/browser/host.js';
import { timeout } from '../../../../base/common/async.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
import { IWorkbenchExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { toExtensionDescription } from '../common/extensions.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
let CachedExtensionScanner = class CachedExtensionScanner {
    constructor(_notificationService, _hostService, _extensionsScannerService, _userDataProfileService, _extensionManagementService, _environmentService, _logService) {
        this._notificationService = _notificationService;
        this._hostService = _hostService;
        this._extensionsScannerService = _extensionsScannerService;
        this._userDataProfileService = _userDataProfileService;
        this._extensionManagementService = _extensionManagementService;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this.scannedExtensions = new Promise((resolve, reject) => {
            this._scannedExtensionsResolve = resolve;
            this._scannedExtensionsReject = reject;
        });
    }
    async startScanningExtensions() {
        try {
            const extensions = await this._scanInstalledExtensions();
            this._scannedExtensionsResolve(extensions);
        }
        catch (err) {
            this._scannedExtensionsReject(err);
        }
    }
    async _scanInstalledExtensions() {
        try {
            const language = platform.language;
            const result = await Promise.allSettled([
                this._extensionsScannerService.scanSystemExtensions({ language, checkControlFile: true }),
                this._extensionsScannerService.scanUserExtensions({ language, profileLocation: this._userDataProfileService.currentProfile.extensionsResource, useCache: true }),
                this._environmentService.remoteAuthority ? [] : this._extensionManagementService.getInstalledWorkspaceExtensions(false)
            ]);
            let hasErrors = false;
            let scannedSystemExtensions = [];
            if (result[0].status === 'fulfilled') {
                scannedSystemExtensions = result[0].value;
            }
            else {
                hasErrors = true;
                this._logService.error(`Error scanning system extensions:`, getErrorMessage(result[0].reason));
            }
            let scannedUserExtensions = [];
            if (result[1].status === 'fulfilled') {
                scannedUserExtensions = result[1].value;
            }
            else {
                hasErrors = true;
                this._logService.error(`Error scanning user extensions:`, getErrorMessage(result[1].reason));
            }
            let workspaceExtensions = [];
            if (result[2].status === 'fulfilled') {
                workspaceExtensions = result[2].value;
            }
            else {
                hasErrors = true;
                this._logService.error(`Error scanning workspace extensions:`, getErrorMessage(result[2].reason));
            }
            const scannedDevelopedExtensions = [];
            try {
                const allScannedDevelopedExtensions = await this._extensionsScannerService.scanExtensionsUnderDevelopment([...scannedSystemExtensions, ...scannedUserExtensions], { language, includeInvalid: true });
                const invalidExtensions = [];
                for (const extensionUnderDevelopment of allScannedDevelopedExtensions) {
                    if (extensionUnderDevelopment.isValid) {
                        scannedDevelopedExtensions.push(extensionUnderDevelopment);
                    }
                    else {
                        invalidExtensions.push(extensionUnderDevelopment);
                    }
                }
                if (invalidExtensions.length > 0) {
                    this._notificationService.prompt(Severity.Warning, invalidExtensions.length === 1
                        ? localize('extensionUnderDevelopment.invalid', "Failed loading extension '{0}' under development because it is invalid: {1}", invalidExtensions[0].location.fsPath, invalidExtensions[0].validations[0][1])
                        : localize('extensionsUnderDevelopment.invalid', "Failed loading extensions {0} under development because they are invalid: {1}", invalidExtensions.map(ext => `'${ext.location.fsPath}'`).join(', '), invalidExtensions.map(ext => `${ext.validations[0][1]}`).join(', ')), []);
                }
            }
            catch (error) {
                this._logService.error(error);
            }
            const system = scannedSystemExtensions.map(e => toExtensionDescriptionFromScannedExtension(e, false));
            const user = scannedUserExtensions.map(e => toExtensionDescriptionFromScannedExtension(e, false));
            const workspace = workspaceExtensions.map(e => toExtensionDescription(e, false));
            const development = scannedDevelopedExtensions.map(e => toExtensionDescriptionFromScannedExtension(e, true));
            const r = dedupExtensions(system, user, workspace, development, this._logService);
            if (!hasErrors) {
                const disposable = this._extensionsScannerService.onDidChangeCache(() => {
                    disposable.dispose();
                    this._notificationService.prompt(Severity.Error, localize('extensionCache.invalid', "Extensions have been modified on disk. Please reload the window."), [{
                            label: localize('reloadWindow', "Reload Window"),
                            run: () => this._hostService.reload()
                        }]);
                });
                timeout(5000).then(() => disposable.dispose());
            }
            return r;
        }
        catch (err) {
            this._logService.error(`Error scanning installed extensions:`);
            this._logService.error(err);
            return [];
        }
    }
};
CachedExtensionScanner = __decorate([
    __param(0, INotificationService),
    __param(1, IHostService),
    __param(2, IExtensionsScannerService),
    __param(3, IUserDataProfileService),
    __param(4, IWorkbenchExtensionManagementService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, ILogService)
], CachedExtensionScanner);
export { CachedExtensionScanner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGVkRXh0ZW5zaW9uU2Nhbm5lci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvZWxlY3Ryb24tYnJvd3Nlci9jYWNoZWRFeHRlbnNpb25TY2FubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFFaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzlELE9BQU8sRUFBRSx5QkFBeUIsRUFBcUIsc0JBQXNCLElBQUksMENBQTBDLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUNqTixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRXZGLElBQU0sc0JB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