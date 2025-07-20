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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { localize } from '../../../../nls.js';
import { FileOperationError, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { IUserDataProfileService } from '../common/userDataProfile.js';
let McpResourceInitializer = class McpResourceInitializer {
    constructor(userDataProfileService, fileService, logService) {
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.logService = logService;
    }
    async initialize(content) {
        const mcpContent = JSON.parse(content);
        if (!mcpContent.mcp) {
            this.logService.info(`Initializing Profile: No MCP servers to apply...`);
            return;
        }
        await this.fileService.writeFile(this.userDataProfileService.currentProfile.mcpResource, VSBuffer.fromString(mcpContent.mcp));
    }
};
McpResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IFileService),
    __param(2, ILogService)
], McpResourceInitializer);
export { McpResourceInitializer };
let McpProfileResource = class McpProfileResource {
    constructor(fileService, logService) {
        this.fileService = fileService;
        this.logService = logService;
    }
    async getContent(profile) {
        const mcpContent = await this.getMcpResourceContent(profile);
        return JSON.stringify(mcpContent);
    }
    async getMcpResourceContent(profile) {
        const mcpContent = await this.getMcpContent(profile);
        return { mcp: mcpContent };
    }
    async apply(content, profile) {
        const mcpContent = JSON.parse(content);
        if (!mcpContent.mcp) {
            this.logService.info(`Importing Profile (${profile.name}): No MCP servers to apply...`);
            return;
        }
        await this.fileService.writeFile(profile.mcpResource, VSBuffer.fromString(mcpContent.mcp));
    }
    async getMcpContent(profile) {
        try {
            const content = await this.fileService.readFile(profile.mcpResource);
            return content.value.toString();
        }
        catch (error) {
            // File not found
            if (error instanceof FileOperationError && error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return null;
            }
            else {
                throw error;
            }
        }
    }
};
McpProfileResource = __decorate([
    __param(0, IFileService),
    __param(1, ILogService)
], McpProfileResource);
export { McpProfileResource };
let McpResourceTreeItem = class McpResourceTreeItem {
    constructor(profile, uriIdentityService, instantiationService) {
        this.profile = profile;
        this.uriIdentityService = uriIdentityService;
        this.instantiationService = instantiationService;
        this.type = "mcp" /* ProfileResourceType.Mcp */;
        this.handle = "mcp" /* ProfileResourceType.Mcp */;
        this.label = { label: localize('mcp', "MCP Servers") };
        this.collapsibleState = TreeItemCollapsibleState.Expanded;
    }
    async getChildren() {
        return [{
                handle: this.profile.mcpResource.toString(),
                resourceUri: this.profile.mcpResource,
                collapsibleState: TreeItemCollapsibleState.None,
                parent: this,
                accessibilityInformation: {
                    label: this.uriIdentityService.extUri.basename(this.profile.mcpResource)
                },
                command: {
                    id: API_OPEN_EDITOR_COMMAND_ID,
                    title: '',
                    arguments: [this.profile.mcpResource, undefined, undefined]
                }
            }];
    }
    async hasContent() {
        const mcpContent = await this.instantiationService.createInstance(McpProfileResource).getMcpResourceContent(this.profile);
        return mcpContent.mcp !== null;
    }
    async getContent() {
        return this.instantiationService.createInstance(McpProfileResource).getContent(this.profile);
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.mcp;
    }
};
McpResourceTreeItem = __decorate([
    __param(1, IUriIdentityService),
    __param(2, IInstantiationService)
], McpResourceTreeItem);
export { McpResourceTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUHJvZmlsZVJlc291cmNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFQcm9maWxlL2Jyb3dzZXIvbWNwUHJvZmlsZVJlc291cmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGtCQUFrQixFQUF1QixZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuSCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFN0YsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0YsT0FBTyxFQUEwQix3QkFBd0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzVGLE9BQU8sRUFBMEcsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQU14SyxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUFzQjtJQUVsQyxZQUMyQyxzQkFBK0MsRUFDMUQsV0FBeUIsRUFDMUIsVUFBdUI7UUFGWCwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBQzFELGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQzFCLGVBQVUsR0FBVixVQUFVLENBQWE7SUFFdEQsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBZTtRQUMvQixNQUFNLFVBQVUsR0FBd0IsSUFBSSxDQUFDLEtB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