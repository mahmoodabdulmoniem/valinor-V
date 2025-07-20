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
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
export const IAuthenticationMcpAccessService = createDecorator('IAuthenticationMcpAccessService');
// TODO@TylerLeonhardt: Should this class only keep track of allowed things and throw away disallowed ones?
let AuthenticationMcpAccessService = class AuthenticationMcpAccessService extends Disposable {
    constructor(_storageService, _productService) {
        super();
        this._storageService = _storageService;
        this._productService = _productService;
        this._onDidChangeMcpSessionAccess = this._register(new Emitter());
        this.onDidChangeMcpSessionAccess = this._onDidChangeMcpSessionAccess.event;
    }
    isAccessAllowed(providerId, accountName, mcpServerId) {
        const trustedMCPServerAuthAccess = this._productService.trustedMcpAuthAccess;
        if (Array.isArray(trustedMCPServerAuthAccess)) {
            if (trustedMCPServerAuthAccess.includes(mcpServerId)) {
                return true;
            }
        }
        else if (trustedMCPServerAuthAccess?.[providerId]?.includes(mcpServerId)) {
            return true;
        }
        const allowList = this.readAllowedMcpServers(providerId, accountName);
        const mcpServerData = allowList.find(mcpServer => mcpServer.id === mcpServerId);
        if (!mcpServerData) {
            return undefined;
        }
        // This property didn't exist on this data previously, inclusion in the list at all indicates allowance
        return mcpServerData.allowed !== undefined
            ? mcpServerData.allowed
            : true;
    }
    readAllowedMcpServers(providerId, accountName) {
        let trustedMCPServers = [];
        try {
            const trustedMCPServerSrc = this._storageService.get(`mcpserver-${providerId}-${accountName}`, -1 /* StorageScope.APPLICATION */);
            if (trustedMCPServerSrc) {
                trustedMCPServers = JSON.parse(trustedMCPServerSrc);
            }
        }
        catch (err) { }
        // Add trusted MCP servers from product.json if they're not already in the list
        const trustedMcpServerAuthAccess = this._productService.trustedMcpAuthAccess;
        const trustedMcpServerIds = 
        // Case 1: trustedMcpServerAuthAccess is an array
        Array.isArray(trustedMcpServerAuthAccess)
            ? trustedMcpServerAuthAccess
            // Case 2: trustedMcpServerAuthAccess is an object
            : typeof trustedMcpServerAuthAccess === 'object'
                ? trustedMcpServerAuthAccess[providerId] ?? []
                : [];
        for (const mcpServerId of trustedMcpServerIds) {
            const existingServer = trustedMCPServers.find(server => server.id === mcpServerId);
            if (!existingServer) {
                // Add new trusted server (name will be set by caller if they have server info)
                trustedMCPServers.push({
                    id: mcpServerId,
                    name: mcpServerId, // Default to ID, caller can update with proper name
                    allowed: true,
                    trusted: true
                });
            }
            else {
                // Update existing server to be trusted
                existingServer.allowed = true;
                existingServer.trusted = true;
            }
        }
        return trustedMCPServers;
    }
    updateAllowedMcpServers(providerId, accountName, mcpServers) {
        const allowList = this.readAllowedMcpServers(providerId, accountName);
        for (const mcpServer of mcpServers) {
            const index = allowList.findIndex(e => e.id === mcpServer.id);
            if (index === -1) {
                allowList.push(mcpServer);
            }
            else {
                allowList[index].allowed = mcpServer.allowed;
                // Update name if provided and not already set to a proper name
                if (mcpServer.name && mcpServer.name !== mcpServer.id && allowList[index].name !== mcpServer.name) {
                    allowList[index].name = mcpServer.name;
                }
            }
        }
        // Filter out trusted servers before storing - they should only come from product.json, not user storage
        const userManagedServers = allowList.filter(server => !server.trusted);
        this._storageService.store(`mcpserver-${providerId}-${accountName}`, JSON.stringify(userManagedServers), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        this._onDidChangeMcpSessionAccess.fire({ providerId, accountName });
    }
    removeAllowedMcpServers(providerId, accountName) {
        this._storageService.remove(`mcpserver-${providerId}-${accountName}`, -1 /* StorageScope.APPLICATION */);
        this._onDidChangeMcpSessionAccess.fire({ providerId, accountName });
    }
};
AuthenticationMcpAccessService = __decorate([
    __param(0, IStorageService),
    __param(1, IProductService)
], AuthenticationMcpAccessService);
export { AuthenticationMcpAccessService };
registerSingleton(IAuthenticationMcpAccessService, AuthenticationMcpAccessService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25NY3BBY2Nlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYXV0aGVudGljYXRpb24vYnJvd3Nlci9hdXRoZW50aWNhdGlvbk1jcEFjY2Vzc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBZ0I5RyxNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyxlQUFlLENBQWtDLGlDQUFpQyxDQUFDLENBQUM7QUFvQm5JLDJHQUEyRztBQUNwRyxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7SUFNN0QsWUFDa0IsZUFBaUQsRUFDakQsZUFBaUQ7UUFFbEUsS0FBSyxFQUFFLENBQUM7UUFIMEIsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ2hDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUwzRCxpQ0FBNEIsR0FBeUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBK0MsQ0FBQyxDQUFDO1FBQy9KLGdDQUEyQixHQUF1RCxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFDO0lBT25JLENBQUM7SUFFRCxlQUFl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