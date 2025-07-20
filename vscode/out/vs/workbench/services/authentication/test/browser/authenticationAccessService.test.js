/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { TestStorageService, TestProductService } from '../../../../test/common/workbenchTestServices.js';
import { AuthenticationAccessService } from '../../browser/authenticationAccessService.js';
suite('AuthenticationAccessService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let storageService;
    let productService;
    let authenticationAccessService;
    setup(() => {
        instantiationService = disposables.add(new TestInstantiationService());
        // Set up storage service
        storageService = disposables.add(new TestStorageService());
        instantiationService.stub(IStorageService, storageService);
        // Set up product service with no trusted extensions by default
        productService = { ...TestProductService, trustedExtensionAuthAccess: undefined };
        instantiationService.stub(IProductService, productService);
        // Create the service instance
        authenticationAccessService = disposables.add(instantiationService.createInstance(AuthenticationAccessService));
    });
    teardown(() => {
        // Reset product service configuration to prevent test interference
        if (productService) {
            productService.trustedExtensionAuthAccess = undefined;
        }
    });
    suite('isAccessAllowed', () => {
        test('returns undefined for unknown extension with no product configuration', () => {
            const result = authenticationAccessService.isAccessAllowed('github', 'user@example.com', 'unknown-extension');
            assert.strictEqual(result, undefined);
        });
        test('returns true for trusted extension from product.json (array format)', () => {
            productService.trustedExtensionAuthAccess = ['trusted-extension-1', 'trusted-extension-2'];
            const result = authenticationAccessService.isAccessAllowed('github', 'user@example.com', 'trusted-extension-1');
            assert.strictEqual(result, true);
        });
        test('returns true for trusted extension from product.json (object format)', () => {
            productService.trustedExtensionAuthAccess = {
                'github': ['github-extension'],
                'microsoft': ['microsoft-extension']
            };
            const result1 = authenticationAccessService.isAccessAllowed('github', 'user@example.com', 'github-extension');
            assert.strictEqual(result1, true);
            const result2 = authenticationAccessService.isAccessAllowed('microsoft', 'user@microsoft.com', 'microsoft-extension');
            assert.strictEqual(result2, true);
        });
        test('returns undefined for extension not in trusted list', () => {
            productService.trustedExtensionAuthAccess = ['trusted-extension'];
            const result = authenticationAccessService.isAccessAllowed('github', 'user@example.com', 'untrusted-extension');
            assert.strictEqual(result, undefined);
        });
        test('returns stored allowed state when extension is in storage', () => {
            // Add extension to storage
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [{
                    id: 'stored-extension',
                    name: 'Stored Extension',
                    allowed: false
                }]);
            const result = authenticationAccessService.isAccessAllowed('github', 'user@example.com', 'stored-extension');
            assert.strictEqual(result, false);
        });
        test('returns true for extension in storage with allowed=true', () => {
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [{
                    id: 'allowed-extension',
                    name: 'Allowed Extension',
                    allowed: true
                }]);
            const result = authenticationAccessService.isAccessAllowed('github', 'user@example.com', 'allowed-extension');
            assert.strictEqual(result, true);
        });
        test('returns true for extension in storage with undefined allowed property (legacy behavior)', () => {
            // Simulate legacy data where allowed property didn't exist
            const legacyExtension = {
                id: 'legacy-extension',
                name: 'Legacy Extension'
                // allowed property is undefined
            };
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [legacyExtension]);
            const result = authenticationAccessService.isAccessAllowed('github', 'user@example.com', 'legacy-extension');
            assert.strictEqual(result, true);
        });
        test('product.json trusted extensions take precedence over storage', () => {
            productService.trustedExtensionAuthAccess = ['product-trusted-extension'];
            // Try to store the same extension as not allowed
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [{
                    id: 'product-trusted-extension',
                    name: 'Product Trusted Extension',
                    allowed: false
                }]);
            // Product.json should take precedence
            const result = authenticationAccessService.isAccessAllowed('github', 'user@example.com', 'product-trusted-extension');
            assert.strictEqual(result, true);
        });
    });
    suite('readAllowedExtensions', () => {
        test('returns empty array when no data exists', () => {
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 0);
        });
        test('returns stored extensions', () => {
            const extensions = [
                { id: 'extension1', name: 'Extension 1', allowed: true },
                { id: 'extension2', name: 'Extension 2', allowed: false }
            ];
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', extensions);
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].id, 'extension1');
            assert.strictEqual(result[0].allowed, true);
            assert.strictEqual(result[1].id, 'extension2');
            assert.strictEqual(result[1].allowed, false);
        });
        test('includes trusted extensions from product.json (array format)', () => {
            productService.trustedExtensionAuthAccess = ['trusted-extension-1', 'trusted-extension-2'];
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 2);
            const trustedExtension1 = result.find(e => e.id === 'trusted-extension-1');
            assert.ok(trustedExtension1);
            assert.strictEqual(trustedExtension1.allowed, true);
            assert.strictEqual(trustedExtension1.trusted, true);
            assert.strictEqual(trustedExtension1.name, 'trusted-extension-1'); // Should default to ID
            const trustedExtension2 = result.find(e => e.id === 'trusted-extension-2');
            assert.ok(trustedExtension2);
            assert.strictEqual(trustedExtension2.allowed, true);
            assert.strictEqual(trustedExtension2.trusted, true);
        });
        test('includes trusted extensions from product.json (object format)', () => {
            productService.trustedExtensionAuthAccess = {
                'github': ['github-extension'],
                'microsoft': ['microsoft-extension']
            };
            const githubResult = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(githubResult.length, 1);
            assert.strictEqual(githubResult[0].id, 'github-extension');
            assert.strictEqual(githubResult[0].trusted, true);
            const microsoftResult = authenticationAccessService.readAllowedExtensions('microsoft', 'user@microsoft.com');
            assert.strictEqual(microsoftResult.length, 1);
            assert.strictEqual(microsoftResult[0].id, 'microsoft-extension');
            assert.strictEqual(microsoftResult[0].trusted, true);
            // Provider not in trusted list should return empty (no stored extensions)
            const unknownResult = authenticationAccessService.readAllowedExtensions('unknown', 'user@unknown.com');
            assert.strictEqual(unknownResult.length, 0);
        });
        test('merges stored extensions with trusted extensions from product.json', () => {
            productService.trustedExtensionAuthAccess = ['trusted-extension'];
            // Add some stored extensions
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'stored-extension', name: 'Stored Extension', allowed: false }
            ]);
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 2);
            const trustedExtension = result.find(e => e.id === 'trusted-extension');
            assert.ok(trustedExtension);
            assert.strictEqual(trustedExtension.trusted, true);
            assert.strictEqual(trustedExtension.allowed, true);
            const storedExtension = result.find(e => e.id === 'stored-extension');
            assert.ok(storedExtension);
            assert.strictEqual(storedExtension.trusted, undefined);
            assert.strictEqual(storedExtension.allowed, false);
        });
        test('updates existing stored extension to trusted when found in product.json', () => {
            // First add an extension to storage
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'extension1', name: 'Extension 1', allowed: false }
            ]);
            // Then add it to trusted list
            productService.trustedExtensionAuthAccess = ['extension1'];
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].id, 'extension1');
            assert.strictEqual(result[0].trusted, true);
            assert.strictEqual(result[0].allowed, true); // Should be marked as allowed due to being trusted
        });
        test('handles malformed storage data gracefully', () => {
            // Directly store malformed data in storage
            storageService.store('github-user@example.com', 'invalid-json', -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 0); // Should return empty array instead of throwing
        });
    });
    suite('updateAllowedExtensions', () => {
        test('adds new extensions to storage', () => {
            const extensions = [
                { id: 'extension1', name: 'Extension 1', allowed: true },
                { id: 'extension2', name: 'Extension 2', allowed: false }
            ];
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', extensions);
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 2);
            assert.strictEqual(result[0].id, 'extension1');
            assert.strictEqual(result[1].id, 'extension2');
        });
        test('updates existing extension allowed status', () => {
            // First add an extension
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'extension1', name: 'Extension 1', allowed: true }
            ]);
            // Then update its allowed status
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'extension1', name: 'Extension 1', allowed: false }
            ]);
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].allowed, false);
        });
        test('updates existing extension name when new name is provided', () => {
            // First add an extension with default name
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'extension1', name: 'extension1', allowed: true }
            ]);
            // Then update with a proper name
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'extension1', name: 'My Extension', allowed: true }
            ]);
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'My Extension');
        });
        test('does not update name when new name is same as ID', () => {
            // First add an extension with a proper name
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'extension1', name: 'My Extension', allowed: true }
            ]);
            // Then try to update with ID as name (should keep existing name)
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'extension1', name: 'extension1', allowed: false }
            ]);
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].name, 'My Extension'); // Should keep the original name
            assert.strictEqual(result[0].allowed, false); // But update the allowed status
        });
        test('does not store trusted extensions - they should only come from product.json', () => {
            productService.trustedExtensionAuthAccess = ['trusted-extension'];
            // Try to store a trusted extension along with regular extensions
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'regular-extension', name: 'Regular Extension', allowed: true },
                { id: 'trusted-extension', name: 'Trusted Extension', allowed: false }
            ]);
            // Check what's actually stored in storage (should only be the regular extension)
            const storedData = storageService.get('github-user@example.com', -1 /* StorageScope.APPLICATION */);
            assert.ok(storedData);
            const parsedData = JSON.parse(storedData);
            assert.strictEqual(parsedData.length, 1);
            assert.strictEqual(parsedData[0].id, 'regular-extension');
            // But when we read, we should get both (trusted from product.json + stored)
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 2);
            const trustedExt = result.find(e => e.id === 'trusted-extension');
            assert.ok(trustedExt);
            assert.strictEqual(trustedExt.trusted, true);
            assert.strictEqual(trustedExt.allowed, true); // Should be true from product.json, not false from storage
            const regularExt = result.find(e => e.id === 'regular-extension');
            assert.ok(regularExt);
            assert.strictEqual(regularExt.trusted, undefined);
            assert.strictEqual(regularExt.allowed, true);
        });
        test('filters out trusted extensions before storing', () => {
            productService.trustedExtensionAuthAccess = ['trusted-ext-1', 'trusted-ext-2'];
            // Add both trusted and regular extensions
            const extensions = [
                { id: 'regular-ext', name: 'Regular Extension', allowed: true },
                { id: 'trusted-ext-1', name: 'Trusted Extension 1', allowed: false },
                { id: 'another-regular-ext', name: 'Another Regular Extension', allowed: false },
                { id: 'trusted-ext-2', name: 'Trusted Extension 2', allowed: true }
            ];
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', extensions);
            // Check storage - should only contain regular extensions
            const storedData = storageService.get('github-user@example.com', -1 /* StorageScope.APPLICATION */);
            assert.ok(storedData);
            const parsedData = JSON.parse(storedData);
            assert.strictEqual(parsedData.length, 2);
            assert.ok(parsedData.find((e) => e.id === 'regular-ext'));
            assert.ok(parsedData.find((e) => e.id === 'another-regular-ext'));
            assert.ok(!parsedData.find((e) => e.id === 'trusted-ext-1'));
            assert.ok(!parsedData.find((e) => e.id === 'trusted-ext-2'));
        });
        test('fires onDidChangeExtensionSessionAccess event', () => {
            let eventFired = false;
            let eventData;
            const subscription = authenticationAccessService.onDidChangeExtensionSessionAccess(e => {
                eventFired = true;
                eventData = e;
            });
            disposables.add(subscription);
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'extension1', name: 'Extension 1', allowed: true }
            ]);
            assert.strictEqual(eventFired, true);
            assert.ok(eventData);
            assert.strictEqual(eventData.providerId, 'github');
            assert.strictEqual(eventData.accountName, 'user@example.com');
        });
    });
    suite('removeAllowedExtensions', () => {
        test('removes all extensions from storage', () => {
            // First add some extensions
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'extension1', name: 'Extension 1', allowed: true },
                { id: 'extension2', name: 'Extension 2', allowed: false }
            ]);
            // Verify they exist
            const result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.ok(result.length > 0);
            // Remove them
            authenticationAccessService.removeAllowedExtensions('github', 'user@example.com');
            // Verify storage is empty (but trusted extensions from product.json might still be there)
            const storedData = storageService.get('github-user@example.com', -1 /* StorageScope.APPLICATION */);
            assert.strictEqual(storedData, undefined);
        });
        test('fires onDidChangeExtensionSessionAccess event', () => {
            let eventFired = false;
            let eventData;
            // First add an extension
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'extension1', name: 'Extension 1', allowed: true }
            ]);
            // Then listen for the remove event
            const subscription = authenticationAccessService.onDidChangeExtensionSessionAccess(e => {
                eventFired = true;
                eventData = e;
            });
            disposables.add(subscription);
            authenticationAccessService.removeAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(eventFired, true);
            assert.ok(eventData);
            assert.strictEqual(eventData.providerId, 'github');
            assert.strictEqual(eventData.accountName, 'user@example.com');
        });
        test('does not affect trusted extensions from product.json', () => {
            productService.trustedExtensionAuthAccess = ['trusted-extension'];
            // Add some regular extensions and verify both trusted and regular exist
            authenticationAccessService.updateAllowedExtensions('github', 'user@example.com', [
                { id: 'regular-extension', name: 'Regular Extension', allowed: true }
            ]);
            let result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 2); // 1 trusted + 1 regular
            // Remove stored extensions
            authenticationAccessService.removeAllowedExtensions('github', 'user@example.com');
            // Trusted extension should still be there
            result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].id, 'trusted-extension');
            assert.strictEqual(result[0].trusted, true);
        });
    });
    suite('integration with product.json configurations', () => {
        test('handles switching between array and object format', () => {
            // Start with array format
            productService.trustedExtensionAuthAccess = ['ext1', 'ext2'];
            let result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 2);
            // Switch to object format
            productService.trustedExtensionAuthAccess = {
                'github': ['ext1', 'ext3'],
                'microsoft': ['ext4']
            };
            result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 2); // ext1 and ext3 for github
            assert.ok(result.find(e => e.id === 'ext1'));
            assert.ok(result.find(e => e.id === 'ext3'));
            assert.ok(!result.find(e => e.id === 'ext2')); // Should not be there anymore
        });
        test('handles empty trusted extension configurations', () => {
            // Test undefined
            productService.trustedExtensionAuthAccess = undefined;
            let result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 0);
            // Test empty array
            productService.trustedExtensionAuthAccess = [];
            result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 0);
            // Test empty object
            productService.trustedExtensionAuthAccess = {};
            result = authenticationAccessService.readAllowedExtensions('github', 'user@example.com');
            assert.strictEqual(result.length, 0);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb25BY2Nlc3NTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hdXRoZW50aWNhdGlvbi90ZXN0L2Jyb3dzZXIvYXV0aGVudGljYXRpb25BY2Nlc3NTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sbURBQW1ELENBQUM7QUFDakgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSwyQkFBMkIsRUFBZ0MsTUFBTSw4Q0FBOEMsQ0FBQztBQUd6SCxLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFOUQsSUFBSSxvQkFBOEMsQ0FBQztJQUNuRCxJQUFJLGNBQWtDLENBQUM7SUFDdkMsSUFBSSxjQUFzRyxDQUFDO0lBQzNHLElBQUksMkJBQXlELENBQUM7SUFFOUQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7UUFFdkUseUJBQXlCO1FBQ3pCLGNBQWMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtC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