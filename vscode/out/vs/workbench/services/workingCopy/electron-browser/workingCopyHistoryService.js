/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NativeWorkingCopyHistoryService } from '../common/workingCopyHistoryService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkingCopyHistoryService } from '../common/workingCopyHistory.js';
// Register Service
registerSingleton(IWorkingCopyHistoryService, NativeWorkingCopyHistoryService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2VsZWN0cm9uLWJyb3dzZXIvd29ya2luZ0NvcHlIaXN0b3J5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFN0UsbUJBQW1CO0FBQ25CLGlCQUFpQixDQUFDLDBCQUEwQixFQUFFLCtCQUErQixvQ0FBNEIsQ0FBQyJ9