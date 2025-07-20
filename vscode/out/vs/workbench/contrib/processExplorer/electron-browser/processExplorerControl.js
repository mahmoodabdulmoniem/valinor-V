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
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProcessService } from '../../../../platform/process/common/process.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ProcessExplorerControl } from '../browser/processExplorerControl.js';
let NativeProcessExplorerControl = class NativeProcessExplorerControl extends ProcessExplorerControl {
    constructor(container, instantiationService, productService, contextMenuService, nativeHostService, commandService, processService, clipboardService) {
        super(instantiationService, productService, contextMenuService, commandService, clipboardService);
        this.nativeHostService = nativeHostService;
        this.processService = processService;
        this.create(container);
    }
    killProcess(pid, signal) {
        return this.nativeHostService.killProcess(pid, signal);
    }
    resolveProcesses() {
        return this.processService.resolveProcesses();
    }
};
NativeProcessExplorerControl = __decorate([
    __param(1, IInstantiationService),
    __param(2, IProductService),
    __param(3, IContextMenuService),
    __param(4, INativeHostService),
    __param(5, ICommandService),
    __param(6, IProcessService),
    __param(7, IClipboardService)
], NativeProcessExplorerControl);
export { NativeProcessExplorerControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyQ29udHJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJvY2Vzc0V4cGxvcmVyL2VsZWN0cm9uLWJyb3dzZXIvcHJvY2Vzc0V4cGxvcmVyQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkUsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxzQkFBc0I7SUFFdkUsWUFDQyxTQUFzQixFQUNDLG9CQUEyQyxFQUNqRCxjQUErQixFQUMzQixrQkFBdUMsRUFDdkIsaUJBQXFDLEVBQ3pELGNBQStCLEVBQ2QsY0FBK0IsRUFDOUMsZ0JBQW1DO1FBRXRELEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFMN0Qsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUV4QyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFLakUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRWtCLFdBQVcsQ0FBQyxHQUFXLEVBQUUsTUFBYztRQUN6RCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFa0IsZ0JBQWdCO1FBQ2xDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQy9DLENBQUM7Q0FDRCxDQUFBO0FBeEJZLDRCQUE0QjtJQUl0QyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGlCQUFpQixDQUFBO0dBVlAsNEJBQTRCLENBd0J4QyJ9