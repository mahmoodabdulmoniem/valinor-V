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
import { Queue } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IAuthenticationService } from '../common/authentication.js';
export const IAuthenticationMcpUsageService = createDecorator('IAuthenticationMcpUsageService');
let AuthenticationMcpUsageService = class AuthenticationMcpUsageService extends Disposable {
    constructor(_storageService, _authenticationService, _logService, productService) {
        super();
        this._storageService = _storageService;
        this._authenticationService = _authenticationService;
        this._logService = _logService;
        this._queue = new Queue();
        this._mcpServersUsingAuth = new Set();
        // If an MCP server is listed in `trustedMcpAuthAccess` we should consider it as using auth
        const trustedMcpAuthAccess = productService.trustedMcpAuthAccess;
        if (Array.isArray(trustedMcpAuthAccess)) {
            for (const mcpServerId of trustedMcpAuthAccess) {
                this._mcpServersUsingAuth.add(mcpServerId);
            }
        }
        else if (trustedMcpAuthAccess) {
            for (const mcpServers of Object.values(trustedMcpAuthAccess)) {
                for (const mcpServerId of mcpServers) {
                    this._mcpServersUsingAuth.add(mcpServerId);
                }
            }
        }
        this._register(this._authenticationService.onDidRegisterAuthenticationProvider(provider => this._queue.queue(() => this._addToCache(provider.id))));
    }
    async initializeUsageCache() {
        await this._queue.queue(() => Promise.all(this._authenticationService.getProviderIds().map(providerId => this._addToCache(providerId))));
    }
    async hasUsedAuth(mcpServerId) {
        await this._queue.whenIdle();
        return this._mcpServersUsingAuth.has(mcpServerId);
    }
    readAccountUsages(providerId, accountName) {
        const accountKey = `${providerId}-${accountName}-mcpserver-usages`;
        const storedUsages = this._storageService.get(accountKey, -1 /* StorageScope.APPLICATION */);
        let usages = [];
        if (storedUsages) {
            try {
                usages = JSON.parse(storedUsages);
            }
            catch (e) {
                // ignore
            }
        }
        return usages;
    }
    removeAccountUsage(providerId, accountName) {
        const accountKey = `${providerId}-${accountName}-mcpserver-usages`;
        this._storageService.remove(accountKey, -1 /* StorageScope.APPLICATION */);
    }
    addAccountUsage(providerId, accountName, scopes, mcpServerId, mcpServerName) {
        const accountKey = `${providerId}-${accountName}-mcpserver-usages`;
        const usages = this.readAccountUsages(providerId, accountName);
        const existingUsageIndex = usages.findIndex(usage => usage.mcpServerId === mcpServerId);
        if (existingUsageIndex > -1) {
            usages.splice(existingUsageIndex, 1, {
                mcpServerId,
                mcpServerName,
                scopes,
                lastUsed: Date.now()
            });
        }
        else {
            usages.push({
                mcpServerId,
                mcpServerName,
                scopes,
                lastUsed: Date.now()
            });
        }
        this._storageService.store(accountKey, JSON.stringify(usages), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this._mcpServersUsingAuth.add(mcpServerId);
    }
    async _addToCache(providerId) {
        try {
            const accounts = await this._authenticationService.getAccounts(providerId);
            for (const account of accounts) {
                const usage = this.readAccountUsages(providerId, account.label);
                for (const u of usage) {
                    this._mcpServersUsingAuth.add(u.mcpServerId);
                }
            }
        }
        catch (e) {
            this._logService.error(e);
        }
    }
};
AuthenticationMcpUsageService = __decorate([
    __param(0, IStorageService),
    __param(1, IAuthenticationService),
    __param(2, ILogService),
    __param(3, IProductService)
], AuthenticationMcpUsageService);
export { AuthenticationMcpUsageService };
registerSingleton(IAuthenticationMcpUsageService, AuthenticationMcpUsageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25NY3BVc2FnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hdXRoZW50aWNhdGlvbi9icm93c2VyL2F1dGhlbnRpY2F0aW9uTWNwVXNhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFTckUsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsZUFBZSxDQUFpQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBa0N6SCxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLFVBQVU7SUFNNUQsWUFDa0IsZUFBaUQsRUFDMUMsc0JBQStELEVBQzFFLFdBQXlDLEVBQ3JDLGNBQStCO1FBRWhELEtBQUssRUFBRSxDQUFDO1FBTDBCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUN6QiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO1FBQ3pELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBTi9DLFdB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