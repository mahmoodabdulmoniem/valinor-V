/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { NotificationsModel, NotificationViewItem } from '../../common/notifications.js';
import { Action } from '../../../base/common/actions.js';
import { Severity, NotificationsFilter, NotificationPriority } from '../../../platform/notification/common/notification.js';
import { createErrorWithActions } from '../../../base/common/errorMessage.js';
import { timeout } from '../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
suite('Notifications', () => {
    const disposables = new DisposableStore();
    const noFilter = { global: NotificationsFilter.OFF, sources: new Map() };
    teardown(() => {
        disposables.clear();
    });
    test('Items', () => {
        // Invalid
        assert.ok(!NotificationViewItem.create({ severity: Severity.Error, message: '' }, noFilter));
        assert.ok(!NotificationViewItem.create({ severity: Severity.Error, message: null }, noFilter));
        // Duplicates
        const item1 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, noFilter);
        const item2 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, noFilter);
        const item3 = NotificationViewItem.create({ severity: Severity.Info, message: 'Info Message' }, noFilter);
        const item4 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message', source: 'Source' }, noFilter);
        const item5 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message', actions: { primary: [disposables.add(new Action('id', 'label'))] } }, noFilter);
        const item6 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message', actions: { primary: [disposables.add(new Action('id', 'label'))] }, progress: { infinite: true } }, noFilter);
        assert.strictEqual(item1.equals(item1), true);
        assert.strictEqual(item2.equals(item2), true);
        assert.strictEqual(item3.equals(item3), true);
        assert.strictEqual(item4.equals(item4), true);
        assert.strictEqual(item5.equals(item5), true);
        assert.strictEqual(item1.equals(item2), true);
        assert.strictEqual(item1.equals(item3), false);
        assert.strictEqual(item1.equals(item4), false);
        assert.strictEqual(item1.equals(item5), false);
        const itemId1 = NotificationViewItem.create({ id: 'same', message: 'Info Message', severity: Severity.Info }, noFilter);
        const itemId2 = NotificationViewItem.create({ id: 'same', message: 'Error Message', severity: Severity.Error }, noFilter);
        assert.strictEqual(itemId1.equals(itemId2), true);
        assert.strictEqual(itemId1.equals(item3), false);
        // Progress
        assert.strictEqual(item1.hasProgress, false);
        assert.strictEqual(item6.hasProgress, true);
        // Message Box
        assert.strictEqual(item5.canCollapse, false);
        assert.strictEqual(item5.expanded, true);
        // Events
        let called = 0;
        disposables.add(item1.onDidChangeExpansion(() => {
            called++;
        }));
        item1.expand();
        item1.expand();
        item1.collapse();
        item1.collapse();
        assert.strictEqual(called, 2);
        called = 0;
        disposables.add(item1.onDidChangeContent(e => {
            if (e.kind === 3 /* NotificationViewItemContentChangeKind.PROGRESS */) {
                called++;
            }
        }));
        item1.progress.infinite();
        item1.progress.done();
        assert.strictEqual(called, 2);
        called = 0;
        disposables.add(item1.onDidChangeContent(e => {
            if (e.kind === 1 /* NotificationViewItemContentChangeKind.MESSAGE */) {
                called++;
            }
        }));
        item1.updateMessage('message update');
        called = 0;
        disposables.add(item1.onDidChangeContent(e => {
            if (e.kind === 0 /* NotificationViewItemContentChangeKind.SEVERITY */) {
                called++;
            }
        }));
        item1.updateSeverity(Severity.Error);
        called = 0;
        disposables.add(item1.onDidChangeContent(e => {
            if (e.kind === 2 /* NotificationViewItemContentChangeKind.ACTIONS */) {
                called++;
            }
        }));
        item1.updateActions({ primary: [disposables.add(new Action('id2', 'label'))] });
        assert.strictEqual(called, 1);
        called = 0;
        disposables.add(item1.onDidChangeVisibility(e => {
            called++;
        }));
        item1.updateVisibility(true);
        item1.updateVisibility(false);
        item1.updateVisibility(false);
        assert.strictEqual(called, 2);
        called = 0;
        disposables.add(item1.onDidClose(() => {
            called++;
        }));
        item1.close();
        assert.strictEqual(called, 1);
        // Error with Action
        const item7 = NotificationViewItem.create({ severity: Severity.Error, message: createErrorWithActions('Hello Error', [disposables.add(new Action('id', 'label'))]) }, noFilter);
        assert.strictEqual(item7.actions.primary.length, 1);
        // Filter
        const item8 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, { global: NotificationsFilter.OFF, sources: new Map() });
        assert.strictEqual(item8.priority, NotificationPriority.DEFAULT);
        const item9 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, { global: NotificationsFilter.ERROR, sources: new Map() });
        assert.strictEqual(item9.priority, NotificationPriority.DEFAULT);
        const item10 = NotificationViewItem.create({ severity: Severity.Warning, message: 'Error Message' }, { global: NotificationsFilter.ERROR, sources: new Map() });
        assert.strictEqual(item10.priority, NotificationPriority.SILENT);
        const sources = new Map();
        sources.set('test.source', NotificationsFilter.ERROR);
        const item11 = NotificationViewItem.create({ severity: Severity.Warning, message: 'Error Message', source: 'test.source' }, { global: NotificationsFilter.OFF, sources });
        assert.strictEqual(item11.priority, NotificationPriority.DEFAULT);
        const item12 = NotificationViewItem.create({ severity: Severity.Warning, message: 'Error Message', source: { id: 'test.source', label: 'foo' } }, { global: NotificationsFilter.OFF, sources });
        assert.strictEqual(item12.priority, NotificationPriority.SILENT);
        const item13 = NotificationViewItem.create({ severity: Severity.Warning, message: 'Error Message', source: { id: 'test.source2', label: 'foo' } }, { global: NotificationsFilter.OFF, sources });
        assert.strictEqual(item13.priority, NotificationPriority.DEFAULT);
        for (const item of [item1, item2, item3, item4, item5, item6, itemId1, itemId2, item7, item8, item9, item10, item11, item12, item13]) {
            item.close();
        }
    });
    test('Items - does not fire changed when message did not change (content, severity)', async () => {
        const item1 = NotificationViewItem.create({ severity: Severity.Error, message: 'Error Message' }, noFilter);
        let fired = false;
        disposables.add(item1.onDidChangeContent(() => {
            fired = true;
        }));
        item1.updateMessage('Error Message');
        await timeout(0);
        assert.ok(!fired, 'Expected onDidChangeContent to not be fired');
        item1.updateSeverity(Severity.Error);
        await timeout(0);
        assert.ok(!fired, 'Expected onDidChangeContent to not be fired');
        for (const item of [item1]) {
            item.close();
        }
    });
    test('Model', () => {
        const model = disposables.add(new NotificationsModel());
        let lastNotificationEvent;
        disposables.add(model.onDidChangeNotification(e => {
            lastNotificationEvent = e;
        }));
        let lastStatusMessageEvent;
        disposables.add(model.onDidChangeStatusMessage(e => {
            lastStatusMessageEvent = e;
        }));
        const item1 = { severity: Severity.Error, message: 'Error Message', actions: { primary: [disposables.add(new Action('id', 'label'))] } };
        const item2 = { severity: Severity.Warning, message: 'Warning Message', source: 'Some Source' };
        const item2Duplicate = { severity: Severity.Warning, message: 'Warning Message', source: 'Some Source' };
        const item3 = { severity: Severity.Info, message: 'Info Message' };
        const item1Handle = model.addNotification(item1);
        assert.strictEqual(lastNotificationEvent.item.severity, item1.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item1.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        item1Handle.updateMessage('Different Error Message');
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 1 /* NotificationViewItemContentChangeKind.MESSAGE */);
        item1Handle.updateSeverity(Severity.Warning);
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 0 /* NotificationViewItemContentChangeKind.SEVERITY */);
        item1Handle.updateActions({ primary: [], secondary: [] });
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 2 /* NotificationViewItemContentChangeKind.ACTIONS */);
        item1Handle.progress.infinite();
        assert.strictEqual(lastNotificationEvent.kind, 1 /* NotificationChangeType.CHANGE */);
        assert.strictEqual(lastNotificationEvent.detail, 3 /* NotificationViewItemContentChangeKind.PROGRESS */);
        const item2Handle = model.addNotification(item2);
        assert.strictEqual(lastNotificationEvent.item.severity, item2.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item2.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        const item3Handle = model.addNotification(item3);
        assert.strictEqual(lastNotificationEvent.item.severity, item3.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item3.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        assert.strictEqual(model.notifications.length, 3);
        let called = 0;
        disposables.add(item1Handle.onDidClose(() => {
            called++;
        }));
        item1Handle.close();
        assert.strictEqual(called, 1);
        assert.strictEqual(model.notifications.length, 2);
        assert.strictEqual(lastNotificationEvent.item.severity, Severity.Warning);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), 'Different Error Message');
        assert.strictEqual(lastNotificationEvent.index, 2);
        assert.strictEqual(lastNotificationEvent.kind, 3 /* NotificationChangeType.REMOVE */);
        const item2DuplicateHandle = model.addNotification(item2Duplicate);
        assert.strictEqual(model.notifications.length, 2);
        assert.strictEqual(lastNotificationEvent.item.severity, item2Duplicate.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item2Duplicate.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 0 /* NotificationChangeType.ADD */);
        item2Handle.close();
        assert.strictEqual(model.notifications.length, 1);
        assert.strictEqual(lastNotificationEvent.item.severity, item2Duplicate.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item2Duplicate.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 3 /* NotificationChangeType.REMOVE */);
        model.notifications[0].expand();
        assert.strictEqual(lastNotificationEvent.item.severity, item3.severity);
        assert.strictEqual(lastNotificationEvent.item.message.linkedText.toString(), item3.message);
        assert.strictEqual(lastNotificationEvent.index, 0);
        assert.strictEqual(lastNotificationEvent.kind, 2 /* NotificationChangeType.EXPAND_COLLAPSE */);
        const disposable = model.showStatusMessage('Hello World');
        assert.strictEqual(model.statusMessage.message, 'Hello World');
        assert.strictEqual(lastStatusMessageEvent.item.message, model.statusMessage.message);
        assert.strictEqual(lastStatusMessageEvent.kind, 0 /* StatusMessageChangeType.ADD */);
        disposable.close();
        assert.ok(!model.statusMessage);
        assert.strictEqual(lastStatusMessageEvent.kind, 1 /* StatusMessageChangeType.REMOVE */);
        const disposable2 = model.showStatusMessage('Hello World 2');
        const disposable3 = model.showStatusMessage('Hello World 3');
        assert.strictEqual(model.statusMessage.message, 'Hello World 3');
        disposable2.close();
        assert.strictEqual(model.statusMessage.message, 'Hello World 3');
        disposable3.close();
        assert.ok(!model.statusMessage);
        item2DuplicateHandle.close();
        item3Handle.close();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9jb21tb24vbm90aWZpY2F0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLEVBQXFLLE1BQU0sK0JBQStCLENBQUM7QUFDNVAsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pELE9BQU8sRUFBaUIsUUFBUSxFQUFFLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDM0ksT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVwRSxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtJQUUzQixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLE1BQU0sUUFBUSxHQUF5QixFQUFFLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQztJQUUvRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFFbEIsVUFBVTtRQUNWLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUM3RixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUssRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFaEcsYUFBYTtRQUNiLE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsRUFBRSxRQUFRLENBQUUsQ0FBQztRQUM3RyxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLEVBQUUsUUFBUSxDQUFFLENBQUM7UUFDN0csTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxFQUFFLFFBQVEsQ0FBRSxDQUFDO1FBQzNHLE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxFQUFFLFFBQVEsQ0FBRSxDQUFDO1FBQy9ILE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUUsQ0FBQztRQUNqTCxNQUFNLEtBQUssR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBRSxDQUFDO1FBRS9NLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFD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