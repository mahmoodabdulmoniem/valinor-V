/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IChatSessionsService } from '../../contrib/chat/common/chatSessionsService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadChatSessions = class MainThreadChatSessions extends Disposable {
    constructor(_extHostContext, _chatSessionsService, _logService) {
        super();
        this._extHostContext = _extHostContext;
        this._chatSessionsService = _chatSessionsService;
        this._logService = _logService;
        this._registrations = this._register(new DisposableMap());
    }
    $registerChatSessionsProvider(handle) {
        // Register the provider handle - this tracks that a provider exists
        const provider = {
            provideChatSessions: (token) => this._provideChatSessionsInformation(handle, token)
        };
        this._registrations.set(handle, this._chatSessionsService.registerChatSessionsProvider(handle, provider));
    }
    async _provideChatSessionsInformation(handle, token) {
        const proxy = this._extHostContext.getProxy(ExtHostContext.ExtHostChatSessions);
        try {
            // Get all results as an array from the RPC call
            return await proxy.$provideChatSessions(handle, token);
        }
        catch (error) {
            this._logService.error('Error providing chat sessions:', error);
        }
        return [];
    }
    $unregisterChatSessionsProvider(handle) {
        this._registrations.deleteAndDispose(handle);
    }
};
MainThreadChatSessions = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatSessions),
    __param(1, IChatSessionsService),
    __param(2, ILogService)
], MainThreadChatSessions);
export { MainThreadChatSessions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRTZXNzaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRDaGF0U2Vzc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUE4QyxvQkFBb0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3BJLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBK0IsTUFBTSwrQkFBK0IsQ0FBQztBQUdsRyxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7SUFHckQsWUFDa0IsZUFBZ0MsRUFDM0Isb0JBQTJELEVBQ3BFLFdBQXlDO1FBRXRELEtBQUssRUFBRSxDQUFDO1FBSlMsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ1YseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUNuRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUx0QyxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQVUsQ0FBQyxDQUFDO0lBUTlFLENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxNQUFjO1FBQzNDLG9FQUFvRTtRQUNwRSxNQUFNLFFBQVEsR0FBMEI7WUFDdkMsbUJBQW1CLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDO1NBQ25GLENBQUM7UUFDRixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLDRCQUE0QixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzNHLENBQUM7SUFFTyxLQUFLLENBQUMsK0JBQStCLENBQUMsTUFBYyxFQUFFLEtBQXdCO1FBQ3JGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRWhGLElBQUksQ0FBQztZQUNKLGdEQUFnRDtZQUNoRCxPQUFPLE1BQU0sS0FBSyxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBQ0QsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsK0JBQStCLENBQUMsTUFBYztRQUM3QyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlDLENBQUM7Q0FDRCxDQUFBO0FBbENZLHNCQUFzQjtJQURsQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUM7SUFNdEQsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLFdBQVcsQ0FBQTtHQU5ELHNCQUFzQixDQWtDbEMifQ==