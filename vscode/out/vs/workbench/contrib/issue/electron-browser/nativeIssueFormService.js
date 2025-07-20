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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IMenuService } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import product from '../../../../platform/product/common/product.js';
import { IAuxiliaryWindowService } from '../../../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IssueFormService } from '../browser/issueFormService.js';
import { IssueReporter } from './issueReporterService.js';
let NativeIssueFormService = class NativeIssueFormService extends IssueFormService {
    constructor(instantiationService, auxiliaryWindowService, logService, dialogService, menuService, contextKeyService, hostService, nativeHostService, environmentService) {
        super(instantiationService, auxiliaryWindowService, menuService, contextKeyService, logService, dialogService, hostService);
        this.nativeHostService = nativeHostService;
        this.environmentService = environmentService;
        this.store = new DisposableStore();
    }
    // override to grab platform info
    async openReporter(data) {
        if (this.hasToReload(data)) {
            return;
        }
        const bounds = await this.nativeHostService.getActiveWindowPosition();
        if (!bounds) {
            return;
        }
        await this.openAuxIssueReporter(data, bounds);
        // Get platform information
        const { arch, release, type } = await this.nativeHostService.getOSProperties();
        this.arch = arch;
        this.release = release;
        this.type = type;
        // create issue reporter and instantiate
        if (this.issueReporterWindow) {
            const issueReporter = this.store.add(this.instantiationService.createInstance(IssueReporter, !!this.environmentService.disableExtensions, data, { type: this.type, arch: this.arch, release: this.release }, product, this.issueReporterWindow));
            issueReporter.render();
        }
        else {
            this.store.dispose();
        }
    }
};
NativeIssueFormService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IAuxiliaryWindowService),
    __param(2, ILogService),
    __param(3, IDialogService),
    __param(4, IMenuService),
    __param(5, IContextKeyService),
    __param(6, IHostService),
    __param(7, INativeHostService),
    __param(8, INativeEnvironmentService)
], NativeIssueFormService);
export { NativeIssueFormService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlSXNzdWVGb3JtU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvZWxlY3Ryb24tYnJvd3Nlci9uYXRpdmVJc3N1ZUZvcm1TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLE9BQU8sTUFBTSxnREFBZ0QsQ0FBQztBQUNyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM5RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRW5ELElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsZ0JBQWdCO0lBRzNELFlBQ3dCLG9CQUEyQyxFQUN6QyxzQkFBK0MsRUFDM0QsVUFBdUIsRUFDcEIsYUFBNkIsRUFDL0IsV0FBeUIsRUFDbkIsaUJBQXFDLEVBQzNDLFdBQXlCLEVBQ25CLGlCQUFzRCxFQUMvQyxrQkFBOEQ7UUFDekYsS0FBSyxDQUFDLG9CQUFvQixFQUFFLHNCQUFzQixFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRnZGLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDOUIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUEyQjtRQVh6RSxVQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQWEvQyxDQUFDO0lBRUQsaUNBQWlDO0lBQ3hCLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBdUI7UUFDbEQsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQ3RFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTlDLDJCQUEyQjtRQUMzQixNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUMvRSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUVqQix3Q0FBd0M7UUFDeEMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM5QixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixFQUFFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7WUFDalAsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3hCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUEzQ1ksc0JBQXNCO0lBSWhDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHlCQUF5QixDQUFBO0dBWmYsc0JBQXNCLENBMkNsQyJ9