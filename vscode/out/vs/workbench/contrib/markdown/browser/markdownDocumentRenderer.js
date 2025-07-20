/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basicMarkupHtmlTags, sanitizeHtml } from '../../../../base/browser/domSanitize.js';
import { allowedMarkdownHtmlAttributes } from '../../../../base/browser/markdownRenderer.js';
import * as marked from '../../../../base/common/marked/marked.js';
import { Schemas } from '../../../../base/common/network.js';
import { escape } from '../../../../base/common/strings.js';
import { tokenizeToString } from '../../../../editor/common/languages/textToHtmlTokenizer.js';
import { markedGfmHeadingIdPlugin } from './markedGfmHeadingIdPlugin.js';
export const DEFAULT_MARKDOWN_STYLES = `
body {
	padding: 10px 20px;
	line-height: 22px;
	max-width: 882px;
	margin: 0 auto;
}

body *:last-child {
	margin-bottom: 0;
}

img {
	max-width: 100%;
	max-height: 100%;
}

a {
	text-decoration: var(--text-link-decoration);
}

a:hover {
	text-decoration: underline;
}

a:focus,
input:focus,
select:focus,
textarea:focus {
	outline: 1px solid -webkit-focus-ring-color;
	outline-offset: -1px;
}

hr {
	border: 0;
	height: 2px;
	border-bottom: 2px solid;
}

h1 {
	padding-bottom: 0.3em;
	line-height: 1.2;
	border-bottom-width: 1px;
	border-bottom-style: solid;
}

h1, h2, h3 {
	font-weight: normal;
}

table {
	border-collapse: collapse;
}

th {
	text-align: left;
	border-bottom: 1px solid;
}

th,
td {
	padding: 5px 10px;
}

table > tbody > tr + tr > td {
	border-top-width: 1px;
	border-top-style: solid;
}

blockquote {
	margin: 0 7px 0 5px;
	padding: 0 16px 0 10px;
	border-left-width: 5px;
	border-left-style: solid;
}

code {
	font-family: "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace;
}

pre {
	padding: 16px;
	border-radius: 3px;
	overflow: auto;
}

pre code {
	font-family: var(--vscode-editor-font-family);
	font-weight: var(--vscode-editor-font-weight);
	font-size: var(--vscode-editor-font-size);
	line-height: 1.5;
	color: var(--vscode-editor-foreground);
	tab-size: 4;
}

.monaco-tokenized-source {
	white-space: pre;
}

/** Theming */

.pre {
	background-color: var(--vscode-textCodeBlock-background);
}

.vscode-high-contrast h1 {
	border-color: rgb(0, 0, 0);
}

.vscode-light th {
	border-color: rgba(0, 0, 0, 0.69);
}

.vscode-dark th {
	border-color: rgba(255, 255, 255, 0.69);
}

.vscode-light h1,
.vscode-light hr,
.vscode-light td {
	border-color: rgba(0, 0, 0, 0.18);
}

.vscode-dark h1,
.vscode-dark hr,
.vscode-dark td {
	border-color: rgba(255, 255, 255, 0.18);
}

@media (forced-colors: active) and (prefers-color-scheme: light){
	body {
		forced-color-adjust: none;
	}
}

@media (forced-colors: active) and (prefers-color-scheme: dark){
	body {
		forced-color-adjust: none;
	}
}
`;
const allowedProtocols = [
    Schemas.http,
    Schemas.https,
    Schemas.command,
];
function sanitize(documentContent, allowAllProtocols = false) {
    // TODO: Move most of these options to the callers
    return sanitizeHtml(documentContent, {
        allowedLinkProtocols: {
            override: allowAllProtocols ? '*' : allowedProtocols,
        },
        allowedTags: {
            override: [
                ...basicMarkupHtmlTags,
                'input',
                'select',
                'checkbox',
                'checklist',
            ],
        },
        allowedAttributes: {
            override: [
                ...allowedMarkdownHtmlAttributes,
                'data-command', 'name', 'id', 'role', 'tabindex',
                'x-dispatch',
                'required', 'checked', 'placeholder', 'when-checked', 'checked-on',
            ],
        }
    });
}
/**
 * Renders a string of markdown as a document.
 *
 * Uses VS Code's syntax highlighting code blocks.
 */
export async function renderMarkdownDocument(text, extensionService, languageService, options) {
    const m = new marked.Marked(MarkedHighlight.markedHighlight({
        async: true,
        async highlight(code, lang) {
            if (typeof lang !== 'string') {
                return escape(code);
            }
            await extensionService.whenInstalledExtensionsRegistered();
            if (options?.token?.isCancellationRequested) {
                return '';
            }
            const languageId = languageService.getLanguageIdByLanguageName(lang) ?? languageService.getLanguageIdByLanguageName(lang.split(/\s+|:|,|(?!^)\{|\?]/, 1)[0]);
            return tokenizeToString(languageService, code, languageId);
        }
    }), markedGfmHeadingIdPlugin(), ...(options?.markedExtensions ?? []));
    const raw = await m.parse(text, { async: true });
    if (options?.shouldSanitize ?? true) {
        return sanitize(raw, options?.allowUnknownProtocols ?? false);
    }
    else {
        return raw;
    }
}
var MarkedHighlight;
(function (MarkedHighlight) {
    // Copied from https://github.com/markedjs/marked-highlight/blob/main/src/index.js
    function markedHighlight(options) {
        if (typeof options === 'function') {
            options = {
                highlight: options,
            };
        }
        if (!options || typeof options.highlight !== 'function') {
            throw new Error('Must provide highlight function');
        }
        return {
            async: !!options.async,
            walkTokens(token) {
                if (token.type !== 'code') {
                    return;
                }
                if (options.async) {
                    return Promise.resolve(options.highlight(token.text, token.lang)).then(updateToken(token));
                }
                const code = options.highlight(token.text, token.lang);
                if (code instanceof Promise) {
                    throw new Error('markedHighlight is not set to async but the highlight function is async. Set the async option to true on markedHighlight to await the async highlight function.');
                }
                updateToken(token)(code);
            },
            renderer: {
                code({ text, lang, escaped }) {
                    const classAttr = lang
                        ? ` class="language-${escape(lang)}"`
                        : '';
                    text = text.replace(/\n$/, '');
                    return `<pre><code${classAttr}>${escaped ? text : escape(text, true)}\n</code></pre>`;
                },
            },
        };
    }
    MarkedHighlight.markedHighlight = markedHighlight;
    function updateToken(token) {
        return (code) => {
            if (typeof code === 'string' && code !== token.text) {
                token.escaped = true;
                token.text = code;
            }
        };
    }
    // copied from marked helpers
    const escapeTest = /[&<>"']/;
    const escapeReplace = new RegExp(escapeTest.source, 'g');
    const escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
    const escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, 'g');
    const escapeReplacement = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        [`'`]: '&#39;',
    };
    const getEscapeReplacement = (ch) => escapeReplacement[ch];
    function escape(html, encode) {
        if (encode) {
            if (escapeTest.test(html)) {
                return html.replace(escapeReplace, getEscapeReplacement);
            }
        }
        else {
            if (escapeTestNoEncode.test(html)) {
                return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
            }
        }
        return html;
    }
})(MarkedHighlight || (MarkedHighlight = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25Eb2N1bWVudFJlbmRlcmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZG93bi9icm93c2VyL21hcmtkb3duRG9jdW1lbnRSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFN0YsT0FBTyxLQUFLLE1BQU0sTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTlGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXpFLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQTRJdEMsQ0FBQztBQUVGLE1BQU0sZ0JBQWdCLEdBQUc7SUFDeEIsT0FBTyxDQUFDLElBQUk7SUFDWixPQUFPLENBQUMsS0FBSztJQUNiLE9BQU8sQ0FBQyxPQUFPO0NBQ2YsQ0FBQztBQUVGLFNBQVMsUUFBUSxDQUFDLGVBQXVCLEVBQUUsaUJBQWlCLEdBQUcsS0FBSztJQUNuRSxrREFBa0Q7SUFD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