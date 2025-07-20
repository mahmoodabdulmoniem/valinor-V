/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { AuthenticationQueryService } from '../../browser/authenticationQueryService.js';
import { IAuthenticationService, IAuthenticationExtensionsService } from '../../common/authentication.js';
import { IAuthenticationUsageService } from '../../browser/authenticationUsageService.js';
import { IAuthenticationMcpUsageService } from '../../browser/authenticationMcpUsageService.js';
import { IAuthenticationAccessService } from '../../browser/authenticationAccessService.js';
import { IAuthenticationMcpAccessService } from '../../browser/authenticationMcpAccessService.js';
import { IAuthenticationMcpService } from '../../browser/authenticationMcpService.js';
import { TestUsageService, TestMcpUsageService, TestAccessService, TestMcpAccessService, TestExtensionsService, TestMcpService, TestAuthenticationService, createProvider, } from './authenticationQueryServiceMocks.js';
/**
 * Real integration tests for AuthenticationQueryService
 */
suite('AuthenticationQueryService Integration Tests', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let queryService;
    let authService;
    let usageService;
    let mcpUsageService;
    let accessService;
    let mcpAccessService;
    setup(() => {
        const instantiationService = disposables.add(new TestInstantiationService());
        // Set up storage service
        const storageService = disposables.add(new TestStorageService());
        instantiationService.stub(IStorageService, storageService);
        // Set up log service
        instantiationService.stub(ILogService, new NullLogService());
        // Create and register test services
        authService = disposables.add(new TestAuthenticationService());
        instantiationService.stub(IAuthenticationService, authService);
        usageService = disposables.add(new TestUsageService());
        mcpUsageService = disposables.add(new TestMcpUsageService());
        accessService = disposables.add(new TestAccessService());
        mcpAccessService = disposables.add(new TestMcpAccessService());
        instantiationService.stub(IAuthenticationUsageService, usageService);
        instantiationService.stub(IAuthenticationMcpUsageService, mcpUsageService);
        instantiationService.stub(IAuthenticationAccessService, accessService);
        instantiationService.stub(IAuthenticationMcpAccessService, mcpAccessService);
        instantiationService.stub(IAuthenticationExtensionsService, disposables.add(new TestExtensionsService()));
        instantiationService.stub(IAuthenticationMcpService, disposables.add(new TestMcpService()));
        // Create the query service
        queryService = disposables.add(instantiationService.createInstance(AuthenticationQueryService));
    });
    test('usage tracking stores and retrieves data correctly', () => {
        const extensionQuery = queryService.provider('github').account('user@example.com').extension('my-extension');
        // Initially no usage
        assert.strictEqual(extensionQuery.getUsage().length, 0);
        // Add usage and verify it's stored
        extensionQuery.addUsage(['read', 'write'], 'My Extension');
        const usage = extensionQuery.getUsage();
        assert.strictEqual(usage.length, 1);
        assert.strictEqual(usage[0].extensionId, 'my-extension');
        assert.strictEqual(usage[0].extensionName, 'My Extension');
        assert.deepStrictEqual(usage[0].scopes, ['read', 'write']);
        // Add more usage and verify accumulation
        extensionQuery.addUsage(['admin'], 'My Extension');
        assert.strictEqual(extensionQuery.getUsage().length, 2);
    });
    test('access control persists across queries', () => {
        const extensionQuery = queryService.provider('github').account('user@example.com').extension('my-extension');
        // Set access and verify
        extensionQuery.setAccessAllowed(true, 'My Extension');
        assert.strictEqual(extensionQuery.isAccessAllowed(), true);
        // Create new query object for same target - should persist
        const sameExtensionQuery = queryService.provider('github').account('user@example.com').extension('my-extension');
        assert.strictEqual(sameExtensionQuery.isAccessAllowed(), true);
        // Different extension should be unaffected
        const otherExtensionQuery = queryService.provider('github').account('user@example.com').extension('other-extension');
        assert.strictEqual(otherExtensionQuery.isAccessAllowed(), undefined);
    });
    test('account preferences work across services', () => {
        const extensionQuery = queryService.provider('github').extension('my-extension');
        const mcpQuery = queryService.provider('github').mcpServer('my-server');
        // Set preferences for both
        extensionQuery.setPreferredAccount({ id: 'user1', label: 'user@example.com' });
        mcpQuery.setPreferredAccount({ id: 'user2', label: 'admin@example.com' });
        // Verify different preferences are stored independently
        assert.strictEqual(extensionQuery.getPreferredAccount(), 'user@example.com');
        assert.strictEqual(mcpQuery.getPreferredAccount(), 'admin@example.com');
        // Test preference detection
        const userExtensionQuery = queryService.provider('github').account('user@example.com').extension('my-extension');
        const adminMcpQuery = queryService.provider('github').account('admin@example.com').mcpServer('my-server');
        assert.strictEqual(userExtensionQuery.isPreferred(), true);
        assert.strictEqual(adminMcpQuery.isPreferred(), true);
        // Test non-preferred accounts
        const wrongExtensionQuery = queryService.provider('github').account('wrong@example.com').extension('my-extension');
        assert.strictEqual(wrongExtensionQuery.isPreferred(), false);
    });
    test('account removal cleans up all related data', () => {
        const accountQuery = queryService.provider('github').account('user@example.com');
        // Set up data across multiple services
        accountQuery.extension('ext1').setAccessAllowed(true, 'Extension 1');
        accountQuery.extension('ext1').addUsage(['read'], 'Extension 1');
        accountQuery.mcpServer('mcp1').setAccessAllowed(true, 'MCP Server 1');
        accountQuery.mcpServer('mcp1').addUsage(['write'], 'MCP Server 1');
        // Verify data exists
        assert.strictEqual(accountQuery.extension('ext1').isAccessAllowed(), true);
        assert.strictEqual(accountQuery.extension('ext1').getUsage().length, 1);
        assert.strictEqual(accountQuery.mcpServer('mcp1').isAccessAllowed(), true);
        assert.strictEqual(accountQuery.mcpServer('mcp1').getUsage().length, 1);
        // Remove account
        accountQuery.remove();
        // Verify all data is cleaned up
        assert.strictEqual(accountQuery.extension('ext1').isAccessAllowed(), undefined);
        assert.strictEqual(accountQuery.extension('ext1').getUsage().length, 0);
        assert.strictEqual(accountQuery.mcpServer('mcp1').isAccessAllowed(), undefined);
        assert.strictEqual(accountQuery.mcpServer('mcp1').getUsage().length, 0);
    });
    test('provider registration and listing works', () => {
        // Initially no providers
        assert.strictEqual(queryService.getProviderIds().length, 0);
        // Register a provider
        const provider = createProvider({ id: 'github', label: 'GitHub' });
        authService.registerAuthenticationProvider('github', provider);
        // Verify provider is listed
        const providerIds = queryService.getProviderIds();
        assert.ok(providerIds.includes('github'));
        assert.strictEqual(authService.isAuthenticationProviderRegistered('github'), true);
    });
    test('MCP usage and access work independently from extensions', () => {
        const extensionQuery = queryService.provider('github').account('user@example.com').extension('my-extension');
        const mcpQuery = queryService.provider('github').account('user@example.com').mcpServer('my-server');
        // Set up data for both
        extensionQuery.setAccessAllowed(true, 'My Extension');
        extensionQuery.addUsage(['read'], 'My Extension');
        mcpQuery.setAccessAllowed(false, 'My Server');
        mcpQuery.addUsage(['write'], 'My Server');
        // Verify they're independent
        assert.strictEqual(extensionQuery.isAccessAllowed(), true);
        assert.strictEqual(mcpQuery.isAccessAllowed(), false);
        assert.strictEqual(extensionQuery.getUsage()[0].extensionId, 'my-extension');
        assert.strictEqual(mcpQuery.getUsage()[0].mcpServerId, 'my-server');
        // Verify no cross-contamination
        assert.strictEqual(extensionQuery.getUsage().length, 1);
        assert.strictEqual(mcpQuery.getUsage().length, 1);
    });
    test('getAllAccountPreferences returns synchronously', () => {
        // Register providers for the test
        const githubProvider = createProvider({ id: 'github', label: 'GitHub' });
        const azureProvider = createProvider({ id: 'azure', label: 'Azure' });
        authService.registerAuthenticationProvider('github', githubProvider);
        authService.registerAuthenticationProvider('azure', azureProvider);
        const extensionQuery = queryService.extension('my-extension');
        const mcpQuery = queryService.mcpServer('my-server');
        // Set preferences for different providers
        extensionQuery.provider('github').setPreferredAccount({ id: 'user1', label: 'github-user@example.com' });
        extensionQuery.provider('azure').setPreferredAccount({ id: 'user2', label: 'azure-user@example.com' });
        mcpQuery.provider('github').setPreferredAccount({ id: 'user3', label: 'github-mcp@example.com' });
        // Get all preferences synchronously (no await needed)
        const extensionPreferences = extensionQuery.getAllAccountPreferences();
        const mcpPreferences = mcpQuery.getAllAccountPreferences();
        // Verify extension preferences
        assert.strictEqual(extensionPreferences.get('github'), 'github-user@example.com');
        assert.strictEqual(extensionPreferences.get('azure'), 'azure-user@example.com');
        assert.strictEqual(extensionPreferences.size, 2);
        // Verify MCP preferences
        assert.strictEqual(mcpPreferences.get('github'), 'github-mcp@example.com');
        assert.strictEqual(mcpPreferences.size, 1);
        // Verify they don't interfere with each other
        assert.notStrictEqual(extensionPreferences.get('github'), mcpPreferences.get('github'));
    });
    test('forEach methods work synchronously', () => {
        const accountQuery = queryService.provider('github').account('user@example.com');
        // Add some usage data first
        accountQuery.extension('ext1').addUsage(['read'], 'Extension 1');
        accountQuery.extension('ext2').addUsage(['write'], 'Extension 2');
        accountQuery.mcpServer('mcp1').addUsage(['admin'], 'MCP Server 1');
        // Test extensions forEach - no await needed
        const extensionIds = [];
        accountQuery.extensions().forEach(extensionQuery => {
            extensionIds.push(extensionQuery.extensionId);
        });
        assert.strictEqual(extensionIds.length, 2);
        assert.ok(extensionIds.includes('ext1'));
        assert.ok(extensionIds.includes('ext2'));
        // Test MCP servers forEach - no await needed
        const mcpServerIds = [];
        accountQuery.mcpServers().forEach(mcpServerQuery => {
            mcpServerIds.push(mcpServerQuery.mcpServerId);
        });
        assert.strictEqual(mcpServerIds.length, 1);
        assert.ok(mcpServerIds.includes('mcp1'));
    });
    test('remove method works synchronously', () => {
        const accountQuery = queryService.provider('github').account('user@example.com');
        // Set up data
        accountQuery.extension('ext1').setAccessAllowed(true, 'Extension 1');
        accountQuery.mcpServer('mcp1').setAccessAllowed(true, 'MCP Server 1');
        // Remove synchronously - no await needed
        accountQuery.remove();
        // Verify data is gone
        assert.strictEqual(accountQuery.extension('ext1').isAccessAllowed(), undefined);
        assert.strictEqual(accountQuery.mcpServer('mcp1').isAccessAllowed(), undefined);
    });
    test('cross-provider extension queries work correctly', () => {
        // Register multiple providers
        const githubProvider = createProvider({ id: 'github', label: 'GitHub' });
        const azureProvider = createProvider({ id: 'azure', label: 'Azure' });
        authService.registerAuthenticationProvider('github', githubProvider);
        authService.registerAuthenticationProvider('azure', azureProvider);
        // Set up data using provider-first approach
        queryService.provider('github').account('user@example.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('azure').account('admin@example.com').extension('my-extension').setAccessAllowed(false, 'My Extension');
        // Query using extension-first approach should return all providers
        const extensionQuery = queryService.extension('my-extension');
        const githubPrefs = extensionQuery.getAllAccountPreferences();
        // Should include both providers
        assert.ok(githubPrefs.size >= 0); // Extension query should work across providers
        // Test preferences using extension-first query pattern
        extensionQuery.provider('github').setPreferredAccount({ id: 'user1', label: 'user@example.com' });
        extensionQuery.provider('azure').setPreferredAccount({ id: 'user2', label: 'admin@example.com' });
        assert.strictEqual(extensionQuery.provider('github').getPreferredAccount(), 'user@example.com');
        assert.strictEqual(extensionQuery.provider('azure').getPreferredAccount(), 'admin@example.com');
    });
    test('event forwarding from authentication service works', () => {
        let eventFired = false;
        // Listen for access change events through the query service
        const disposable = queryService.onDidChangeAccess(() => {
            eventFired = true;
        });
        try {
            // Trigger an access change that should fire an event
            queryService.provider('github').account('user@example.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
            // Verify the event was fired
            assert.strictEqual(eventFired, true);
        }
        finally {
            disposable.dispose();
        }
    });
    test('error handling for invalid inputs works correctly', () => {
        // Test with non-existent provider
        const invalidProviderQuery = queryService.provider('non-existent-provider');
        // Should not throw, but should handle gracefully
        assert.doesNotThrow(() => {
            invalidProviderQuery.account('user@example.com').extension('my-extension').isAccessAllowed();
        });
        // Test with empty/invalid account names
        const emptyAccountQuery = queryService.provider('github').account('').extension('my-extension');
        assert.doesNotThrow(() => {
            emptyAccountQuery.isAccessAllowed();
        });
        // Test with empty extension IDs
        const emptyExtensionQuery = queryService.provider('github').account('user@example.com').extension('');
        assert.doesNotThrow(() => {
            emptyExtensionQuery.isAccessAllowed();
        });
    });
    test('bulk operations work correctly', () => {
        const accountQuery = queryService.provider('github').account('user@example.com');
        // Set up multiple extensions with different access levels
        accountQuery.extension('ext1').setAccessAllowed(true, 'Extension 1');
        accountQuery.extension('ext2').setAccessAllowed(false, 'Extension 2');
        accountQuery.extension('ext3').setAccessAllowed(true, 'Extension 3');
        // Add usage for some extensions
        accountQuery.extension('ext1').addUsage(['read'], 'Extension 1');
        accountQuery.extension('ext3').addUsage(['write'], 'Extension 3');
        // Test bulk enumeration
        let extensionCount = 0;
        let allowedCount = 0;
        let usageCount = 0;
        accountQuery.extensions().forEach(extensionQuery => {
            extensionCount++;
            if (extensionQuery.isAccessAllowed() === true) {
                allowedCount++;
            }
            if (extensionQuery.getUsage().length > 0) {
                usageCount++;
            }
        });
        // Verify bulk operation results
        assert.strictEqual(extensionCount, 3);
        assert.strictEqual(allowedCount, 2); // ext1 and ext3
        assert.strictEqual(usageCount, 2); // ext1 and ext3
        // Test bulk operations for MCP servers
        accountQuery.mcpServer('mcp1').setAccessAllowed(true, 'MCP 1');
        accountQuery.mcpServer('mcp2').setAccessAllowed(false, 'MCP 2');
        let mcpCount = 0;
        accountQuery.mcpServers().forEach(mcpQuery => {
            mcpCount++;
        });
        assert.strictEqual(mcpCount, 2);
    });
    test('data consistency across different query paths', () => {
        // Set up data using one query path
        const extensionQuery1 = queryService.provider('github').account('user@example.com').extension('my-extension');
        extensionQuery1.setAccessAllowed(true, 'My Extension');
        extensionQuery1.addUsage(['read', 'write'], 'My Extension');
        // Access same data using different query path (cross-provider query)
        const extensionQuery2 = queryService.extension('my-extension').provider('github');
        // Data should be consistent through provider preference access
        assert.strictEqual(extensionQuery1.isAccessAllowed(), true);
        assert.strictEqual(extensionQuery1.getUsage().length, 1);
        // Set preferences and check consistency
        extensionQuery2.setPreferredAccount({ id: 'user', label: 'user@example.com' });
        assert.strictEqual(extensionQuery2.getPreferredAccount(), 'user@example.com');
        // Modify through one path
        extensionQuery1.setAccessAllowed(false, 'My Extension');
        // Should be reflected when accessing through provider->account path
        assert.strictEqual(extensionQuery1.isAccessAllowed(), false);
    });
    test('preference management handles complex scenarios', () => {
        // Register multiple providers
        const githubProvider = createProvider({ id: 'github', label: 'GitHub' });
        const azureProvider = createProvider({ id: 'azure', label: 'Azure' });
        authService.registerAuthenticationProvider('github', githubProvider);
        authService.registerAuthenticationProvider('azure', azureProvider);
        const extensionQuery = queryService.extension('my-extension');
        // Set different preferences for different providers
        extensionQuery.provider('github').setPreferredAccount({ id: 'user1', label: 'github-user@example.com' });
        extensionQuery.provider('azure').setPreferredAccount({ id: 'user2', label: 'azure-user@example.com' });
        // Test preference retrieval
        assert.strictEqual(extensionQuery.provider('github').getPreferredAccount(), 'github-user@example.com');
        assert.strictEqual(extensionQuery.provider('azure').getPreferredAccount(), 'azure-user@example.com');
        // Test account preference detection through provider->account queries
        assert.strictEqual(queryService.provider('github').account('github-user@example.com').extension('my-extension').isPreferred(), true);
        assert.strictEqual(queryService.provider('azure').account('azure-user@example.com').extension('my-extension').isPreferred(), true);
        assert.strictEqual(queryService.provider('github').account('wrong@example.com').extension('my-extension').isPreferred(), false);
        // Test getAllAccountPreferences with multiple providers
        const allPrefs = extensionQuery.getAllAccountPreferences();
        assert.strictEqual(allPrefs.get('github'), 'github-user@example.com');
        assert.strictEqual(allPrefs.get('azure'), 'azure-user@example.com');
        assert.strictEqual(allPrefs.size, 2);
    });
    test('MCP server vs extension data isolation is complete', () => {
        const accountQuery = queryService.provider('github').account('user@example.com');
        // Set up similar data for extension and MCP server with same IDs
        const sameId = 'same-identifier';
        accountQuery.extension(sameId).setAccessAllowed(true, 'Extension');
        accountQuery.extension(sameId).addUsage(['ext-scope'], 'Extension');
        accountQuery.mcpServer(sameId).setAccessAllowed(false, 'MCP Server');
        accountQuery.mcpServer(sameId).addUsage(['mcp-scope'], 'MCP Server');
        // Verify complete isolation
        assert.strictEqual(accountQuery.extension(sameId).isAccessAllowed(), true);
        assert.strictEqual(accountQuery.mcpServer(sameId).isAccessAllowed(), false);
        const extUsage = accountQuery.extension(sameId).getUsage();
        const mcpUsage = accountQuery.mcpServer(sameId).getUsage();
        assert.strictEqual(extUsage.length, 1);
        assert.strictEqual(mcpUsage.length, 1);
        assert.strictEqual(extUsage[0].extensionId, sameId);
        assert.strictEqual(mcpUsage[0].mcpServerId, sameId);
        assert.notDeepStrictEqual(extUsage[0].scopes, mcpUsage[0].scopes);
        // Test preference isolation
        queryService.extension(sameId).provider('github').setPreferredAccount({ id: 'ext-user', label: 'ext@example.com' });
        queryService.mcpServer(sameId).provider('github').setPreferredAccount({ id: 'mcp-user', label: 'mcp@example.com' });
        assert.strictEqual(queryService.extension(sameId).provider('github').getPreferredAccount(), 'ext@example.com');
        assert.strictEqual(queryService.mcpServer(sameId).provider('github').getPreferredAccount(), 'mcp@example.com');
    });
    test('provider listing and registration integration', () => {
        // Initially should have providers from setup (if any)
        const initialProviders = queryService.getProviderIds();
        const initialCount = initialProviders.length;
        // Register a new provider
        const newProvider = createProvider({ id: 'test-provider', label: 'Test Provider' });
        authService.registerAuthenticationProvider('test-provider', newProvider);
        // Should now appear in listing
        const updatedProviders = queryService.getProviderIds();
        assert.strictEqual(updatedProviders.length, initialCount + 1);
        assert.ok(updatedProviders.includes('test-provider'));
        // Should be able to query the new provider
        const providerQuery = queryService.provider('test-provider');
        assert.strictEqual(providerQuery.providerId, 'test-provider');
        // Should integrate with authentication service state
        assert.strictEqual(authService.isAuthenticationProviderRegistered('test-provider'), true);
    });
    /**
     * Service Call Verification Tests
     * These tests verify that the AuthenticationQueryService properly delegates to underlying services
     * with the correct parameters. This is important for ensuring the facade works correctly.
     */
    test('setAccessAllowed calls updateAllowedExtensions with correct parameters', () => {
        const extensionQuery = queryService.provider('github').account('user@example.com').extension('my-extension');
        // Clear any previous calls
        accessService.clearCallHistory();
        // Call setAccessAllowed
        extensionQuery.setAccessAllowed(true, 'My Extension');
        // Verify the underlying service was called correctly
        const calls = accessService.getCallsFor('updateAllowedExtensions');
        assert.strictEqual(calls.length, 1);
        const [providerId, accountName, extensions] = calls[0].args;
        assert.strictEqual(providerId, 'github');
        assert.strictEqual(accountName, 'user@example.com');
        assert.strictEqual(extensions.length, 1);
        assert.strictEqual(extensions[0].id, 'my-extension');
        assert.strictEqual(extensions[0].name, 'My Extension');
        assert.strictEqual(extensions[0].allowed, true);
    });
    test('addUsage calls addAccountUsage with correct parameters', () => {
        const extensionQuery = queryService.provider('azure').account('admin@company.com').extension('test-extension');
        // Clear any previous calls
        usageService.clearCallHistory();
        // Call addUsage
        extensionQuery.addUsage(['read', 'write'], 'Test Extension');
        // Verify the underlying service was called correctly
        const calls = usageService.getCallsFor('addAccountUsage');
        assert.strictEqual(calls.length, 1);
        const [providerId, accountName, scopes, extensionId, extensionName] = calls[0].args;
        assert.strictEqual(providerId, 'azure');
        assert.strictEqual(accountName, 'admin@company.com');
        assert.deepStrictEqual(scopes, ['read', 'write']);
        assert.strictEqual(extensionId, 'test-extension');
        assert.strictEqual(extensionName, 'Test Extension');
    });
    test('isAccessAllowed calls underlying service with correct parameters', () => {
        const extensionQuery = queryService.provider('github').account('user@example.com').extension('my-extension');
        // Clear any previous calls
        accessService.clearCallHistory();
        // Call isAccessAllowed
        extensionQuery.isAccessAllowed();
        // Verify the underlying service was called correctly
        const calls = accessService.getCallsFor('isAccessAllowed');
        assert.strictEqual(calls.length, 1);
        const [providerId, accountName, extensionId] = calls[0].args;
        assert.strictEqual(providerId, 'github');
        assert.strictEqual(accountName, 'user@example.com');
        assert.strictEqual(extensionId, 'my-extension');
    });
    test('getUsage calls readAccountUsages with correct parameters', () => {
        const extensionQuery = queryService.provider('github').account('user@example.com').extension('my-extension');
        // Clear any previous calls
        usageService.clearCallHistory();
        // Call getUsage
        extensionQuery.getUsage();
        // Verify the underlying service was called correctly
        const calls = usageService.getCallsFor('readAccountUsages');
        assert.strictEqual(calls.length, 1);
        const [providerId, accountName] = calls[0].args;
        assert.strictEqual(providerId, 'github');
        assert.strictEqual(accountName, 'user@example.com');
    });
    test('MCP setAccessAllowed calls updateAllowedMcpServers with correct parameters', () => {
        const mcpQuery = queryService.provider('github').account('user@example.com').mcpServer('my-server');
        // Clear any previous calls
        mcpAccessService.clearCallHistory();
        // Call setAccessAllowed
        mcpQuery.setAccessAllowed(false, 'My MCP Server');
        // Verify the underlying service was called correctly
        const calls = mcpAccessService.getCallsFor('updateAllowedMcpServers');
        assert.strictEqual(calls.length, 1);
        const [providerId, accountName, servers] = calls[0].args;
        assert.strictEqual(providerId, 'github');
        assert.strictEqual(accountName, 'user@example.com');
        assert.strictEqual(servers.length, 1);
        assert.strictEqual(servers[0].id, 'my-server');
        assert.strictEqual(servers[0].name, 'My MCP Server');
        assert.strictEqual(servers[0].allowed, false);
    });
    test('MCP addUsage calls addAccountUsage with correct parameters', () => {
        const mcpQuery = queryService.provider('azure').account('admin@company.com').mcpServer('test-server');
        // Clear any previous calls
        mcpUsageService.clearCallHistory();
        // Call addUsage
        mcpQuery.addUsage(['admin'], 'Test MCP Server');
        // Verify the underlying service was called correctly
        const calls = mcpUsageService.getCallsFor('addAccountUsage');
        assert.strictEqual(calls.length, 1);
        const [providerId, accountName, scopes, serverId, serverName] = calls[0].args;
        assert.strictEqual(providerId, 'azure');
        assert.strictEqual(accountName, 'admin@company.com');
        assert.deepStrictEqual(scopes, ['admin']);
        assert.strictEqual(serverId, 'test-server');
        assert.strictEqual(serverName, 'Test MCP Server');
    });
    test('account removal calls all appropriate cleanup methods', () => {
        const accountQuery = queryService.provider('github').account('user@example.com');
        // Set up some data first
        accountQuery.extension('ext1').setAccessAllowed(true, 'Extension 1');
        accountQuery.extension('ext1').addUsage(['read'], 'Extension 1');
        accountQuery.mcpServer('mcp1').setAccessAllowed(true, 'MCP Server 1');
        accountQuery.mcpServer('mcp1').addUsage(['write'], 'MCP Server 1');
        // Clear call history to focus on removal calls
        usageService.clearCallHistory();
        mcpUsageService.clearCallHistory();
        accessService.clearCallHistory();
        mcpAccessService.clearCallHistory();
        // Call remove
        accountQuery.remove();
        // Verify all cleanup methods were called
        const extensionUsageRemoval = usageService.getCallsFor('removeAccountUsage');
        const mcpUsageRemoval = mcpUsageService.getCallsFor('removeAccountUsage');
        const extensionAccessRemoval = accessService.getCallsFor('removeAllowedExtensions');
        const mcpAccessRemoval = mcpAccessService.getCallsFor('removeAllowedMcpServers');
        assert.strictEqual(extensionUsageRemoval.length, 1);
        assert.strictEqual(mcpUsageRemoval.length, 1);
        assert.strictEqual(extensionAccessRemoval.length, 1);
        assert.strictEqual(mcpAccessRemoval.length, 1);
        // Verify all calls use correct parameters
        [extensionUsageRemoval[0], mcpUsageRemoval[0], extensionAccessRemoval[0], mcpAccessRemoval[0]].forEach(call => {
            const [providerId, accountName] = call.args;
            assert.strictEqual(providerId, 'github');
            assert.strictEqual(accountName, 'user@example.com');
        });
    });
    test('bulk operations call readAccountUsages and readAllowedExtensions', () => {
        const accountQuery = queryService.provider('github').account('user@example.com');
        // Set up some data
        accountQuery.extension('ext1').setAccessAllowed(true, 'Extension 1');
        accountQuery.extension('ext2').addUsage(['read'], 'Extension 2');
        // Clear call history
        usageService.clearCallHistory();
        accessService.clearCallHistory();
        // Perform bulk operation
        accountQuery.extensions().forEach(() => {
            // Just iterate to trigger the underlying service calls
        });
        // Verify the underlying services were called for bulk enumeration
        const usageCalls = usageService.getCallsFor('readAccountUsages');
        const accessCalls = accessService.getCallsFor('readAllowedExtensions');
        assert.strictEqual(usageCalls.length, 1);
        assert.strictEqual(accessCalls.length, 1);
        // Verify parameters
        usageCalls.concat(accessCalls).forEach(call => {
            const [providerId, accountName] = call.args;
            assert.strictEqual(providerId, 'github');
            assert.strictEqual(accountName, 'user@example.com');
        });
    });
    test('multiple operations accumulate service calls correctly', () => {
        const extensionQuery = queryService.provider('github').account('user@example.com').extension('my-extension');
        // Clear call history
        accessService.clearCallHistory();
        usageService.clearCallHistory();
        // Perform multiple operations
        extensionQuery.setAccessAllowed(true, 'My Extension');
        extensionQuery.addUsage(['read'], 'My Extension');
        extensionQuery.isAccessAllowed();
        extensionQuery.getUsage();
        extensionQuery.setAccessAllowed(false, 'My Extension');
        // Verify call counts
        assert.strictEqual(accessService.getCallsFor('updateAllowedExtensions').length, 2);
        assert.strictEqual(accessService.getCallsFor('isAccessAllowed').length, 1);
        assert.strictEqual(usageService.getCallsFor('addAccountUsage').length, 1);
        assert.strictEqual(usageService.getCallsFor('readAccountUsages').length, 1);
    });
    test('getProvidersWithAccess filters internal providers by default', async () => {
        // Register multiple providers including internal ones
        const githubProvider = createProvider({ id: 'github', label: 'GitHub' });
        const azureProvider = createProvider({ id: 'azure', label: 'Azure' });
        const internalProvider1 = createProvider({ id: '__internal1', label: 'Internal Provider 1' });
        const internalProvider2 = createProvider({ id: '__internal2', label: 'Internal Provider 2' });
        authService.registerAuthenticationProvider('github', githubProvider);
        authService.registerAuthenticationProvider('azure', azureProvider);
        authService.registerAuthenticationProvider('__internal1', internalProvider1);
        authService.registerAuthenticationProvider('__internal2', internalProvider2);
        // Add accounts to all providers
        authService.addAccounts('github', [{ id: 'user1', label: 'user@github.com' }]);
        authService.addAccounts('azure', [{ id: 'user2', label: 'user@azure.com' }]);
        authService.addAccounts('__internal1', [{ id: 'user3', label: 'internal1@example.com' }]);
        authService.addAccounts('__internal2', [{ id: 'user4', label: 'internal2@example.com' }]);
        // Set up access for all providers
        queryService.provider('github').account('user@github.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('azure').account('user@azure.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('__internal1').account('internal1@example.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('__internal2').account('internal2@example.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        // Test extension query - should exclude internal providers by default
        const extensionQuery = queryService.extension('my-extension');
        const providersWithAccess = await extensionQuery.getProvidersWithAccess();
        assert.strictEqual(providersWithAccess.length, 2);
        assert.ok(providersWithAccess.includes('github'));
        assert.ok(providersWithAccess.includes('azure'));
        assert.ok(!providersWithAccess.includes('__internal1'));
        assert.ok(!providersWithAccess.includes('__internal2'));
    });
    test('getProvidersWithAccess includes internal providers when requested', async () => {
        // Register multiple providers including internal ones
        const githubProvider = createProvider({ id: 'github', label: 'GitHub' });
        const internalProvider = createProvider({ id: '__internal1', label: 'Internal Provider' });
        authService.registerAuthenticationProvider('github', githubProvider);
        authService.registerAuthenticationProvider('__internal1', internalProvider);
        // Add accounts to all providers
        authService.addAccounts('github', [{ id: 'user1', label: 'user@github.com' }]);
        authService.addAccounts('__internal1', [{ id: 'user2', label: 'internal@example.com' }]);
        // Set up access for all providers
        queryService.provider('github').account('user@github.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('__internal1').account('internal@example.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        // Test extension query - should include internal providers when requested
        const extensionQuery = queryService.extension('my-extension');
        const providersWithAccess = await extensionQuery.getProvidersWithAccess(true);
        assert.strictEqual(providersWithAccess.length, 2);
        assert.ok(providersWithAccess.includes('github'));
        assert.ok(providersWithAccess.includes('__internal1'));
    });
    test('MCP server getProvidersWithAccess filters internal providers by default', async () => {
        // Register multiple providers including internal ones
        const githubProvider = createProvider({ id: 'github', label: 'GitHub' });
        const azureProvider = createProvider({ id: 'azure', label: 'Azure' });
        const internalProvider1 = createProvider({ id: '__internal1', label: 'Internal Provider 1' });
        const internalProvider2 = createProvider({ id: '__internal2', label: 'Internal Provider 2' });
        authService.registerAuthenticationProvider('github', githubProvider);
        authService.registerAuthenticationProvider('azure', azureProvider);
        authService.registerAuthenticationProvider('__internal1', internalProvider1);
        authService.registerAuthenticationProvider('__internal2', internalProvider2);
        // Add accounts to all providers
        authService.addAccounts('github', [{ id: 'user1', label: 'user@github.com' }]);
        authService.addAccounts('azure', [{ id: 'user2', label: 'user@azure.com' }]);
        authService.addAccounts('__internal1', [{ id: 'user3', label: 'internal1@example.com' }]);
        authService.addAccounts('__internal2', [{ id: 'user4', label: 'internal2@example.com' }]);
        // Set up MCP access for all providers
        queryService.provider('github').account('user@github.com').mcpServer('my-server').setAccessAllowed(true, 'My Server');
        queryService.provider('azure').account('user@azure.com').mcpServer('my-server').setAccessAllowed(true, 'My Server');
        queryService.provider('__internal1').account('internal1@example.com').mcpServer('my-server').setAccessAllowed(true, 'My Server');
        queryService.provider('__internal2').account('internal2@example.com').mcpServer('my-server').setAccessAllowed(true, 'My Server');
        // Test MCP server query - should exclude internal providers by default
        const mcpServerQuery = queryService.mcpServer('my-server');
        const providersWithAccess = await mcpServerQuery.getProvidersWithAccess();
        assert.strictEqual(providersWithAccess.length, 2);
        assert.ok(providersWithAccess.includes('github'));
        assert.ok(providersWithAccess.includes('azure'));
        assert.ok(!providersWithAccess.includes('__internal1'));
        assert.ok(!providersWithAccess.includes('__internal2'));
    });
    test('MCP server getProvidersWithAccess includes internal providers when requested', async () => {
        // Register multiple providers including internal ones
        const githubProvider = createProvider({ id: 'github', label: 'GitHub' });
        const internalProvider = createProvider({ id: '__internal1', label: 'Internal Provider' });
        authService.registerAuthenticationProvider('github', githubProvider);
        authService.registerAuthenticationProvider('__internal1', internalProvider);
        // Add accounts to all providers
        authService.addAccounts('github', [{ id: 'user1', label: 'user@github.com' }]);
        authService.addAccounts('__internal1', [{ id: 'user2', label: 'internal@example.com' }]);
        // Set up MCP access for all providers
        queryService.provider('github').account('user@github.com').mcpServer('my-server').setAccessAllowed(true, 'My Server');
        queryService.provider('__internal1').account('internal@example.com').mcpServer('my-server').setAccessAllowed(true, 'My Server');
        // Test MCP server query - should include internal providers when requested
        const mcpServerQuery = queryService.mcpServer('my-server');
        const providersWithAccess = await mcpServerQuery.getProvidersWithAccess(true);
        assert.strictEqual(providersWithAccess.length, 2);
        assert.ok(providersWithAccess.includes('github'));
        assert.ok(providersWithAccess.includes('__internal1'));
    });
    test('internal provider filtering works with mixed access patterns', async () => {
        // Register mixed providers
        const normalProvider = createProvider({ id: 'normal', label: 'Normal Provider' });
        const internalProvider = createProvider({ id: '__internal', label: 'Internal Provider' });
        const noAccessProvider = createProvider({ id: 'no-access', label: 'No Access Provider' });
        authService.registerAuthenticationProvider('normal', normalProvider);
        authService.registerAuthenticationProvider('__internal', internalProvider);
        authService.registerAuthenticationProvider('no-access', noAccessProvider);
        // Add accounts to all providers
        authService.addAccounts('normal', [{ id: 'user1', label: 'user@normal.com' }]);
        authService.addAccounts('__internal', [{ id: 'user2', label: 'internal@example.com' }]);
        authService.addAccounts('no-access', [{ id: 'user3', label: 'user@noaccess.com' }]);
        // Set up access only for normal and internal providers
        queryService.provider('normal').account('user@normal.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('__internal').account('internal@example.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        // Note: no-access provider deliberately has no access set
        const extensionQuery = queryService.extension('my-extension');
        // Without includeInternal: should only return normal provider
        const providersWithoutInternal = await extensionQuery.getProvidersWithAccess(false);
        assert.strictEqual(providersWithoutInternal.length, 1);
        assert.ok(providersWithoutInternal.includes('normal'));
        assert.ok(!providersWithoutInternal.includes('__internal'));
        assert.ok(!providersWithoutInternal.includes('no-access'));
        // With includeInternal: should return both normal and internal
        const providersWithInternal = await extensionQuery.getProvidersWithAccess(true);
        assert.strictEqual(providersWithInternal.length, 2);
        assert.ok(providersWithInternal.includes('normal'));
        assert.ok(providersWithInternal.includes('__internal'));
        assert.ok(!providersWithInternal.includes('no-access'));
    });
    test('internal provider filtering respects the __ prefix exactly', async () => {
        // Register providers with various naming patterns
        const regularProvider = createProvider({ id: 'regular', label: 'Regular Provider' });
        const underscoreProvider = createProvider({ id: '_single', label: 'Single Underscore Provider' });
        const doubleUnderscoreProvider = createProvider({ id: '__double', label: 'Double Underscore Provider' });
        const tripleUnderscoreProvider = createProvider({ id: '___triple', label: 'Triple Underscore Provider' });
        const underscoreInMiddleProvider = createProvider({ id: 'mid_underscore', label: 'Middle Underscore Provider' });
        authService.registerAuthenticationProvider('regular', regularProvider);
        authService.registerAuthenticationProvider('_single', underscoreProvider);
        authService.registerAuthenticationProvider('__double', doubleUnderscoreProvider);
        authService.registerAuthenticationProvider('___triple', tripleUnderscoreProvider);
        authService.registerAuthenticationProvider('mid_underscore', underscoreInMiddleProvider);
        // Add accounts to all providers
        authService.addAccounts('regular', [{ id: 'user1', label: 'user@regular.com' }]);
        authService.addAccounts('_single', [{ id: 'user2', label: 'user@single.com' }]);
        authService.addAccounts('__double', [{ id: 'user3', label: 'user@double.com' }]);
        authService.addAccounts('___triple', [{ id: 'user4', label: 'user@triple.com' }]);
        authService.addAccounts('mid_underscore', [{ id: 'user5', label: 'user@middle.com' }]);
        // Set up access for all providers
        queryService.provider('regular').account('user@regular.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('_single').account('user@single.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('__double').account('user@double.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('___triple').account('user@triple.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('mid_underscore').account('user@middle.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        const extensionQuery = queryService.extension('my-extension');
        // Without includeInternal: should exclude only providers starting with exactly "__"
        const providersWithoutInternal = await extensionQuery.getProvidersWithAccess(false);
        assert.strictEqual(providersWithoutInternal.length, 3);
        assert.ok(providersWithoutInternal.includes('regular'));
        assert.ok(providersWithoutInternal.includes('_single'));
        assert.ok(!providersWithoutInternal.includes('__double'));
        assert.ok(!providersWithoutInternal.includes('___triple')); // This starts with __, so should be filtered
        assert.ok(providersWithoutInternal.includes('mid_underscore'));
        // With includeInternal: should include all providers
        const providersWithInternal = await extensionQuery.getProvidersWithAccess(true);
        assert.strictEqual(providersWithInternal.length, 5);
        assert.ok(providersWithInternal.includes('regular'));
        assert.ok(providersWithInternal.includes('_single'));
        assert.ok(providersWithInternal.includes('__double'));
        assert.ok(providersWithInternal.includes('___triple'));
        assert.ok(providersWithInternal.includes('mid_underscore'));
    });
    test('getAllAccountPreferences filters internal providers by default for extensions', () => {
        // Register providers
        authService.registerAuthenticationProvider('github', createProvider({ id: 'github', label: 'GitHub' }));
        authService.registerAuthenticationProvider('azure', createProvider({ id: 'azure', label: 'Azure' }));
        authService.registerAuthenticationProvider('__internal', createProvider({ id: '__internal', label: 'Internal' }));
        // Set preferences
        const extensionQuery = queryService.extension('my-extension');
        extensionQuery.provider('github').setPreferredAccount({ id: 'user1', label: 'user@github.com' });
        extensionQuery.provider('azure').setPreferredAccount({ id: 'user2', label: 'user@azure.com' });
        extensionQuery.provider('__internal').setPreferredAccount({ id: 'user3', label: 'internal@example.com' });
        // Without includeInternal: should exclude internal providers
        const prefsWithoutInternal = extensionQuery.getAllAccountPreferences(false);
        assert.strictEqual(prefsWithoutInternal.size, 2);
        assert.strictEqual(prefsWithoutInternal.get('github'), 'user@github.com');
        assert.strictEqual(prefsWithoutInternal.get('azure'), 'user@azure.com');
        assert.strictEqual(prefsWithoutInternal.get('__internal'), undefined);
        // With includeInternal: should include all providers
        const prefsWithInternal = extensionQuery.getAllAccountPreferences(true);
        assert.strictEqual(prefsWithInternal.size, 3);
        assert.strictEqual(prefsWithInternal.get('github'), 'user@github.com');
        assert.strictEqual(prefsWithInternal.get('azure'), 'user@azure.com');
        assert.strictEqual(prefsWithInternal.get('__internal'), 'internal@example.com');
        // Default behavior: should exclude internal providers
        const prefsDefault = extensionQuery.getAllAccountPreferences();
        assert.strictEqual(prefsDefault.size, 2);
        assert.strictEqual(prefsDefault.get('__internal'), undefined);
    });
    test('getAllAccountPreferences filters internal providers by default for MCP servers', () => {
        // Register providers
        authService.registerAuthenticationProvider('github', createProvider({ id: 'github', label: 'GitHub' }));
        authService.registerAuthenticationProvider('azure', createProvider({ id: 'azure', label: 'Azure' }));
        authService.registerAuthenticationProvider('__internal', createProvider({ id: '__internal', label: 'Internal' }));
        // Set preferences
        const mcpQuery = queryService.mcpServer('my-server');
        mcpQuery.provider('github').setPreferredAccount({ id: 'user1', label: 'user@github.com' });
        mcpQuery.provider('azure').setPreferredAccount({ id: 'user2', label: 'user@azure.com' });
        mcpQuery.provider('__internal').setPreferredAccount({ id: 'user3', label: 'internal@example.com' });
        // Without includeInternal: should exclude internal providers
        const prefsWithoutInternal = mcpQuery.getAllAccountPreferences(false);
        assert.strictEqual(prefsWithoutInternal.size, 2);
        assert.strictEqual(prefsWithoutInternal.get('github'), 'user@github.com');
        assert.strictEqual(prefsWithoutInternal.get('azure'), 'user@azure.com');
        assert.strictEqual(prefsWithoutInternal.get('__internal'), undefined);
        // With includeInternal: should include all providers
        const prefsWithInternal = mcpQuery.getAllAccountPreferences(true);
        assert.strictEqual(prefsWithInternal.size, 3);
        assert.strictEqual(prefsWithInternal.get('github'), 'user@github.com');
        assert.strictEqual(prefsWithInternal.get('azure'), 'user@azure.com');
        assert.strictEqual(prefsWithInternal.get('__internal'), 'internal@example.com');
        // Default behavior: should exclude internal providers
        const prefsDefault = mcpQuery.getAllAccountPreferences();
        assert.strictEqual(prefsDefault.size, 2);
        assert.strictEqual(prefsDefault.get('__internal'), undefined);
    });
    test('clearAllData includes internal providers by default', async () => {
        // Register providers
        authService.registerAuthenticationProvider('github', createProvider({ id: 'github', label: 'GitHub' }));
        authService.registerAuthenticationProvider('__internal', createProvider({ id: '__internal', label: 'Internal' }));
        // Add accounts
        authService.addAccounts('github', [{ id: 'user1', label: 'user@github.com' }]);
        authService.addAccounts('__internal', [{ id: 'user2', label: 'internal@example.com' }]);
        // Set up some data
        queryService.provider('github').account('user@github.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('__internal').account('internal@example.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        // Verify data exists
        assert.strictEqual(queryService.provider('github').account('user@github.com').extension('my-extension').isAccessAllowed(), true);
        assert.strictEqual(queryService.provider('__internal').account('internal@example.com').extension('my-extension').isAccessAllowed(), true);
        // Clear all data (should include internal providers by default)
        await queryService.clearAllData('CLEAR_ALL_AUTH_DATA');
        // Verify all data is cleared
        assert.strictEqual(queryService.provider('github').account('user@github.com').extension('my-extension').isAccessAllowed(), undefined);
        assert.strictEqual(queryService.provider('__internal').account('internal@example.com').extension('my-extension').isAccessAllowed(), undefined);
    });
    test('clearAllData can exclude internal providers when specified', async () => {
        // Register providers
        authService.registerAuthenticationProvider('github', createProvider({ id: 'github', label: 'GitHub' }));
        authService.registerAuthenticationProvider('__internal', createProvider({ id: '__internal', label: 'Internal' }));
        // Add accounts
        authService.addAccounts('github', [{ id: 'user1', label: 'user@github.com' }]);
        authService.addAccounts('__internal', [{ id: 'user2', label: 'internal@example.com' }]);
        // Set up some data
        queryService.provider('github').account('user@github.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        queryService.provider('__internal').account('internal@example.com').extension('my-extension').setAccessAllowed(true, 'My Extension');
        // Clear data excluding internal providers
        await queryService.clearAllData('CLEAR_ALL_AUTH_DATA', false);
        // Verify only non-internal data is cleared
        assert.strictEqual(queryService.provider('github').account('user@github.com').extension('my-extension').isAccessAllowed(), undefined);
        assert.strictEqual(queryService.provider('__internal').account('internal@example.com').extension('my-extension').isAccessAllowed(), true);
    });
    test('isTrusted method works with mock service', () => {
        // Register provider and add account
        authService.registerAuthenticationProvider('github', createProvider({ id: 'github', label: 'GitHub' }));
        authService.addAccounts('github', [{ id: 'user1', label: 'user@github.com' }]);
        // Add a server with trusted state manually to the mock
        mcpAccessService.updateAllowedMcpServers('github', 'user@github.com', [{
                id: 'trusted-server',
                name: 'Trusted Server',
                allowed: true,
                trusted: true
            }]);
        // Add a non-trusted server
        mcpAccessService.updateAllowedMcpServers('github', 'user@github.com', [{
                id: 'non-trusted-server',
                name: 'Non-Trusted Server',
                allowed: true
            }]);
        // Test trusted server
        const trustedQuery = queryService.provider('github').account('user@github.com').mcpServer('trusted-server');
        assert.strictEqual(trustedQuery.isTrusted(), true);
        // Test non-trusted server
        const nonTrustedQuery = queryService.provider('github').account('user@github.com').mcpServer('non-trusted-server');
        assert.strictEqual(nonTrustedQuery.isTrusted(), false);
    });
    test('getAllowedMcpServers method returns servers with trusted state', () => {
        // Register provider and add account
        authService.registerAuthenticationProvider('github', createProvider({ id: 'github', label: 'GitHub' }));
        authService.addAccounts('github', [{ id: 'user1', label: 'user@github.com' }]);
        // Add servers manually to the mock
        mcpAccessService.updateAllowedMcpServers('github', 'user@github.com', [
            {
                id: 'trusted-server',
                name: 'Trusted Server',
                allowed: true,
                trusted: true
            },
            {
                id: 'user-server',
                name: 'User Server',
                allowed: true
            }
        ]);
        // Get all allowed servers
        const allowedServers = queryService.provider('github').account('user@github.com').mcpServers().getAllowedMcpServers();
        // Should have both servers
        assert.strictEqual(allowedServers.length, 2);
        // Find the trusted server
        const trustedServer = allowedServers.find(s => s.id === 'trusted-server');
        assert.ok(trustedServer);
        assert.strictEqual(trustedServer.trusted, true);
        assert.strictEqual(trustedServer.allowed, true);
        // Find the user-allowed server
        const userServer = allowedServers.find(s => s.id === 'user-server');
        assert.ok(userServer);
        assert.strictEqual(userServer.trusted, undefined);
        assert.strictEqual(userServer.allowed, true);
    });
    test('getAllowedExtensions returns extension data with trusted state', () => {
        // Set up some extension access data
        const accountQuery = queryService.provider('github').account('user@example.com');
        accountQuery.extension('ext1').setAccessAllowed(true, 'Extension One');
        accountQuery.extension('ext2').setAccessAllowed(true, 'Extension Two');
        accountQuery.extension('ext1').addUsage(['read'], 'Extension One');
        const allowedExtensions = accountQuery.extensions().getAllowedExtensions();
        // Should have both extensions
        assert.strictEqual(allowedExtensions.length, 2);
        // Find the first extension
        const ext1 = allowedExtensions.find(e => e.id === 'ext1');
        assert.ok(ext1);
        assert.strictEqual(ext1.name, 'Extension One');
        assert.strictEqual(ext1.allowed, true);
        assert.strictEqual(ext1.trusted, false); // Not in trusted list
        assert.ok(typeof ext1.lastUsed === 'number');
        // Find the second extension
        const ext2 = allowedExtensions.find(e => e.id === 'ext2');
        assert.ok(ext2);
        assert.strictEqual(ext2.name, 'Extension Two');
        assert.strictEqual(ext2.allowed, true);
        assert.strictEqual(ext2.trusted, false); // Not in trusted list
        assert.strictEqual(ext2.lastUsed, undefined); // No usage
    });
    suite('Account entities query', () => {
        test('hasAnyUsage returns false for clean account', () => {
            const entitiesQuery = queryService.provider('github').account('clean@example.com').entities();
            assert.strictEqual(entitiesQuery.hasAnyUsage(), false);
        });
        test('hasAnyUsage returns true when extension has usage', () => {
            const accountQuery = queryService.provider('github').account('user@example.com');
            accountQuery.extension('test-ext').addUsage(['read'], 'Test Extension');
            const entitiesQuery = accountQuery.entities();
            assert.strictEqual(entitiesQuery.hasAnyUsage(), true);
        });
        test('hasAnyUsage returns true when MCP server has usage', () => {
            const accountQuery = queryService.provider('github').account('user@example.com');
            accountQuery.mcpServer('test-server').addUsage(['write'], 'Test Server');
            const entitiesQuery = accountQuery.entities();
            assert.strictEqual(entitiesQuery.hasAnyUsage(), true);
        });
        test('hasAnyUsage returns true when extension has access', () => {
            const accountQuery = queryService.provider('github').account('user@example.com');
            accountQuery.extension('test-ext').setAccessAllowed(true, 'Test Extension');
            const entitiesQuery = accountQuery.entities();
            assert.strictEqual(entitiesQuery.hasAnyUsage(), true);
        });
        test('hasAnyUsage returns true when MCP server has access', () => {
            const accountQuery = queryService.provider('github').account('user@example.com');
            accountQuery.mcpServer('test-server').setAccessAllowed(true, 'Test Server');
            const entitiesQuery = accountQuery.entities();
            assert.strictEqual(entitiesQuery.hasAnyUsage(), true);
        });
        test('getEntityCount returns correct counts', () => {
            const accountQuery = queryService.provider('github').account('user@example.com');
            // Set up test data
            accountQuery.extension('ext1').setAccessAllowed(true, 'Extension One');
            accountQuery.extension('ext2').setAccessAllowed(true, 'Extension Two');
            accountQuery.mcpServer('server1').setAccessAllowed(true, 'Server One');
            const entitiesQuery = accountQuery.entities();
            const counts = entitiesQuery.getEntityCount();
            assert.strictEqual(counts.extensions, 2);
            assert.strictEqual(counts.mcpServers, 1);
            assert.strictEqual(counts.total, 3);
        });
        test('getEntityCount returns zero for clean account', () => {
            const entitiesQuery = queryService.provider('github').account('clean@example.com').entities();
            const counts = entitiesQuery.getEntityCount();
            assert.strictEqual(counts.extensions, 0);
            assert.strictEqual(counts.mcpServers, 0);
            assert.strictEqual(counts.total, 0);
        });
        test('removeAllAccess removes access for all entity types', () => {
            const accountQuery = queryService.provider('github').account('user@example.com');
            // Set up test data
            accountQuery.extension('ext1').setAccessAllowed(true, 'Extension One');
            accountQuery.extension('ext2').setAccessAllowed(true, 'Extension Two');
            accountQuery.mcpServer('server1').setAccessAllowed(true, 'Server One');
            accountQuery.mcpServer('server2').setAccessAllowed(true, 'Server Two');
            // Verify initial state
            assert.strictEqual(accountQuery.extension('ext1').isAccessAllowed(), true);
            assert.strictEqual(accountQuery.extension('ext2').isAccessAllowed(), true);
            assert.strictEqual(accountQuery.mcpServer('server1').isAccessAllowed(), true);
            assert.strictEqual(accountQuery.mcpServer('server2').isAccessAllowed(), true);
            // Remove all access
            const entitiesQuery = accountQuery.entities();
            entitiesQuery.removeAllAccess();
            // Verify all access is removed
            assert.strictEqual(accountQuery.extension('ext1').isAccessAllowed(), false);
            assert.strictEqual(accountQuery.extension('ext2').isAccessAllowed(), false);
            assert.strictEqual(accountQuery.mcpServer('server1').isAccessAllowed(), false);
            assert.strictEqual(accountQuery.mcpServer('server2').isAccessAllowed(), false);
        });
        test('forEach iterates over all entity types', () => {
            const accountQuery = queryService.provider('github').account('user@example.com');
            // Set up test data
            accountQuery.extension('ext1').setAccessAllowed(true, 'Extension One');
            accountQuery.extension('ext2').addUsage(['read'], 'Extension Two');
            accountQuery.mcpServer('server1').setAccessAllowed(true, 'Server One');
            accountQuery.mcpServer('server2').addUsage(['write'], 'Server Two');
            const entitiesQuery = accountQuery.entities();
            const visitedEntities = [];
            entitiesQuery.forEach((entityId, entityType) => {
                visitedEntities.push({ id: entityId, type: entityType });
            });
            // Should visit all entities that have usage or access
            assert.strictEqual(visitedEntities.length, 4);
            const extensions = visitedEntities.filter(e => e.type === 'extension');
            const mcpServers = visitedEntities.filter(e => e.type === 'mcpServer');
            assert.strictEqual(extensions.length, 2);
            assert.strictEqual(mcpServers.length, 2);
            // Check specific entities were visited
            assert.ok(visitedEntities.some(e => e.id === 'ext1' && e.type === 'extension'));
            assert.ok(visitedEntities.some(e => e.id === 'ext2' && e.type === 'extension'));
            assert.ok(visitedEntities.some(e => e.id === 'server1' && e.type === 'mcpServer'));
            assert.ok(visitedEntities.some(e => e.id === 'server2' && e.type === 'mcpServer'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25RdWVyeVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2F1dGhlbnRpY2F0aW9uL3Rlc3QvYnJvd3Nlci9hdXRoZW50aWNhdGlvblF1ZXJ5U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzFGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3RGLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsbUJBQW1C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QyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxNQUFNLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQ2hGLE1BQU0sQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssTUFBTSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNoRixNQUFNLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLFNBQVMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDbkYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxTQUFTLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9