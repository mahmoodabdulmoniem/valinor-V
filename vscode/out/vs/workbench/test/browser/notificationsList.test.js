/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { NotificationAccessibilityProvider } from '../../browser/parts/notifications/notificationsList.js';
import { NotificationViewItem } from '../../common/notifications.js';
import { Severity, NotificationsFilter } from '../../../platform/notification/common/notification.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { MockKeybindingService } from '../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
suite('NotificationsList AccessibilityProvider', () => {
    const noFilter = { global: NotificationsFilter.OFF, sources: new Map() };
    let configurationService;
    let keybindingService;
    let accessibilityProvider;
    const createdNotifications = [];
    setup(() => {
        configurationService = new TestConfigurationService();
        keybindingService = new MockKeybindingService();
        accessibilityProvider = new NotificationAccessibilityProvider({}, keybindingService, configurationService);
    });
    teardown(() => {
        // Close all created notifications to prevent disposable leaks
        for (const notification of createdNotifications) {
            notification.close();
        }
        createdNotifications.length = 0;
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('getAriaLabel includes severity prefix for Error notifications', () => {
        const notification = NotificationViewItem.create({ severity: Severity.Error, message: 'Something went wrong' }, noFilter);
        createdNotifications.push(notification);
        const ariaLabel = accessibilityProvider.getAriaLabel(notification);
        assert.ok(ariaLabel.startsWith('Error: '), `Expected aria label to start with "Error: ", but got: ${ariaLabel}`);
        assert.ok(ariaLabel.includes('Something went wrong'), 'Expected aria label to include original message');
        assert.ok(ariaLabel.includes('notification'), 'Expected aria label to include "notification"');
    });
    test('getAriaLabel includes severity prefix for Warning notifications', () => {
        const notification = NotificationViewItem.create({ severity: Severity.Warning, message: 'This is a warning' }, noFilter);
        createdNotifications.push(notification);
        const ariaLabel = accessibilityProvider.getAriaLabel(notification);
        assert.ok(ariaLabel.startsWith('Warning: '), `Expected aria label to start with "Warning: ", but got: ${ariaLabel}`);
        assert.ok(ariaLabel.includes('This is a warning'), 'Expected aria label to include original message');
        assert.ok(ariaLabel.includes('notification'), 'Expected aria label to include "notification"');
    });
    test('getAriaLabel includes severity prefix for Info notifications', () => {
        const notification = NotificationViewItem.create({ severity: Severity.Info, message: 'Information message' }, noFilter);
        createdNotifications.push(notification);
        const ariaLabel = accessibilityProvider.getAriaLabel(notification);
        assert.ok(ariaLabel.startsWith('Info: '), `Expected aria label to start with "Info: ", but got: ${ariaLabel}`);
        assert.ok(ariaLabel.includes('Information message'), 'Expected aria label to include original message');
        assert.ok(ariaLabel.includes('notification'), 'Expected aria label to include "notification"');
    });
    test('getAriaLabel includes source when present', () => {
        const notification = NotificationViewItem.create({
            severity: Severity.Error,
            message: 'Error with source',
            source: 'TestExtension'
        }, noFilter);
        createdNotifications.push(notification);
        const ariaLabel = accessibilityProvider.getAriaLabel(notification);
        assert.ok(ariaLabel.startsWith('Error: '), 'Expected aria label to start with severity prefix');
        assert.ok(ariaLabel.includes('Error with source'), 'Expected aria label to include original message');
        assert.ok(ariaLabel.includes('source: TestExtension'), 'Expected aria label to include source information');
        assert.ok(ariaLabel.includes('notification'), 'Expected aria label to include "notification"');
    });
    test('severity prefix consistency', () => {
        // Test that the severity prefixes are consistent with the ARIA alerts
        const errorNotification = NotificationViewItem.create({ severity: Severity.Error, message: 'Error message' }, noFilter);
        const warningNotification = NotificationViewItem.create({ severity: Severity.Warning, message: 'Warning message' }, noFilter);
        const infoNotification = NotificationViewItem.create({ severity: Severity.Info, message: 'Info message' }, noFilter);
        createdNotifications.push(errorNotification, warningNotification, infoNotification);
        const errorLabel = accessibilityProvider.getAriaLabel(errorNotification);
        const warningLabel = accessibilityProvider.getAriaLabel(warningNotification);
        const infoLabel = accessibilityProvider.getAriaLabel(infoNotification);
        // Check that each severity type gets the correct prefix
        assert.ok(errorLabel.includes('Error: Error message'), 'Error notifications should have Error prefix');
        assert.ok(warningLabel.includes('Warning: Warning message'), 'Warning notifications should have Warning prefix');
        assert.ok(infoLabel.includes('Info: Info message'), 'Info notifications should have Info prefix');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uc0xpc3QudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9ub3RpZmljYXRpb25zTGlzdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMzRyxPQUFPLEVBQUUsb0JBQW9CLEVBQStDLE1BQU0sK0JBQStCLENBQUM7QUFDbEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBR3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ25ILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQzFHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdGLEtBQUssQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7SUFFckQsTUFBTSxRQUFRLEdBQXlCLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBRSxDQUFDO0lBQy9GLElBQUksb0JBQTJDLENBQUM7SUFDaEQsSUFBSSxpQkFBcUMsQ0FBQztJQUMxQyxJQUFJLHFCQUF3RCxDQUFDO0lBQzdELE1BQU0sb0JBQW9CLEdBQTRCLEVBQUUsQ0FBQztJQUV6RCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO1FBQ3RELGlCQUFpQixHQUFHLElBQUkscUJBQXFCLEVBQUUsQ0FBQztRQUNoRCxxQkFBcUIsR0FBRyxJ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