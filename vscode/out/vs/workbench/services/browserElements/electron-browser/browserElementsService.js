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
import { INativeBrowserElementsService } from '../../../../platform/browserElements/common/browserElements.js';
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-browser/globals.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IBrowserElementsService } from '../browser/browserElementsService.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-browser/environmentService.js';
import { NativeBrowserElementsService } from '../../../../platform/browserElements/common/nativeBrowserElementsService.js';
let WorkbenchNativeBrowserElementsService = class WorkbenchNativeBrowserElementsService extends NativeBrowserElementsService {
    constructor(environmentService, mainProcessService) {
        super(environmentService.window.id, mainProcessService);
    }
};
WorkbenchNativeBrowserElementsService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IMainProcessService)
], WorkbenchNativeBrowserElementsService);
let cancelSelectionIdPool = 0;
let cancelAndDetachIdPool = 0;
let WorkbenchBrowserElementsService = class WorkbenchBrowserElementsService {
    constructor(simpleBrowser) {
        this.simpleBrowser = simpleBrowser;
    }
    async startDebugSession(token, browserType) {
        const cancelAndDetachId = cancelAndDetachIdPool++;
        const onCancelChannel = `vscode:cancelCurrentSession${cancelAndDetachId}`;
        const disposable = token.onCancellationRequested(() => {
            ipcRenderer.send(onCancelChannel, cancelAndDetachId);
            disposable.dispose();
        });
        try {
            await this.simpleBrowser.startDebugSession(token, browserType, cancelAndDetachId);
        }
        catch (error) {
            disposable.dispose();
            throw new Error('No debug session target found', error);
        }
    }
    async getElementData(rect, token, browserType) {
        if (!browserType) {
            return undefined;
        }
        const cancelSelectionId = cancelSelectionIdPool++;
        const onCancelChannel = `vscode:cancelElementSelection${cancelSelectionId}`;
        const disposable = token.onCancellationRequested(() => {
            ipcRenderer.send(onCancelChannel, cancelSelectionId);
        });
        try {
            const elementData = await this.simpleBrowser.getElementData(rect, token, browserType, cancelSelectionId);
            return elementData;
        }
        catch (error) {
            disposable.dispose();
            throw new Error(`Native Host: Error getting element data: ${error}`);
        }
        finally {
            disposable.dispose();
        }
    }
};
WorkbenchBrowserElementsService = __decorate([
    __param(0, INativeBrowserElementsService)
], WorkbenchBrowserElementsService);
registerSingleton(IBrowserElementsService, WorkbenchBrowserElementsService, 1 /* InstantiationType.Delayed */);
registerSingleton(INativeBrowserElementsService, WorkbenchNativeBrowserElementsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlckVsZW1lbnRzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2Jyb3dzZXJFbGVtZW50cy9lbGVjdHJvbi1icm93c2VyL2Jyb3dzZXJFbGVtZW50c1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUE2Qiw2QkFBNkIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRTFJLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUV6RixPQUFPLEVBQUUsaUJBQWlCLEVBQXFCLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFFM0gsSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBc0MsU0FBUSw0QkFBNEI7SUFFL0UsWUFDcUMsa0JBQXNELEVBQ3JFLGtCQUF1QztRQUU1RCxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3pELENBQUM7Q0FDRCxDQUFBO0FBUksscUNBQXFDO0lBR3hDLFdBQUEsa0NBQWtDLENBQUE7SUFDbEMsV0FBQSxtQkFBbUIsQ0FBQTtHQUpoQixxQ0FBcUMsQ0FRMUM7QUFFRCxJQUFJLHFCQUFxQixHQUFHLENBQUMsQ0FBQztBQUM5QixJQUFJLHFCQUFxQixHQUFHLENBQUMsQ0FBQztBQUU5QixJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUErQjtJQUdwQyxZQUNpRCxhQUE0QztRQUE1QyxrQkFBYSxHQUFiLGFBQWEsQ0FBK0I7SUFDekYsQ0FBQztJQUVMLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxLQUF3QixFQUFFLFdBQXdCO1FBQ3pFLE1BQU0saUJBQWlCLEdBQUcscUJBQXFCLEVBQUUsQ0FBQztRQUNsRCxNQUFNLGVBQWUsR0FBRyw4QkFBOEIsaUJBQWlCLEVBQUUsQ0FBQztRQUUxRSxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ3JELFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDckQsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNuRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6RCxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBZ0IsRUFBRSxLQUF3QixFQUFFLFdBQW9DO1FBQ3BHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxxQkFBcUIsRUFBRSxDQUFDO1FBQ2xELE1BQU0sZUFBZSxHQUFHLGdDQUFnQyxpQkFBaUIsRUFBRSxDQUFDO1FBQzVFLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7WUFDckQsV0FBVyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQztZQUNKLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztZQUN6RyxPQUFPLFdBQVcsQ0FBQztRQUNwQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO2dCQUFTLENBQUM7WUFDVixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBMUNLLCtCQUErQjtJQUlsQyxXQUFBLDZCQUE2QixDQUFBO0dBSjFCLCtCQUErQixDQTBDcEM7QUFFRCxpQkFBaUIsQ0FBQyx1QkFBdUIsRUFBRSwrQkFBK0Isb0NBQTRCLENBQUM7QUFDdkcsaUJBQWlCLENBQUMsNkJBQTZCLEVBQUUscUNBQXFDLG9DQUE0QixDQUFDIn0=