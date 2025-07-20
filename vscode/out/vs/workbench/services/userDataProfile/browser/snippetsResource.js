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
import { ResourceSet } from '../../../../base/common/map.js';
import { localize } from '../../../../nls.js';
import { FileOperationError, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { TreeItemCollapsibleState } from '../../../common/views.js';
import { IUserDataProfileService } from '../common/userDataProfile.js';
let SnippetsResourceInitializer = class SnippetsResourceInitializer {
    constructor(userDataProfileService, fileService, uriIdentityService) {
        this.userDataProfileService = userDataProfileService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
    }
    async initialize(content) {
        const snippetsContent = JSON.parse(content);
        for (const key in snippetsContent.snippets) {
            const resource = this.uriIdentityService.extUri.joinPath(this.userDataProfileService.currentProfile.snippetsHome, key);
            await this.fileService.writeFile(resource, VSBuffer.fromString(snippetsContent.snippets[key]));
        }
    }
};
SnippetsResourceInitializer = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IFileService),
    __param(2, IUriIdentityService)
], SnippetsResourceInitializer);
export { SnippetsResourceInitializer };
let SnippetsResource = class SnippetsResource {
    constructor(fileService, uriIdentityService) {
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
    }
    async getContent(profile, excluded) {
        const snippets = await this.getSnippets(profile, excluded);
        return JSON.stringify({ snippets });
    }
    async apply(content, profile) {
        const snippetsContent = JSON.parse(content);
        for (const key in snippetsContent.snippets) {
            const resource = this.uriIdentityService.extUri.joinPath(profile.snippetsHome, key);
            await this.fileService.writeFile(resource, VSBuffer.fromString(snippetsContent.snippets[key]));
        }
    }
    async getSnippets(profile, excluded) {
        const snippets = {};
        const snippetsResources = await this.getSnippetsResources(profile, excluded);
        for (const resource of snippetsResources) {
            const key = this.uriIdentityService.extUri.relativePath(profile.snippetsHome, resource);
            const content = await this.fileService.readFile(resource);
            snippets[key] = content.value.toString();
        }
        return snippets;
    }
    async getSnippetsResources(profile, excluded) {
        const snippets = [];
        let stat;
        try {
            stat = await this.fileService.resolve(profile.snippetsHome);
        }
        catch (e) {
            // No snippets
            if (e instanceof FileOperationError && e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                return snippets;
            }
            else {
                throw e;
            }
        }
        for (const { resource } of stat.children || []) {
            if (excluded?.has(resource)) {
                continue;
            }
            const extension = this.uriIdentityService.extUri.extname(resource);
            if (extension === '.json' || extension === '.code-snippets') {
                snippets.push(resource);
            }
        }
        return snippets;
    }
};
SnippetsResource = __decorate([
    __param(0, IFileService),
    __param(1, IUriIdentityService)
], SnippetsResource);
export { SnippetsResource };
let SnippetsResourceTreeItem = class SnippetsResourceTreeItem {
    constructor(profile, instantiationService, uriIdentityService) {
        this.profile = profile;
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        this.type = "snippets" /* ProfileResourceType.Snippets */;
        this.label = { label: localize('snippets', "Snippets") };
        this.collapsibleState = TreeItemCollapsibleState.Collapsed;
        this.excludedSnippets = new ResourceSet();
        this.handle = this.profile.snippetsHome.toString();
    }
    async getChildren() {
        const snippetsResources = await this.instantiationService.createInstance(SnippetsResource).getSnippetsResources(this.profile);
        const that = this;
        return snippetsResources.map(resource => ({
            handle: resource.toString(),
            parent: that,
            resourceUri: resource,
            collapsibleState: TreeItemCollapsibleState.None,
            accessibilityInformation: {
                label: this.uriIdentityService.extUri.basename(resource),
            },
            checkbox: that.checkbox ? {
                get isChecked() { return !that.excludedSnippets.has(resource); },
                set isChecked(value) {
                    if (value) {
                        that.excludedSnippets.delete(resource);
                    }
                    else {
                        that.excludedSnippets.add(resource);
                    }
                },
                accessibilityInformation: {
                    label: localize('exclude', "Select Snippet {0}", this.uriIdentityService.extUri.basename(resource)),
                }
            } : undefined,
            command: {
                id: API_OPEN_EDITOR_COMMAND_ID,
                title: '',
                arguments: [resource, undefined, undefined]
            }
        }));
    }
    async hasContent() {
        const snippetsResources = await this.instantiationService.createInstance(SnippetsResource).getSnippetsResources(this.profile);
        return snippetsResources.length > 0;
    }
    async getContent() {
        return this.instantiationService.createInstance(SnippetsResource).getContent(this.profile, this.excludedSnippets);
    }
    isFromDefaultProfile() {
        return !this.profile.isDefault && !!this.profile.useDefaultFlags?.snippets;
    }
};
SnippetsResourceTreeItem = __decorate([
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService)
], SnippetsResourceTreeItem);
export { SnippetsResourceTreeItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNSZXNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhUHJvZmlsZS9icm93c2VyL3NuaXBwZXRzUmVzb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUU3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGtCQUFrQixFQUF1QixZQUFZLEVBQWEsTUFBTSw0Q0FBNEMsQ0FBQztBQUM5SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU3RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM3RixPQUFPLEVBQTBCLHdCQUF3QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDNUYsT0FBTyxFQUEwRyx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBTXhLLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTJCO0lBRXZDLFlBQzJDLHNCQUErQyxFQUMxRCxXQUF5QixFQUNsQixrQkFBdUM7UUFGbkMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUMxRCxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNsQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO0lBRTlFLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQWU7UUFDL0IsTUFBTSxlQUFlLEdBQXFCLElBQUksQ0FB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