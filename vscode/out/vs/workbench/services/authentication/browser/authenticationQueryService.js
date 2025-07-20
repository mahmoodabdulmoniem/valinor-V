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
import { ILogService } from '../../../../platform/log/common/log.js';
import { IAuthenticationService, IAuthenticationExtensionsService, INTERNAL_AUTH_PROVIDER_PREFIX } from '../common/authentication.js';
import { IAuthenticationQueryService } from '../common/authenticationQuery.js';
import { IAuthenticationUsageService } from './authenticationUsageService.js';
import { IAuthenticationMcpUsageService } from './authenticationMcpUsageService.js';
import { IAuthenticationAccessService } from './authenticationAccessService.js';
import { IAuthenticationMcpAccessService } from './authenticationMcpAccessService.js';
import { IAuthenticationMcpService } from './authenticationMcpService.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
/**
 * Base implementation for query interfaces
 */
class BaseQuery {
    constructor(providerId, queryService) {
        this.providerId = providerId;
        this.queryService = queryService;
    }
}
/**
 * Implementation of account-extension query operations
 */
class AccountExtensionQuery extends BaseQuery {
    constructor(providerId, accountName, extensionId, queryService) {
        super(providerId, queryService);
        this.accountName = accountName;
        this.extensionId = extensionId;
    }
    isAccessAllowed() {
        return this.queryService.authenticationAccessService.isAccessAllowed(this.providerId, this.accountName, this.extensionId);
    }
    setAccessAllowed(allowed, extensionName) {
        this.queryService.authenticationAccessService.updateAllowedExtensions(this.providerId, this.accountName, [{ id: this.extensionId, name: extensionName || this.extensionId, allowed }]);
    }
    addUsage(scopes, extensionName) {
        this.queryService.authenticationUsageService.addAccountUsage(this.providerId, this.accountName, scopes, this.extensionId, extensionName);
    }
    getUsage() {
        const allUsages = this.queryService.authenticationUsageService.readAccountUsages(this.providerId, this.accountName);
        return allUsages
            .filter(usage => usage.extensionId === ExtensionIdentifier.toKey(this.extensionId))
            .map(usage => ({
            extensionId: usage.extensionId,
            extensionName: usage.extensionName,
            scopes: usage.scopes || [],
            lastUsed: usage.lastUsed
        }));
    }
    removeUsage() {
        // Get current usages, filter out this extension, and store the rest
        const allUsages = this.queryService.authenticationUsageService.readAccountUsages(this.providerId, this.accountName);
        const filteredUsages = allUsages.filter(usage => usage.extensionId !== this.extensionId);
        // Clear all usages and re-add the filtered ones
        this.queryService.authenticationUsageService.removeAccountUsage(this.providerId, this.accountName);
        for (const usage of filteredUsages) {
            this.queryService.authenticationUsageService.addAccountUsage(this.providerId, this.accountName, usage.scopes || [], usage.extensionId, usage.extensionName);
        }
    }
    setAsPreferred() {
        this.queryService.authenticationExtensionsService.updateAccountPreference(this.extensionId, this.providerId, { label: this.accountName, id: this.accountName });
    }
    isPreferred() {
        const preferredAccount = this.queryService.authenticationExtensionsService.getAccountPreference(this.extensionId, this.providerId);
        return preferredAccount === this.accountName;
    }
    isTrusted() {
        const allowedExtensions = this.queryService.authenticationAccessService.readAllowedExtensions(this.providerId, this.accountName);
        const extension = allowedExtensions.find(ext => ext.id === this.extensionId);
        return extension?.trusted === true;
    }
}
/**
 * Implementation of account-MCP server query operations
 */
class AccountMcpServerQuery extends BaseQuery {
    constructor(providerId, accountName, mcpServerId, queryService) {
        super(providerId, queryService);
        this.accountName = accountName;
        this.mcpServerId = mcpServerId;
    }
    isAccessAllowed() {
        return this.queryService.authenticationMcpAccessService.isAccessAllowed(this.providerId, this.accountName, this.mcpServerId);
    }
    setAccessAllowed(allowed, mcpServerName) {
        this.queryService.authenticationMcpAccessService.updateAllowedMcpServers(this.providerId, this.accountName, [{ id: this.mcpServerId, name: mcpServerName || this.mcpServerId, allowed }]);
    }
    addUsage(scopes, mcpServerName) {
        this.queryService.authenticationMcpUsageService.addAccountUsage(this.providerId, this.accountName, scopes, this.mcpServerId, mcpServerName);
    }
    getUsage() {
        const allUsages = this.queryService.authenticationMcpUsageService.readAccountUsages(this.providerId, this.accountName);
        return allUsages
            .filter(usage => usage.mcpServerId === this.mcpServerId)
            .map(usage => ({
            mcpServerId: usage.mcpServerId,
            mcpServerName: usage.mcpServerName,
            scopes: usage.scopes || [],
            lastUsed: usage.lastUsed
        }));
    }
    removeUsage() {
        // Get current usages, filter out this MCP server, and store the rest
        const allUsages = this.queryService.authenticationMcpUsageService.readAccountUsages(this.providerId, this.accountName);
        const filteredUsages = allUsages.filter(usage => usage.mcpServerId !== this.mcpServerId);
        // Clear all usages and re-add the filtered ones
        this.queryService.authenticationMcpUsageService.removeAccountUsage(this.providerId, this.accountName);
        for (const usage of filteredUsages) {
            this.queryService.authenticationMcpUsageService.addAccountUsage(this.providerId, this.accountName, usage.scopes || [], usage.mcpServerId, usage.mcpServerName);
        }
    }
    setAsPreferred() {
        this.queryService.authenticationMcpService.updateAccountPreference(this.mcpServerId, this.providerId, { label: this.accountName, id: this.accountName });
    }
    isPreferred() {
        const preferredAccount = this.queryService.authenticationMcpService.getAccountPreference(this.mcpServerId, this.providerId);
        return preferredAccount === this.accountName;
    }
    isTrusted() {
        const allowedMcpServers = this.queryService.authenticationMcpAccessService.readAllowedMcpServers(this.providerId, this.accountName);
        const mcpServer = allowedMcpServers.find(server => server.id === this.mcpServerId);
        return mcpServer?.trusted === true;
    }
}
/**
 * Implementation of account-extensions query operations
 */
class AccountExtensionsQuery extends BaseQuery {
    constructor(providerId, accountName, queryService) {
        super(providerId, queryService);
        this.accountName = accountName;
    }
    getAllowedExtensions() {
        const allowedExtensions = this.queryService.authenticationAccessService.readAllowedExtensions(this.providerId, this.accountName);
        const usages = this.queryService.authenticationUsageService.readAccountUsages(this.providerId, this.accountName);
        return allowedExtensions
            .filter(ext => ext.allowed !== false)
            .map(ext => {
            // Find the most recent usage for this extension
            const extensionUsages = usages.filter(usage => usage.extensionId === ext.id);
            const lastUsed = extensionUsages.length > 0 ? Math.max(...extensionUsages.map(u => u.lastUsed)) : undefined;
            // Check if trusted through the extension query
            const extensionQuery = new AccountExtensionQuery(this.providerId, this.accountName, ext.id, this.queryService);
            const trusted = extensionQuery.isTrusted();
            return {
                id: ext.id,
                name: ext.name,
                allowed: ext.allowed,
                lastUsed,
                trusted
            };
        });
    }
    allowAccess(extensionIds) {
        const extensionsToAllow = extensionIds.map(id => ({ id, name: id, allowed: true }));
        this.queryService.authenticationAccessService.updateAllowedExtensions(this.providerId, this.accountName, extensionsToAllow);
    }
    removeAccess(extensionIds) {
        const extensionsToRemove = extensionIds.map(id => ({ id, name: id, allowed: false }));
        this.queryService.authenticationAccessService.updateAllowedExtensions(this.providerId, this.accountName, extensionsToRemove);
    }
    forEach(callback) {
        const usages = this.queryService.authenticationUsageService.readAccountUsages(this.providerId, this.accountName);
        const allowedExtensions = this.queryService.authenticationAccessService.readAllowedExtensions(this.providerId, this.accountName);
        // Combine extensions from both usage and access data
        const extensionIds = new Set();
        usages.forEach(usage => extensionIds.add(usage.extensionId));
        allowedExtensions.forEach(ext => extensionIds.add(ext.id));
        for (const extensionId of extensionIds) {
            const extensionQuery = new AccountExtensionQuery(this.providerId, this.accountName, extensionId, this.queryService);
            callback(extensionQuery);
        }
    }
}
/**
 * Implementation of account-MCP servers query operations
 */
class AccountMcpServersQuery extends BaseQuery {
    constructor(providerId, accountName, queryService) {
        super(providerId, queryService);
        this.accountName = accountName;
    }
    getAllowedMcpServers() {
        return this.queryService.authenticationMcpAccessService.readAllowedMcpServers(this.providerId, this.accountName)
            .filter(server => server.allowed !== false);
    }
    allowAccess(mcpServerIds) {
        const mcpServersToAllow = mcpServerIds.map(id => ({ id, name: id, allowed: true }));
        this.queryService.authenticationMcpAccessService.updateAllowedMcpServers(this.providerId, this.accountName, mcpServersToAllow);
    }
    removeAccess(mcpServerIds) {
        const mcpServersToRemove = mcpServerIds.map(id => ({ id, name: id, allowed: false }));
        this.queryService.authenticationMcpAccessService.updateAllowedMcpServers(this.providerId, this.accountName, mcpServersToRemove);
    }
    forEach(callback) {
        const usages = this.queryService.authenticationMcpUsageService.readAccountUsages(this.providerId, this.accountName);
        const allowedMcpServers = this.queryService.authenticationMcpAccessService.readAllowedMcpServers(this.providerId, this.accountName);
        // Combine MCP servers from both usage and access data
        const mcpServerIds = new Set();
        usages.forEach(usage => mcpServerIds.add(usage.mcpServerId));
        allowedMcpServers.forEach(server => mcpServerIds.add(server.id));
        for (const mcpServerId of mcpServerIds) {
            const mcpServerQuery = new AccountMcpServerQuery(this.providerId, this.accountName, mcpServerId, this.queryService);
            callback(mcpServerQuery);
        }
    }
}
/**
 * Implementation of account-entities query operations for type-agnostic operations
 */
class AccountEntitiesQuery extends BaseQuery {
    constructor(providerId, accountName, queryService) {
        super(providerId, queryService);
        this.accountName = accountName;
    }
    hasAnyUsage() {
        // Check extension usage
        const extensionUsages = this.queryService.authenticationUsageService.readAccountUsages(this.providerId, this.accountName);
        if (extensionUsages.length > 0) {
            return true;
        }
        // Check MCP server usage
        const mcpUsages = this.queryService.authenticationMcpUsageService.readAccountUsages(this.providerId, this.accountName);
        if (mcpUsages.length > 0) {
            return true;
        }
        // Check extension access
        const allowedExtensions = this.queryService.authenticationAccessService.readAllowedExtensions(this.providerId, this.accountName);
        if (allowedExtensions.some(ext => ext.allowed !== false)) {
            return true;
        }
        // Check MCP server access
        const allowedMcpServers = this.queryService.authenticationMcpAccessService.readAllowedMcpServers(this.providerId, this.accountName);
        if (allowedMcpServers.some(server => server.allowed !== false)) {
            return true;
        }
        return false;
    }
    getEntityCount() {
        // Use the same logic as getAllEntities to count all entities with usage or access
        const extensionUsages = this.queryService.authenticationUsageService.readAccountUsages(this.providerId, this.accountName);
        const allowedExtensions = this.queryService.authenticationAccessService.readAllowedExtensions(this.providerId, this.accountName).filter(ext => ext.allowed);
        const extensionIds = new Set();
        extensionUsages.forEach(usage => extensionIds.add(usage.extensionId));
        allowedExtensions.forEach(ext => extensionIds.add(ext.id));
        const mcpUsages = this.queryService.authenticationMcpUsageService.readAccountUsages(this.providerId, this.accountName);
        const allowedMcpServers = this.queryService.authenticationMcpAccessService.readAllowedMcpServers(this.providerId, this.accountName).filter(server => server.allowed);
        const mcpServerIds = new Set();
        mcpUsages.forEach(usage => mcpServerIds.add(usage.mcpServerId));
        allowedMcpServers.forEach(server => mcpServerIds.add(server.id));
        const extensionCount = extensionIds.size;
        const mcpServerCount = mcpServerIds.size;
        return {
            extensions: extensionCount,
            mcpServers: mcpServerCount,
            total: extensionCount + mcpServerCount
        };
    }
    removeAllAccess() {
        // Remove all extension access
        const extensionsQuery = new AccountExtensionsQuery(this.providerId, this.accountName, this.queryService);
        const extensions = extensionsQuery.getAllowedExtensions();
        const extensionIds = extensions.map(ext => ext.id);
        if (extensionIds.length > 0) {
            extensionsQuery.removeAccess(extensionIds);
        }
        // Remove all MCP server access
        const mcpServersQuery = new AccountMcpServersQuery(this.providerId, this.accountName, this.queryService);
        const mcpServers = mcpServersQuery.getAllowedMcpServers();
        const mcpServerIds = mcpServers.map(server => server.id);
        if (mcpServerIds.length > 0) {
            mcpServersQuery.removeAccess(mcpServerIds);
        }
    }
    forEach(callback) {
        // Iterate over extensions
        const extensionsQuery = new AccountExtensionsQuery(this.providerId, this.accountName, this.queryService);
        extensionsQuery.forEach(extensionQuery => {
            callback(extensionQuery.extensionId, 'extension');
        });
        // Iterate over MCP servers
        const mcpServersQuery = new AccountMcpServersQuery(this.providerId, this.accountName, this.queryService);
        mcpServersQuery.forEach(mcpServerQuery => {
            callback(mcpServerQuery.mcpServerId, 'mcpServer');
        });
    }
}
/**
 * Implementation of account query operations
 */
class AccountQuery extends BaseQuery {
    constructor(providerId, accountName, queryService) {
        super(providerId, queryService);
        this.accountName = accountName;
    }
    extension(extensionId) {
        return new AccountExtensionQuery(this.providerId, this.accountName, extensionId, this.queryService);
    }
    mcpServer(mcpServerId) {
        return new AccountMcpServerQuery(this.providerId, this.accountName, mcpServerId, this.queryService);
    }
    extensions() {
        return new AccountExtensionsQuery(this.providerId, this.accountName, this.queryService);
    }
    mcpServers() {
        return new AccountMcpServersQuery(this.providerId, this.accountName, this.queryService);
    }
    entities() {
        return new AccountEntitiesQuery(this.providerId, this.accountName, this.queryService);
    }
    remove() {
        // Remove all extension access and usage data
        this.queryService.authenticationAccessService.removeAllowedExtensions(this.providerId, this.accountName);
        this.queryService.authenticationUsageService.removeAccountUsage(this.providerId, this.accountName);
        // Remove all MCP server access and usage data
        this.queryService.authenticationMcpAccessService.removeAllowedMcpServers(this.providerId, this.accountName);
        this.queryService.authenticationMcpUsageService.removeAccountUsage(this.providerId, this.accountName);
    }
}
/**
 * Implementation of provider-extension query operations
 */
class ProviderExtensionQuery extends BaseQuery {
    constructor(providerId, extensionId, queryService) {
        super(providerId, queryService);
        this.extensionId = extensionId;
    }
    getPreferredAccount() {
        return this.queryService.authenticationExtensionsService.getAccountPreference(this.extensionId, this.providerId);
    }
    setPreferredAccount(account) {
        this.queryService.authenticationExtensionsService.updateAccountPreference(this.extensionId, this.providerId, account);
    }
    removeAccountPreference() {
        this.queryService.authenticationExtensionsService.removeAccountPreference(this.extensionId, this.providerId);
    }
}
/**
 * Implementation of provider-MCP server query operations
 */
class ProviderMcpServerQuery extends BaseQuery {
    constructor(providerId, mcpServerId, queryService) {
        super(providerId, queryService);
        this.mcpServerId = mcpServerId;
    }
    async getLastUsedAccount() {
        try {
            const accounts = await this.queryService.authenticationService.getAccounts(this.providerId);
            let lastUsedAccount;
            let lastUsedTime = 0;
            for (const account of accounts) {
                const usages = this.queryService.authenticationMcpUsageService.readAccountUsages(this.providerId, account.label);
                const mcpServerUsages = usages.filter(usage => usage.mcpServerId === this.mcpServerId);
                for (const usage of mcpServerUsages) {
                    if (usage.lastUsed > lastUsedTime) {
                        lastUsedTime = usage.lastUsed;
                        lastUsedAccount = account.label;
                    }
                }
            }
            return lastUsedAccount;
        }
        catch {
            return undefined;
        }
    }
    getPreferredAccount() {
        return this.queryService.authenticationMcpService.getAccountPreference(this.mcpServerId, this.providerId);
    }
    setPreferredAccount(account) {
        this.queryService.authenticationMcpService.updateAccountPreference(this.mcpServerId, this.providerId, account);
    }
    removeAccountPreference() {
        this.queryService.authenticationMcpService.removeAccountPreference(this.mcpServerId, this.providerId);
    }
    async getUsedAccounts() {
        try {
            const accounts = await this.queryService.authenticationService.getAccounts(this.providerId);
            const usedAccounts = [];
            for (const account of accounts) {
                const usages = this.queryService.authenticationMcpUsageService.readAccountUsages(this.providerId, account.label);
                if (usages.some(usage => usage.mcpServerId === this.mcpServerId)) {
                    usedAccounts.push(account.label);
                }
            }
            return usedAccounts;
        }
        catch {
            return [];
        }
    }
}
/**
 * Implementation of provider query operations
 */
class ProviderQuery extends BaseQuery {
    constructor(providerId, queryService) {
        super(providerId, queryService);
    }
    account(accountName) {
        return new AccountQuery(this.providerId, accountName, this.queryService);
    }
    extension(extensionId) {
        return new ProviderExtensionQuery(this.providerId, extensionId, this.queryService);
    }
    mcpServer(mcpServerId) {
        return new ProviderMcpServerQuery(this.providerId, mcpServerId, this.queryService);
    }
    async getActiveEntities() {
        const extensions = [];
        const mcpServers = [];
        try {
            const accounts = await this.queryService.authenticationService.getAccounts(this.providerId);
            for (const account of accounts) {
                // Get extension usages
                const extensionUsages = this.queryService.authenticationUsageService.readAccountUsages(this.providerId, account.label);
                for (const usage of extensionUsages) {
                    if (!extensions.includes(usage.extensionId)) {
                        extensions.push(usage.extensionId);
                    }
                }
                // Get MCP server usages
                const mcpUsages = this.queryService.authenticationMcpUsageService.readAccountUsages(this.providerId, account.label);
                for (const usage of mcpUsages) {
                    if (!mcpServers.includes(usage.mcpServerId)) {
                        mcpServers.push(usage.mcpServerId);
                    }
                }
            }
        }
        catch {
            // Return empty arrays if there's an error
        }
        return { extensions, mcpServers };
    }
    async getAccountNames() {
        try {
            const accounts = await this.queryService.authenticationService.getAccounts(this.providerId);
            return accounts.map(account => account.label);
        }
        catch {
            return [];
        }
    }
    async getUsageStats() {
        const recentActivity = [];
        let totalSessions = 0;
        let totalAccounts = 0;
        try {
            const accounts = await this.queryService.authenticationService.getAccounts(this.providerId);
            totalAccounts = accounts.length;
            for (const account of accounts) {
                const extensionUsages = this.queryService.authenticationUsageService.readAccountUsages(this.providerId, account.label);
                const mcpUsages = this.queryService.authenticationMcpUsageService.readAccountUsages(this.providerId, account.label);
                const allUsages = [...extensionUsages, ...mcpUsages];
                const usageCount = allUsages.length;
                const lastUsed = Math.max(...allUsages.map(u => u.lastUsed), 0);
                if (usageCount > 0) {
                    recentActivity.push({ accountName: account.label, lastUsed, usageCount });
                }
            }
            // Sort by most recent activity
            recentActivity.sort((a, b) => b.lastUsed - a.lastUsed);
            // Count total sessions (approximate)
            totalSessions = recentActivity.reduce((sum, activity) => sum + activity.usageCount, 0);
        }
        catch {
            // Return default stats if there's an error
        }
        return { totalSessions, totalAccounts, recentActivity };
    }
    async forEachAccount(callback) {
        try {
            const accounts = await this.queryService.authenticationService.getAccounts(this.providerId);
            for (const account of accounts) {
                const accountQuery = new AccountQuery(this.providerId, account.label, this.queryService);
                callback(accountQuery);
            }
        }
        catch {
            // Silently handle errors in enumeration
        }
    }
}
/**
 * Implementation of extension query operations (cross-provider)
 */
class ExtensionQuery {
    constructor(extensionId, queryService) {
        this.extensionId = extensionId;
        this.queryService = queryService;
    }
    async getProvidersWithAccess(includeInternal) {
        const providersWithAccess = [];
        const providerIds = this.queryService.authenticationService.getProviderIds();
        for (const providerId of providerIds) {
            // Skip internal providers unless explicitly requested
            if (!includeInternal && providerId.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX)) {
                continue;
            }
            try {
                const accounts = await this.queryService.authenticationService.getAccounts(providerId);
                const hasAccess = accounts.some(account => {
                    const accessAllowed = this.queryService.authenticationAccessService.isAccessAllowed(providerId, account.label, this.extensionId);
                    return accessAllowed === true;
                });
                if (hasAccess) {
                    providersWithAccess.push(providerId);
                }
            }
            catch {
                // Skip providers that error
            }
        }
        return providersWithAccess;
    }
    getAllAccountPreferences(includeInternal) {
        const preferences = new Map();
        const providerIds = this.queryService.authenticationService.getProviderIds();
        for (const providerId of providerIds) {
            // Skip internal providers unless explicitly requested
            if (!includeInternal && providerId.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX)) {
                continue;
            }
            const preferredAccount = this.queryService.authenticationExtensionsService.getAccountPreference(this.extensionId, providerId);
            if (preferredAccount) {
                preferences.set(providerId, preferredAccount);
            }
        }
        return preferences;
    }
    provider(providerId) {
        return new ProviderExtensionQuery(providerId, this.extensionId, this.queryService);
    }
}
/**
 * Implementation of MCP server query operations (cross-provider)
 */
class McpServerQuery {
    constructor(mcpServerId, queryService) {
        this.mcpServerId = mcpServerId;
        this.queryService = queryService;
    }
    async getProvidersWithAccess(includeInternal) {
        const providersWithAccess = [];
        const providerIds = this.queryService.authenticationService.getProviderIds();
        for (const providerId of providerIds) {
            // Skip internal providers unless explicitly requested
            if (!includeInternal && providerId.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX)) {
                continue;
            }
            try {
                const accounts = await this.queryService.authenticationService.getAccounts(providerId);
                const hasAccess = accounts.some(account => {
                    const accessAllowed = this.queryService.authenticationMcpAccessService.isAccessAllowed(providerId, account.label, this.mcpServerId);
                    return accessAllowed === true;
                });
                if (hasAccess) {
                    providersWithAccess.push(providerId);
                }
            }
            catch {
                // Skip providers that error
            }
        }
        return providersWithAccess;
    }
    getAllAccountPreferences(includeInternal) {
        const preferences = new Map();
        const providerIds = this.queryService.authenticationService.getProviderIds();
        for (const providerId of providerIds) {
            // Skip internal providers unless explicitly requested
            if (!includeInternal && providerId.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX)) {
                continue;
            }
            const preferredAccount = this.queryService.authenticationMcpService.getAccountPreference(this.mcpServerId, providerId);
            if (preferredAccount) {
                preferences.set(providerId, preferredAccount);
            }
        }
        return preferences;
    }
    provider(providerId) {
        return new ProviderMcpServerQuery(providerId, this.mcpServerId, this.queryService);
    }
}
/**
 * Main implementation of the authentication query service
 */
let AuthenticationQueryService = class AuthenticationQueryService extends Disposable {
    constructor(authenticationService, authenticationUsageService, authenticationMcpUsageService, authenticationAccessService, authenticationMcpAccessService, authenticationExtensionsService, authenticationMcpService, logService) {
        super();
        this.authenticationService = authenticationService;
        this.authenticationUsageService = authenticationUsageService;
        this.authenticationMcpUsageService = authenticationMcpUsageService;
        this.authenticationAccessService = authenticationAccessService;
        this.authenticationMcpAccessService = authenticationMcpAccessService;
        this.authenticationExtensionsService = authenticationExtensionsService;
        this.authenticationMcpService = authenticationMcpService;
        this.logService = logService;
        this._onDidChangePreferences = this._register(new Emitter());
        this.onDidChangePreferences = this._onDidChangePreferences.event;
        this._onDidChangeAccess = this._register(new Emitter());
        this.onDidChangeAccess = this._onDidChangeAccess.event;
        // Forward events from underlying services
        this._register(this.authenticationExtensionsService.onDidChangeAccountPreference(e => {
            this._onDidChangePreferences.fire({
                providerId: e.providerId,
                entityType: 'extension',
                entityIds: e.extensionIds
            });
        }));
        this._register(this.authenticationMcpService.onDidChangeAccountPreference(e => {
            this._onDidChangePreferences.fire({
                providerId: e.providerId,
                entityType: 'mcpServer',
                entityIds: e.mcpServerIds
            });
        }));
        this._register(this.authenticationAccessService.onDidChangeExtensionSessionAccess(e => {
            this._onDidChangeAccess.fire({
                providerId: e.providerId,
                accountName: e.accountName
            });
        }));
        this._register(this.authenticationMcpAccessService.onDidChangeMcpSessionAccess(e => {
            this._onDidChangeAccess.fire({
                providerId: e.providerId,
                accountName: e.accountName
            });
        }));
    }
    provider(providerId) {
        return new ProviderQuery(providerId, this);
    }
    extension(extensionId) {
        return new ExtensionQuery(extensionId, this);
    }
    mcpServer(mcpServerId) {
        return new McpServerQuery(mcpServerId, this);
    }
    getProviderIds(includeInternal) {
        return this.authenticationService.getProviderIds().filter(providerId => {
            // Filter out internal providers unless explicitly included
            return includeInternal || !providerId.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX);
        });
    }
    async clearAllData(confirmation, includeInternal = true) {
        if (confirmation !== 'CLEAR_ALL_AUTH_DATA') {
            throw new Error('Must provide confirmation string to clear all authentication data');
        }
        const providerIds = this.getProviderIds(includeInternal);
        for (const providerId of providerIds) {
            try {
                const accounts = await this.authenticationService.getAccounts(providerId);
                for (const account of accounts) {
                    // Clear extension data
                    this.authenticationAccessService.removeAllowedExtensions(providerId, account.label);
                    this.authenticationUsageService.removeAccountUsage(providerId, account.label);
                    // Clear MCP server data
                    this.authenticationMcpAccessService.removeAllowedMcpServers(providerId, account.label);
                    this.authenticationMcpUsageService.removeAccountUsage(providerId, account.label);
                }
            }
            catch (error) {
                this.logService.error(`Error clearing data for provider ${providerId}:`, error);
            }
        }
        this.logService.info('All authentication data cleared');
    }
};
AuthenticationQueryService = __decorate([
    __param(0, IAuthenticationService),
    __param(1, IAuthenticationUsageService),
    __param(2, IAuthenticationMcpUsageService),
    __param(3, IAuthenticationAccessService),
    __param(4, IAuthenticationMcpAccessService),
    __param(5, IAuthenticationExtensionsService),
    __param(6, IAuthenticationMcpService),
    __param(7, ILogService)
], AuthenticationQueryService);
export { AuthenticationQueryService };
registerSingleton(IAuthenticationQueryService, AuthenticationQueryService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25RdWVyeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hdXRoZW50aWNhdGlvbi9icm93c2VyL2F1dGhlbnRpY2F0aW9uUXVlcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQWdDLHNCQUFzQixFQUFFLGdDQUFnQyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDcEssT0FBTyxFQUNOLDJCQUEyQixFQWUzQixNQUFNLGtDQUFrQyxDQUFDO0FBQzFDLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRTNGOztHQUVHO0FBQ0gsTUFBZSxTQUFTO0lBQ3ZCLFlBQ2lCLFVBQWtCLEVBQ2YsWUFBd0M7UUFEM0MsZUFBVSxHQUFWLFVB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