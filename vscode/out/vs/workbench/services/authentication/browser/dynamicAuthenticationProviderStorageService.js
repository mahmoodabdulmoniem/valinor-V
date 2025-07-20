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
var DynamicAuthenticationProviderStorageService_1;
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IDynamicAuthenticationProviderStorageService } from '../common/dynamicAuthenticationProviderStorage.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { isAuthorizationTokenResponse } from '../../../../base/common/oauth.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Queue } from '../../../../base/common/async.js';
let DynamicAuthenticationProviderStorageService = class DynamicAuthenticationProviderStorageService extends Disposable {
    static { DynamicAuthenticationProviderStorageService_1 = this; }
    static { this.PROVIDERS_STORAGE_KEY = 'dynamicAuthProviders'; }
    constructor(storageService, secretStorageService, logService) {
        super();
        this.storageService = storageService;
        this.secretStorageService = secretStorageService;
        this.logService = logService;
        this._onDidChangeTokens = this._register(new Emitter());
        this.onDidChangeTokens = this._onDidChangeTokens.event;
        // Listen for secret storage changes and emit events for dynamic auth provider token changes
        const queue = new Queue();
        this._register(this.secretStorageService.onDidChangeSecret(async (key) => {
            let payload;
            try {
                payload = JSON.parse(key);
            }
            catch (error) {
                // Ignore errors... must not be a dynamic auth provider
            }
            if (payload?.isDynamicAuthProvider) {
                void queue.queue(async () => {
                    const tokens = await this.getSessionsForDynamicAuthProvider(payload.authProviderId, payload.clientId);
                    this._onDidChangeTokens.fire({
                        authProviderId: payload.authProviderId,
                        clientId: payload.clientId,
                        tokens
                    });
                });
            }
        }));
    }
    async getClientRegistration(providerId) {
        // First try new combined SecretStorage format
        const key = `dynamicAuthProvider:clientRegistration:${providerId}`;
        const credentialsValue = await this.secretStorageService.get(key);
        if (credentialsValue) {
            try {
                const credentials = JSON.parse(credentialsValue);
                if (credentials && (credentials.clientId || credentials.clientSecret)) {
                    return credentials;
                }
            }
            catch {
                await this.secretStorageService.delete(key);
            }
        }
        // Just grab the client id from the provider
        const providers = this._getStoredProviders();
        const provider = providers.find(p => p.providerId === providerId);
        return provider?.clientId ? { clientId: provider.clientId } : undefined;
    }
    getClientId(providerId) {
        // For backward compatibility, try old storage format first
        const providers = this._getStoredProviders();
        const provider = providers.find(p => p.providerId === providerId);
        return provider?.clientId;
    }
    async storeClientRegistration(providerId, authorizationServer, clientId, clientSecret, label) {
        // Store provider information for backward compatibility and UI display
        this._trackProvider(providerId, authorizationServer, clientId, label);
        // Store both client ID and secret together in SecretStorage
        const key = `dynamicAuthProvider:clientRegistration:${providerId}`;
        const credentials = { clientId, clientSecret };
        await this.secretStorageService.set(key, JSON.stringify(credentials));
    }
    _trackProvider(providerId, authorizationServer, clientId, label) {
        const providers = this._getStoredProviders();
        // Check if provider already exists
        const existingProviderIndex = providers.findIndex(p => p.providerId === providerId);
        if (existingProviderIndex === -1) {
            // Add new provider with provided or default info
            const newProvider = {
                providerId,
                label: label || providerId, // Use provided label or providerId as default
                authorizationServer,
                clientId
            };
            providers.push(newProvider);
            this._storeProviders(providers);
        }
        else {
            const existingProvider = providers[existingProviderIndex];
            // Create new provider object with updated info
            const updatedProvider = {
                providerId,
                label: label || existingProvider.label,
                authorizationServer,
                clientId
            };
            providers[existingProviderIndex] = updatedProvider;
            this._storeProviders(providers);
        }
    }
    _getStoredProviders() {
        const stored = this.storageService.get(DynamicAuthenticationProviderStorageService_1.PROVIDERS_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, '[]');
        try {
            const providerInfos = JSON.parse(stored);
            // MIGRATION: remove after an iteration or 2
            for (const providerInfo of providerInfos) {
                if (!providerInfo.authorizationServer) {
                    providerInfo.authorizationServer = providerInfo.issuer;
                }
            }
            return providerInfos;
        }
        catch {
            return [];
        }
    }
    _storeProviders(providers) {
        this.storageService.store(DynamicAuthenticationProviderStorageService_1.PROVIDERS_STORAGE_KEY, JSON.stringify(providers), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getInteractedProviders() {
        return this._getStoredProviders();
    }
    async removeDynamicProvider(providerId) {
        // Get provider info before removal for secret cleanup
        const providers = this._getStoredProviders();
        const providerInfo = providers.find(p => p.providerId === providerId);
        // Remove from stored providers
        const filteredProviders = providers.filter(p => p.providerId !== providerId);
        this._storeProviders(filteredProviders);
        // Remove sessions from secret storage if we have the provider info
        if (providerInfo) {
            const secretKey = JSON.stringify({ isDynamicAuthProvider: true, authProviderId: providerId, clientId: providerInfo.clientId });
            await this.secretStorageService.delete(secretKey);
        }
        // Remove client credentials from new SecretStorage format
        const credentialsKey = `dynamicAuthProvider:clientRegistration:${providerId}`;
        await this.secretStorageService.delete(credentialsKey);
    }
    async getSessionsForDynamicAuthProvider(authProviderId, clientId) {
        const key = JSON.stringify({ isDynamicAuthProvider: true, authProviderId, clientId });
        const value = await this.secretStorageService.get(key);
        if (value) {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed) || !parsed.every((t) => typeof t.created_at === 'number' && isAuthorizationTokenResponse(t))) {
                this.logService.error(`Invalid session data for ${authProviderId} (${clientId}) in secret storage:`, parsed);
                await this.secretStorageService.delete(key);
                return undefined;
            }
            return parsed;
        }
        return undefined;
    }
    async setSessionsForDynamicAuthProvider(authProviderId, clientId, sessions) {
        const key = JSON.stringify({ isDynamicAuthProvider: true, authProviderId, clientId });
        const value = JSON.stringify(sessions);
        await this.secretStorageService.set(key, value);
        this.logService.trace(`Set session data for ${authProviderId} (${clientId}) in secret storage:`, sessions);
    }
};
DynamicAuthenticationProviderStorageService = DynamicAuthenticationProviderStorageService_1 = __decorate([
    __param(0, IStorageService),
    __param(1, ISecretStorageService),
    __param(2, ILogService)
], DynamicAuthenticationProviderStorageService);
export { DynamicAuthenticationProviderStorageService };
registerSingleton(IDynamicAuthenticationProviderStorageService, DynamicAuthenticationProviderStorageService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1pY0F1dGhlbnRpY2F0aW9uUHJvdmlkZXJTdG9yYWdlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2F1dGhlbnRpY2F0aW9uL2Jyb3dzZXIvZHluYW1pY0F1dGhlbnRpY2F0aW9uUHJvdmlkZXJTdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLDRDQUE0QyxFQUFxRixNQUFNLG1EQUFtRCxDQUFDO0FBQ3BNLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBK0IsNEJBQTRCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEQsSUFBTSwyQ0FBMkMsR0FBakQsTUFBTSwyQ0FBNEMsU0FBUSxVQUFVOzthQUdsRCwwQkFBcUIsR0FBRyxzQkFBc0IsQUFBekIsQ0FBMEI7SUFLdkUsWUFDa0IsY0FBZ0QsRUFDMUMsb0JBQTRELEVBQ3RFLFVBQXdDO1FBRXJELEtBQUssRUFBRSxDQUFDO1FBSjBCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN6Qix5QkFBb0IsR0FBcEIsb0JBQW9C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