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
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { extname } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWebContentExtractorService } from '../../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { detectEncodingFromBuffer } from '../../../../services/textfile/common/encoding.js';
import { ChatImageMimeType } from '../../common/languageModels.js';
import { ToolDataSource } from '../../common/languageModelToolsService.js';
import { InternalFetchWebPageToolId } from '../../common/tools/tools.js';
export const FetchWebPageToolData = {
    id: InternalFetchWebPageToolId,
    displayName: 'Fetch Web Page',
    canBeReferencedInPrompt: false,
    modelDescription: localize('fetchWebPage.modelDescription', 'Fetches the main content from a web page. This tool is useful for summarizing or analyzing the content of a webpage.'),
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            urls: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: localize('fetchWebPage.urlsDescription', 'An array of URLs to fetch content from.')
            }
        },
        required: ['urls']
    }
};
let FetchWebPageTool = class FetchWebPageTool {
    constructor(_readerModeService, _fileService) {
        this._readerModeService = _readerModeService;
        this._fileService = _fileService;
        this._alreadyApprovedDomains = new ResourceSet();
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const urls = invocation.parameters.urls || [];
        const { webUris, fileUris, invalidUris } = this._parseUris(urls);
        const allValidUris = [...webUris.values(), ...fileUris.values()];
        if (!allValidUris.length && invalidUris.size === 0) {
            return {
                content: [{ kind: 'text', value: localize('fetchWebPage.noValidUrls', 'No valid URLs provided.') }]
            };
        }
        // We approved these via confirmation, so mark them as "approved" in this session
        // if they are not approved via the trusted domain service.
        for (const uri of webUris.values()) {
            this._alreadyApprovedDomains.add(uri);
        }
        // Get contents from web URIs
        const webContents = webUris.size > 0 ? await this._readerModeService.extract([...webUris.values()]) : [];
        // Get contents from file URIs
        const fileContents = [];
        const successfulFileUris = [];
        for (const uri of fileUris.values()) {
            try {
                const fileContent = await this._fileService.readFile(uri, undefined, token);
                // Check if this is a supported image type first
                const imageMimeType = this._getSupportedImageMimeType(uri);
                if (imageMimeType) {
                    // For supported image files, return as IToolResultDataPart
                    fileContents.push({
                        kind: 'data',
                        value: {
                            mimeType: imageMimeType,
                            data: fileContent.value
                        }
                    });
                }
                else {
                    // Check if the content is binary
                    const detected = detectEncodingFromBuffer({ buffer: fileContent.value, bytesRead: fileContent.value.byteLength });
                    if (detected.seemsBinary) {
                        // For binary files, return a message indicating they're not supported
                        // We do this for now until the tools that leverage this internal tool can support binary content
                        fileContents.push(localize('fetchWebPage.binaryNotSupported', 'Binary files are not supported at the moment.'));
                    }
                    else {
                        // For text files, convert to string
                        fileContents.push(fileContent.value.toString());
                    }
                }
                successfulFileUris.push(uri);
            }
            catch (error) {
                // If file service can't read it, treat as invalid
                fileContents.push(undefined);
            }
        }
        // Build results array in original order
        const results = [];
        let webIndex = 0;
        let fileIndex = 0;
        for (const url of urls) {
            if (invalidUris.has(url)) {
                results.push(undefined);
            }
            else if (webUris.has(url)) {
                results.push(webContents[webIndex]);
                webIndex++;
            }
            else if (fileUris.has(url)) {
                results.push(fileContents[fileIndex]);
                fileIndex++;
            }
            else {
                results.push(undefined);
            }
        }
        // Only include URIs that actually had content successfully fetched
        const actuallyValidUris = [...webUris.values(), ...successfulFileUris];
        return {
            content: this._getPromptPartsForResults(results),
            toolResultDetails: actuallyValidUris
        };
    }
    async prepareToolInvocation(context, token) {
        const { webUris, fileUris, invalidUris } = this._parseUris(context.parameters.urls);
        // Check which file URIs can actually be read
        const validFileUris = [];
        const additionalInvalidUrls = [];
        for (const [originalUrl, uri] of fileUris.entries()) {
            try {
                await this._fileService.stat(uri);
                validFileUris.push(uri);
            }
            catch (error) {
                // If file service can't stat it, treat as invalid
                additionalInvalidUrls.push(originalUrl);
            }
        }
        const invalid = [...Array.from(invalidUris), ...additionalInvalidUrls];
        const valid = [...webUris.values(), ...validFileUris];
        const urlsNeedingConfirmation = webUris.size > 0 ? [...webUris.values()].filter(url => !this._alreadyApprovedDomains.has(url)) : [];
        const pastTenseMessage = invalid.length
            ? invalid.length > 1
                // If there are multiple invalid URLs, show them all
                ? new MarkdownString(localize('fetchWebPage.pastTenseMessage.plural', 'Fetched {0} resources, but the following were invalid URLs:\n\n{1}\n\n', valid.length, invalid.map(url => `- ${url}`).join('\n')))
                // If there is only one invalid URL, show it
                : new MarkdownString(localize('fetchWebPage.pastTenseMessage.singular', 'Fetched resource, but the following was an invalid URL:\n\n{0}\n\n', invalid[0]))
            // No invalid URLs
            : new MarkdownString();
        const invocationMessage = new MarkdownString();
        if (valid.length > 1) {
            pastTenseMessage.appendMarkdown(localize('fetchWebPage.pastTenseMessageResult.plural', 'Fetched {0} resources', valid.length));
            invocationMessage.appendMarkdown(localize('fetchWebPage.invocationMessage.plural', 'Fetching {0} resources', valid.length));
        }
        else if (valid.length === 1) {
            const url = valid[0].toString();
            // If the URL is too long or it's a file url, show it as a link... otherwise, show it as plain text
            if (url.length > 400 || validFileUris.length === 1) {
                pastTenseMessage.appendMarkdown(localize({
                    key: 'fetchWebPage.pastTenseMessageResult.singularAsLink',
                    comment: [
                        // Make sure the link syntax is correct
                        '{Locked="]({0})"}',
                    ]
                }, 'Fetched [resource]({0})', url));
                invocationMessage.appendMarkdown(localize({
                    key: 'fetchWebPage.invocationMessage.singularAsLink',
                    comment: [
                        // Make sure the link syntax is correct
                        '{Locked="]({0})"}',
                    ]
                }, 'Fetching [resource]({0})', url));
            }
            else {
                pastTenseMessage.appendMarkdown(localize('fetchWebPage.pastTenseMessageResult.singular', 'Fetched {0}', url));
                invocationMessage.appendMarkdown(localize('fetchWebPage.invocationMessage.singular', 'Fetching {0}', url));
            }
        }
        const result = { invocationMessage, pastTenseMessage };
        if (urlsNeedingConfirmation.length) {
            let confirmationTitle;
            let confirmationMessage;
            if (urlsNeedingConfirmation.length === 1) {
                confirmationTitle = localize('fetchWebPage.confirmationTitle.singular', 'Fetch web page?');
                confirmationMessage = new MarkdownString(urlsNeedingConfirmation[0].toString() + '\n\n$(info) ' +
                    localize('fetchWebPage.confirmationMessage.singular', 'Web content may contain malicious code or attempt prompt injection attacks.'), { supportThemeIcons: true });
            }
            else {
                confirmationTitle = localize('fetchWebPage.confirmationTitle.plural', 'Fetch web pages?');
                confirmationMessage = new MarkdownString(urlsNeedingConfirmation.map(uri => `- ${uri.toString()}`).join('\n') + '\n\n$(info) ' +
                    localize('fetchWebPage.confirmationMessage.plural', 'Web content may contain malicious code or attempt prompt injection attacks.'), { supportThemeIcons: true });
            }
            result.confirmationMessages = { title: confirmationTitle, message: confirmationMessage, allowAutoConfirm: true };
        }
        return result;
    }
    _parseUris(urls) {
        const webUris = new Map();
        const fileUris = new Map();
        const invalidUris = new Set();
        urls?.forEach(url => {
            try {
                const uriObj = URI.parse(url);
                if (uriObj.scheme === 'http' || uriObj.scheme === 'https') {
                    webUris.set(url, uriObj);
                }
                else {
                    // Try to handle other schemes via file service
                    fileUris.set(url, uriObj);
                }
            }
            catch (e) {
                invalidUris.add(url);
            }
        });
        return { webUris, fileUris, invalidUris };
    }
    _getPromptPartsForResults(results) {
        return results.map(value => {
            if (!value) {
                return {
                    kind: 'text',
                    value: localize('fetchWebPage.invalidUrl', 'Invalid URL')
                };
            }
            else if (typeof value === 'string') {
                return {
                    kind: 'text',
                    value: value
                };
            }
            else {
                // This is an IToolResultDataPart
                return value;
            }
        });
    }
    _getSupportedImageMimeType(uri) {
        const ext = extname(uri.path).toLowerCase();
        switch (ext) {
            case '.png':
                return ChatImageMimeType.PNG;
            case '.jpg':
            case '.jpeg':
                return ChatImageMimeType.JPEG;
            case '.gif':
                return ChatImageMimeType.GIF;
            case '.webp':
                return ChatImageMimeType.WEBP;
            case '.bmp':
                return ChatImageMimeType.BMP;
            default:
                return undefined;
        }
    }
};
FetchWebPageTool = __decorate([
    __param(0, IWebContentExtractorService),
    __param(1, IFileService)
], FetchWebPageTool);
export { FetchWebPageTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2hQYWdlVG9vbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9lbGVjdHJvbi1icm93c2VyL3Rvb2xzL2ZldGNoUGFnZVRvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0UsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkVBQTJFLENBQUM7QUFDeEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFpTCxjQUFjLEVBQWdCLE1BQU0sMkNBQTJDLENBQUM7QUFDeFEsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFekUsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQWM7SUFDOUMsRUFBRSxFQUFFLDBCQUEwQjtJQUM5QixXQUFXLEVBQUUsZ0JBQWdCO0lBQzdCLHVCQUF1QixFQUFFLEtBQUs7SUFDOUIsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLCtCQUErQixFQUFFLHNIQUFzSCxDQUFDO0lBQ25MLE1BQU0sRUFBRSxjQUFj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