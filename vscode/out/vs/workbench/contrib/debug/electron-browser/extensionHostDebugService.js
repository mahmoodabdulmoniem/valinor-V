/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { registerMainProcessRemoteService } from '../../../../platform/ipc/electron-browser/services.js';
import { ExtensionHostDebugChannelClient, ExtensionHostDebugBroadcastChannel } from '../../../../platform/debug/common/extensionHostDebugIpc.js';
registerMainProcessRemoteService(IExtensionHostDebugService, ExtensionHostDebugBroadcastChannel.ChannelName, { channelClientCtor: ExtensionHostDebugChannelClient });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvZWxlY3Ryb24tYnJvd3Nlci9leHRlbnNpb25Ib3N0RGVidWdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRWpKLGdDQUFnQyxDQUFDLDBCQUEwQixFQUFFLGtDQUFrQyxDQUFDLFdBQVcsRUFBRSxFQUFFLGlCQUFpQixFQUFFLCtCQUErQixFQUFFLENBQUMsQ0FBQyJ9