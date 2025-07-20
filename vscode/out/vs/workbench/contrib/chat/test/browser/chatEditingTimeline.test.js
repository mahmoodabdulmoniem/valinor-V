/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { ChatEditingTimeline } from '../../browser/chatEditing/chatEditingTimeline.js';
import { transaction } from '../../../../../base/common/observable.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { URI } from '../../../../../base/common/uri.js';
suite('ChatEditingTimeline', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let timeline;
    setup(() => {
        const instaService = workbenchInstantiationService(undefined, ds);
        timeline = instaService.createInstance(ChatEditingTimeline);
    });
    suite('undo/redo', () => {
        test('undo/redo with empty history', () => {
            assert.strictEqual(timeline.getUndoSnapshot(), undefined);
            assert.strictEqual(timeline.getRedoSnapshot(), undefined);
            assert.strictEqual(timeline.canRedo.get(), false);
            assert.strictEqual(timeline.canUndo.get(), false);
        });
    });
    function createSnapshot(stopId, requestId = 'req1') {
        return {
            stopId,
            entries: stopId === undefined ? new ResourceMap() : new ResourceMap([[
                    URI.file(`file:///path/to/${stopId}`),
                    { requestId, current: `Content for ${stopId}` }
                ]]),
        };
    }
    suite('Basic functionality', () => {
        test('pushSnapshot and undo/redo navigation', () => {
            // Push two snapshots
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            // After two pushes, canUndo should be true, canRedo false
            assert.strictEqual(timeline.canUndo.get(), true);
            assert.strictEqual(timeline.canRedo.get(), false);
            // Undo should move back to stop1
            const undoSnap = timeline.getUndoSnapshot();
            assert.ok(undoSnap);
            assert.strictEqual(undoSnap.stop.stopId, 'stop1');
            undoSnap.apply();
            assert.strictEqual(timeline.canUndo.get(), false);
            assert.strictEqual(timeline.canRedo.get(), true);
            // Redo should move forward to stop2
            const redoSnap = timeline.getRedoSnapshot();
            assert.ok(redoSnap);
            assert.strictEqual(redoSnap.stop.stopId, 'stop2');
            redoSnap.apply();
            assert.strictEqual(timeline.canUndo.get(), true);
            assert.strictEqual(timeline.canRedo.get(), false);
        });
        test('restoreFromState restores history and index', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            const state = timeline.getStateForPersistence();
            // Move back
            timeline.getUndoSnapshot()?.apply();
            // Restore state
            transaction(tx => timeline.restoreFromState(state, tx));
            assert.strictEqual(timeline.canUndo.get(), true);
            assert.strictEqual(timeline.canRedo.get(), false);
        });
        test('getSnapshotForRestore returns correct snapshot', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            const snap = timeline.getSnapshotForRestore('req1', 'stop1');
            assert.ok(snap);
            assert.strictEqual(snap.stop.stopId, 'stop1');
            snap.apply();
            assert.strictEqual(timeline.canRedo.get(), true);
            assert.strictEqual(timeline.canUndo.get(), false);
            const snap2 = timeline.getSnapshotForRestore('req1', 'stop2');
            assert.ok(snap2);
            assert.strictEqual(snap2.stop.stopId, 'stop2');
            snap2.apply();
            assert.strictEqual(timeline.canRedo.get(), false);
            assert.strictEqual(timeline.canUndo.get(), true);
        });
        test('getRequestDisablement returns correct requests', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req2', 'stop2', createSnapshot('stop2', 'req2'));
            // Move back to first
            timeline.getUndoSnapshot()?.apply();
            const disables = timeline.requestDisablement.get();
            assert.ok(Array.isArray(disables));
            assert.ok(disables.some(d => d.requestId === 'req2'));
        });
    });
    suite('Multiple requests', () => {
        test('handles multiple requests with separate snapshots', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req2', 'stop2', createSnapshot('stop2', 'req2'));
            timeline.pushSnapshot('req3', 'stop3', createSnapshot('stop3'));
            assert.strictEqual(timeline.canUndo.get(), true);
            assert.strictEqual(timeline.canRedo.get(), false);
            // Undo should go back through requests
            let undoSnap = timeline.getUndoSnapshot();
            assert.ok(undoSnap);
            assert.strictEqual(undoSnap.stop.stopId, 'stop2');
            undoSnap.apply();
            undoSnap = timeline.getUndoSnapshot();
            assert.ok(undoSnap);
            assert.strictEqual(undoSnap.stop.stopId, 'stop1');
        });
        test('handles same request with multiple stops', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            timeline.pushSnapshot('req1', 'stop3', createSnapshot('stop3'));
            const state = timeline.getStateForPersistence();
            assert.strictEqual(state.history.length, 1);
            assert.strictEqual(state.history[0].stops.length, 3);
            assert.strictEqual(state.history[0].requestId, 'req1');
        });
        test('mixed requests and stops', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            timeline.pushSnapshot('req2', 'stop3', createSnapshot('stop3', 'req2'));
            timeline.pushSnapshot('req2', 'stop4', createSnapshot('stop4', 'req2'));
            const state = timeline.getStateForPersistence();
            assert.strictEqual(state.history.length, 2);
            assert.strictEqual(state.history[0].stops.length, 2);
            assert.strictEqual(state.history[1].stops.length, 2);
        });
    });
    suite('Edge cases', () => {
        test('getSnapshotForRestore with non-existent request', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            const snap = timeline.getSnapshotForRestore('nonexistent', 'stop1');
            assert.strictEqual(snap, undefined);
        });
        test('getSnapshotForRestore with non-existent stop', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            const snap = timeline.getSnapshotForRestore('req1', 'nonexistent');
            assert.strictEqual(snap, undefined);
        });
    });
    suite('History manipulation', () => {
        test('pushing snapshots after undo truncates future history', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            timeline.pushSnapshot('req1', 'stop3', createSnapshot('stop3'));
            // Undo twice
            timeline.getUndoSnapshot()?.apply();
            timeline.getUndoSnapshot()?.apply();
            // Push new snapshot - should truncate stop3
            timeline.pushSnapshot('req1', 'new_stop', createSnapshot('new_stop'));
            const state = timeline.getStateForPersistence();
            assert.strictEqual(state.history[0].stops.length, 2); // stop1 + new_stop
            assert.strictEqual(state.history[0].stops[1].stopId, 'new_stop');
        });
        test('branching from middle of history creates new branch', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req2', 'stop2', createSnapshot('stop2', 'req2'));
            timeline.pushSnapshot('req3', 'stop3', createSnapshot('stop3'));
            // Undo to middle
            timeline.getUndoSnapshot()?.apply();
            // Push new request
            timeline.pushSnapshot('req4', 'stop4', createSnapshot('stop4'));
            const state = timeline.getStateForPersistence();
            assert.strictEqual(state.history.length, 3); // req1, req2, req4
            assert.strictEqual(state.history[2].requestId, 'req4');
        });
    });
    suite('State persistence', () => {
        test('getStateForPersistence returns complete state', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req2', 'stop2', createSnapshot('stop2', 'req2'));
            const state = timeline.getStateForPersistence();
            assert.ok(state.history);
            assert.ok(typeof state.index === 'number');
            assert.strictEqual(state.history.length, 2);
            assert.strictEqual(state.index, 2);
        });
        test('restoreFromState handles empty history', () => {
            const emptyState = { history: [], index: 0 };
            transaction(tx => timeline.restoreFromState(emptyState, tx));
            assert.strictEqual(timeline.canUndo.get(), false);
            assert.strictEqual(timeline.canRedo.get(), false);
        });
        test('restoreFromState with complex history', () => {
            // Create complex state
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            timeline.pushSnapshot('req2', 'stop3', createSnapshot('stop3', 'req2'));
            const originalState = timeline.getStateForPersistence();
            // Create new timeline and restore
            const instaService = workbenchInstantiationService(undefined, ds);
            const newTimeline = instaService.createInstance(ChatEditingTimeline);
            transaction(tx => newTimeline.restoreFromState(originalState, tx));
            const restoredState = newTimeline.getStateForPersistence();
            assert.deepStrictEqual(restoredState.index, originalState.index);
            assert.strictEqual(restoredState.history.length, originalState.history.length);
        });
    });
    suite('Request disablement', () => {
        test('getRequestDisablement at various positions', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req2', 'stop2', createSnapshot('stop2', 'req2'));
            timeline.pushSnapshot('req3', 'stop3', createSnapshot('stop3'));
            // At end - no disabled requests
            let disables = timeline.requestDisablement.get();
            assert.strictEqual(disables.length, 0);
            // Move back one
            timeline.getUndoSnapshot()?.apply();
            disables = timeline.requestDisablement.get();
            assert.strictEqual(disables.length, 1);
            assert.strictEqual(disables[0].requestId, 'req3');
            // Move back to beginning
            timeline.getUndoSnapshot()?.apply();
            timeline.getUndoSnapshot()?.apply();
            disables = timeline.requestDisablement.get();
            assert.strictEqual(disables.length, 2);
        });
        test('getRequestDisablement with mixed request/stop structure', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            timeline.pushSnapshot('req2', 'stop3', createSnapshot('stop3', 'req2'));
            // Move to middle of req1
            timeline.getUndoSnapshot()?.apply();
            timeline.getUndoSnapshot()?.apply();
            const disables = timeline.requestDisablement.get();
            assert.strictEqual(disables.length, 2);
            // Should have partial disable for req1 and full disable for req2
            const req1Disable = disables.find(d => d.requestId === 'req1');
            const req2Disable = disables.find(d => d.requestId === 'req2');
            assert.ok(req1Disable);
            assert.ok(req2Disable);
            assert.ok(req1Disable.afterUndoStop);
            assert.strictEqual(req2Disable.afterUndoStop, undefined);
        });
    });
    suite('Boundary conditions', () => {
        test('undo/redo at boundaries', () => {
            // Empty timeline
            assert.strictEqual(timeline.getUndoSnapshot(), undefined);
            assert.strictEqual(timeline.getRedoSnapshot(), undefined);
            // Single snapshot
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            assert.ok(timeline.getUndoSnapshot());
            assert.strictEqual(timeline.getRedoSnapshot(), undefined);
            // At beginning after undo
            timeline.getUndoSnapshot()?.apply();
            assert.strictEqual(timeline.getUndoSnapshot(), undefined);
            assert.ok(timeline.getRedoSnapshot());
        });
        test('multiple undos and redos', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req2', 'stop2', createSnapshot('stop2', 'req2'));
            timeline.pushSnapshot('req3', 'stop3', createSnapshot('stop3'));
            // Undo all
            const stops = [];
            let undoSnap = timeline.getUndoSnapshot();
            while (undoSnap) {
                stops.push(undoSnap.stop.stopId);
                undoSnap.apply();
                undoSnap = timeline.getUndoSnapshot();
            }
            assert.deepStrictEqual(stops, ['stop2', 'stop1']);
            // Redo all
            const redoStops = [];
            let redoSnap = timeline.getRedoSnapshot();
            while (redoSnap) {
                redoStops.push(redoSnap.stop.stopId);
                redoSnap.apply();
                redoSnap = timeline.getRedoSnapshot();
            }
            assert.deepStrictEqual(redoStops, ['stop2', 'stop3']);
        });
        test('getRequestDisablement with root request ID', () => {
            timeline.pushSnapshot('req1', undefined, createSnapshot(undefined));
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            timeline.pushSnapshot('req2', undefined, createSnapshot(undefined, 'req2'));
            timeline.pushSnapshot('req2', 'stop1-2', createSnapshot('stop1-2', 'req2'));
            timeline.pushSnapshot('req2', 'stop2-2', createSnapshot('stop2-2', 'req2'));
            const expected = [
                [{ requestId: 'req2', afterUndoStop: 'stop1-2' }],
                [{ requestId: 'req2' }],
                // stop2 is not in this because we're at stop2 when undoing req2
                [{ requestId: 'req1', afterUndoStop: 'stop1' }, { requestId: 'req2' }],
                [{ requestId: 'req1', afterUndoStop: undefined }, { requestId: 'req2' }],
            ];
            let ei = 0;
            while (timeline.canUndo.get()) {
                timeline.getUndoSnapshot().apply();
                const actual = timeline.requestDisablement.get();
                assert.deepStrictEqual(actual, expected[ei++]);
            }
            expected.unshift([]);
            while (timeline.canRedo.get()) {
                timeline.getRedoSnapshot().apply();
                const actual = timeline.requestDisablement.get();
                assert.deepStrictEqual(actual, expected[--ei]);
            }
        });
    });
    suite('Static methods', () => {
        test('createEmptySnapshot creates valid snapshot', () => {
            const snapshot = ChatEditingTimeline.createEmptySnapshot('test-stop');
            assert.strictEqual(snapshot.stopId, 'test-stop');
            assert.ok(snapshot.entries);
            assert.strictEqual(snapshot.entries.size, 0);
        });
        test('createEmptySnapshot with undefined stopId', () => {
            const snapshot = ChatEditingTimeline.createEmptySnapshot(undefined);
            assert.strictEqual(snapshot.stopId, undefined);
            assert.ok(snapshot.entries);
        });
        test('POST_EDIT_STOP_ID is consistent', () => {
            assert.strictEqual(typeof ChatEditingTimeline.POST_EDIT_STOP_ID, 'string');
            assert.ok(ChatEditingTimeline.POST_EDIT_STOP_ID.length > 0);
        });
    });
    suite('Observable behavior', () => {
        test('canUndo observable updates correctly', () => {
            assert.strictEqual(timeline.canUndo.get(), false);
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            assert.strictEqual(timeline.canUndo.get(), true);
            timeline.getUndoSnapshot()?.apply();
            assert.strictEqual(timeline.canUndo.get(), false);
        });
        test('canRedo observable updates correctly', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            assert.strictEqual(timeline.canRedo.get(), false);
            timeline.getUndoSnapshot()?.apply();
            assert.strictEqual(timeline.canRedo.get(), true);
            timeline.getRedoSnapshot()?.apply();
            assert.strictEqual(timeline.canRedo.get(), false);
        });
    });
    suite('Complex scenarios', () => {
        test('interleaved requests and undos', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req2', 'stop2', createSnapshot('stop2', 'req2'));
            // Undo req2
            timeline.getUndoSnapshot()?.apply();
            // Add req3 (should branch from req1)
            timeline.pushSnapshot('req3', 'stop3', createSnapshot('stop3'));
            const state = timeline.getStateForPersistence();
            assert.strictEqual(state.history.length, 2); // req1, req3
            assert.strictEqual(state.history[1].requestId, 'req3');
        });
        test('large number of snapshots', () => {
            // Push 100 snapshots
            for (let i = 1; i <= 100; i++) {
                timeline.pushSnapshot(`req${i}`, `stop${i}`, createSnapshot(`stop${i}`));
            }
            assert.strictEqual(timeline.canUndo.get(), true);
            assert.strictEqual(timeline.canRedo.get(), false);
            const state = timeline.getStateForPersistence();
            assert.strictEqual(state.history.length, 100);
            assert.strictEqual(state.index, 100);
        });
        test('alternating single and multi-stop requests', () => {
            // Single stop request
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            // Multi-stop request
            timeline.pushSnapshot('req2', 'stop2a', createSnapshot('stop2a', 'req2'));
            timeline.pushSnapshot('req2', 'stop2b', createSnapshot('stop2b', 'req2'));
            timeline.pushSnapshot('req2', 'stop2c', createSnapshot('stop2c', 'req2'));
            // Single stop request
            timeline.pushSnapshot('req3', 'stop3', createSnapshot('stop3'));
            const state = timeline.getStateForPersistence();
            assert.strictEqual(state.history.length, 3);
            assert.strictEqual(state.history[0].stops.length, 1);
            assert.strictEqual(state.history[1].stops.length, 3);
            assert.strictEqual(state.history[2].stops.length, 1);
        });
    });
    suite('Error resilience', () => {
        test('handles invalid apply calls gracefully', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            timeline.pushSnapshot('req1', 'stop2', createSnapshot('stop2'));
            const undoSnap = timeline.getUndoSnapshot();
            assert.ok(undoSnap);
            // Apply twice - second should be safe
            undoSnap.apply();
            undoSnap.apply(); // Should not throw
            assert.strictEqual(timeline.canUndo.get(), false);
        });
        test('getSnapshotForRestore with malformed stopId', () => {
            timeline.pushSnapshot('req1', 'stop1', createSnapshot('stop1'));
            const snap = timeline.getSnapshotForRestore('req1', '');
            assert.strictEqual(snap, undefined);
        });
        test('handles restoration edge cases', () => {
            const emptyState = { history: [], index: 0 };
            transaction(tx => timeline.restoreFromState(emptyState, tx));
            // Should be safe to call methods on empty timeline
            assert.strictEqual(timeline.getUndoSnapshot(), undefined);
            assert.strictEqual(timeline.getRedoSnapshot(), undefined);
            assert.deepStrictEqual(timeline.requestDisablement.get(), []);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdUaW1lbGluZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvYnJvd3Nlci9jaGF0RWRpdGluZ1RpbWVsaW5lLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFdkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHeEQsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNqQyxNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBQ3JELElBQUksUUFBNkIsQ0FBQztJQUVsQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxZQUFZLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLFFBQVEsR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDN0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN2QixJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1lBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMs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