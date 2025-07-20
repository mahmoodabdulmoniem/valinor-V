/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../nls.js';
import { Event } from '../../../base/common/event.js';
import BaseSeverity from '../../../base/common/severity.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var Severity = BaseSeverity;
export const INotificationService = createDecorator('notificationService');
export var NotificationPriority;
(function (NotificationPriority) {
    /**
     * Default priority: notification will be visible unless do not disturb mode is enabled.
     */
    NotificationPriority[NotificationPriority["DEFAULT"] = 0] = "DEFAULT";
    /**
     * Optional priority: notification might only be visible from the notifications center.
     */
    NotificationPriority[NotificationPriority["OPTIONAL"] = 1] = "OPTIONAL";
    /**
     * Silent priority: notification will only be visible from the notifications center.
     */
    NotificationPriority[NotificationPriority["SILENT"] = 2] = "SILENT";
    /**
     * Urgent priority: notification will be visible even when do not disturb mode is enabled.
     */
    NotificationPriority[NotificationPriority["URGENT"] = 3] = "URGENT";
})(NotificationPriority || (NotificationPriority = {}));
export var NeverShowAgainScope;
(function (NeverShowAgainScope) {
    /**
     * Will never show this notification on the current workspace again.
     */
    NeverShowAgainScope[NeverShowAgainScope["WORKSPACE"] = 0] = "WORKSPACE";
    /**
     * Will never show this notification on any workspace of the same
     * profile again.
     */
    NeverShowAgainScope[NeverShowAgainScope["PROFILE"] = 1] = "PROFILE";
    /**
     * Will never show this notification on any workspace across all
     * profiles again.
     */
    NeverShowAgainScope[NeverShowAgainScope["APPLICATION"] = 2] = "APPLICATION";
})(NeverShowAgainScope || (NeverShowAgainScope = {}));
export function isNotificationSource(thing) {
    if (thing) {
        const candidate = thing;
        return typeof candidate.id === 'string' && typeof candidate.label === 'string';
    }
    return false;
}
export var NotificationsFilter;
(function (NotificationsFilter) {
    /**
     * No filter is enabled.
     */
    NotificationsFilter[NotificationsFilter["OFF"] = 0] = "OFF";
    /**
     * All notifications are silent except error notifications.
    */
    NotificationsFilter[NotificationsFilter["ERROR"] = 1] = "ERROR";
})(NotificationsFilter || (NotificationsFilter = {}));
export class NoOpNotification {
    constructor() {
        this.progress = new NoOpProgress();
        this.onDidClose = Event.None;
        this.onDidChangeVisibility = Event.None;
    }
    updateSeverity(severity) { }
    updateMessage(message) { }
    updateActions(actions) { }
    close() { }
}
export class NoOpProgress {
    infinite() { }
    done() { }
    total(value) { }
    worked(value) { }
}
export function withSeverityPrefix(label, severity) {
    // Add severity prefix to match WCAG 4.1.3 Status
    // Messages requirements.
    if (severity === Severity.Error) {
        return localize('severityPrefix.error', "Error: {0}", label);
    }
    if (severity === Severity.Warning) {
        return localize('severityPrefix.warning', "Warning: {0}", label);
    }
    return localize('severityPrefix.info', "Info: {0}", label);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9ub3RpZmljYXRpb24vY29tbW9uL25vdGlmaWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFM0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sWUFBWSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU5RSxNQUFNLEtBQVEsUUFBUSxHQUFHLFlBQVksQ0FBQztBQUV0QyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUM7QUFJakcsTUFBTSxDQUFOLElBQVksb0JBcUJYO0FBckJELFdBQVksb0JBQW9CO0lBRS9COztPQUVHO0lBQ0gscUVBQU8sQ0FBQTtJQUVQOztPQUVHO0lBQ0gsdUVBQVEsQ0FBQTtJQUVSOztPQUVHO0lBQ0gsbUVBQU0sQ0FBQTtJQUVOOztPQUVHO0lBQ0gsbUVBQU0sQ0FBQTtBQUNQLENBQUMsRUFyQlcsb0JBQW9CLEtBQXBCLG9CQUFvQixRQXFCL0I7QUF5QkQsTUFBTSxDQUFOLElBQVksbUJBa0JYO0FBbEJELFdBQVksbUJBQW1CO0lBRTlCOztPQUVHO0lBQ0gsdUVBQVMsQ0FBQTtJQUVUOzs7T0FHRztJQUNILG1FQUFPLENBQUE7SUFFUDs7O09BR0c7SUFDSCwyRUFBVyxDQUFBO0FBQ1osQ0FBQyxFQWxCVyxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBa0I5QjtBQW9DRCxNQUFNLFVBQVUsb0JBQW9CLENBQUMsS0FBYztJQUNsRCxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQ1gsTUFBTSxTQUFTLEdBQUcsS0FBNEIsQ0FBQztRQUUvQyxPQUFPLE9BQU8sU0FBUyxDQUFDLEVBQUUsS0FBSyxRQUFRLElBQUksT0FBTyxTQUFTLENBQUMsS0FBSyxLQUFLLFFBQVEsQ0FBQztJQUNoRixDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZCxDQUFDO0FBK05ELE1BQU0sQ0FBTixJQUFZLG1CQVdYO0FBWEQsV0FBWSxtQkFBbUI7SUFFOUI7O09BRUc7SUFDSCwyREFBRyxDQUFBO0lBRUg7O01BRUU7SUFDRiwrREFBSyxDQUFBO0FBQ04sQ0FBQyxFQVhXLG1CQUFtQixLQUFuQixtQkFBbUIsUUFXOUI7QUFnR0QsTUFBTSxPQUFPLGdCQUFnQjtJQUE3QjtRQUVVLGFBQVEsR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBRTlCLGVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3hCLDBCQUFxQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFPN0MsQ0FBQztJQUxBLGNBQWMsQ0FBQyxRQUFrQixJQUFVLENBQUM7SUFDNUMsYUFBYSxDQUFDLE9BQTRCLElBQVUsQ0FBQztJQUNyRCxhQUFhLENBQUMsT0FBOEIsSUFBVSxDQUFDO0lBRXZELEtBQUssS0FBVyxDQUFDO0NBQ2pCO0FBRUQsTUFBTSxPQUFPLFlBQVk7SUFDeEIsUUFBUSxLQUFXLENBQUM7SUFDcEIsSUFBSSxLQUFXLENBQUM7SUFDaEIsS0FBSyxDQUFDLEtBQWEsSUFBVSxDQUFDO0lBQzlCLE1BQU0sQ0FBQyxLQUFhLElBQVUsQ0FBQztDQUMvQjtBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxLQUFhLEVBQUUsUUFBa0I7SUFFbkUsaURBQWlEO0lBQ2pELHlCQUF5QjtJQUV6QixJQUFJLFFBQVEsS0FBSyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakMsT0FBTyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFRCxJQUFJLFFBQVEsS0FBSyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkMsT0FBTyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxPQUFPLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDNUQsQ0FBQyJ9