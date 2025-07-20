/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { parseEnvFile } from '../../common/envfile.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import * as assert from 'assert';
/*
Test cases from https://github.com/motdotla/dotenv/blob/master/tests/.env

    Copyright (c) 2015, Scott Motte
    All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, this
        list of conditions and the following disclaimer.

    * Redistributions in binary form must reproduce the above copyright notice,
        this list of conditions and the following disclaimer in the documentation
        and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
    DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
    FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
    DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
    SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
    CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
    OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
const example = `
BASIC=basic

# previous line intentionally left blank
AFTER_LINE=after_line
EMPTY=
EMPTY_SINGLE_QUOTES=''
EMPTY_DOUBLE_QUOTES=""
EMPTY_BACKTICKS=\`\`
SINGLE_QUOTES='single_quotes'
SINGLE_QUOTES_SPACED='    single quotes    '
DOUBLE_QUOTES="double_quotes"
DOUBLE_QUOTES_SPACED="    double quotes    "
DOUBLE_QUOTES_INSIDE_SINGLE='double "quotes" work inside single quotes'
DOUBLE_QUOTES_WITH_NO_SPACE_BRACKET="{ port: $MONGOLAB_PORT}"
SINGLE_QUOTES_INSIDE_DOUBLE="single 'quotes' work inside double quotes"
BACKTICKS_INSIDE_SINGLE='\`backticks\` work inside single quotes'
BACKTICKS_INSIDE_DOUBLE="\`backticks\` work inside double quotes"
BACKTICKS=\`backticks\`
BACKTICKS_SPACED=\`    backticks    \`
DOUBLE_QUOTES_INSIDE_BACKTICKS=\`double "quotes" work inside backticks\`
SINGLE_QUOTES_INSIDE_BACKTICKS=\`single 'quotes' work inside backticks\`
DOUBLE_AND_SINGLE_QUOTES_INSIDE_BACKTICKS=\`double "quotes" and single 'quotes' work inside backticks\`
EXPAND_NEWLINES="expand\\nnew\\nlines"
DONT_EXPAND_UNQUOTED=dontexpand\\nnewlines
DONT_EXPAND_SQUOTED='dontexpand\\nnewlines'
# COMMENTS=work
INLINE_COMMENTS=inline comments # work #very #well
INLINE_COMMENTS_SINGLE_QUOTES='inline comments outside of #singlequotes' # work
INLINE_COMMENTS_DOUBLE_QUOTES="inline comments outside of #doublequotes" # work
INLINE_COMMENTS_BACKTICKS=\`inline comments outside of #backticks\` # work
INLINE_COMMENTS_SPACE=inline comments start with a#number sign. no space required.
EQUAL_SIGNS=equals==
RETAIN_INNER_QUOTES={"foo": "bar"}
RETAIN_INNER_QUOTES_AS_STRING='{"foo": "bar"}'
RETAIN_INNER_QUOTES_AS_BACKTICKS=\`{"foo": "bar's"}\`
TRIM_SPACE_FROM_UNQUOTED=    some spaced out string
USERNAME=therealnerdybeast@example.tld
		SPACED_KEY = parsed
`;
suite('parseEnvFile', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parses', () => {
        const parsed = parseEnvFile(example);
        assert.strictEqual(parsed.get('BASIC'), 'basic');
        assert.strictEqual(parsed.get('AFTER_LINE'), 'after_line');
        assert.strictEqual(parsed.get('EMPTY'), '');
        assert.strictEqual(parsed.get('EMPTY_SINGLE_QUOTES'), '');
        assert.strictEqual(parsed.get('EMPTY_DOUBLE_QUOTES'), '');
        assert.strictEqual(parsed.get('EMPTY_BACKTICKS'), '');
        assert.strictEqual(parsed.get('SINGLE_QUOTES'), 'single_quotes');
        assert.strictEqual(parsed.get('SINGLE_QUOTES_SPACED'), '    single quotes    ');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES'), 'double_quotes');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_SPACED'), '    double quotes    ');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_INSIDE_SINGLE'), 'double "quotes" work inside single quotes');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_WITH_NO_SPACE_BRACKET'), '{ port: $MONGOLAB_PORT}');
        assert.strictEqual(parsed.get('SINGLE_QUOTES_INSIDE_DOUBLE'), "single 'quotes' work inside double quotes");
        assert.strictEqual(parsed.get('BACKTICKS_INSIDE_SINGLE'), '`backticks` work inside single quotes');
        assert.strictEqual(parsed.get('BACKTICKS_INSIDE_DOUBLE'), '`backticks` work inside double quotes');
        assert.strictEqual(parsed.get('BACKTICKS'), 'backticks');
        assert.strictEqual(parsed.get('BACKTICKS_SPACED'), '    backticks    ');
        assert.strictEqual(parsed.get('DOUBLE_QUOTES_INSIDE_BACKTICKS'), 'double "quotes" work inside backticks');
        assert.strictEqual(parsed.get('SINGLE_QUOTES_INSIDE_BACKTICKS'), "single 'quotes' work inside backticks");
        assert.strictEqual(parsed.get('DOUBLE_AND_SINGLE_QUOTES_INSIDE_BACKTICKS'), "double \"quotes\" and single 'quotes' work inside backticks");
        assert.strictEqual(parsed.get('EXPAND_NEWLINES'), 'expand\nnew\nlines');
        assert.strictEqual(parsed.get('DONT_EXPAND_UNQUOTED'), 'dontexpand\\nnewlines');
        assert.strictEqual(parsed.get('DONT_EXPAND_SQUOTED'), 'dontexpand\\nnewlines');
        assert.strictEqual(parsed.get('COMMENTS'), undefined);
        assert.strictEqual(parsed.get('INLINE_COMMENTS'), 'inline comments');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_SINGLE_QUOTES'), 'inline comments outside of #singlequotes');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_DOUBLE_QUOTES'), 'inline comments outside of #doublequotes');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_BACKTICKS'), 'inline comments outside of #backticks');
        assert.strictEqual(parsed.get('INLINE_COMMENTS_SPACE'), 'inline comments start with a');
        assert.strictEqual(parsed.get('EQUAL_SIGNS'), 'equals==');
        assert.strictEqual(parsed.get('RETAIN_INNER_QUOTES'), '{"foo": "bar"}');
        assert.strictEqual(parsed.get('RETAIN_INNER_QUOTES_AS_STRING'), '{"foo": "bar"}');
        assert.strictEqual(parsed.get('RETAIN_INNER_QUOTES_AS_BACKTICKS'), '{"foo": "bar\'s"}');
        assert.strictEqual(parsed.get('TRIM_SPACE_FROM_UNQUOTED'), 'some spaced out string');
        assert.strictEqual(parsed.get('USERNAME'), 'therealnerdybeast@example.tld');
        assert.strictEqual(parsed.get('SPACED_KEY'), 'parsed');
        const payload = parseEnvFile('BUFFER=true');
        assert.strictEqual(payload.get('BUFFER'), 'true');
        const expectedPayload = Object.entries({ SERVER: 'localhost', PASSWORD: 'password', DB: 'tests' });
        const RPayload = parseEnvFile('SERVER=localhost\rPASSWORD=password\rDB=tests\r');
        assert.deepStrictEqual([...RPayload], expectedPayload);
        const NPayload = parseEnvFile('SERVER=localhost\nPASSWORD=password\nDB=tests\n');
        assert.deepStrictEqual([...NPayload], expectedPayload);
        const RNPayload = parseEnvFile('SERVER=localhost\r\nPASSWORD=password\r\nDB=tests\r\n');
        assert.deepStrictEqual([...RNPayload], expectedPayload);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52ZmlsZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2VudmZpbGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3JFLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRWpDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQTBCRTtBQUVGLE1BQU0sT0FBTyxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0F1Q2YsQ0FBQztBQUVGLEtBQUssQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzFCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7UUFDbkIsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENB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