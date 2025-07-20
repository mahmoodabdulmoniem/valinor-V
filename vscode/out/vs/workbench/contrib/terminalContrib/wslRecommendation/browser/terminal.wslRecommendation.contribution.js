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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { localize } from '../../../../../nls.js';
import { IExtensionManagementService } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, NeverShowAgainScope, NotificationPriority, Severity } from '../../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { InstallRecommendedExtensionAction } from '../../../extensions/browser/extensionsActions.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
let TerminalWslRecommendationContribution = class TerminalWslRecommendationContribution extends Disposable {
    static { this.ID = 'terminalWslRecommendation'; }
    constructor(extensionManagementService, instantiationService, notificationService, productService, terminalService) {
        super();
        if (!isWindows) {
            return;
        }
        const exeBasedExtensionTips = productService.exeBasedExtensionTips;
        if (!exeBasedExtensionTips || !exeBasedExtensionTips.wsl) {
            return;
        }
        let listener = terminalService.onDidCreateInstance(async (instance) => {
            async function isExtensionInstalled(id) {
                const extensions = await extensionManagementService.getInstalled();
                return extensions.some(e => e.identifier.id === id);
            }
            if (!instance.shellLaunchConfig.executable || basename(instance.shellLaunchConfig.executable).toLowerCase() !== 'wsl.exe') {
                return;
            }
            listener?.dispose();
            listener = undefined;
            const extId = Object.keys(exeBasedExtensionTips.wsl.recommendations).find(extId => exeBasedExtensionTips.wsl.recommendations[extId].important);
            if (!extId || await isExtensionInstalled(extId)) {
                return;
            }
            notificationService.prompt(Severity.Info, localize('useWslExtension.title', "The '{0}' extension is recommended for opening a terminal in WSL.", exeBasedExtensionTips.wsl.friendlyName), [
                {
                    label: localize('install', 'Install'),
                    run: () => {
                        instantiationService.createInstance(InstallRecommendedExtensionAction, extId).run();
                    }
                }
            ], {
                priority: NotificationPriority.OPTIONAL,
                neverShowAgain: { id: 'terminalConfigHelper/launchRecommendationsIgnore', scope: NeverShowAgainScope.APPLICATION },
                onCancel: () => { }
            });
        });
    }
};
TerminalWslRecommendationContribution = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IProductService),
    __param(4, ITerminalService)
], TerminalWslRecommendationContribution);
export { TerminalWslRecommendationContribution };
registerWorkbenchContribution2(TerminalWslRecommendationContribution.ID, TerminalWslRecommendationContribution, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwud3NsUmVjb21tZW5kYXRpb24uY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvd3NsUmVjb21tZW5kYXRpb24vYnJvd3Nlci90ZXJtaW5hbC53c2xSZWNvbW1lbmRhdGlvbi5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBb0IsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUN4SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDeEosT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSw4QkFBOEIsRUFBK0MsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsSSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVsRSxJQUFNLHFDQUFxQyxHQUEzQyxNQUFNLHFDQUFzQyxTQUFRLFVBQVU7YUFDN0QsT0FBRSxHQUFHLDJCQUEyQixB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