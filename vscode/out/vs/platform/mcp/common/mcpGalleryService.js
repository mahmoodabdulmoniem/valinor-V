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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { dirname, joinPath } from '../../../base/common/resources.js';
import { uppercaseFirstLetter } from '../../../base/common/strings.js';
import { isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, asText, IRequestService } from '../../request/common/request.js';
import { mcpGalleryServiceUrlConfig } from './mcpManagement.js';
let McpGalleryService = class McpGalleryService extends Disposable {
    constructor(configurationService, requestService, fileService, productService, logService) {
        super();
        this.configurationService = configurationService;
        this.requestService = requestService;
        this.fileService = fileService;
        this.productService = productService;
        this.logService = logService;
    }
    isEnabled() {
        return this.getMcpGalleryUrl() !== undefined;
    }
    async query(options, token = CancellationToken.None) {
        let { servers } = await this.fetchGallery(token);
        if (options?.text) {
            const searchText = options.text.toLowerCase();
            servers = servers.filter(item => item.name.toLowerCase().includes(searchText) || item.description.toLowerCase().includes(searchText));
        }
        const galleryServers = [];
        for (const item of servers) {
            galleryServers.push(this.toGalleryMcpServer(item));
        }
        return galleryServers;
    }
    async getMcpServers(names) {
        const mcpUrl = this.getMcpGalleryUrl() ?? this.productService.extensionsGallery?.mcpUrl;
        if (!mcpUrl) {
            return [];
        }
        const { servers } = await this.fetchGallery(mcpUrl, CancellationToken.None);
        const filteredServers = servers.filter(item => names.includes(item.name));
        return filteredServers.map(item => this.toGalleryMcpServer(item));
    }
    async getManifest(gallery, token) {
        if (gallery.manifest) {
            return gallery.manifest;
        }
        if (!gallery.manifestUrl) {
            throw new Error(`No manifest URL found for ${gallery.name}`);
        }
        const uri = URI.parse(gallery.manifestUrl);
        if (uri.scheme === Schemas.file) {
            try {
                const content = await this.fileService.readFile(uri);
                const data = content.value.toString();
                return JSON.parse(data);
            }
            catch (error) {
                this.logService.error(`Failed to read file from ${uri}: ${error}`);
            }
        }
        const context = await this.requestService.request({
            type: 'GET',
            url: gallery.manifestUrl,
        }, token);
        const result = await asJson(context);
        if (!result) {
            throw new Error(`Failed to fetch manifest from ${gallery.manifestUrl}`);
        }
        return {
            packages: result.packages,
            remotes: result.remotes,
        };
    }
    async getReadme(gallery, token) {
        const readmeUrl = gallery.readmeUrl;
        if (!readmeUrl) {
            return Promise.resolve(localize('noReadme', 'No README available'));
        }
        const uri = URI.parse(readmeUrl);
        if (uri.scheme === Schemas.file) {
            try {
                const content = await this.fileService.readFile(uri);
                return content.value.toString();
            }
            catch (error) {
                this.logService.error(`Failed to read file from ${uri}: ${error}`);
            }
        }
        if (uri.authority !== 'raw.githubusercontent.com') {
            return new MarkdownString(localize('readme.viewInBrowser', "You can find information about this server [here]({0})", readmeUrl)).value;
        }
        const context = await this.requestService.request({
            type: 'GET',
            url: readmeUrl,
        }, token);
        const result = await asText(context);
        if (!result) {
            throw new Error(`Failed to fetch README from ${readmeUrl}`);
        }
        return result;
    }
    toGalleryMcpServer(item) {
        let publisher = '';
        const nameParts = item.name.split('/');
        if (nameParts.length > 0) {
            const domainParts = nameParts[0].split('.');
            if (domainParts.length > 0) {
                publisher = domainParts[domainParts.length - 1]; // Always take the last part as owner
            }
        }
        let icon;
        if (this.productService.extensionsGallery?.mcpUrl !== this.getMcpGalleryUrl()) {
            if (item.iconUrl) {
                icon = {
                    light: item.iconUrl,
                    dark: item.iconUrl
                };
            }
            if (item.iconUrlLight && item.iconUrlDark) {
                icon = {
                    light: item.iconUrlLight,
                    dark: item.iconUrlDark
                };
            }
        }
        return {
            id: item.id ?? item.name,
            name: item.name,
            displayName: item.displayName ?? nameParts[nameParts.length - 1].split('-').map(s => uppercaseFirstLetter(s)).join(' '),
            url: item.repository?.url,
            description: item.description,
            version: item.version_detail?.version,
            lastUpdated: item.version_detail ? Date.parse(item.version_detail.release_date) : undefined,
            repositoryUrl: item.repository?.url,
            codicon: item.codicon,
            icon,
            readmeUrl: item.readmeUrl,
            manifestUrl: this.getManifestUrl(item),
            packageTypes: item.package_types ?? [],
            publisher,
            publisherDisplayName: item.publisher?.displayName,
            publisherDomain: item.publisher ? {
                link: item.publisher.url,
                verified: item.publisher.is_verified,
            } : undefined,
            manifest: item.manifest
        };
    }
    async fetchGallery(arg1, arg2) {
        const mcpGalleryUrl = isString(arg1) ? arg1 : this.getMcpGalleryUrl();
        if (!mcpGalleryUrl) {
            return Promise.resolve({ servers: [] });
        }
        const token = isString(arg1) ? arg2 : arg1;
        const uri = URI.parse(mcpGalleryUrl);
        if (uri.scheme === Schemas.file) {
            try {
                const content = await this.fileService.readFile(uri);
                const data = content.value.toString();
                return JSON.parse(data);
            }
            catch (error) {
                this.logService.error(`Failed to read file from ${uri}: ${error}`);
            }
        }
        const context = await this.requestService.request({
            type: 'GET',
            url: mcpGalleryUrl,
        }, token);
        const result = await asJson(context);
        return result || { servers: [] };
    }
    getManifestUrl(item) {
        const mcpGalleryUrl = this.getMcpGalleryUrl();
        if (!mcpGalleryUrl) {
            return undefined;
        }
        const uri = URI.parse(mcpGalleryUrl);
        if (uri.scheme === Schemas.file) {
            return joinPath(dirname(uri), item.id ?? item.name).fsPath;
        }
        return `${mcpGalleryUrl}/${item.id}`;
    }
    getMcpGalleryUrl() {
        if (this.productService.quality === 'stable') {
            return undefined;
        }
        return this.configurationService.getValue(mcpGalleryServiceUrlConfig);
    }
};
McpGalleryService = __decorate([
    __param(0, IConfigurationService),
    __param(1, IRequestService),
    __param(2, IFileService),
    __param(3, IProductService),
    __param(4, ILogService)
], McpGalleryService);
export { McpGalleryService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwR2FsbGVyeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21jcC9jb21tb24vbWNwR2FsbGVyeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRixPQUFPLEVBQTRFLDBCQUEwQixFQUFlLE1BQU0sb0JB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