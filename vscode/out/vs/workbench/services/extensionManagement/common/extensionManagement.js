/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator, refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
export const IProfileAwareExtensionManagementService = refineServiceDecorator(IExtensionManagementService);
export var ExtensionInstallLocation;
(function (ExtensionInstallLocation) {
    ExtensionInstallLocation[ExtensionInstallLocation["Local"] = 1] = "Local";
    ExtensionInstallLocation[ExtensionInstallLocation["Remote"] = 2] = "Remote";
    ExtensionInstallLocation[ExtensionInstallLocation["Web"] = 3] = "Web";
})(ExtensionInstallLocation || (ExtensionInstallLocation = {}));
export const IExtensionManagementServerService = createDecorator('extensionManagementServerService');
export const IWorkbenchExtensionManagementService = refineServiceDecorator(IProfileAwareExtensionManagementService);
export var EnablementState;
(function (EnablementState) {
    EnablementState[EnablementState["DisabledByTrustRequirement"] = 0] = "DisabledByTrustRequirement";
    EnablementState[EnablementState["DisabledByExtensionKind"] = 1] = "DisabledByExtensionKind";
    EnablementState[EnablementState["DisabledByEnvironment"] = 2] = "DisabledByEnvironment";
    EnablementState[EnablementState["EnabledByEnvironment"] = 3] = "EnabledByEnvironment";
    EnablementState[EnablementState["DisabledByMalicious"] = 4] = "DisabledByMalicious";
    EnablementState[EnablementState["DisabledByVirtualWorkspace"] = 5] = "DisabledByVirtualWorkspace";
    EnablementState[EnablementState["DisabledByInvalidExtension"] = 6] = "DisabledByInvalidExtension";
    EnablementState[EnablementState["DisabledByAllowlist"] = 7] = "DisabledByAllowlist";
    EnablementState[EnablementState["DisabledByExtensionDependency"] = 8] = "DisabledByExtensionDependency";
    EnablementState[EnablementState["DisabledGlobally"] = 9] = "DisabledGlobally";
    EnablementState[EnablementState["DisabledWorkspace"] = 10] = "DisabledWorkspace";
    EnablementState[EnablementState["EnabledGlobally"] = 11] = "EnabledGlobally";
    EnablementState[EnablementState["EnabledWorkspace"] = 12] = "EnabledWorkspace";
})(EnablementState || (EnablementState = {}));
export const IWorkbenchExtensionEnablementService = createDecorator('extensionEnablementService');
export const IWebExtensionsScannerService = createDecorator('IWebExtensionsScannerService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbk1hbmFnZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRXJILE9BQU8sRUFBRSwyQkFBMkIsRUFBc04sTUFBTSx3RUFBd0UsQ0FBQztBQU16VSxNQUFNLENBQUMsTUFBTSx1Q0FBdUMsR0FBRyxzQkFBc0IsQ0FBdUUsMkJBQTJCLENBQUMsQ0FBQztBQWNqTCxNQUFNLENBQU4sSUFBa0Isd0JBSWpCO0FBSkQsV0FBa0Isd0JBQXdCO0lBQ3pDLHlFQUFTLENBQUE7SUFDVCwyRUFBTSxDQUFBO0lBQ04scUVBQUcsQ0FBQTtBQUNKLENBQUMsRUFKaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUl6QztBQUVELE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLGVBQWUsQ0FBb0Msa0NBQWtDLENBQUMsQ0FBQztBQTZCeEksTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsc0JBQXNCLENBQWdGLHVDQUF1QyxDQUFDLENBQUM7QUFxQ25NLE1BQU0sQ0FBTixJQUFrQixlQWNqQjtBQWRELFdBQWtCLGVBQWU7SUFDaEMsaUdBQTBCLENBQUE7SUFDMUIsMkZBQXVCLENBQUE7SUFDdkIsdUZBQXFCLENBQUE7SUFDckIscUZBQW9CLENBQUE7SUFDcEIsbUZBQW1CLENBQUE7SUFDbkIsaUdBQTBCLENBQUE7SUFDMUIsaUdBQTBCLENBQUE7SUFDMUIsbUZBQW1CLENBQUE7SUFDbkIsdUdBQTZCLENBQUE7SUFDN0IsNkVBQWdCLENBQUE7SUFDaEIsZ0ZBQWlCLENBQUE7SUFDakIsNEVBQWUsQ0FBQTtJQUNmLDhFQUFnQixDQUFBO0FBQ2pCLENBQUMsRUFkaUIsZUFBZSxLQUFmLGVBQWUsUUFjaEM7QUFFRCxNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxlQUFlLENBQXVDLDRCQUE0QixDQUFDLENBQUM7QUE4RXhJLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLGVBQWUsQ0FBK0IsOEJBQThCLENBQUMsQ0FBQyJ9