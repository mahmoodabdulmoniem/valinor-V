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
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { reviveWebviewExtension } from './mainThreadWebviews.js';
import * as extHostProtocol from '../common/extHost.protocol.js';
import { IWebviewViewService } from '../../contrib/webviewView/browser/webviewViewService.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
let MainThreadWebviewsViews = class MainThreadWebviewsViews extends Disposable {
    constructor(context, mainThreadWebviews, _telemetryService, _webviewViewService) {
        super();
        this.mainThreadWebviews = mainThreadWebviews;
        this._telemetryService = _telemetryService;
        this._webviewViewService = _webviewViewService;
        this._webviewViews = this._register(new DisposableMap());
        this._webviewViewProviders = this._register(new DisposableMap());
        this._proxy = context.getProxy(extHostProtocol.ExtHostContext.ExtHostWebviewViews);
    }
    $setWebviewViewTitle(handle, value) {
        const webviewView = this.getWebviewView(handle);
        webviewView.title = value;
    }
    $setWebviewViewDescription(handle, value) {
        const webviewView = this.getWebviewView(handle);
        webviewView.description = value;
    }
    $setWebviewViewBadge(handle, badge) {
        const webviewView = this.getWebviewView(handle);
        webviewView.badge = badge;
    }
    $show(handle, preserveFocus) {
        const webviewView = this.getWebviewView(handle);
        webviewView.show(preserveFocus);
    }
    $registerWebviewViewProvider(extensionData, viewType, options) {
        if (this._webviewViewProviders.has(viewType)) {
            throw new Error(`View provider for ${viewType} already registered`);
        }
        const extension = reviveWebviewExtension(extensionData);
        const registration = this._webviewViewService.register(viewType, {
            resolve: async (webviewView, cancellation) => {
                const handle = generateUuid();
                this._webviewViews.set(handle, webviewView);
                this.mainThreadWebviews.addWebview(handle, webviewView.webview, { serializeBuffersForPostMessage: options.serializeBuffersForPostMessage });
                let state = undefined;
                if (webviewView.webview.state) {
                    try {
                        state = JSON.parse(webviewView.webview.state);
                    }
                    catch (e) {
                        console.error('Could not load webview state', e, webviewView.webview.state);
                    }
                }
                webviewView.webview.extension = extension;
                if (options) {
                    webviewView.webview.options = options;
                }
                const subscriptions = new DisposableStore();
                subscriptions.add(webviewView.onDidChangeVisibility(visible => {
                    this._proxy.$onDidChangeWebviewViewVisibility(handle, visible);
                }));
                subscriptions.add(webviewView.onDispose(() => {
                    this._proxy.$disposeWebviewView(handle);
                    this._webviewViews.deleteAndDispose(handle);
                    subscriptions.dispose();
                }));
                this._telemetryService.publicLog2('webviews:createWebviewView', {
                    extensionId: extension.id.value,
                    id: viewType,
                });
                try {
                    await this._proxy.$resolveWebviewView(handle, viewType, webviewView.title, state, cancellation);
                }
                catch (error) {
                    onUnexpectedError(error);
                    webviewView.webview.setHtml(this.mainThreadWebviews.getWebviewResolvedFailedContent(viewType));
                }
            }
        });
        this._webviewViewProviders.set(viewType, registration);
    }
    $unregisterWebviewViewProvider(viewType) {
        if (!this._webviewViewProviders.has(viewType)) {
            throw new Error(`No view provider for ${viewType} registered`);
        }
        this._webviewViewProviders.deleteAndDispose(viewType);
    }
    getWebviewView(handle) {
        const webviewView = this._webviewViews.get(handle);
        if (!webviewView) {
            throw new Error('unknown webview view');
        }
        return webviewView;
    }
};
MainThreadWebviewsViews = __decorate([
    __param(2, ITelemetryService),
    __param(3, IWebviewViewService)
], MainThreadWebviewsViews);
export { MainThreadWebviewsViews };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdlYnZpZXdWaWV3cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRXZWJ2aWV3Vmlld3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzVELE9BQU8sRUFBc0Isc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNyRixPQUFPLEtBQUssZUFBZSxNQUFNLCtCQUErQixDQUFDO0FBRWpFLE9BQU8sRUFBRSxtQkFBbUIsRUFBZSxNQUFNLHlEQUF5RCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBSTdFLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTtJQU90RCxZQUNDLE9BQXdCLEVBQ1Asa0JBQXNDLEVBQ3BDLGlCQUFxRCxFQUNuRCxtQkFBeUQ7UUFFOUUsS0FBSyxFQUFFLENBQUM7UUFKUyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ25CLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDbEMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQVA5RCxrQkFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQXVCLENBQUMsQ0FBQztRQUN6RSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFVLENBQUMsQ0FBQztRQVVwRixJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxNQUFxQyxFQUFFLEtBQXlCO1FBQzNGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEQsV0FBVyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDM0IsQ0FBQztJQUVNLDBCQUEwQixDQUFDLE1BQXFDLEVBQUUsS0FBeUI7UUFDakcsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoRCxXQUFXLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztJQUNqQyxDQUFDO0lBRU0sb0JBQW9CLENBQUMsTUFBYyxFQUFFLEtBQTZCO1FBQ3hFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEQsV0FBVyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDM0IsQ0FBQztJQUVNLEtBQUssQ0FBQyxNQUFxQyxFQUFFLGFBQXNCO1FBQ3pFLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEQsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRU0sNEJBQTRCLENBQ2xDLGFBQTBELEVBQzFELFFBQWdCLEVBQ2hCLE9BQXVGO1FBRXZGLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzlDLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLFFBQVEscUJBQXFCLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsc0JBQXNCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFeEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUU7WUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxXQUF3QixFQUFFLFlBQStCLEVBQUUsRUFBRTtnQkFDNUUsTUFBTSxNQUFNLEdBQUcsWUFBWSxFQUFFLENBQUM7Z0JBRTlCLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLDhCQUE4QixFQUFFLE9BQU8sQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLENBQUM7Z0JBRTVJLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQztnQkFDdEIsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUMvQixJQUFJLENBQUM7d0JBQ0osS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDL0MsQ0FBQztvQkFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUNaLE9BQU8sQ0FBQyxLQUFLLENBQUMsOEJBQThCLEVBQUUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQzdFLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxXQUFXLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7Z0JBRTFDLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsV0FBVyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO2dCQUN2QyxDQUFDO2dCQUVELE1BQU0sYUFBYSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7Z0JBQzVDLGFBQWEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUM3RCxJQUFJLENBQUMsTUFBTSxDQUFDLGlDQUFpQyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDaEUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFSixhQUFhLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO29CQUM1QyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUM1QyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBWUosSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBNkMsNEJBQTRCLEVBQUU7b0JBQzNHLFdBQVcsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLEtBQUs7b0JBQy9CLEVBQUUsRUFBRSxRQUFRO2lCQUNaLENBQUMsQ0FBQztnQkFFSCxJQUFJLENBQUM7b0JBQ0osTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ2pHLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ3pCLFdBQVcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQywrQkFBK0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNoRyxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFTSw4QkFBOEIsQ0FBQyxRQUFnQjtRQUNyRCxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQy9DLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLFFBQVEsYUFBYSxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRU8sY0FBYyxDQUFDLE1BQWM7UUFDcEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBQ0QsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztDQUNELENBQUE7QUE1SFksdUJBQXVCO0lBVWpDLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxtQkFBbUIsQ0FBQTtHQVhULHVCQUF1QixDQTRIbkMifQ==