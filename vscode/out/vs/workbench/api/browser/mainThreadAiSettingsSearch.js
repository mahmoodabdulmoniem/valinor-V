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
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IAiSettingsSearchService } from '../../services/aiSettingsSearch/common/aiSettingsSearch.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
let MainThreadAiSettingsSearch = class MainThreadAiSettingsSearch extends Disposable {
    constructor(context, _settingsSearchService) {
        super();
        this._settingsSearchService = _settingsSearchService;
        this._registrations = this._register(new DisposableMap());
        this._proxy = context.getProxy(ExtHostContext.ExtHostAiSettingsSearch);
    }
    $registerAiSettingsSearchProvider(handle) {
        const provider = {
            searchSettings: (query, option, token) => {
                return this._proxy.$startSearch(handle, query, option, token);
            }
        };
        this._registrations.set(handle, this._settingsSearchService.registerSettingsSearchProvider(provider));
    }
    $unregisterAiSettingsSearchProvider(handle) {
        this._registrations.deleteAndDispose(handle);
    }
    $handleSearchResult(handle, result) {
        if (!this._registrations.has(handle)) {
            throw new Error(`No AI settings search provider found`);
        }
        this._settingsSearchService.handleSearchResult(result);
    }
};
MainThreadAiSettingsSearch = __decorate([
    extHostNamedCustomer(MainContext.MainThreadAiSettingsSearch),
    __param(1, IAiSettingsSearchService)
], MainThreadAiSettingsSearch);
export { MainThreadAiSettingsSearch };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEFpU2V0dGluZ3NTZWFyY2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQWlTZXR0aW5nc1NlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxvQkFBb0IsRUFBbUIsTUFBTSxzREFBc0QsQ0FBQztBQUM3RyxPQUFPLEVBQXFELHdCQUF3QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDekosT0FBTyxFQUFFLGNBQWMsRUFBZ0MsV0FBVyxHQUFvQyxNQUFNLCtCQUErQixDQUFDO0FBR3JJLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTtJQUl6RCxZQUNDLE9BQXdCLEVBQ0Usc0JBQWlFO1FBRTNGLEtBQUssRUFBRSxDQUFDO1FBRm1DLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBMEI7UUFKM0UsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFVLENBQUMsQ0FBQztRQU83RSxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUVELGlDQUFpQyxDQUFDLE1BQWM7UUFDL0MsTUFBTSxRQUFRLEdBQThCO1lBQzNDLGNBQWMsRUFBRSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ3hDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0QsQ0FBQztTQUNELENBQUM7UUFDRixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLDhCQUE4QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDdkcsQ0FBQztJQUVELG1DQUFtQyxDQUFDLE1BQWM7UUFDakQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsbUJBQW1CLENBQUMsTUFBYyxFQUFFLE1BQThCO1FBQ2pFLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBRUQsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hELENBQUM7Q0FDRCxDQUFBO0FBaENZLDBCQUEwQjtJQUR0QyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUM7SUFPMUQsV0FBQSx3QkFBd0IsQ0FBQTtHQU5kLDBCQUEwQixDQWdDdEMifQ==