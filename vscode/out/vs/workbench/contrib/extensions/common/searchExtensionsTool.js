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
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { EXTENSION_CATEGORIES } from '../../../../platform/extensions/common/extensions.js';
import { ToolDataSource } from '../../chat/common/languageModelToolsService.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
export const SearchExtensionsToolId = 'vscode_searchExtensions_internal';
export const SearchExtensionsToolData = {
    id: SearchExtensionsToolId,
    toolReferenceName: 'extensions',
    canBeReferencedInPrompt: true,
    icon: ThemeIcon.fromId(Codicon.extensions.id),
    displayName: localize('searchExtensionsTool.displayName', 'Search Extensions'),
    modelDescription: localize('searchExtensionsTool.modelDescription', "This is a tool for browsing Visual Studio Code Extensions Marketplace. It allows the model to search for extensions and retrieve detailed information about them. The model should use this tool whenever it needs to discover extensions or resolve information about known ones. To use the tool, the model has to provide the category of the extensions, relevant search keywords, or known extension IDs. Note that search results may include false positives, so reviewing and filtering is recommended."),
    userDescription: localize('searchExtensionsTool.userDescription', 'Search for extensions in the Visual Studio Code Extensions Marketplace'),
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            category: {
                type: 'string',
                description: 'The category of extensions to search for',
                enum: EXTENSION_CATEGORIES,
            },
            keywords: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: 'The keywords to search for',
            },
            ids: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: 'The ids of the extensions to search for',
            },
        },
    }
};
let SearchExtensionsTool = class SearchExtensionsTool {
    constructor(extensionWorkbenchService) {
        this.extensionWorkbenchService = extensionWorkbenchService;
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const params = invocation.parameters;
        if (!params.keywords?.length && !params.category && !params.ids?.length) {
            return {
                content: [{
                        kind: 'text',
                        value: localize('searchExtensionsTool.noInput', 'Please provide a category or keywords or ids to search for.')
                    }]
            };
        }
        const extensionsMap = new Map();
        const addExtension = (extensions) => {
            for (const extension of extensions) {
                if (extension.deprecationInfo || extension.isMalicious) {
                    continue;
                }
                extensionsMap.set(extension.identifier.id.toLowerCase(), {
                    id: extension.identifier.id,
                    name: extension.displayName,
                    description: extension.description,
                    installed: extension.state === 1 /* ExtensionState.Installed */,
                    installCount: extension.installCount ?? 0,
                    rating: extension.rating ?? 0,
                    categories: extension.categories ?? [],
                    tags: extension.gallery?.tags ?? []
                });
            }
        };
        const queryAndAddExtensions = async (text) => {
            const extensions = await this.extensionWorkbenchService.queryGallery({
                text,
                pageSize: 10,
                sortBy: "InstallCount" /* SortBy.InstallCount */
            }, token);
            if (extensions.firstPage.length) {
                addExtension(extensions.firstPage);
            }
        };
        // Search for extensions by their ids
        if (params.ids?.length) {
            const extensions = await this.extensionWorkbenchService.getExtensions(params.ids.map(id => ({ id })), token);
            addExtension(extensions);
        }
        if (params.keywords?.length) {
            for (const keyword of params.keywords ?? []) {
                if (keyword === 'featured') {
                    await queryAndAddExtensions('featured');
                }
                else {
                    let text = params.category ? `category:"${params.category}"` : '';
                    text = keyword ? `${text} ${keyword}`.trim() : text;
                    await queryAndAddExtensions(text);
                }
            }
        }
        else {
            await queryAndAddExtensions(`category:"${params.category}"`);
        }
        const result = Array.from(extensionsMap.values());
        return {
            content: [{
                    kind: 'text',
                    value: `Here are the list of extensions:\n${JSON.stringify(result)}\n. Important: Use the following format to display extensions to the user because there is a renderer available to parse these extensions in this format and display them with all details. So, do not describe about the extensions to the user.\n\`\`\`vscode-extensions\nextensionId1,extensionId2\n\`\`\`\n.`
                }],
            toolResultDetails: {
                input: JSON.stringify(params),
                output: [{ isText: true, value: JSON.stringify(result.map(extension => extension.id)) }]
            }
        };
    }
};
SearchExtensionsTool = __decorate([
    __param(0, IExtensionsWorkbenchService)
], SearchExtensionsTool);
export { SearchExtensionsTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRXh0ZW5zaW9uc1Rvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvY29tbW9uL3NlYXJjaEV4dGVuc2lvbnNUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzVGLE9BQU8sRUFBMkUsY0FBYyxFQUFnQixNQUFNLGdEQUFnRCxDQUFDO0FBQ3ZLLE9BQU8sRUFBOEIsMkJBQTJCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUVsRyxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxrQ0FBa0MsQ0FBQztBQUV6RSxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBYztJQUNsRCxFQUFFLEVBQUUsc0JBQXNCO0lBQzFCLGlCQUFpQixFQUFFLFlBQVk7SUFDL0IsdUJBQXVCLEVBQUUsSUFBSTtJQUM3QixJQUFJLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztJQUM3QyxXQUFXLEVBQUUsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLG1CQUFtQixDQUFDO0lBQzlFLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSxpZkFBaWYsQ0FBQztJQUN0akIsZUFBZSxFQUFFLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSx3RUFBd0UsQ0FBQztJQUMzSSxNQUFNLEVBQUUsY0FBYyxD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