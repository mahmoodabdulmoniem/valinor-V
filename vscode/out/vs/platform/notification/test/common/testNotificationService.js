/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { NoOpNotification, NotificationsFilter, Severity } from '../../common/notification.js';
export class TestNotificationService {
    constructor() {
        this.onDidChangeFilter = Event.None;
    }
    static { this.NO_OP = new NoOpNotification(); }
    info(message) {
        return this.notify({ severity: Severity.Info, message });
    }
    warn(message) {
        return this.notify({ severity: Severity.Warning, message });
    }
    error(error) {
        return this.notify({ severity: Severity.Error, message: error });
    }
    notify(notification) {
        return TestNotificationService.NO_OP;
    }
    prompt(severity, message, choices, options) {
        return TestNotificationService.NO_OP;
    }
    status(message, options) {
        return {
            close: () => { }
        };
    }
    setFilter() { }
    getFilter(source) {
        return NotificationsFilter.OFF;
    }
    getFilters() {
        return [];
    }
    removeFilter(sourceId) { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE5vdGlmaWNhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL25vdGlmaWNhdGlvbi90ZXN0L2NvbW1vbi90ZXN0Tm90aWZpY2F0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFpTCxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUU5USxNQUFNLE9BQU8sdUJBQXVCO0lBQXBDO1FBRVUsc0JBQWlCLEdBQWdCLEtBQUssQ0FBQyxJQUFJLENBQUM7SUEyQ3RELENBQUM7YUF2Q3dCLFVBQUssR0FBd0IsSUFBSSxnQkFBZ0IsRUFBRSxBQUE5QyxDQUErQztJQUU1RSxJQUFJLENBQUMsT0FBZTtRQUNuQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzFELENBQUM7SUFFRCxJQUFJLENBQUMsT0FBZTtRQUNuQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFRCxLQUFLLENBQUMsS0FBcUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVELE1BQU0sQ0FBQyxZQUEyQjtRQUNqQyxPQUFPLHVCQUF1QixDQUFDLEtBQUssQ0FBQztJQUN0QyxDQUFDO0lBRUQsTUFBTSxDQUFDLFFBQWtCLEVBQUUsT0FBZSxFQUFFLE9BQXdCLEVBQUUsT0FBd0I7UUFDN0YsT0FBTyx1QkFBdUIsQ0FBQyxLQUFLLENBQUM7SUFDdEMsQ0FBQztJQUVELE1BQU0sQ0FBQyxPQUF1QixFQUFFLE9BQStCO1FBQzlELE9BQU87WUFDTixLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztTQUNoQixDQUFDO0lBQ0gsQ0FBQztJQUVELFNBQVMsS0FBVyxDQUFDO0lBRXJCLFNBQVMsQ0FBQyxNQUF3QztRQUNqRCxPQUFPLG1CQUFtQixDQUFDLEdBQUcsQ0FBQztJQUNoQyxDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFnQixJQUFVLENBQUMifQ==