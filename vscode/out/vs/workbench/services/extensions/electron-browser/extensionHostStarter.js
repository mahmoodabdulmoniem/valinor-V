/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerMainProcessRemoteService } from '../../../../platform/ipc/electron-browser/services.js';
import { IExtensionHostStarter, ipcExtensionHostStarterChannelName } from '../../../../platform/extensions/common/extensionHostStarter.js';
registerMainProcessRemoteService(IExtensionHostStarter, ipcExtensionHostStarterChannelName);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFN0YXJ0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2VsZWN0cm9uLWJyb3dzZXIvZXh0ZW5zaW9uSG9zdFN0YXJ0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGtDQUFrQyxFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFFM0ksZ0NBQWdDLENBQUMscUJBQXFCLEVBQUUsa0NBQWtDLENBQUMsQ0FBQyJ9