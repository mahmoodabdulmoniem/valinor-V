/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
import { sanitizeHtml } from '../../browser/domSanitize.js';
import * as assert from 'assert';
import { Schemas } from '../../common/network.js';
suite('DomSanitize', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('removes unsupported tags by default', () => {
        const html = '<div>safe<script>alert(1)</script>content</div>';
        const result = sanitizeHtml(html);
        const str = result.toString();
        assert.ok(str.includes('<div>'));
        assert.ok(str.includes('safe'));
        assert.ok(str.includes('content'));
        assert.ok(!str.includes('<script>'));
        assert.ok(!str.includes('alert(1)'));
    });
    test('removes unsupported attributes by default', () => {
        const html = '<div onclick="alert(1)" title="safe">content</div>';
        const result = sanitizeHtml(html);
        const str = result.toString();
        assert.ok(str.includes('<div title="safe">'));
        assert.ok(!str.includes('onclick'));
        assert.ok(!str.includes('alert(1)'));
    });
    test('allows custom tags via config', () => {
        {
            const html = '<div>removed</div><custom-tag>hello</custom-tag>';
            const result = sanitizeHtml(html, {
                allowedTags: { override: ['custom-tag'] }
            });
            assert.strictEqual(result.toString(), 'removed<custom-tag>hello</custom-tag>');
        }
        {
            const html = '<div>kept</div><augmented-tag>world</augmented-tag>';
            const result = sanitizeHtml(html, {
                allowedTags: { augment: ['augmented-tag'] }
            });
            assert.strictEqual(result.toString(), '<div>kept</div><augmented-tag>world</augmented-tag>');
        }
    });
    test('allows custom attributes via config', () => {
        const html = '<div custom-attr="value">content</div>';
        const result = sanitizeHtml(html, {
            allowedAttributes: { override: ['custom-attr'] }
        });
        const str = result.toString();
        assert.ok(str.includes('custom-attr="value"'));
    });
    test('removes unsupported protocols for href by default', () => {
        const html = '<a href="javascript:alert(1)">bad link</a>';
        const result = sanitizeHtml(html);
        const str = result.toString();
        assert.ok(str.includes('<a>bad link</a>'));
        assert.ok(!str.includes('javascript:'));
    });
    test('removes unsupported protocols for src by default', () => {
        const html = '<img alt="text" src="javascript:alert(1)">';
        const result = sanitizeHtml(html);
        const str = result.toString();
        assert.ok(str.includes('<img alt="text">'));
        assert.ok(!str.includes('javascript:'));
    });
    test('allows safe protocols for href', () => {
        const html = '<a href="https://example.com">safe link</a>';
        const result = sanitizeHtml(html);
        const str = result.toString();
        assert.ok(str.includes('href="https://example.com"'));
    });
    test('allows fragment links', () => {
        const html = '<a href="#section">fragment link</a>';
        const result = sanitizeHtml(html);
        const str = result.toString();
        assert.ok(str.includes('href="#section"'));
    });
    test('removes data images by default', () => {
        const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">';
        const result = sanitizeHtml(html);
        const str = result.toString();
        assert.ok(str.includes('<img>'));
        assert.ok(!str.includes('src="data:'));
    });
    test('allows data images when enabled', () => {
        const html = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==">';
        const result = sanitizeHtml(html, {
            allowedMediaProtocols: { override: [Schemas.data] }
        });
        const str = result.toString();
        assert.ok(str.includes('src="data:image/png;base64,'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tU2FuaXRpemUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvZG9tU2FuaXRpemUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDNUQsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRWxELEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBRXpCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtRQUNoRCxNQUFNLElBQUksR0FBRyxpREFBaUQsQ0FBQztRQUMvRCxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRTlCLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7UUFDdEQsTUFBTSxJQUFJLEdBQUcsb0RBQW9ELENBQUM7UUFDbEUsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUU5QixNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7UUFDMUMsQ0FBQztZQUNBLE1BQU0sSUFBSSxHQUFHLGtEQUFrRCxDQUFDO1lBQ2hFLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxJQUFJLEVBQUU7Z0JBQ2pDLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFO2FBQ3pDLENBQUMsQ0FBQztZQUNILE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLHVDQUF1QyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUNELENBQUM7WUFDQSxNQUFNLElBQUksR0FBRyxxREFBcUQsQ0FBQztZQUNuRSxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsSUFBSSxFQUFFO2dCQUNqQyxXQUFXLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRTthQUMzQyxDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxxREFBcUQsQ0FBQyxDQUFDO1FBQzlGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7UUFDaEQsTUFBTSxJQUFJLEdBQUcsd0NBQXdDLENBQUM7UUFDdEQsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLElBQUksRUFBRTtZQUNqQyxpQkFBaUIsRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFFO1NBQ2hELENBQUMsQ0FBQztRQUNILE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUU5QixNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDO0lBQ2hELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtRQUM5RCxNQUFNLElBQUksR0FBRyw0Q0FBNEMsQ0FBQztRQUMxRCxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRTlCLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUN6QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7UUFDN0QsTUFBTSxJQUFJLEdBQUcsNENBQTRDLENBQUM7UUFDMUQsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUU5QixNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1FBQzNDLE1BQU0sSUFBSSxHQUFHLDZDQUE2QyxDQUFDO1FBQzNELE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFOUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQztJQUN2RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsTUFBTSxJQUFJLEdBQUcsc0NBQXNDLENBQUM7UUFDcEQsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUU5QixNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0lBQzVDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtRQUMzQyxNQUFNLElBQUksR0FBRyxvSUFBb0ksQ0FBQztRQUNsSixNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRTlCLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDeEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1FBQzVDLE1BQU0sSUFBSSxHQUFHLG9JQUFvSSxDQUFDO1FBQ2xKLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxJQUFJLEVBQUU7WUFDakMscUJBQXFCLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7U0FDbkQsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRTlCLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUM7SUFDeEQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9