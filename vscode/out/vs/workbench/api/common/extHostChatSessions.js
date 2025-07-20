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
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { MainContext } from './extHost.protocol.js';
import { ILogService } from '../../../platform/log/common/log.js';
export const IExtHostChatSessions = createDecorator('IExtHostChatSessions');
let ExtHostChatSessions = class ExtHostChatSessions extends Disposable {
    constructor(_extHostRpc, _logService) {
        super();
        this._extHostRpc = _extHostRpc;
        this._logService = _logService;
        this._statusProviders = new Map();
        this._nextHandle = 0;
        this._proxy = this._extHostRpc.getProxy(MainContext.MainThreadChatSessions);
    }
    registerChatSessionsProvider(provider) {
        const handle = this._nextHandle++;
        const disposables = new DisposableStore();
        this._statusProviders.set(handle, { provider, disposable: disposables });
        this._proxy.$registerChatSessionsProvider(handle);
        return {
            dispose: () => {
                this._statusProviders.delete(handle);
                disposables.dispose();
                provider.dispose();
                this._proxy.$unregisterChatSessionsProvider(handle);
            }
        };
    }
    async $provideChatSessions(handle, token) {
        const entry = this._statusProviders.get(handle);
        if (!entry) {
            this._logService.error(`No provider registered for handle ${handle}`);
            return [];
        }
        return await entry.provider.provideChatSessions(token);
    }
};
ExtHostChatSessions = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService)
], ExtHostChatSessions);
export { ExtHostChatSessions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENoYXRTZXNzaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdENoYXRTZXNzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQTRCLFdBQVcsRUFBK0IsTUFBTSx1QkFBdUIsQ0FBQztBQUUzRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFPbEUsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixzQkFBc0IsQ0FBQyxDQUFDO0FBRTNGLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQU9sRCxZQUNxQixXQUFnRCxFQUN2RCxXQUF5QztRQUV0RCxLQUFLLEVBQUUsQ0FBQztRQUg2QixnQkFBVyxHQUFYLFdBQVcsQ0FBb0I7UUFDdEMsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFMdEMscUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQWtGLENBQUM7UUFDdEgsZ0JBQVcsR0FBRyxDQUFDLENBQUM7UUFPdkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQsNEJBQTRCLENBQUMsUUFBcUM7UUFDakUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFMUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDekUsSUFBSSxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVsRCxPQUFPO1lBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNyQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RCLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLE1BQU0sQ0FBQywrQkFBK0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyRCxDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsb0JBQW9CLENBQUMsTUFBYyxFQUFFLEtBQStCO1FBQ3pFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMscUNBQXFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDdEUsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsT0FBTyxNQUFNLEtBQUssQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEQsQ0FBQztDQUNELENBQUE7QUF6Q1ksbUJBQW1CO0lBUTdCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxXQUFXLENBQUE7R0FURCxtQkFBbUIsQ0F5Qy9CIn0=