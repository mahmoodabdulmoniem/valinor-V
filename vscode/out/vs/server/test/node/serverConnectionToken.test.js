/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import { join } from '../../../base/common/path.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { getRandomTestPath } from '../../../base/test/node/testUtils.js';
import { parseServerConnectionToken, ServerConnectionTokenParseError } from '../../node/serverConnectionToken.js';
suite('parseServerConnectionToken', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function isError(r) {
        return (r instanceof ServerConnectionTokenParseError);
    }
    function assertIsError(r) {
        assert.strictEqual(isError(r), true);
    }
    test('no arguments generates a token that is mandatory', async () => {
        const result = await parseServerConnectionToken({}, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 2 /* ServerConnectionTokenType.Mandatory */);
    });
    test('--without-connection-token', async () => {
        const result = await parseServerConnectionToken({ 'without-connection-token': true }, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 0 /* ServerConnectionTokenType.None */);
    });
    test('--without-connection-token --connection-token results in error', async () => {
        assertIsError(await parseServerConnectionToken({ 'without-connection-token': true, 'connection-token': '0' }, async () => 'defaultTokenValue'));
    });
    test('--without-connection-token --connection-token-file results in error', async () => {
        assertIsError(await parseServerConnectionToken({ 'without-connection-token': true, 'connection-token-file': '0' }, async () => 'defaultTokenValue'));
    });
    test('--connection-token-file --connection-token results in error', async () => {
        assertIsError(await parseServerConnectionToken({ 'connection-token-file': '0', 'connection-token': '0' }, async () => 'defaultTokenValue'));
    });
    test('--connection-token-file', async function () {
        this.timeout(10000);
        const testDir = getRandomTestPath(os.tmpdir(), 'vsctests', 'server-connection-token');
        fs.mkdirSync(testDir, { recursive: true });
        const filename = join(testDir, 'connection-token-file');
        const connectionToken = `12345-123-abc`;
        fs.writeFileSync(filename, connectionToken);
        const result = await parseServerConnectionToken({ 'connection-token-file': filename }, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 2 /* ServerConnectionTokenType.Mandatory */);
        assert.strictEqual(result.value, connectionToken);
        fs.rmSync(testDir, { recursive: true, force: true });
    });
    test('--connection-token', async () => {
        const connectionToken = `12345-123-abc`;
        const result = await parseServerConnectionToken({ 'connection-token': connectionToken }, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 2 /* ServerConnectionTokenType.Mandatory */);
        assert.strictEqual(result.value, connectionToken);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyQ29ubmVjdGlvblRva2VuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci90ZXN0L25vZGUvc2VydmVyQ29ubmVjdGlvblRva2VuLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsMEJBQTBCLEVBQXlCLCtCQUErQixFQUE2QixNQUFNLHFDQUFxQyxDQUFDO0FBR3BLLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDeEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxTQUFTLE9BQU8sQ0FBQyxDQUEwRDtRQUMxRSxPQUFPLENBQUMsQ0FBQyxZQUFZLCtCQUErQixDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFDLENBQTBEO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxJQUFJLENBQUMsa0RBQWtELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkUsTUFBTSxNQUFNLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQyxFQUFzQixFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN6RyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLFlBQVksK0JBQStCLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksZ0RBQXdDLENBQUMsQ0FBQztJQUNoRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw0QkFBNEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM3QyxNQUFNLE1BQU0sR0FBRyxNQUFNLDBCQUEwQixDQUFDLEVBQUUsMEJBQTBCLEVBQUUsSUFBSSxFQUFzQixFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUMzSSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLFlBQVksK0JBQStCLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksMkNBQW1DLENBQUMsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxnRUFBZ0UsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRixhQUFhLENBQUMsTUFBTSwwQkFBMEIsQ0FBQyxFQUFFLDBCQUEwQixFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxHQUFHLEVBQXNCLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDckssQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUVBQXFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEYsYUFBYSxDQUFDLE1BQU0sMEJBQTBCLENBQUMsRUFBRSwwQkFBMEIsRUFBRSxJQUFJLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxFQUFzQixFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQzFLLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDZEQUE2RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlFLGFBQWEsQ0FBQyxNQUFNLDBCQUEwQixDQUFDLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxFQUFFLGtCQUFrQixFQUFFLEdBQUcsRUFBc0IsRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUNqSyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLO1FBQ3BDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEIsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLFVBQVUsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3RGLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDM0MsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN4QyxFQUFFLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUM1QyxNQUFNLE1BQU0sR0FBRyxNQUFNLDBCQUEwQixDQUFDLEVBQUUsdUJBQXVCLEVBQUUsUUFBUSxFQUFzQixFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM1SSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLFlBQVksK0JBQStCLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksZ0RBQXdDLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDbEQsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN4QyxNQUFNLE1BQU0sR0FBRyxNQUFNLDBCQUEwQixDQUFDLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFzQixFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUM5SSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLFlBQVksK0JBQStCLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksZ0RBQXdDLENBQUMsQ0FBQztRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDbkQsQ0FBQyxDQUFDLENBQUM7QUFFSixDQUFDLENBQUMsQ0FBQyJ9