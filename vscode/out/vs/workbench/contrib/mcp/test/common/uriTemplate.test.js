/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { UriTemplate } from '../../common/uriTemplate.js';
import * as assert from 'assert';
suite('UriTemplate', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Helper function to test template parsing and component extraction
     */
    function testParsing(template, expectedComponents) {
        const templ = UriTemplate.parse(template);
        assert.deepStrictEqual(templ.components.filter(c => typeof c === 'object'), expectedComponents);
        return templ;
    }
    /**
     * Helper function to test template resolution
     */
    function testResolution(template, variables, expected) {
        const templ = UriTemplate.parse(template);
        const result = templ.resolve(variables);
        assert.strictEqual(result, expected);
    }
    test('simple replacement', () => {
        const templ = UriTemplate.parse('http://example.com/{var}');
        assert.deepStrictEqual(templ.components, ['http://example.com/', {
                expression: "{var}",
                operator: '',
                variables: [{ explodable: false, name: "var", optional: false, prefixLength: undefined, repeatable: false }]
            }, '']);
        const result = templ.resolve({ var: 'value' });
        assert.strictEqual(result, 'http://example.com/value');
    });
    test('parsing components correctly', () => {
        // Simple component
        testParsing('http://example.com/{var}', [{
                expression: "{var}",
                operator: '',
                variables: [{ explodable: false, name: "var", optional: false, prefixLength: undefined, repeatable: false }]
            }]);
        // Component with operator
        testParsing('http://example.com/{+path}', [{
                expression: "{+path}",
                operator: '+',
                variables: [{ explodable: false, name: "path", optional: false, prefixLength: undefined, repeatable: false }]
            }]);
        // Component with multiple variables
        testParsing('http://example.com/{x,y}', [{
                expression: "{x,y}",
                operator: '',
                variables: [
                    { explodable: false, name: "x", optional: false, prefixLength: undefined, repeatable: false },
                    { explodable: false, name: "y", optional: false, prefixLength: undefined, repeatable: false }
                ]
            }]);
        // Component with value modifiers
        testParsing('http://example.com/{var:3}', [{
                expression: "{var:3}",
                operator: '',
                variables: [{ explodable: false, name: "var", optional: false, prefixLength: 3, repeatable: false }]
            }]);
        testParsing('http://example.com/{list*}', [{
                expression: "{list*}",
                operator: '',
                variables: [{ explodable: true, name: "list", optional: false, prefixLength: undefined, repeatable: true }]
            }]);
        // Multiple components
        testParsing('http://example.com/{x}/path/{y}', [
            {
                expression: "{x}",
                operator: '',
                variables: [{ explodable: false, name: "x", optional: false, prefixLength: undefined, repeatable: false }]
            },
            {
                expression: "{y}",
                operator: '',
                variables: [{ explodable: false, name: "y", optional: false, prefixLength: undefined, repeatable: false }]
            }
        ]);
    });
    test('Level 1 - Simple string expansion', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            var: 'value',
            hello: 'Hello World!'
        };
        testResolution('{var}', variables, 'value');
        testResolution('{hello}', variables, 'Hello%20World%21');
    });
    test('Level 2 - Reserved expansion', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            var: 'value',
            hello: 'Hello World!',
            path: '/foo/bar'
        };
        testResolution('{+var}', variables, 'value');
        testResolution('{+hello}', variables, 'Hello%20World!');
        testResolution('{+path}/here', variables, '/foo/bar/here');
        testResolution('here?ref={+path}', variables, 'here?ref=/foo/bar');
    });
    test('Level 2 - Fragment expansion', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            var: 'value',
            hello: 'Hello World!'
        };
        testResolution('X{#var}', variables, 'X#value');
        testResolution('X{#hello}', variables, 'X#Hello%20World!');
    });
    test('Level 3 - String expansion with multiple variables', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            var: 'value',
            hello: 'Hello World!',
            empty: '',
            path: '/foo/bar',
            x: '1024',
            y: '768'
        };
        testResolution('map?{x,y}', variables, 'map?1024,768');
        testResolution('{x,hello,y}', variables, '1024,Hello%20World%21,768');
    });
    test('Level 3 - Reserved expansion with multiple variables', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            var: 'value',
            hello: 'Hello World!',
            path: '/foo/bar',
            x: '1024',
            y: '768'
        };
        testResolution('{+x,hello,y}', variables, '1024,Hello%20World!,768');
        testResolution('{+path,x}/here', variables, '/foo/bar,1024/here');
    });
    test('Level 3 - Fragment expansion with multiple variables', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            var: 'value',
            hello: 'Hello World!',
            path: '/foo/bar',
            x: '1024',
            y: '768'
        };
        testResolution('{#x,hello,y}', variables, '#1024,Hello%20World!,768');
        testResolution('{#path,x}/here', variables, '#/foo/bar,1024/here');
    });
    test('Level 3 - Label expansion with dot-prefix', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            var: 'value',
            x: '1024',
            y: '768'
        };
        testResolution('X{.var}', variables, 'X.value');
        testResolution('X{.x,y}', variables, 'X.1024.768');
    });
    test('Level 3 - Path segments expansion', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            var: 'value',
            x: '1024'
        };
        testResolution('{/var}', variables, '/value');
        testResolution('{/var,x}/here', variables, '/value/1024/here');
    });
    test('Level 3 - Path-style parameter expansion', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            x: '1024',
            y: '768',
            empty: ''
        };
        testResolution('{;x,y}', variables, ';x=1024;y=768');
        testResolution('{;x,y,empty}', variables, ';x=1024;y=768;empty');
    });
    test('Level 3 - Form-style query expansion', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            x: '1024',
            y: '768',
            empty: ''
        };
        testResolution('{?x,y}', variables, '?x=1024&y=768');
        testResolution('{?x,y,empty}', variables, '?x=1024&y=768&empty=');
    });
    test('Level 3 - Form-style query continuation', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            x: '1024',
            y: '768',
            empty: ''
        };
        testResolution('?fixed=yes{&x}', variables, '?fixed=yes&x=1024');
        testResolution('{&x,y,empty}', variables, '&x=1024&y=768&empty=');
    });
    test('Level 4 - String expansion with value modifiers', () => {
        // Test cases from RFC 6570 Section 1.2
        const variables = {
            var: 'value',
            hello: 'Hello World!',
            path: '/foo/bar',
            list: ['red', 'green', 'blue'],
            keys: {
                semi: ';',
                dot: '.',
                comma: ','
            }
        };
        testResolution('{var:3}', variables, 'val');
        testResolution('{var:30}', variables, 'value');
        testResolution('{list}', variables, 'red,green,blue');
        testResolution('{list*}', variables, 'red,green,blue');
    });
    test('Level 4 - Reserved expansion with value modifiers', () => {
        // Test cases related to Level 4 features
        const variables = {
            var: 'value',
            hello: 'Hello World!',
            path: '/foo/bar',
            list: ['red', 'green', 'blue'],
            keys: {
                semi: ';',
                dot: '.',
                comma: ','
            }
        };
        testResolution('{+path:6}/here', variables, '/foo/b/here');
        testResolution('{+list}', variables, 'red,green,blue');
        testResolution('{+list*}', variables, 'red,green,blue');
        testResolution('{+keys}', variables, 'semi,;,dot,.,comma,,');
        testResolution('{+keys*}', variables, 'semi=;,dot=.,comma=,');
    });
    test('Level 4 - Fragment expansion with value modifiers', () => {
        // Test cases related to Level 4 features
        const variables = {
            var: 'value',
            hello: 'Hello World!',
            path: '/foo/bar',
            list: ['red', 'green', 'blue'],
            keys: {
                semi: ';',
                dot: '.',
                comma: ','
            }
        };
        testResolution('{#path:6}/here', variables, '#/foo/b/here');
        testResolution('{#list}', variables, '#red,green,blue');
        testResolution('{#list*}', variables, '#red,green,blue');
        testResolution('{#keys}', variables, '#semi,;,dot,.,comma,,');
        testResolution('{#keys*}', variables, '#semi=;,dot=.,comma=,');
    });
    test('Level 4 - Label expansion with value modifiers', () => {
        // Test cases related to Level 4 features
        const variables = {
            var: 'value',
            list: ['red', 'green', 'blue'],
            keys: {
                semi: ';',
                dot: '.',
                comma: ','
            }
        };
        testResolution('X{.var:3}', variables, 'X.val');
        testResolution('X{.list}', variables, 'X.red,green,blue');
        testResolution('X{.list*}', variables, 'X.red.green.blue');
        testResolution('X{.keys}', variables, 'X.semi,;,dot,.,comma,,');
        testResolution('X{.keys*}', variables, 'X.semi=;.dot=..comma=,');
    });
    test('Level 4 - Path expansion with value modifiers', () => {
        // Test cases related to Level 4 features
        const variables = {
            var: 'value',
            list: ['red', 'green', 'blue'],
            path: '/foo/bar',
            keys: {
                semi: ';',
                dot: '.',
                comma: ','
            }
        };
        testResolution('{/var:1,var}', variables, '/v/value');
        testResolution('{/list}', variables, '/red,green,blue');
        testResolution('{/list*}', variables, '/red/green/blue');
        testResolution('{/list*,path:4}', variables, '/red/green/blue/%2Ffoo');
        testResolution('{/keys}', variables, '/semi,;,dot,.,comma,,');
        testResolution('{/keys*}', variables, '/semi=%3B/dot=./comma=%2C');
    });
    test('Level 4 - Path-style parameters with value modifiers', () => {
        // Test cases related to Level 4 features
        const variables = {
            var: 'value',
            list: ['red', 'green', 'blue'],
            keys: {
                semi: ';',
                dot: '.',
                comma: ','
            }
        };
        testResolution('{;hello:5}', { hello: 'Hello World!' }, ';hello=Hello');
        testResolution('{;list}', variables, ';list=red,green,blue');
        testResolution('{;list*}', variables, ';list=red;list=green;list=blue');
        testResolution('{;keys}', variables, ';keys=semi,;,dot,.,comma,,');
        testResolution('{;keys*}', variables, ';semi=;;dot=.;comma=,');
    });
    test('Level 4 - Form-style query with value modifiers', () => {
        // Test cases related to Level 4 features
        const variables = {
            var: 'value',
            list: ['red', 'green', 'blue'],
            keys: {
                semi: ';',
                dot: '.',
                comma: ','
            }
        };
        testResolution('{?var:3}', variables, '?var=val');
        testResolution('{?list}', variables, '?list=red,green,blue');
        testResolution('{?list*}', variables, '?list=red&list=green&list=blue');
        testResolution('{?keys}', variables, '?keys=semi,;,dot,.,comma,,');
        testResolution('{?keys*}', variables, '?semi=;&dot=.&comma=,');
    });
    test('Level 4 - Form-style query continuation with value modifiers', () => {
        // Test cases related to Level 4 features
        const variables = {
            var: 'value',
            list: ['red', 'green', 'blue'],
            keys: {
                semi: ';',
                dot: '.',
                comma: ','
            }
        };
        testResolution('?fixed=yes{&var:3}', variables, '?fixed=yes&var=val');
        testResolution('?fixed=yes{&list}', variables, '?fixed=yes&list=red,green,blue');
        testResolution('?fixed=yes{&list*}', variables, '?fixed=yes&list=red&list=green&list=blue');
        testResolution('?fixed=yes{&keys}', variables, '?fixed=yes&keys=semi,;,dot,.,comma,,');
        testResolution('?fixed=yes{&keys*}', variables, '?fixed=yes&semi=;&dot=.&comma=,');
    });
    test('handling undefined or null values', () => {
        // Test handling of undefined/null values for different operators
        const variables = {
            defined: 'value',
            undef: undefined,
            null: null,
            empty: ''
        };
        // Simple string expansion
        testResolution('{defined,undef,null,empty}', variables, 'value,');
        // Reserved expansion
        testResolution('{+defined,undef,null,empty}', variables, 'value,');
        // Fragment expansion
        testResolution('{#defined,undef,null,empty}', variables, '#value,');
        // Label expansion
        testResolution('X{.defined,undef,null,empty}', variables, 'X.value');
        // Path segments
        testResolution('{/defined,undef,null}', variables, '/value');
        // Path-style parameters
        testResolution('{;defined,empty}', variables, ';defined=value;empty');
        // Form-style query
        testResolution('{?defined,undef,null,empty}', variables, '?defined=value&undef=&null=&empty=');
        // Form-style query continuation
        testResolution('{&defined,undef,null,empty}', variables, '&defined=value&undef=&null=&empty=');
    });
    test('complex templates', () => {
        // Test more complex template combinations
        const variables = {
            domain: 'example.com',
            user: 'fred',
            path: ['path', 'to', 'resource'],
            query: 'search',
            page: 5,
            lang: 'en',
            sessionId: '123abc',
            filters: ['color:blue', 'shape:square'],
            coordinates: { lat: '37.7', lon: '-122.4' }
        };
        // RESTful URL pattern
        testResolution('https://{domain}/api/v1/users/{user}{/path*}{?query,page,lang}', variables, 'https://example.com/api/v1/users/fred/path/to/resource?query=search&page=5&lang=en');
        // Complex query parameters
        testResolution('https://{domain}/search{?query,filters,coordinates*}', variables, 'https://example.com/search?query=search&filters=color:blue,shape:square&lat=37.7&lon=-122.4');
        // Multiple expression types
        testResolution('https://{domain}/users/{user}/profile{.lang}{?sessionId}{#path}', variables, 'https://example.com/users/fred/profile.en?sessionId=123abc#path,to,resource');
    });
    test('literals and escaping', () => {
        // Test literal segments and escaping
        testParsing('http://example.com/literal', []);
        testParsing('http://example.com/{var}literal{var2}', [
            {
                expression: '{var}',
                operator: '',
                variables: [{ explodable: false, name: 'var', optional: false, prefixLength: undefined, repeatable: false }]
            },
            {
                expression: '{var2}',
                operator: '',
                variables: [{ explodable: false, name: 'var2', optional: false, prefixLength: undefined, repeatable: false }]
            }
        ]);
        // Test that escaped braces are treated as literals
        // Note: The current implementation might not handle this case
        testResolution('http://example.com/{{var}}', { var: 'value' }, 'http://example.com/{var}');
    });
    test('edge cases', () => {
        // Empty template
        testResolution('', {}, '');
        // Template with only literals
        testResolution('http://example.com/path', {}, 'http://example.com/path');
        // No variables provided for resolution
        testResolution('{var}', {}, '');
        // Multiple sequential expressions
        testResolution('{a}{b}{c}', { a: '1', b: '2', c: '3' }, '123');
        // Expressions with special characters in variable names
        testResolution('{_hidden.var-name$}', { '_hidden.var-name$': 'value' }, 'value');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpVGVtcGxhdGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL3Rlc3QvY29tbW9uL3VyaVRlbXBsYXRlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRWpDLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUM7O09BRUc7SUFDSCxTQUFTLFdBQVcsQ0FBQyxRQUFnQixFQUFFLGtCQUF5QjtRQUMvRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2hHLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsU0FBUyxjQUFjLENBQUMsUUFBZ0IsRUFBRSxTQUE4QixFQUFFLFFBQWdCO1FBQ3pGLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMscUJBQXFCLEVBQUU7Z0JBQ2hFLFVBQVUsRUFBRSxPQUFPO2dCQUNuQixRQUFRLEVBQUUsRUFBRTtnQkFDWixTQUFTLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDO2FBQzVHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNSLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO0lBQ3hELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN6QyxtQkFBbUI7UUFDbkIsV0FBVyxDQUFDLDBCQUEwQixFQUFFLENBQUM7Z0JBQ3hDLFVBQVUsRUFBRSxPQUFPO2dCQUNuQixRQUFRLEVBQUUsRUFBRTtnQkFDWixTQUFTLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDO2FBQzVHLENBQUMsQ0FBQyxDQUFDO1FBRUosMEJBQTBCO1FBQzFCLFdBQVcsQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO2dCQUMxQyxVQUFVLEVBQUUsU0FBUztnQkFDckIsUUFBUSxFQUFFLEdBQUc7Z0JBQ2IsU0FBUyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQzthQUM3RyxDQUFDLENBQUMsQ0FBQztRQUVKLG9DQUFvQztRQUNwQyxXQUFXLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztnQkFDeEMsVUFBVSxFQUFFLE9BQU87Z0JBQ25CLFFBQVEsRUFBRSxFQUFFO2dCQUNaLFNBQVMsRUFBRTtvQkFDVixFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRTtvQkFDN0YsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUU7aUJBQzdGO2FBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixpQ0FBaUM7UUFDakMsV0FBVyxDQUFDLDRCQUE0QixFQUFFLENBQUM7Z0JBQzFDLFVBQVUsRUFBRSxTQUFTO2dCQUNyQixRQUFRLEVBQUUsRUFBRTtnQkFDWixTQUFTLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDO2FBQ3BHLENBQUMsQ0FBQyxDQUFDO1FBRUosV0FBVyxDQUFDLDRCQUE0QixFQUFFLENBQUM7Z0JBQzFDLFVBQVUsRUFBRSxTQUFTO2dCQUNyQixRQUFRLEVBQUUsRUFBRTtnQkFDWixTQUFTLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDO2FBQzNHLENBQUMsQ0FBQyxDQUFDO1FBRUosc0JBQXNCO1FBQ3RCLFdBQVcsQ0FBQyxpQ0FBaUMsRUFBRTtZQUM5QztnQkFDQyxVQUFVLEVBQUUsS0FBSztnQkFDakIsUUFBUSxFQUFFLEVBQUU7Z0JBQ1osU0FBUyxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQzthQUMxRztZQUNEO2dCQUNDLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixRQUFRLEVBQUUsRUFBRTtnQkFDWixTQUFTLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDO2FBQzFHO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLHVDQUF1QztRQUN2QyxNQUFNLFNBQVMsR0FBRztZQUNqQixHQUFHLEVBQUUsT0FBTztZQUNaLEtBQUssRUFBRSxjQUFjO1NBQ3JCLENBQUM7UUFFRixjQUFjLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM1QyxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQzFELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN6Qyx1Q0FBdUM7UUFDdkMsTUFBTSxTQUFTLEdBQUc7WUFDakIsR0FBRyxFQUFFLE9BQU87WUFDWixLQUFLLEVBQUUsY0FBYztZQUNyQixJQUFJLEVBQUUsVUFBVTtTQUNoQixDQUFDO1FBRUYsY0FBYyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDN0MsY0FBYyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUN4RCxjQUFjLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUMzRCxjQUFjLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDcEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3pDLHVDQUF1QztRQUN2QyxNQUFNLFNBQVMsR0FBRztZQUNqQixHQUFHLEVBQUUsT0FBTztZQUNaLEtBQUssRUFBRSxjQUFjO1NBQ3JCLENBQUM7UUFFRixjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNoRCxjQUFjLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQzVELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEdBQUcsRUFBRTtRQUMvRCx1Q0FBdUM7UUFDdkMsTUFBTSxTQUFTLEdBQUc7WUFDakIsR0FBRyxFQUFFLE9BQU87WUFDWixLQUFLLEVBQUUsY0FBYztZQUNyQixLQUFLLEVBQUUsRUFBRTtZQUNULElBQUksRUFBRSxVQUFVO1lBQ2hCLENBQUMsRUFBRSxNQUFNO1lBQ1QsQ0FBQyxFQUFFLEtBQUs7U0FDUixDQUFDO1FBRUYsY0FBYyxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDdkQsY0FBYyxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztJQUN2RSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxzREFBc0QsRUFBRSxHQUFHLEVBQUU7UUFDakUsdUNBQXVDO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHO1lBQ2pCLEdBQUcsRUFBRSxPQUFPO1lBQ1osS0FBSyxFQUFFLGNBQWM7WUFDckIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsQ0FBQyxFQUFFLE1BQU07WUFDVCxDQUFDLEVBQUUsS0FBSztTQUNSLENBQUM7UUFFRixjQUFjLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3JFLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUNuRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxzREFBc0QsRUFBRSxHQUFHLEVBQUU7UUFDakUsdUNBQXVDO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHO1lBQ2pCLEdBQUcsRUFBRSxPQUFPO1lBQ1osS0FBSyxFQUFFLGNBQWM7WUFDckIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsQ0FBQyxFQUFFLE1BQU07WUFDVCxDQUFDLEVBQUUsS0FBSztTQUNSLENBQUM7UUFFRixjQUFjLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQ3RFLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQUNwRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7UUFDdEQsdUNBQXVDO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHO1lBQ2pCLEdBQUcsRUFBRSxPQUFPO1lBQ1osQ0FBQyxFQUFFLE1BQU07WUFDVCxDQUFDLEVBQUUsS0FBSztTQUNSLENBQUM7UUFFRixjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNoRCxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNwRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDOUMsdUNBQXVDO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHO1lBQ2pCLEdBQUcsRUFBRSxPQUFPO1lBQ1osQ0FBQyxFQUFFLE1BQU07U0FDVCxDQUFDO1FBRUYsY0FBYyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDOUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUNoRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7UUFDckQsdUNBQXVDO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHO1lBQ2pCLENBQUMsRUFBRSxNQUFNO1lBQ1QsQ0FBQyxFQUFFLEtBQUs7WUFDUixLQUFLLEVBQUUsRUFBRTtTQUNULENBQUM7UUFFRixjQUFjLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNyRCxjQUFjLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNqRCx1Q0FBdUM7UUFDdkMsTUFBTSxTQUFTLEdBQUc7WUFDakIsQ0FBQyxFQUFFLE1BQU07WUFDVCxDQUFDLEVBQUUsS0FBSztZQUNSLEtBQUssRUFBRSxFQUFFO1NBQ1QsQ0FBQztRQUVGLGNBQWMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELGNBQWMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixDQUFDLENBQUM7SUFDbkUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO1FBQ3BELHVDQUF1QztRQUN2QyxNQUFNLFNBQVMsR0FBRztZQUNqQixDQUFDLEVBQUUsTUFBTTtZQUNULENBQUMsRUFBRSxLQUFLO1lBQ1IsS0FBSyxFQUFFLEVBQUU7U0FDVCxDQUFDO1FBRUYsY0FBYyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ2pFLGNBQWMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixDQUFDLENBQUM7SUFDbkUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1FBQzVELHVDQUF1QztRQUN2QyxNQUFNLFNBQVMsR0FBRztZQUNqQixHQUFHLEVBQUUsT0FBTztZQUNaLEtBQUssRUFBRSxjQUFjO1lBQ3JCLElBQUksRUFBRSxVQUFVO1lBQ2hCLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDO1lBQzlCLElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsR0FBRztnQkFDVCxHQUFHLEVBQUUsR0FBRztnQkFDUixLQUFLLEVBQUUsR0FBRzthQUNWO1NBQ0QsQ0FBQztRQUVGLGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzVDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLGNBQWMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDdEQsY0FBYyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUN4RCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxtREFBbUQsRUFBRSxHQUFHLEVBQUU7UUFDOUQseUNBQXlDO1FBQ3pDLE1BQU0sU0FBUyxHQUFHO1lBQ2pCLEdBQUcsRUFBRSxPQUFPO1lBQ1osS0FBSyxFQUFFLGNBQWM7WUFDckIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUM7WUFDOUIsSUFBSSxFQUFFO2dCQUNMLElBQUksRUFBRSxHQUFHO2dCQUNULEdBQUcsRUFBRSxHQUFHO2dCQUNSLEtBQUssRUFBRSxHQUFHO2FBQ1Y7U0FDRCxDQUFDO1FBRUYsY0FBYyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMzRCxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3ZELGNBQWMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDeEQsY0FBYyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztRQUM3RCxjQUFjLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO0lBQy9ELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtRQUM5RCx5Q0FBeUM7UUFDekMsTUFBTSxTQUFTLEdBQUc7WUFDakIsR0FBRyxFQUFFLE9BQU87WUFDWixLQUFLLEVBQUUsY0FBYztZQUNyQixJQUFJLEVBQUUsVUFBVTtZQUNoQixJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQztZQUM5QixJQUFJLEVBQUU7Z0JBQ0wsSUFBSSxFQUFFLEdBQUc7Z0JBQ1QsR0FBRyxFQUFFLEdBQUc7Z0JBQ1IsS0FBSyxFQUFFLEdBQUc7YUFDVjtTQUNELENBQUM7UUFFRixjQUFjLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzVELGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDeEQsY0FBYyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN6RCxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1FBQzlELGNBQWMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDaEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO1FBQzNELHlDQUF5QztRQUN6QyxNQUFNLFNBQVMsR0FBRztZQUNqQixHQUFHLEVBQUUsT0FBTztZQUNaLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDO1lBQzlCLElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsR0FBRztnQkFDVCxHQUFHLEVBQUUsR0FBRztnQkFDUixLQUFLLEVBQUUsR0FBRzthQUNWO1NBQ0QsQ0FBQztRQUVGLGNBQWMsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELGNBQWMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDMUQsY0FBYyxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxjQUFjLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2hFLGNBQWMsQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLHdCQUF3QixDQUFDLENBQUM7SUFDbEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1FBQzFELHlDQUF5QztRQUN6QyxNQUFNLFNBQVMsR0FBRztZQUNqQixHQUFHLEVBQUUsT0FBTztZQUNaLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDO1lBQzlCLElBQUksRUFBRSxVQUFVO1lBQ2hCLElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsR0FBRztnQkFDVCxHQUFHLEVBQUUsR0FBRztnQkFDUixLQUFLLEVBQUUsR0FBRzthQUNWO1NBQ0QsQ0FBQztRQUVGLGNBQWMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3RELGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDeEQsY0FBYyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN6RCxjQUFjLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDdkUsY0FBYyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztRQUM5RCxjQUFjLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEdBQUcsRUFBRTtRQUNqRSx5Q0FBeUM7UUFDekMsTUFBTSxTQUFTLEdBQUc7WUFDakIsR0FBRyxFQUFFLE9BQU87WUFDWixJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQztZQUM5QixJQUFJLEVBQUU7Z0JBQ0wsSUFBSSxFQUFFLEdBQUc7Z0JBQ1QsR0FBRyxFQUFFLEdBQUc7Z0JBQ1IsS0FBSyxFQUFFLEdBQUc7YUFDVjtTQUNELENBQUM7UUFFRixjQUFjLENBQUMsWUFBWSxFQUFFLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3hFLGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDN0QsY0FBYyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztRQUN4RSxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1FBQ25FLGNBQWMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDaEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1FBQzVELHlDQUF5QztRQUN6QyxNQUFNLFNBQVMsR0FBRztZQUNqQixHQUFHLEVBQUUsT0FBTztZQUNaLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDO1lBQzlCLElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsR0FBRztnQkFDVCxHQUFHLEVBQUUsR0FBRztnQkFDUixLQUFLLEVBQUUsR0FBRzthQUNWO1NBQ0QsQ0FBQztRQUVGLGNBQWMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ2xELGNBQWMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDN0QsY0FBYyxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztRQUN4RSxjQUFjLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSw0QkFBNEIsQ0FBQyxDQUFDO1FBQ25FLGNBQWMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDaEUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsOERBQThELEVBQUUsR0FBRyxFQUFFO1FBQ3pFLHlDQUF5QztRQUN6QyxNQUFNLFNBQVMsR0FBRztZQUNqQixHQUFHLEVBQUUsT0FBTztZQUNaLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDO1lBQzlCLElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsR0FBRztnQkFDVCxHQUFHLEVBQUUsR0FBRztnQkFDUixLQUFLLEVBQUUsR0FBRzthQUNWO1NBQ0QsQ0FBQztRQUVGLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN0RSxjQUFjLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLGdDQUFnQyxDQUFDLENBQUM7UUFDakYsY0FBYyxDQUFDLG9CQUFvQixFQUFFLFNBQVMsRUFBRSwwQ0FBMEMsQ0FBQyxDQUFDO1FBQzVGLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsc0NBQXNDLENBQUMsQ0FBQztRQUN2RixjQUFjLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLENBQUM7SUFDcEYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLGlFQUFpRTtRQUNqRSxNQUFNLFNBQVMsR0FBRztZQUNqQixPQUFPLEVBQUUsT0FBTztZQUNoQixLQUFLLEVBQUUsU0FBUztZQUNoQixJQUFJLEVBQUUsSUFBSTtZQUNWLEtBQUssRUFBRSxFQUFFO1NBQ1QsQ0FBQztRQUVGLDBCQUEwQjtRQUMxQixjQUFjLENBQUMsNEJBQTRCLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRWxFLHFCQUFxQjtRQUNyQixjQUFjLENBQUMsNkJBQTZCLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRW5FLHFCQUFxQjtRQUNyQixjQUFjLENBQUMsNkJBQTZCLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXBFLGtCQUFrQjtRQUNsQixjQUFjLENBQUMsOEJBQThCLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXJFLGdCQUFnQjtRQUNoQixjQUFjLENBQUMsdUJBQXVCLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRTdELHdCQUF3QjtRQUN4QixjQUFjLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFFdEUsbUJBQW1CO1FBQ25CLGNBQWMsQ0FBQyw2QkFBNkIsRUFBRSxTQUFTLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztRQUUvRixnQ0FBZ0M7UUFDaEMsY0FBYyxDQUFDLDZCQUE2QixFQUFFLFNBQVMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDO0lBQ2hHLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5QiwwQ0FBMEM7UUFDMUMsTUFBTSxTQUFTLEdBQUc7WUFDakIsTUFBTSxFQUFFLGFBQWE7WUFDckIsSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQztZQUNoQyxLQUFLLEVBQUUsUUFBUTtZQUNmLElBQUksRUFBRSxDQUFDO1lBQ1AsSUFBSSxFQUFFLElBQUk7WUFDVixTQUFTLEVBQUUsUUFBUTtZQUNuQixPQUFPLEVBQUUsQ0FBQyxZQUFZLEVBQUUsY0FBYyxDQUFDO1lBQ3ZDLFdBQVcsRUFBRSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRTtTQUMzQyxDQUFDO1FBRUYsc0JBQXNCO1FBQ3RCLGNBQWMsQ0FBQyxnRUFBZ0UsRUFDOUUsU0FBUyxFQUNULG9GQUFvRixDQUFDLENBQUM7UUFFdkYsMkJBQTJCO1FBQzNCLGNBQWMsQ0FBQyxzREFBc0QsRUFDcEUsU0FBUyxFQUNULDZGQUE2RixDQUFDLENBQUM7UUFFaEcsNEJBQTRCO1FBQzVCLGNBQWMsQ0FBQyxpRUFBaUUsRUFDL0UsU0FBUyxFQUNULDZFQUE2RSxDQUFDLENBQUM7SUFDakYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLHFDQUFxQztRQUNyQyxXQUFXLENBQUMsNEJBQTRCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDOUMsV0FBVyxDQUFDLHVDQUF1QyxFQUFFO1lBQ3BEO2dCQUNDLFVBQVUsRUFBRSxPQUFPO2dCQUNuQixRQUFRLEVBQUUsRUFBRTtnQkFDWixTQUFTLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDO2FBQzVHO1lBQ0Q7Z0JBQ0MsVUFBVSxFQUFFLFFBQVE7Z0JBQ3BCLFFBQVEsRUFBRSxFQUFFO2dCQUNaLFNBQVMsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUM7YUFDN0c7U0FDRCxDQUFDLENBQUM7UUFFSCxtREFBbUQ7UUFDbkQsOERBQThEO1FBQzlELGNBQWMsQ0FBQyw0QkFBNEIsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO0lBQzVGLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDdkIsaUJBQWlCO1FBQ2pCLGNBQWMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRTNCLDhCQUE4QjtRQUM5QixjQUFjLENBQUMseUJBQXlCLEVBQUUsRUFBRSxFQUFFLHlCQUF5QixDQUFDLENBQUM7UUFFekUsdUNBQXVDO1FBQ3ZDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWhDLGtDQUFrQztRQUNsQyxjQUFjLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUvRCx3REFBd0Q7UUFDeEQsY0FBYyxDQUFDLHFCQUFxQixFQUFFLEVBQUUsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDbEYsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9