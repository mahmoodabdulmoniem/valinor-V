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
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { localize } from '../../../../nls.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { ToolDataSource } from '../../chat/common/languageModelToolsService.js';
import { IExtensionsWorkbenchService } from './extensions.js';
export const InstallExtensionsToolId = 'vscode_installExtensions';
export const InstallExtensionsToolData = {
    id: InstallExtensionsToolId,
    toolReferenceName: 'installExtensions',
    canBeReferencedInPrompt: true,
    displayName: localize('installExtensionsTool.displayName', 'Install Extensions'),
    modelDescription: localize('installExtensionsTool.modelDescription', "This is a tool for installing extensions in Visual Studio Code. You should provide the list of extension ids to install. The identifier of an extension is '\${ publisher }.\${ name }' for example: 'vscode.csharp'."),
    userDescription: localize('installExtensionsTool.userDescription', 'Tool for installing extensions'),
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            ids: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: 'The ids of the extensions to search for. The identifier of an extension is \'\${ publisher }.\${ name }\' for example: \'vscode.csharp\'.',
            },
        }
    }
};
let InstallExtensionsTool = class InstallExtensionsTool {
    constructor(extensionsWorkbenchService) {
        this.extensionsWorkbenchService = extensionsWorkbenchService;
    }
    async prepareToolInvocation(context, token) {
        const parameters = context.parameters;
        return {
            confirmationMessages: {
                title: localize('installExtensionsTool.confirmationTitle', 'Install Extensions'),
                message: new MarkdownString(localize('installExtensionsTool.confirmationMessage', "Review the suggested extensions and click the **Install** button for each extension you wish to add. Once you have finished installing the selected extensions, click **Continue** to proceed.")),
            },
            toolSpecificData: {
                kind: 'extensions',
                extensions: parameters.ids
            }
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const input = invocation.parameters;
        const installed = this.extensionsWorkbenchService.local.filter(e => input.ids.some(id => areSameExtensions({ id }, e.identifier)));
        return {
            content: [{
                    kind: 'text',
                    value: installed.length ? localize('installExtensionsTool.resultMessage', 'Following extensions are installed: {0}', installed.map(e => e.identifier.id).join(', ')) : localize('installExtensionsTool.noResultMessage', 'No extensions were installed.'),
                }]
        };
    }
};
InstallExtensionsTool = __decorate([
    __param(0, IExtensionsWorkbenchService)
], InstallExtensionsTool);
export { InstallExtensionsTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFsbEV4dGVuc2lvbnNUb29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2NvbW1vbi9pbnN0YWxsRXh0ZW5zaW9uc1Rvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUMvRyxPQUFPLEVBQXVJLGNBQWMsRUFBZ0IsTUFBTSxnREFBZ0QsQ0FBQztBQUNuTyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUU5RCxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRywwQkFBMEIsQ0FBQztBQUVsRSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBYztJQUNuRCxFQUFFLEVBQUUsdUJBQXVCO0lBQzNCLGlCQUFpQixFQUFFLG1CQUFtQjtJQUN0Qyx1QkFBdUIsRUFBRSxJQUFJO0lBQzdCLFdBQVcsRUFBRSxRQUFRLENBQUMsbUNBQW1DLEVBQUUsb0JBQW9CLENBQUM7SUFDaEYsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLHVOQUF1TixDQUFDO0lBQzdSLGVBQWUsRUFBRSxRQUFRLENBQUMsdUNBQXVDLEVBQUUsZ0NBQWdDLENBQUM7SUFDcEcsTUFBTSxFQUFFLGNBQWMsQ0FBQyxRQUFRO0lBQy9CLFdBQVcsRUFBRTtRQUNaLElBQUksRUFBRSxRQUFRO1FBQ2QsVUFBVSxFQUFFO1lBQ1gsR0FBRyxFQUFFO2dCQUNKLElBQUksRUFBRSxPQUFPO2dCQUNiLEtBQUssRUFBRTtvQkFDTixJQUFJLEVBQUUsUUFBUTtpQkFDZDtnQkFDRCxXQUFXLEVBQUUsMklBQTJJO2FBQ3hKO1NBQ0Q7S0FDRDtDQUNELENBQUM7QUFNSyxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQUVqQyxZQUMrQywwQkFBdUQ7UUFBdkQsK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE2QjtJQUNsRyxDQUFDO0lBRUwsS0FBSyxDQUFDLHFCQUFxQixDQUFDLE9BQTBDLEVBQUUsS0FBd0I7UUFDL0YsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFVBQXlCLENBQUM7UUFDckQsT0FBTztZQUNOLG9CQUFvQixFQUFFO2dCQUNyQixLQUFLLEVBQUUsUUFBUSxDQUFDLHlDQUF5QyxFQUFFLG9CQUFvQixDQUFDO2dCQUNoRixPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLDJDQUEyQyxFQUFFLGdNQUFnTSxDQUFDLENBQUM7YUFDcFI7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDakIsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLFVBQVUsRUFBRSxVQUFVLENBQUMsR0FBRzthQUMxQjtTQUNELENBQUM7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUEyQixFQUFFLFlBQWlDLEVBQUUsU0FBdUIsRUFBRSxLQUF3QjtRQUM3SCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsVUFBeUIsQ0FBQztRQUNuRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ25JLE9BQU87WUFDTixPQUFPLEVBQUUsQ0FBQztvQkFDVCxJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLHlDQUF5QyxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsdUNBQXVDLEVBQUUsK0JBQStCLENBQUM7aUJBQ3pQLENBQUM7U0FDRixDQUFDO0lBQ0gsQ0FBQztDQUNELENBQUE7QUE5QlkscUJBQXFCO0lBRy9CLFdBQUEsMkJBQTJCLENBQUE7R0FIakIscUJBQXFCLENBOEJqQyJ9