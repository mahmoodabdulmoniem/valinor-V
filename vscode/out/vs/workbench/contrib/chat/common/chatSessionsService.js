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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
export const IChatSessionsService = createDecorator('chatSessionsService');
let ChatSessionsService = class ChatSessionsService extends Disposable {
    constructor(_logService) {
        super();
        this._logService = _logService;
        this._providers = new Map();
    }
    async provideChatSessions(token) {
        const results = [];
        // Iterate through all registered providers and collect their results
        for (const [handle, provider] of this._providers) {
            try {
                if (provider.provideChatSessions) {
                    results.push(...await provider.provideChatSessions(token));
                }
            }
            catch (error) {
                this._logService.error(`Error getting chat sessions from provider ${handle}:`, error);
            }
            if (token.isCancellationRequested) {
                break;
            }
        }
        return results;
    }
    registerChatSessionsProvider(handle, provider) {
        this._providers.set(handle, provider);
        return {
            dispose: () => {
                this._providers.delete(handle);
            }
        };
    }
    get hasChatSessionsProviders() {
        return this._providers.size > 0;
    }
};
ChatSessionsService = __decorate([
    __param(0, ILogService)
], ChatSessionsService);
export { ChatSessionsService };
registerSingleton(IChatSessionsService, ChatSessionsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25zU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFNlc3Npb25zU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFFL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFxQi9HLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIscUJBQXFCLENBQUMsQ0FBQztBQUUxRixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFJbEQsWUFDYyxXQUF5QztRQUV0RCxLQUFLLEVBQUUsQ0FBQztRQUZzQixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUgvQyxlQUFVLEdBQXVDLElBQUksR0FBRyxFQUFFLENBQUM7SUFNbkUsQ0FBQztJQUVNLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxLQUF3QjtRQUN4RCxNQUFNLE9BQU8sR0FBMEIsRUFBRSxDQUFDO1FBRTFDLHFFQUFxRTtRQUNyRSxLQUFLLE1BQU0sQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQztnQkFDSixJQUFJLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO29CQUNsQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxRQUFRLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDNUQsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw2Q0FBNkMsTUFBTSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkYsQ0FBQztZQUVELElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7Z0JBQ25DLE1BQU07WUFDUCxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFTSw0QkFBNEIsQ0FBQyxNQUFjLEVBQUUsUUFBK0I7UUFDbEYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3RDLE9BQU87WUFDTixPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2hDLENBQUM7U0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVELElBQVcsd0JBQXdCO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7Q0FDRCxDQUFBO0FBM0NZLG1CQUFtQjtJQUs3QixXQUFBLFdBQVcsQ0FBQTtHQUxELG1CQUFtQixDQTJDL0I7O0FBRUQsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsbUJBQW1CLG9DQUE0QixDQUFDIn0=