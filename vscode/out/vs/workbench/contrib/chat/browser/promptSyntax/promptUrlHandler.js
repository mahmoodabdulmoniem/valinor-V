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
import { streamToBuffer, VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IRequestService } from '../../../../../platform/request/common/request.js';
import { IURLService } from '../../../../../platform/url/common/url.js';
import { askForPromptFileName } from './pickers/askForPromptName.js';
import { askForPromptSourceFolder } from './pickers/askForPromptSourceFolder.js';
import { getCleanPromptName } from '../../common/promptSyntax/config/promptFileLocations.js';
import { PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { localize } from '../../../../../nls.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { Schemas } from '../../../../../base/common/network.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { mainWindow } from '../../../../../base/browser/window.js';
// example URL: code-oss:chat-prompt/install?url=https://gist.githubusercontent.com/aeschli/43fe78babd5635f062aef0195a476aad/raw/dfd71f60058a4dd25f584b55de3e20f5fd580e63/filterEvenNumbers.prompt.md
let PromptUrlHandler = class PromptUrlHandler extends Disposable {
    static { this.ID = 'workbench.contrib.promptUrlHandler'; }
    constructor(urlService, notificationService, requestService, instantiationService, fileService, openerService, logService, dialogService, hostService) {
        super();
        this.notificationService = notificationService;
        this.requestService = requestService;
        this.instantiationService = instantiationService;
        this.fileService = fileService;
        this.openerService = openerService;
        this.logService = logService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        this._register(urlService.registerHandler(this));
    }
    async handleURL(uri) {
        let promptType;
        switch (uri.path) {
            case 'chat-prompt/install':
                promptType = PromptsType.prompt;
                break;
            case 'chat-instructions/install':
                promptType = PromptsType.instructions;
                break;
            case 'chat-mode/install':
                promptType = PromptsType.mode;
                break;
            default:
                return false;
        }
        try {
            const query = decodeURIComponent(uri.query);
            if (!query || !query.startsWith('url=')) {
                return true;
            }
            const urlString = query.substring(4);
            const url = URI.parse(urlString);
            if (url.scheme !== Schemas.https && url.scheme !== Schemas.http) {
                this.logService.error(`[PromptUrlHandler] Invalid URL: ${urlString}`);
                return true;
            }
            await this.hostService.focus(mainWindow);
            if (await this.shouldBlockInstall(promptType, url)) {
                return true;
            }
            const result = await this.requestService.request({ type: 'GET', url: urlString }, CancellationToken.None);
            if (result.res.statusCode !== 200) {
                this.logService.error(`[PromptUrlHandler] Failed to fetch URL: ${urlString}`);
                this.notificationService.error(localize('failed', 'Failed to fetch URL: {0}', urlString));
                return true;
            }
            const responseData = (await streamToBuffer(result.stream)).toString();
            const newFolder = await this.instantiationService.invokeFunction(askForPromptSourceFolder, promptType);
            if (!newFolder) {
                return true;
            }
            const newName = await this.instantiationService.invokeFunction(askForPromptFileName, promptType, newFolder.uri, getCleanPromptName(url));
            if (!newName) {
                return true;
            }
            const promptUri = URI.joinPath(newFolder.uri, newName);
            await this.fileService.createFolder(newFolder.uri);
            await this.fileService.createFile(promptUri, VSBuffer.fromString(responseData));
            await this.openerService.open(promptUri);
            return true;
        }
        catch (error) {
            this.logService.error(`Error handling prompt URL ${uri.toString()}`, error);
            return true;
        }
    }
    async shouldBlockInstall(promptType, url) {
        let uriLabel = url.toString();
        if (uriLabel.length > 50) {
            uriLabel = `${uriLabel.substring(0, 35)}...${uriLabel.substring(uriLabel.length - 15)}`;
        }
        const detail = new MarkdownString('', { supportHtml: true });
        detail.appendMarkdown(localize('confirmOpenDetail2', "This will access {0}.\n\n", `[${uriLabel}](${url.toString()})`));
        detail.appendMarkdown(localize('confirmOpenDetail3', "If you did not initiate this request, it may represent an attempted attack on your system. Unless you took an explicit action to initiate this request, you should press 'No'"));
        let message;
        switch (promptType) {
            case PromptsType.prompt:
                message = localize('confirmInstallPrompt', "An external application wants to create a prompt file with content from a URL. Do you want to continue by selecting a destination folder and name?");
                break;
            case PromptsType.instructions:
                message = localize('confirmInstallInstructions', "An external application wants to create an instructions file with content from a URL. Do you want to continue by selecting a destination folder and name?");
                break;
            default:
                message = localize('confirmInstallMode', "An external application wants to create a chat mode with content from a URL. Do you want to continue by selecting a destination folder and name?");
                break;
        }
        const { confirmed } = await this.dialogService.confirm({
            type: 'warning',
            primaryButton: localize({ key: 'yesButton', comment: ['&& denotes a mnemonic'] }, "&&Yes"),
            cancelButton: localize('noButton', "No"),
            message,
            custom: {
                markdownDetails: [{
                        markdown: detail
                    }]
            }
        });
        return !confirmed;
    }
};
PromptUrlHandler = __decorate([
    __param(0, IURLService),
    __param(1, INotificationService),
    __param(2, IRequestService),
    __param(3, IInstantiationService),
    __param(4, IFileService),
    __param(5, IOpenerService),
    __param(6, ILogService),
    __param(7, IDialogService),
    __param(8, IHostService)
], PromptUrlHandler);
export { PromptUrlHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VXJsSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9wcm9tcHRVcmxIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNwRixPQUFPLEVBQWUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFckYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDckUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFB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