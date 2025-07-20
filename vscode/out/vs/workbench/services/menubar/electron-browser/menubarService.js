/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IMenubarService } from '../../../../platform/menubar/electron-browser/menubar.js';
import { registerMainProcessRemoteService } from '../../../../platform/ipc/electron-browser/services.js';
registerMainProcessRemoteService(IMenubarService, 'menubar');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9tZW51YmFyL2VsZWN0cm9uLWJyb3dzZXIvbWVudWJhclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRXpHLGdDQUFnQyxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQyJ9