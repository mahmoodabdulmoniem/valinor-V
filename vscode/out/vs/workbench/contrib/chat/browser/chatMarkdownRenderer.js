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
import { $ } from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { MarkdownRenderer } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import product from '../../../../platform/product/common/product.js';
import { REVEAL_IN_EXPLORER_COMMAND_ID } from '../../files/browser/fileConstants.js';
export const allowedChatMarkdownHtmlTags = [
    'b',
    'blockquote',
    'br',
    'code',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'li',
    'ol',
    'p',
    'pre',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul',
    'a',
    'img',
    // TODO@roblourens when we sanitize attributes in markdown source, we can ban these elements at that step. microsoft/vscode-copilot#5091
    // Not in the official list, but used for codicons and other vscode markdown extensions
    'span',
    'div',
];
/**
 * This wraps the MarkdownRenderer and applies sanitizer options needed for Chat.
 */
let ChatMarkdownRenderer = class ChatMarkdownRenderer extends MarkdownRenderer {
    constructor(options, languageService, openerService, hoverService, fileService, commandService) {
        super(options ?? {}, languageService, openerService);
        this.hoverService = hoverService;
        this.fileService = fileService;
        this.commandService = commandService;
    }
    render(markdown, options, outElement) {
        options = {
            ...options,
            remoteImageIsAllowed: (_uri) => false,
            sanitizerOptions: {
                replaceWithPlaintext: true,
                allowedTags: {
                    override: allowedChatMarkdownHtmlTags,
                },
                ...options?.sanitizerOptions,
                allowedProductProtocols: [product.urlProtocol]
            }
        };
        const mdWithBody = (markdown && markdown.supportHtml) ?
            {
                ...markdown,
                // dompurify uses DOMParser, which strips leading comments. Wrapping it all in 'body' prevents this.
                // The \n\n prevents marked.js from parsing the body contents as just text in an 'html' token, instead of actual markdown.
                value: `<body>\n\n${markdown.value}</body>`,
            }
            : markdown;
        const result = super.render(mdWithBody, options, outElement);
        // In some cases, the renderer can return text that is not inside a <p>,
        // but our CSS expects text to be in a <p> for margin to be applied properly.
        // So just normalize it.
        const lastChild = result.element.lastChild;
        if (lastChild?.nodeType === Node.TEXT_NODE && lastChild.textContent?.trim()) {
            lastChild.replaceWith($('p', undefined, lastChild.textContent));
        }
        return this.attachCustomHover(result);
    }
    attachCustomHover(result) {
        const store = new DisposableStore();
        result.element.querySelectorAll('a').forEach((element) => {
            if (element.title) {
                const title = element.title;
                element.title = '';
                store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), element, title));
            }
        });
        return {
            element: result.element,
            dispose: () => {
                result.dispose();
                store.dispose();
            }
        };
    }
    async openMarkdownLink(link, markdown) {
        try {
            const uri = URI.parse(link);
            if ((await this.fileService.stat(uri)).isDirectory) {
                return this.commandService.executeCommand(REVEAL_IN_EXPLORER_COMMAND_ID, uri);
            }
        }
        catch {
            // noop
        }
        return super.openMarkdownLink(link, markdown);
    }
};
ChatMarkdownRenderer = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService),
    __param(3, IHoverService),
    __param(4, IFileService),
    __param(5, ICommandService)
], ChatMarkdownRenderer);
export { ChatMarkdownRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0TWFya2Rvd25SZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFcEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQW1ELGdCQUFnQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDbkssT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQzlFLE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFDO0FBQ3JFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXJGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHO0lBQzFDLEdBQUc7SUFDSCxZQUFZO0lBQ1osSUFBSTtJQUNKLE1BQU07SUFDTixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJ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