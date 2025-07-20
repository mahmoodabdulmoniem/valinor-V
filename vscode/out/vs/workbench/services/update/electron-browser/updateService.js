/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { registerMainProcessRemoteService } from '../../../../platform/ipc/electron-browser/services.js';
import { UpdateChannelClient } from '../../../../platform/update/common/updateIpc.js';
registerMainProcessRemoteService(IUpdateService, 'update', { channelClientCtor: UpdateChannelClient });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VwZGF0ZS9lbGVjdHJvbi1icm93c2VyL3VwZGF0ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXRGLGdDQUFnQyxDQUFDLGNBQWMsRUFBRSxRQUFRLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxDQUFDLENBQUMifQ==