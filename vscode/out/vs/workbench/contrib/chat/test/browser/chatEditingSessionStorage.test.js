/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ResourceMap } from '../../../../../base/common/map.js';
import { cloneAndChange } from '../../../../../base/common/objects.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { TestEnvironmentService } from '../../../../test/browser/workbenchTestServices.js';
import { ChatEditingSessionStorage } from '../../browser/chatEditing/chatEditingSessionStorage.js';
import { ChatEditingSnapshotTextModelContentProvider } from '../../browser/chatEditing/chatEditingTextModelContentProviders.js';
suite('ChatEditingSessionStorage', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    const sessionId = generateUuid();
    let fs;
    let storage;
    class TestChatEditingSessionStorage extends ChatEditingSessionStorage {
        get storageLocation() {
            return super._getStorageLocation();
        }
    }
    setup(() => {
        fs = ds.add(new FileService(new NullLogService()));
        ds.add(fs.registerProvider(TestEnvironmentService.workspaceStorageHome.scheme, ds.add(new InMemoryFileSystemProvider())));
        storage = new TestChatEditingSessionStorage(sessionId, fs, TestEnvironmentService, new NullLogService(), { getWorkspace: () => ({ id: 'workspaceId' }) });
    });
    function makeStop(requestId, before, after) {
        const stopId = generateUuid();
        const resource = URI.file('/foo.js');
        return {
            stopId,
            entries: new ResourceMap([
                [resource, { resource, languageId: 'javascript', snapshotUri: ChatEditingSnapshotTextModelContentProvider.getSnapshotFileURI(sessionId, requestId, stopId, resource.path), original: `contents${before}}`, current: `contents${after}`, state: 0 /* ModifiedFileEntryState.Modified */, telemetryInfo: { agentId: 'agentId', command: 'cmd', requestId: generateUuid(), result: undefined, sessionId } }],
            ]),
        };
    }
    function generateState() {
        const initialFileContents = new ResourceMap();
        for (let i = 0; i < 10; i++) {
            initialFileContents.set(URI.file(`/foo${i}.js`), `fileContents${Math.floor(i / 2)}`);
        }
        const r1 = generateUuid();
        const r2 = generateUuid();
        return {
            initialFileContents,
            pendingSnapshot: makeStop(undefined, 'd', 'e'),
            recentSnapshot: makeStop(undefined, 'd', 'e'),
            linearHistoryIndex: 3,
            linearHistory: [
                { startIndex: 0, requestId: r1, stops: [makeStop(r1, 'a', 'b')] },
                { startIndex: 1, requestId: r2, stops: [makeStop(r2, 'c', 'd'), makeStop(r2, 'd', 'd')] },
            ]
        };
    }
    test('state is empty initially', async () => {
        const s = await storage.restoreState();
        assert.strictEqual(s, undefined);
    });
    test('round trips state', async () => {
        const original = generateState();
        await storage.storeState(original);
        const changer = (x) => {
            return URI.isUri(x) ? x.toString() : x instanceof Map ? cloneAndChange([...x.values()], changer) : undefined;
        };
        const restored = await storage.restoreState();
        assert.deepStrictEqual(cloneAndChange(restored, changer), cloneAndChange(original, changer));
    });
    test('clears state', async () => {
        await storage.storeState(generateState());
        await storage.clearState();
        const s = await storage.restoreState();
        assert.strictEqual(s, undefined);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXNzaW9uU3RvcmFnZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvYnJvd3Nlci9jaGF0RWRpdGluZ1Nlc3Npb25TdG9yYWdlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNoSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDM0YsT0FBTyxFQUFFLHlCQUF5QixFQUErQyxNQUFNLHdEQUF3RCxDQUFDO0FBQ2hKLE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBR2hJLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7SUFDdkMsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUNyRCxNQUFNLFNBQVMsR0FBRyxZQUFZLEVBQUUsQ0FBQztJQUNqQyxJQUFJ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