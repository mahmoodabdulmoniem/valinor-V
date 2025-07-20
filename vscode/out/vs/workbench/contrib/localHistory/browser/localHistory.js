/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { language } from '../../../../base/common/platform.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { safeIntl } from '../../../../base/common/date.js';
let localHistoryDateFormatter = undefined;
export function getLocalHistoryDateFormatter() {
    if (!localHistoryDateFormatter) {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        const formatter = safeIntl.DateTimeFormat(language, options).value;
        localHistoryDateFormatter = {
            format: date => formatter.format(date)
        };
    }
    return localHistoryDateFormatter;
}
export const LOCAL_HISTORY_MENU_CONTEXT_VALUE = 'localHistory:item';
export const LOCAL_HISTORY_MENU_CONTEXT_KEY = ContextKeyExpr.equals('timelineItem', LOCAL_HISTORY_MENU_CONTEXT_VALUE);
export const LOCAL_HISTORY_ICON_ENTRY = registerIcon('localHistory-icon', Codicon.circleOutline, localize('localHistoryIcon', "Icon for a local history entry in the timeline view."));
export const LOCAL_HISTORY_ICON_RESTORE = registerIcon('localHistory-restore', Codicon.check, localize('localHistoryRestore', "Icon for restoring contents of a local history entry."));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2NhbEhpc3RvcnkvYnJvd3Nlci9sb2NhbEhpc3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFNM0QsSUFBSSx5QkFBeUIsR0FBMkMsU0FBUyxDQUFDO0FBRWxGLE1BQU0sVUFBVSw0QkFBNEI7SUFDM0MsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7UUFDaEMsTUFBTSxPQUFPLEdBQStCLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUM7UUFDbkksTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQ25FLHlCQUF5QixHQUFHO1lBQzNCLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1NBQ3RDLENBQUM7SUFDSCxDQUFDO0lBRUQsT0FBTyx5QkFBeUIsQ0FBQztBQUNsQyxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsbUJBQW1CLENBQUM7QUFDcEUsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQztBQUV0SCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxZQUFZLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsa0JBQWtCLEVBQUUsc0RBQXNELENBQUMsQ0FBQyxDQUFDO0FBQ3ZMLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLFlBQVksQ0FBQyxzQkFBc0IsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSx1REFBdUQsQ0FBQyxDQUFDLENBQUMifQ==