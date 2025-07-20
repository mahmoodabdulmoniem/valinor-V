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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export const IAuthenticationAccessService = createDecorator('IAuthenticationAccessService');
// TODO@TylerLeonhardt: Move this class to MainThreadAuthentication
// TODO@TylerLeonhardt: Should this class only keep track of allowed things and throw away disallowed ones?
let AuthenticationAccessService = class AuthenticationAccessService extends Disposable {
    constructor(_storageService, _productService) {
        super();
        this._storageService = _storageService;
        this._productService = _productService;
        this._onDidChangeExtensionSessionAccess = this._register(new Emitter());
        this.onDidChangeExtensionSessionAccess = this._onDidChangeExtensionSessionAccess.event;
    }
    isAccessAllowed(providerId, accountName, extensionId) {
        const trustedExtensionAuthAccess = this._productService.trustedExtensionAuthAccess;
        const extensionKey = ExtensionIdentifier.toKey(extensionId);
        if (Array.isArray(trustedExtensionAuthAccess)) {
            if (trustedExtensionAuthAccess.includes(extensionKey)) {
                return true;
            }
        }
        else if (trustedExtensionAuthAccess?.[providerId]?.includes(extensionKey)) {
            return true;
        }
        const allowList = this.readAllowedExtensions(providerId, accountName);
        const extensionData = allowList.find(extension => extension.id === extensionKey);
        if (!extensionData) {
            return undefined;
        }
        // This property didn't exist on this data previously, inclusion in the list at all indicates allowance
        return extensionData.allowed !== undefined
            ? extensionData.allowed
            : true;
    }
    readAllowedExtensions(providerId, accountName) {
        let trustedExtensions = [];
        try {
            const trustedExtensionSrc = this._storageService.get(`${providerId}-${accountName}`, -1 /* StorageScope.APPLICATION */);
            if (trustedExtensionSrc) {
                trustedExtensions = JSON.parse(trustedExtensionSrc);
            }
        }
        catch (err) { }
        // Add trusted extensions from product.json if they're not already in the list
        const trustedExtensionAuthAccess = this._productService.trustedExtensionAuthAccess;
        const trustedExtensionIds = 
        // Case 1: trustedExtensionAuthAccess is an array
        Array.isArray(trustedExtensionAuthAccess)
            ? trustedExtensionAuthAccess
            // Case 2: trustedExtensionAuthAccess is an object
            : typeof trustedExtensionAuthAccess === 'object'
                ? trustedExtensionAuthAccess[providerId] ?? []
                : [];
        for (const extensionId of trustedExtensionIds) {
            const extensionKey = ExtensionIdentifier.toKey(extensionId);
            const existingExtension = trustedExtensions.find(extension => extension.id === extensionKey);
            if (!existingExtension) {
                // Add new trusted extension (name will be set by caller if they have extension info)
                trustedExtensions.push({
                    id: extensionKey,
                    name: extensionId, // Use original casing for display name
                    allowed: true,
                    trusted: true
                });
            }
            else {
                // Update existing extension to be trusted
                existingExtension.allowed = true;
                existingExtension.trusted = true;
            }
        }
        return trustedExtensions;
    }
    updateAllowedExtensions(providerId, accountName, extensions) {
        const allowList = this.readAllowedExtensions(providerId, accountName);
        for (const extension of extensions) {
            const extensionKey = ExtensionIdentifier.toKey(extension.id);
            const index = allowList.findIndex(e => e.id === extensionKey);
            if (index === -1) {
                allowList.push({
                    ...extension,
                    id: extensionKey
                });
            }
            else {
                allowList[index].allowed = extension.allowed;
                // Update name if provided and not already set to a proper name
                if (extension.name && extension.name !== extensionKey && allowList[index].name !== extension.name) {
                    allowList[index].name = extension.name;
                }
            }
        }
        // Filter out trusted extensions before storing - they should only come from product.json, not user storage
        const userManagedExtensions = allowList.filter(extension => !extension.trusted);
        this._storageService.store(`${providerId}-${accountName}`, JSON.stringify(userManagedExtensions), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        this._onDidChangeExtensionSessionAccess.fire({ providerId, accountName });
    }
    removeAllowedExtensions(providerId, accountName) {
        this._storageService.remove(`${providerId}-${accountName}`, -1 /* StorageScope.APPLICATION */);
        this._onDidChangeExtensionSessionAccess.fire({ providerId, accountName });
    }
};
AuthenticationAccessService = __decorate([
    __param(0, IStorageService),
    __param(1, IProductService)
], AuthenticationAccessService);
export { AuthenticationAccessService };
registerSingleton(IAuthenticationAccessService, AuthenticationAccessService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25BY2Nlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYXV0aGVudGljYXRpb24vYnJvd3Nlci9hdXRoZW50aWNhdGlvbkFjY2Vzc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMzRixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRzlHLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLGVBQWUsQ0FBK0IsOEJBQThCLENBQUMsQ0FBQztBQW9CMUgsbUVBQW1FO0FBQ25FLDJHQUEyRztBQUNwRyxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLFVBQVU7SUFNMUQsWUFDa0IsZUFBaUQsRUFDakQsZUFBaUQ7UUFFbEUsS0FBSyxFQUFFLENBQUM7UUFIMEIsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ2hDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUwzRCx1Q0FBa0MsR0FBeUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBK0MsQ0FBQyxDQUFDO1FBQ3JLLHNDQUFpQyxHQUF1RCxJ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