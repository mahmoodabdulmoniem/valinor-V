/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { isURLDomainTrusted } from '../../common/trustedDomains.js';
function linkAllowedByRules(link, rules) {
    assert.ok(isURLDomainTrusted(URI.parse(link), rules), `Link\n${link}\n should be allowed by rules\n${JSON.stringify(rules)}`);
}
function linkNotAllowedByRules(link, rules) {
    assert.ok(!isURLDomainTrusted(URI.parse(link), rules), `Link\n${link}\n should NOT be allowed by rules\n${JSON.stringify(rules)}`);
}
suite('Link protection domain matching', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('simple', () => {
        linkNotAllowedByRules('https://x.org', []);
        linkAllowedByRules('https://x.org', ['https://x.org']);
        linkAllowedByRules('https://x.org/foo', ['https://x.org']);
        linkNotAllowedByRules('https://x.org', ['http://x.org']);
        linkNotAllowedByRules('http://x.org', ['https://x.org']);
        linkNotAllowedByRules('https://www.x.org', ['https://x.org']);
        linkAllowedByRules('https://www.x.org', ['https://www.x.org', 'https://y.org']);
    });
    test('localhost', () => {
        linkAllowedByRules('https://127.0.0.1', []);
        linkAllowedByRules('https://127.0.0.1:3000', []);
        linkAllowedByRules('https://localhost', []);
        linkAllowedByRules('https://localhost:3000', []);
    });
    test('* star', () => {
        linkAllowedByRules('https://a.x.org', ['https://*.x.org']);
        linkAllowedByRules('https://a.b.x.org', ['https://*.x.org']);
    });
    test('no scheme', () => {
        linkAllowedByRules('https://a.x.org', ['a.x.org']);
        linkAllowedByRules('https://a.x.org', ['*.x.org']);
        linkAllowedByRules('https://a.b.x.org', ['*.x.org']);
        linkAllowedByRules('https://x.org', ['*.x.org']);
        // https://github.com/microsoft/vscode/issues/249353
        linkAllowedByRules('https://x.org:3000', ['*.x.org:3000']);
    });
    test('sub paths', () => {
        linkAllowedByRules('https://x.org/foo', ['https://x.org/foo']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org/foo']);
        linkAllowedByRules('https://x.org/foo', ['https://x.org/foo/']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org/foo/']);
        linkAllowedByRules('https://x.org/foo', ['x.org/foo']);
        linkAllowedByRules('https://x.org/foo', ['*.org/foo']);
        linkNotAllowedByRules('https://x.org/bar', ['https://x.org/foo']);
        linkNotAllowedByRules('https://x.org/bar', ['x.org/foo']);
        linkNotAllowedByRules('https://x.org/bar', ['*.org/foo']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org/foo']);
        linkNotAllowedByRules('https://x.org/foo2', ['https://x.org/foo']);
        linkNotAllowedByRules('https://www.x.org/foo', ['https://x.org/foo']);
        linkNotAllowedByRules('https://a.x.org/bar', ['https://*.x.org/foo']);
        linkNotAllowedByRules('https://a.b.x.org/bar', ['https://*.x.org/foo']);
        linkAllowedByRules('https://github.com', ['https://github.com/foo/bar', 'https://github.com']);
    });
    test('ports', () => {
        linkNotAllowedByRules('https://x.org:8080/foo/bar', ['https://x.org:8081/foo']);
        linkAllowedByRules('https://x.org:8080/foo/bar', ['https://x.org:*/foo']);
        linkAllowedByRules('https://x.org/foo/bar', ['https://x.org:*/foo']);
        linkAllowedByRules('https://x.org:8080/foo/bar', ['https://x.org:8080/foo']);
    });
    test('ip addresses', () => {
        linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.7/']);
        linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.7']);
        linkAllowedByRules('http://192.168.1.7/', ['http://192.168.1.*']);
        linkNotAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.*.6:*']);
        linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.7:3000/']);
        linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.7:*']);
        linkAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.1.*:*']);
        linkNotAllowedByRules('http://192.168.1.7:3000/', ['http://192.168.*.6:*']);
    });
    test('scheme match', () => {
        linkAllowedByRules('http://192.168.1.7/', ['http://*']);
        linkAllowedByRules('http://twitter.com', ['http://*']);
        linkAllowedByRules('http://twitter.com/hello', ['http://*']);
        linkNotAllowedByRules('https://192.168.1.7/', ['http://*']);
        linkNotAllowedByRules('https://twitter.com/', ['http://*']);
    });
    test('case normalization', () => {
        // https://github.com/microsoft/vscode/issues/99294
        linkAllowedByRules('https://github.com/microsoft/vscode/issues/new', ['https://github.com/microsoft']);
        linkAllowedByRules('https://github.com/microsoft/vscode/issues/new', ['https://github.com/microsoft']);
    });
    test('ignore query & fragment - https://github.com/microsoft/vscode/issues/156839', () => {
        linkAllowedByRules('https://github.com/login/oauth/authorize?foo=4', ['https://github.com/login/oauth/authorize']);
        linkAllowedByRules('https://github.com/login/oauth/authorize#foo', ['https://github.com/login/oauth/authorize']);
    });
    test('ensure individual parts of url are compared and wildcard does not leak out', () => {
        linkNotAllowedByRules('https://x.org/github.com', ['https://*.github.com']);
        linkNotAllowedByRules('https://x.org/y.github.com', ['https://*.github.com']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJ1c3RlZERvbWFpbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXJsL3Rlc3QvYnJvd3Nlci90cnVzdGVkRG9tYWlucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEUsU0FBUyxrQkFBa0IsQ0FBQyxJQUFZLEVBQUUsS0FBZTtJQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsU0FBUyxJQUFJLGtDQUFrQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMvSCxDQUFDO0FBQ0QsU0FBUyxxQkFBcUIsQ0FBQyxJQUFZLEVBQUUsS0FBZTtJQUMzRCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsRUFBRSxTQUFTLElBQUksc0NBQXNDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BJLENBQUM7QUFFRCxLQUFLLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBQzdDLHVDQUF1QyxFQUFFLENBQUM7SUFDMUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7UUFD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