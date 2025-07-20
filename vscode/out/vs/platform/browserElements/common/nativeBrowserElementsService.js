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
import { ProxyChannel } from '../../../base/parts/ipc/common/ipc.js';
import { IMainProcessService } from '../../ipc/common/mainProcessService.js';
// @ts-ignore: interface is implemented via proxy
let NativeBrowserElementsService = class NativeBrowserElementsService {
    constructor(windowId, mainProcessService) {
        this.windowId = windowId;
        return ProxyChannel.toService(mainProcessService.getChannel('browserElements'), {
            context: windowId,
            properties: (() => {
                const properties = new Map();
                properties.set('windowId', windowId);
                return properties;
            })()
        });
    }
};
NativeBrowserElementsService = __decorate([
    __param(1, IMainProcessService)
], NativeBrowserElementsService);
export { NativeBrowserElementsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlQnJvd3NlckVsZW1lbnRzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYnJvd3NlckVsZW1lbnRzL2NvbW1vbi9uYXRpdmVCcm93c2VyRWxlbWVudHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUc3RSxpREFBaUQ7QUFDMUMsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNEI7SUFJeEMsWUFDVSxRQUFnQixFQUNKLGtCQUF1QztRQURuRCxhQUFRLEdBQVIsUUFBUSxDQUFRO1FBR3pCLE9BQU8sWUFBWSxDQUFDLFNBQVMsQ0FBZ0Msa0JBQWtCLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEVBQUU7WUFDOUcsT0FBTyxFQUFFLFFBQVE7WUFDakIsVUFBVSxFQUFFLENBQUMsR0FBRyxFQUFFO2dCQUNqQixNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBbUIsQ0FBQztnQkFDOUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBRXJDLE9BQU8sVUFBVSxDQUFDO1lBQ25CLENBQUMsQ0FBQyxFQUFFO1NBQ0osQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNELENBQUE7QUFsQlksNEJBQTRCO0lBTXRDLFdBQUEsbUJBQW1CLENBQUE7R0FOVCw0QkFBNEIsQ0FrQnhDIn0=