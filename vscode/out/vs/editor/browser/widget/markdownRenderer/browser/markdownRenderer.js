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
var MarkdownRenderer_1;
import { renderMarkdown } from '../../../../../base/browser/markdownRenderer.js';
import { createTrustedTypesPolicy } from '../../../../../base/browser/trustedTypes.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../common/languages/modesRegistry.js';
import { tokenizeToString } from '../../../../common/languages/textToHtmlTokenizer.js';
import { applyFontInfo } from '../../../config/domFontInfo.js';
import './renderedMarkdown.css';
/**
 * Markdown renderer that can render codeblocks with the editor mechanics. This
 * renderer should always be preferred.
 */
let MarkdownRenderer = class MarkdownRenderer {
    static { MarkdownRenderer_1 = this; }
    static { this._ttpTokenizer = createTrustedTypesPolicy('tokenizeToString', {
        createHTML(html) {
            return html;
        }
    }); }
    constructor(_options, _languageService, _openerService) {
        this._options = _options;
        this._languageService = _languageService;
        this._openerService = _openerService;
    }
    render(markdown, options, outElement) {
        if (!markdown) {
            const element = outElement ?? document.createElement('span');
            return { element, dispose: () => { } };
        }
        const disposables = new DisposableStore();
        const rendered = disposables.add(renderMarkdown(markdown, { ...this._getRenderOptions(markdown, disposables), ...options }, outElement));
        rendered.element.classList.add('rendered-markdown');
        return {
            element: rendered.element,
            dispose: () => disposables.dispose()
        };
    }
    _getRenderOptions(markdown, disposables) {
        return {
            codeBlockRenderer: async (languageAlias, value) => {
                // In markdown,
                // it is possible that we stumble upon language aliases (e.g.js instead of javascript)
                // it is possible no alias is given in which case we fall back to the current editor lang
                let languageId;
                if (languageAlias) {
                    languageId = this._languageService.getLanguageIdByLanguageName(languageAlias);
                }
                else if (this._options.editor) {
                    languageId = this._options.editor.getModel()?.getLanguageId();
                }
                if (!languageId) {
                    languageId = PLAINTEXT_LANGUAGE_ID;
                }
                const html = await tokenizeToString(this._languageService, value, languageId);
                const element = document.createElement('span');
                element.innerHTML = (MarkdownRenderer_1._ttpTokenizer?.createHTML(html) ?? html);
                // use "good" font
                if (this._options.editor) {
                    const fontInfo = this._options.editor.getOption(59 /* EditorOption.fontInfo */);
                    applyFontInfo(element, fontInfo);
                }
                else if (this._options.codeBlockFontFamily) {
                    element.style.fontFamily = this._options.codeBlockFontFamily;
                }
                if (this._options.codeBlockFontSize !== undefined) {
                    element.style.fontSize = this._options.codeBlockFontSize;
                }
                return element;
            },
            actionHandler: {
                callback: (link) => this.openMarkdownLink(link, markdown),
                disposables
            }
        };
    }
    async openMarkdownLink(link, markdown) {
        await openLinkFromMarkdown(this._openerService, link, markdown.isTrusted);
    }
};
MarkdownRenderer = MarkdownRenderer_1 = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService)
], MarkdownRenderer);
export { MarkdownRenderer };
export async function openLinkFromMarkdown(openerService, link, isTrusted, skipValidation) {
    try {
        return await openerService.open(link, {
            fromUserGesture: true,
            allowContributedOpeners: true,
            allowCommands: toAllowCommandsOption(isTrusted),
            skipValidation
        });
    }
    catch (e) {
        onUnexpectedError(e);
        return false;
    }
}
function toAllowCommandsOption(isTrusted) {
    if (isTrusted === true) {
        return true; // Allow all commands
    }
    if (isTrusted && Array.isArray(isTrusted.enabledCommands)) {
        return isTrusted.enabledCommands; // Allow subset of commands
    }
    return false; // Block commands
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25SZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L21hcmtkb3duUmVuZGVyZXIvYnJvd3Nlci9tYXJrZG93blJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQXlCLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFFakYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRS9ELE9BQU8sd0JBQXdCLENBQUM7QUFZaEM7OztHQUdHO0FBQ0ksSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBZ0I7O2FBRWIsa0JBQWEsR0FBRyx3QkFBd0IsQ0FBQyxrQkFBa0IsRUFBRTtRQUMzRSxVQUFVLENBQUMsSUFBWTtZQUN0QixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7S0FDRCxDQUFDLEFBSjBCLENBSXpCO0lBRUgsWUFDa0IsUUFBa0MsRUFDaEIsZ0JBQWtDLEVBQ3BDLGNBQThCO1FBRjlDLGFBQVEsR0FBUixRQUFRLENB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