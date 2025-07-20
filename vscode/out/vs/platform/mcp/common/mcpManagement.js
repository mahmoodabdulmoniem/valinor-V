/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var PackageType;
(function (PackageType) {
    PackageType["NODE"] = "npm";
    PackageType["DOCKER"] = "docker";
    PackageType["PYTHON"] = "pypi";
    PackageType["NUGET"] = "nuget";
    PackageType["REMOTE"] = "remote";
})(PackageType || (PackageType = {}));
export const IMcpGalleryService = createDecorator('IMcpGalleryService');
export const IMcpManagementService = createDecorator('IMcpManagementService');
export const IAllowedMcpServersService = createDecorator('IAllowedMcpServersService');
export const mcpEnabledConfig = 'chat.mcp.enabled';
export const mcpGalleryServiceUrlConfig = 'chat.mcp.gallery.serviceUrl';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWNwL2NvbW1vbi9tY3BNYW5hZ2VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQTZEOUUsTUFBTSxDQUFOLElBQWtCLFdBTWpCO0FBTkQsV0FBa0IsV0FBVztJQUM1QiwyQkFBWSxDQUFBO0lBQ1osZ0NBQWlCLENBQUE7SUFDakIsOEJBQWUsQ0FBQTtJQUNmLDhCQUFlLENBQUE7SUFDZixnQ0FBaUIsQ0FBQTtBQUNsQixDQUFDLEVBTmlCLFdBQVcsS0FBWCxXQUFXLFFBTTVCO0FBMERELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBcUIsb0JBQW9CLENBQUMsQ0FBQztBQWtENUYsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUF3Qix1QkFBdUIsQ0FBQyxDQUFDO0FBZ0JyRyxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQTRCLDJCQUEyQixDQUFDLENBQUM7QUFRakgsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsa0JBQWtCLENBQUM7QUFDbkQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsNkJBQTZCLENBQUMifQ==