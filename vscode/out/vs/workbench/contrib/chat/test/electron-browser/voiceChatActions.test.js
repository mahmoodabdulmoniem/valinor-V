/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { parseNextChatResponseChunk } from '../../electron-browser/actions/voiceChatActions.js';
suite('VoiceChatActions', function () {
    function assertChunk(text, expected, offset) {
        const res = parseNextChatResponseChunk(text, offset);
        assert.strictEqual(res.chunk, expected);
        return res;
    }
    test('parseNextChatResponseChunk', function () {
        // Simple, no offset
        assertChunk('Hello World', undefined, 0);
        assertChunk('Hello World.', undefined, 0);
        assertChunk('Hello World. ', 'Hello World.', 0);
        assertChunk('Hello World? ', 'Hello World?', 0);
        assertChunk('Hello World! ', 'Hello World!', 0);
        assertChunk('Hello World: ', 'Hello World:', 0);
        // Ensure chunks are parsed from the end, no offset
        assertChunk('Hello World. How is your day? And more...', 'Hello World. How is your day?', 0);
        // Ensure chunks are parsed from the end, with offset
        let offset = assertChunk('Hello World. How is your ', 'Hello World.', 0).offset;
        offset = assertChunk('Hello World. How is your day? And more...', 'How is your day?', offset).offset;
        offset = assertChunk('Hello World. How is your day? And more to come! ', 'And more to come!', offset).offset;
        assertChunk('Hello World. How is your day? And more to come! ', undefined, offset);
        // Sparted by newlines
        offset = assertChunk('Hello World.\nHow is your', 'Hello World.', 0).offset;
        assertChunk('Hello World.\nHow is your day?\n', 'How is your day?', offset);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pY2VDaGF0QWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvZWxlY3Ryb24tYnJvd3Nlci92b2ljZUNoYXRBY3Rpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRWhHLEtBQUssQ0FBQyxrQkFBa0IsRUFBRTtJQUV6QixTQUFTLFdBQVcsQ0FBQyxJQUFZLEVBQUUsUUFBNEIsRUFBRSxNQUFjO1FBQzlFLE1BQU0sR0FBRyxHQUFHLDBCQUEwQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFeEMsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDO0lBRUQsSUFBSSxDQUFDLDRCQUE0QixFQUFFO1FBRWxDLG9CQUFvQjtRQUNwQixXQUFXLENBQUMsYUFBYSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6QyxXQUFXLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQyxXQUFXLENBQUMsZUFBZSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRCxXQUFXLENBQUMsZUFBZSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRCxXQUFXLENBQUMsZUFBZSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRCxXQUFXLENBQUMsZUFBZSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVoRCxtREFBbUQ7UUFDbkQsV0FBVyxDQUFDLDJDQUEyQyxFQUFFLCtCQUErQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTdGLHFEQUFxRDtRQUNyRCxJQUFJLE1BQU0sR0FBRyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUNoRixNQUFNLEdBQUcsV0FBVyxDQUFDLDJDQUEyQyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUNyRyxNQUFNLEdBQUcsV0FBVyxDQUFDLGtEQUFrRCxFQUFFLG1CQUFtQixFQUFFLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUM3RyxXQUFXLENBQUMsa0RBQWtELEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRW5GLHNCQUFzQjtRQUN0QixNQUFNLEdBQUcsV0FBVyxDQUFDLDJCQUEyQixFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDNUUsV0FBVyxDQUFDLGtDQUFrQyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzdFLENBQUMsQ0FBQyxDQUFDO0lBRUgsdUNBQXVDLEVBQUUsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyJ9