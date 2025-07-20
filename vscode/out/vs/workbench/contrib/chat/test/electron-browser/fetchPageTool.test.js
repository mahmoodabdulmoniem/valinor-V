/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { URI } from '../../../../../base/common/uri.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FetchWebPageTool } from '../../electron-browser/tools/fetchPageTool.js';
import { TestFileService } from '../../../../test/browser/workbenchTestServices.js';
class TestWebContentExtractorService {
    constructor(uriToContentMap) {
        this.uriToContentMap = uriToContentMap;
    }
    async extract(uris) {
        return uris.map(uri => {
            const content = this.uriToContentMap.get(uri);
            if (content === undefined) {
                throw new Error(`No content configured for URI: ${uri.toString()}`);
            }
            return content;
        });
    }
}
class ExtendedTestFileService extends TestFileService {
    constructor(uriToContentMap) {
        super();
        this.uriToContentMap = uriToContentMap;
    }
    async readFile(resource, options) {
        const content = this.uriToContentMap.get(resource);
        if (content === undefined) {
            throw new Error(`File not found: ${resource.toString()}`);
        }
        const buffer = typeof content === 'string' ? VSBuffer.fromString(content) : content;
        return {
            resource,
            value: buffer,
            name: '',
            size: buffer.byteLength,
            etag: '',
            mtime: 0,
            ctime: 0,
            readonly: false,
            locked: false
        };
    }
    async stat(resource) {
        // Check if the resource exists in our map
        if (!this.uriToContentMap.has(resource)) {
            throw new Error(`File not found: ${resource.toString()}`);
        }
        return super.stat(resource);
    }
}
suite('FetchWebPageTool', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should handle http/https via web content extractor and other schemes via file service', async () => {
        const webContentMap = new ResourceMap([
            [URI.parse('https://example.com'), 'HTTPS content'],
            [URI.parse('http://example.com'), 'HTTP content']
        ]);
        const fileContentMap = new ResourceMap([
            [URI.parse('test://static/resource/50'), 'MCP resource content'],
            [URI.parse('mcp-resource://746573742D736572766572/custom/hello/world.txt'), 'Custom MCP content']
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap));
        const testUrls = [
            'https://example.com',
            'http://example.com',
            'test://static/resource/50',
            'mcp-resource://746573742D736572766572/custom/hello/world.txt',
            'file:///path/to/nonexistent',
            'ftp://example.com',
            'invalid-url'
        ];
        const result = await tool.invoke({ callId: 'test-call-1', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Should have 7 results (one for each input URL)
        assert.strictEqual(result.content.length, 7, 'Should have result for each input URL');
        // HTTP and HTTPS URLs should have their content from web extractor
        assert.strictEqual(result.content[0].value, 'HTTPS content', 'HTTPS URL should return content');
        assert.strictEqual(result.content[1].value, 'HTTP content', 'HTTP URL should return content');
        // MCP resources should have their content from file service
        assert.strictEqual(result.content[2].value, 'MCP resource content', 'test:// URL should return content from file service');
        assert.strictEqual(result.content[3].value, 'Custom MCP content', 'mcp-resource:// URL should return content from file service');
        // Nonexistent file should be marked as invalid
        assert.strictEqual(result.content[4].value, 'Invalid URL', 'Nonexistent file should be invalid');
        // Unsupported scheme (ftp) should be marked as invalid since file service can't handle it
        assert.strictEqual(result.content[5].value, 'Invalid URL', 'ftp:// URL should be invalid');
        // Invalid URL should be marked as invalid
        assert.strictEqual(result.content[6].value, 'Invalid URL', 'Invalid URL should be invalid');
        // All successfully fetched URLs should be in toolResultDetails
        assert.strictEqual(Array.isArray(result.toolResultDetails) ? result.toolResultDetails.length : 0, 4, 'Should have 4 valid URLs in toolResultDetails');
    });
    test('should handle empty and undefined URLs', async () => {
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(new ResourceMap()));
        // Test empty array
        const emptyResult = await tool.invoke({ callId: 'test-call-2', toolId: 'fetch-page', parameters: { urls: [] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        assert.strictEqual(emptyResult.content.length, 1, 'Empty array should return single message');
        assert.strictEqual(emptyResult.content[0].value, 'No valid URLs provided.', 'Should indicate no valid URLs');
        // Test undefined
        const undefinedResult = await tool.invoke({ callId: 'test-call-3', toolId: 'fetch-page', parameters: {}, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        assert.strictEqual(undefinedResult.content.length, 1, 'Undefined URLs should return single message');
        assert.strictEqual(undefinedResult.content[0].value, 'No valid URLs provided.', 'Should indicate no valid URLs');
        // Test array with invalid URLs
        const invalidResult = await tool.invoke({ callId: 'test-call-4', toolId: 'fetch-page', parameters: { urls: ['', ' ', 'invalid-scheme-that-fileservice-cannot-handle://test'] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        assert.strictEqual(invalidResult.content.length, 3, 'Should have result for each invalid URL');
        assert.strictEqual(invalidResult.content[0].value, 'Invalid URL', 'Empty string should be invalid');
        assert.strictEqual(invalidResult.content[1].value, 'Invalid URL', 'Space-only string should be invalid');
        assert.strictEqual(invalidResult.content[2].value, 'Invalid URL', 'Unhandleable scheme should be invalid');
    });
    test('should provide correct past tense messages for mixed valid/invalid URLs', async () => {
        const webContentMap = new ResourceMap([
            [URI.parse('https://valid.com'), 'Valid content']
        ]);
        const fileContentMap = new ResourceMap([
            [URI.parse('test://valid/resource'), 'Valid MCP content']
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap));
        const preparation = await tool.prepareToolInvocation({ parameters: { urls: ['https://valid.com', 'test://valid/resource', 'invalid://invalid'] } }, CancellationToken.None);
        assert.ok(preparation, 'Should return prepared invocation');
        assert.ok(preparation.pastTenseMessage, 'Should have past tense message');
        const messageText = typeof preparation.pastTenseMessage === 'string' ? preparation.pastTenseMessage : preparation.pastTenseMessage.value;
        assert.ok(messageText.includes('Fetched'), 'Should mention fetched resources');
        assert.ok(messageText.includes('invalid://invalid'), 'Should mention invalid URL');
    });
    test('should return message for binary files indicating they are not supported', async () => {
        // Create binary content (a simple PNG-like header with null bytes)
        const binaryContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
        const binaryBuffer = VSBuffer.wrap(binaryContent);
        const fileContentMap = new ResourceMap([
            [URI.parse('file:///path/to/binary.dat'), binaryBuffer],
            [URI.parse('file:///path/to/text.txt'), 'This is text content']
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-call-binary',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///path/to/binary.dat', 'file:///path/to/text.txt'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Should have 2 results
        assert.strictEqual(result.content.length, 2, 'Should have 2 results');
        // First result should be a text part with binary not supported message
        assert.strictEqual(result.content[0].kind, 'text', 'Binary file should return text part');
        if (result.content[0].kind === 'text') {
            assert.strictEqual(result.content[0].value, 'Binary files are not supported at the moment.', 'Should return not supported message');
        }
        // Second result should be a text part for the text file
        assert.strictEqual(result.content[1].kind, 'text', 'Text file should return text part');
        if (result.content[1].kind === 'text') {
            assert.strictEqual(result.content[1].value, 'This is text content', 'Should return text content');
        }
        // Both files should be in toolResultDetails since they were successfully fetched
        assert.strictEqual(Array.isArray(result.toolResultDetails) ? result.toolResultDetails.length : 0, 2, 'Should have 2 valid URLs in toolResultDetails');
    });
    test('PNG files are now supported as image data parts (regression test)', async () => {
        // This test ensures that PNG files that previously returned "not supported"
        // messages now return proper image data parts
        const binaryContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
        const binaryBuffer = VSBuffer.wrap(binaryContent);
        const fileContentMap = new ResourceMap([
            [URI.parse('file:///path/to/image.png'), binaryBuffer]
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-png-support',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///path/to/image.png'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Should have 1 result
        assert.strictEqual(result.content.length, 1, 'Should have 1 result');
        // PNG file should now be returned as a data part, not a "not supported" message
        assert.strictEqual(result.content[0].kind, 'data', 'PNG file should return data part');
        if (result.content[0].kind === 'data') {
            assert.strictEqual(result.content[0].value.mimeType, 'image/png', 'Should have PNG MIME type');
            assert.strictEqual(result.content[0].value.data, binaryBuffer, 'Should have correct binary data');
        }
    });
    test('should correctly distinguish between binary and text content', async () => {
        // Create content that might be ambiguous
        const jsonData = '{"name": "test", "value": 123}';
        // Create definitely binary data - some random bytes with null bytes that don't follow UTF-16 pattern
        const realBinaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x00, 0x00, 0x00, 0x0D, 0xFF, 0x00, 0xAB]); // More clearly binary
        const fileContentMap = new ResourceMap([
            [URI.parse('file:///data.json'), jsonData], // Should be detected as text
            [URI.parse('file:///binary.dat'), VSBuffer.wrap(realBinaryData)] // Should be detected as binary
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-distinguish',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///data.json', 'file:///binary.dat'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // JSON should be returned as text
        assert.strictEqual(result.content[0].kind, 'text', 'JSON should be detected as text');
        if (result.content[0].kind === 'text') {
            assert.strictEqual(result.content[0].value, jsonData, 'Should return JSON as text');
        }
        // Binary data should be returned as not supported message
        assert.strictEqual(result.content[1].kind, 'text', 'Binary content should return text part with message');
        if (result.content[1].kind === 'text') {
            assert.strictEqual(result.content[1].value, 'Binary files are not supported at the moment.', 'Should return not supported message');
        }
    });
    test('Supported image files are returned as data parts', async () => {
        // Test data for different supported image formats
        const pngData = VSBuffer.fromString('fake PNG data');
        const jpegData = VSBuffer.fromString('fake JPEG data');
        const gifData = VSBuffer.fromString('fake GIF data');
        const webpData = VSBuffer.fromString('fake WebP data');
        const bmpData = VSBuffer.fromString('fake BMP data');
        const fileContentMap = new ResourceMap();
        fileContentMap.set(URI.parse('file:///image.png'), pngData);
        fileContentMap.set(URI.parse('file:///photo.jpg'), jpegData);
        fileContentMap.set(URI.parse('file:///animation.gif'), gifData);
        fileContentMap.set(URI.parse('file:///modern.webp'), webpData);
        fileContentMap.set(URI.parse('file:///bitmap.bmp'), bmpData);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-images',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///image.png', 'file:///photo.jpg', 'file:///animation.gif', 'file:///modern.webp', 'file:///bitmap.bmp'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // All images should be returned as data parts
        assert.strictEqual(result.content.length, 5, 'Should have 5 results');
        // Check PNG
        assert.strictEqual(result.content[0].kind, 'data', 'PNG should be data part');
        if (result.content[0].kind === 'data') {
            assert.strictEqual(result.content[0].value.mimeType, 'image/png', 'PNG should have correct MIME type');
            assert.strictEqual(result.content[0].value.data, pngData, 'PNG should have correct data');
        }
        // Check JPEG
        assert.strictEqual(result.content[1].kind, 'data', 'JPEG should be data part');
        if (result.content[1].kind === 'data') {
            assert.strictEqual(result.content[1].value.mimeType, 'image/jpeg', 'JPEG should have correct MIME type');
            assert.strictEqual(result.content[1].value.data, jpegData, 'JPEG should have correct data');
        }
        // Check GIF
        assert.strictEqual(result.content[2].kind, 'data', 'GIF should be data part');
        if (result.content[2].kind === 'data') {
            assert.strictEqual(result.content[2].value.mimeType, 'image/gif', 'GIF should have correct MIME type');
            assert.strictEqual(result.content[2].value.data, gifData, 'GIF should have correct data');
        }
        // Check WebP
        assert.strictEqual(result.content[3].kind, 'data', 'WebP should be data part');
        if (result.content[3].kind === 'data') {
            assert.strictEqual(result.content[3].value.mimeType, 'image/webp', 'WebP should have correct MIME type');
            assert.strictEqual(result.content[3].value.data, webpData, 'WebP should have correct data');
        }
        // Check BMP
        assert.strictEqual(result.content[4].kind, 'data', 'BMP should be data part');
        if (result.content[4].kind === 'data') {
            assert.strictEqual(result.content[4].value.mimeType, 'image/bmp', 'BMP should have correct MIME type');
            assert.strictEqual(result.content[4].value.data, bmpData, 'BMP should have correct data');
        }
    });
    test('Mixed image and text files work correctly', async () => {
        const textData = 'This is some text content';
        const imageData = VSBuffer.fromString('fake image data');
        const fileContentMap = new ResourceMap();
        fileContentMap.set(URI.parse('file:///text.txt'), textData);
        fileContentMap.set(URI.parse('file:///image.png'), imageData);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-mixed',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///text.txt', 'file:///image.png'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Text should be returned as text part
        assert.strictEqual(result.content[0].kind, 'text', 'Text file should be text part');
        if (result.content[0].kind === 'text') {
            assert.strictEqual(result.content[0].value, textData, 'Text should have correct content');
        }
        // Image should be returned as data part
        assert.strictEqual(result.content[1].kind, 'data', 'Image file should be data part');
        if (result.content[1].kind === 'data') {
            assert.strictEqual(result.content[1].value.mimeType, 'image/png', 'Image should have correct MIME type');
            assert.strictEqual(result.content[1].value.data, imageData, 'Image should have correct data');
        }
    });
    test('Case insensitive image extensions work', async () => {
        const imageData = VSBuffer.fromString('fake image data');
        const fileContentMap = new ResourceMap();
        fileContentMap.set(URI.parse('file:///image.PNG'), imageData);
        fileContentMap.set(URI.parse('file:///photo.JPEG'), imageData);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-case',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///image.PNG', 'file:///photo.JPEG'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Both should be returned as data parts despite uppercase extensions
        assert.strictEqual(result.content[0].kind, 'data', 'PNG with uppercase extension should be data part');
        if (result.content[0].kind === 'data') {
            assert.strictEqual(result.content[0].value.mimeType, 'image/png', 'Should have correct MIME type');
        }
        assert.strictEqual(result.content[1].kind, 'data', 'JPEG with uppercase extension should be data part');
        if (result.content[1].kind === 'data') {
            assert.strictEqual(result.content[1].value.mimeType, 'image/jpeg', 'Should have correct MIME type');
        }
    });
    // Comprehensive tests for toolResultDetails
    suite('toolResultDetails', () => {
        test('should include only successfully fetched URIs in correct order', async () => {
            const webContentMap = new ResourceMap([
                [URI.parse('https://success1.com'), 'Content 1'],
                [URI.parse('https://success2.com'), 'Content 2']
            ]);
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///success.txt'), 'File content'],
                [URI.parse('mcp-resource://server/file.txt'), 'MCP content']
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap));
            const testUrls = [
                'https://success1.com', // index 0 - should be in toolResultDetails
                'invalid-url', // index 1 - should NOT be in toolResultDetails
                'file:///success.txt', // index 2 - should be in toolResultDetails
                'https://success2.com', // index 3 - should be in toolResultDetails
                'file:///nonexistent.txt', // index 4 - should NOT be in toolResultDetails
                'mcp-resource://server/file.txt' // index 5 - should be in toolResultDetails
            ];
            const result = await tool.invoke({ callId: 'test-details', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Verify toolResultDetails contains exactly the successful URIs
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 4, 'Should have 4 successful URIs');
            // Check that all entries are URI objects
            const uriDetails = result.toolResultDetails;
            assert.ok(uriDetails.every(uri => uri instanceof URI), 'All toolResultDetails entries should be URI objects');
            // Check specific URIs are included (web URIs first, then successful file URIs)
            const expectedUris = [
                'https://success1.com/',
                'https://success2.com/',
                'file:///success.txt',
                'mcp-resource://server/file.txt'
            ];
            const actualUriStrings = uriDetails.map(uri => uri.toString());
            assert.deepStrictEqual(actualUriStrings.sort(), expectedUris.sort(), 'Should contain exactly the expected successful URIs');
            // Verify content array matches input order (including failures)
            assert.strictEqual(result.content.length, 6, 'Content should have result for each input URL');
            assert.strictEqual(result.content[0].value, 'Content 1', 'First web URI content');
            assert.strictEqual(result.content[1].value, 'Invalid URL', 'Invalid URL marked as invalid');
            assert.strictEqual(result.content[2].value, 'File content', 'File URI content');
            assert.strictEqual(result.content[3].value, 'Content 2', 'Second web URI content');
            assert.strictEqual(result.content[4].value, 'Invalid URL', 'Nonexistent file marked as invalid');
            assert.strictEqual(result.content[5].value, 'MCP content', 'MCP resource content');
        });
        test('should exclude failed web requests from toolResultDetails', async () => {
            // Set up web content extractor that will throw for some URIs
            const webContentMap = new ResourceMap([
                [URI.parse('https://success.com'), 'Success content']
                // https://failure.com not in map - will throw error
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(new ResourceMap()));
            const testUrls = [
                'https://success.com', // Should succeed
                'https://failure.com' // Should fail (not in content map)
            ];
            try {
                await tool.invoke({ callId: 'test-web-failure', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
                // If the web extractor throws, it should be handled gracefully
                // But in this test setup, the TestWebContentExtractorService throws for missing content
                assert.fail('Expected test web content extractor to throw for missing URI');
            }
            catch (error) {
                // This is expected behavior with the current test setup
                // The TestWebContentExtractorService throws when content is not found
                assert.ok(error.message.includes('No content configured for URI'), 'Should throw for unconfigured URI');
            }
        });
        test('should exclude failed file reads from toolResultDetails', async () => {
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///existing.txt'), 'File exists']
                // file:///missing.txt not in map - will throw error
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
            const testUrls = [
                'file:///existing.txt', // Should succeed
                'file:///missing.txt' // Should fail (not in file map)
            ];
            const result = await tool.invoke({ callId: 'test-file-failure', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Verify only successful file URI is in toolResultDetails
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 1, 'Should have only 1 successful URI');
            const uriDetails = result.toolResultDetails;
            assert.strictEqual(uriDetails[0].toString(), 'file:///existing.txt', 'Should contain only the successful file URI');
            // Verify content reflects both attempts
            assert.strictEqual(result.content.length, 2, 'Should have results for both input URLs');
            assert.strictEqual(result.content[0].value, 'File exists', 'First file should have content');
            assert.strictEqual(result.content[1].value, 'Invalid URL', 'Second file should be marked invalid');
        });
        test('should handle mixed success and failure scenarios', async () => {
            const webContentMap = new ResourceMap([
                [URI.parse('https://web-success.com'), 'Web success']
            ]);
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///file-success.txt'), 'File success'],
                [URI.parse('mcp-resource://good/file.txt'), VSBuffer.fromString('MCP binary content')]
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap));
            const testUrls = [
                'invalid-scheme://bad', // Invalid URI
                'https://web-success.com', // Web success
                'file:///file-missing.txt', // File failure
                'file:///file-success.txt', // File success
                'completely-invalid-url', // Invalid URL format
                'mcp-resource://good/file.txt' // MCP success
            ];
            const result = await tool.invoke({ callId: 'test-mixed', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Should have 3 successful URIs: web-success, file-success, mcp-success
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 3, 'Should have 3 successful URIs');
            const uriDetails = result.toolResultDetails;
            const actualUriStrings = uriDetails.map(uri => uri.toString());
            const expectedSuccessful = [
                'https://web-success.com/',
                'file:///file-success.txt',
                'mcp-resource://good/file.txt'
            ];
            assert.deepStrictEqual(actualUriStrings.sort(), expectedSuccessful.sort(), 'Should contain exactly the successful URIs');
            // Verify content array reflects all inputs in original order
            assert.strictEqual(result.content.length, 6, 'Should have results for all input URLs');
            assert.strictEqual(result.content[0].value, 'Invalid URL', 'Invalid scheme marked as invalid');
            assert.strictEqual(result.content[1].value, 'Web success', 'Web success content');
            assert.strictEqual(result.content[2].value, 'Invalid URL', 'Missing file marked as invalid');
            assert.strictEqual(result.content[3].value, 'File success', 'File success content');
            assert.strictEqual(result.content[4].value, 'Invalid URL', 'Invalid URL marked as invalid');
            assert.strictEqual(result.content[5].value, 'MCP binary content', 'MCP success content');
        });
        test('should return empty toolResultDetails when all requests fail', async () => {
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), // Empty - all web requests fail
            new ExtendedTestFileService(new ResourceMap()) // Empty - all file requests fail
            );
            const testUrls = [
                'https://nonexistent.com',
                'file:///missing.txt',
                'invalid-url',
                'bad://scheme'
            ];
            try {
                const result = await tool.invoke({ callId: 'test-all-fail', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
                // If web extractor doesn't throw, check the results
                assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
                assert.strictEqual(result.toolResultDetails.length, 0, 'Should have no successful URIs');
                assert.strictEqual(result.content.length, 4, 'Should have results for all input URLs');
                assert.ok(result.content.every(content => content.value === 'Invalid URL'), 'All content should be marked as invalid');
            }
            catch (error) {
                // Expected with TestWebContentExtractorService when no content is configured
                assert.ok(error.message.includes('No content configured for URI'), 'Should throw for unconfigured URI');
            }
        });
        test('should handle empty URL array', async () => {
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(new ResourceMap()));
            const result = await tool.invoke({ callId: 'test-empty', toolId: 'fetch-page', parameters: { urls: [] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            assert.strictEqual(result.content.length, 1, 'Should have one content item for empty URLs');
            assert.strictEqual(result.content[0].value, 'No valid URLs provided.', 'Should indicate no valid URLs');
            assert.ok(!result.toolResultDetails, 'toolResultDetails should not be present for empty URLs');
        });
        test('should handle image files in toolResultDetails', async () => {
            const imageBuffer = VSBuffer.fromString('fake-png-data');
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///image.png'), imageBuffer],
                [URI.parse('file:///document.txt'), 'Text content']
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
            const result = await tool.invoke({ callId: 'test-images', toolId: 'fetch-page', parameters: { urls: ['file:///image.png', 'file:///document.txt'] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Both files should be successful and in toolResultDetails
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 2, 'Should have 2 successful file URIs');
            const uriDetails = result.toolResultDetails;
            assert.strictEqual(uriDetails[0].toString(), 'file:///image.png', 'Should include image file');
            assert.strictEqual(uriDetails[1].toString(), 'file:///document.txt', 'Should include text file');
            // Check content types
            assert.strictEqual(result.content[0].kind, 'data', 'Image should be data part');
            assert.strictEqual(result.content[1].kind, 'text', 'Text file should be text part');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2hQYWdlVG9vbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvZWxlY3Ryb24tYnJvd3Nlci9mZXRjaFBhZ2VUb29sLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRXBGLE1BQU0sOEJBQThCO0lBR25DLFlBQW9CLGVBQW9DO1FBQXBDLG9CQUFlLEdBQWYsZUFBZSxDQUFxQjtJQUFJLENBQUM7SUFFN0QsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFXO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNyQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5QyxJQUFJLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENB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