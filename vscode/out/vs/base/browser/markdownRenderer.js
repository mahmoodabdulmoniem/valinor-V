/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../common/errors.js';
import { Event } from '../common/event.js';
import { escapeDoubleQuotes, parseHrefAndDimensions, removeMarkdownEscapes } from '../common/htmlContent.js';
import { markdownEscapeEscapedIcons } from '../common/iconLabels.js';
import { defaultGenerator } from '../common/idGenerator.js';
import { Lazy } from '../common/lazy.js';
import { DisposableStore } from '../common/lifecycle.js';
import * as marked from '../common/marked/marked.js';
import { parse } from '../common/marshalling.js';
import { FileAccess, Schemas } from '../common/network.js';
import { cloneAndChange } from '../common/objects.js';
import { dirname, resolvePath } from '../common/resources.js';
import { escape } from '../common/strings.js';
import { URI } from '../common/uri.js';
import * as DOM from './dom.js';
import * as domSanitize from './domSanitize.js';
import { DomEmitter } from './event.js';
import { StandardKeyboardEvent } from './keyboardEvent.js';
import { StandardMouseEvent } from './mouseEvent.js';
import { renderLabelWithIcons } from './ui/iconLabel/iconLabels.js';
const defaultMarkedRenderers = Object.freeze({
    image: ({ href, title, text }) => {
        let dimensions = [];
        let attributes = [];
        if (href) {
            ({ href, dimensions } = parseHrefAndDimensions(href));
            attributes.push(`src="${escapeDoubleQuotes(href)}"`);
        }
        if (text) {
            attributes.push(`alt="${escapeDoubleQuotes(text)}"`);
        }
        if (title) {
            attributes.push(`title="${escapeDoubleQuotes(title)}"`);
        }
        if (dimensions.length) {
            attributes = attributes.concat(dimensions);
        }
        return '<img ' + attributes.join(' ') + '>';
    },
    paragraph({ tokens }) {
        return `<p>${this.parser.parseInline(tokens)}</p>`;
    },
    link({ href, title, tokens }) {
        let text = this.parser.parseInline(tokens);
        if (typeof href !== 'string') {
            return '';
        }
        // Remove markdown escapes. Workaround for https://github.com/chjj/marked/issues/829
        if (href === text) { // raw link case
            text = removeMarkdownEscapes(text);
        }
        title = typeof title === 'string' ? escapeDoubleQuotes(removeMarkdownEscapes(title)) : '';
        href = removeMarkdownEscapes(href);
        // HTML Encode href
        href = href.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        return `<a href="${href}" title="${title || href}" draggable="false">${text}</a>`;
    },
});
/**
 * Low-level way create a html element from a markdown string.
 *
 * **Note** that for most cases you should be using {@link import('../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js').MarkdownRenderer MarkdownRenderer}
 * which comes with support for pretty code block rendering and which uses the default way of handling links.
 */
export function renderMarkdown(markdown, options = {}, target) {
    const disposables = new DisposableStore();
    let isDisposed = false;
    const markedInstance = new marked.Marked(...(options.markedOptions?.markedExtensions ?? []));
    const { renderer, codeBlocks, syncCodeBlocks } = createMarkdownRenderer(markedInstance, options, markdown);
    const value = preprocessMarkdownString(markdown);
    let renderedMarkdown;
    if (options.fillInIncompleteTokens) {
        // The defaults are applied by parse but not lexer()/parser(), and they need to be present
        const opts = {
            ...markedInstance.defaults,
            ...options.markedOptions,
            renderer
        };
        const tokens = markedInstance.lexer(value, opts);
        const newTokens = fillInIncompleteTokens(tokens);
        renderedMarkdown = markedInstance.parser(newTokens, opts);
    }
    else {
        renderedMarkdown = markedInstance.parse(value, { ...options?.markedOptions, renderer, async: false });
    }
    // Rewrite theme icons
    if (markdown.supportThemeIcons) {
        const elements = renderLabelWithIcons(renderedMarkdown);
        renderedMarkdown = elements.map(e => typeof e === 'string' ? e : e.outerHTML).join('');
    }
    const htmlParser = new DOMParser();
    const markdownHtmlDoc = htmlParser.parseFromString(sanitizeRenderedMarkdown({ isTrusted: markdown.isTrusted, ...options.sanitizerOptions }, renderedMarkdown), 'text/html');
    rewriteRenderedLinks(markdown, options, markdownHtmlDoc.body);
    const element = target ?? document.createElement('div');
    element.innerHTML = sanitizeRenderedMarkdown({ isTrusted: markdown.isTrusted, ...options.sanitizerOptions }, markdownHtmlDoc.body.innerHTML);
    if (codeBlocks.length > 0) {
        Promise.all(codeBlocks).then((tuples) => {
            if (isDisposed) {
                return;
            }
            const renderedElements = new Map(tuples);
            const placeholderElements = element.querySelectorAll(`div[data-code]`);
            for (const placeholderElement of placeholderElements) {
                const renderedElement = renderedElements.get(placeholderElement.dataset['code'] ?? '');
                if (renderedElement) {
                    DOM.reset(placeholderElement, renderedElement);
                }
            }
            options.asyncRenderCallback?.();
        });
    }
    else if (syncCodeBlocks.length > 0) {
        const renderedElements = new Map(syncCodeBlocks);
        const placeholderElements = element.querySelectorAll(`div[data-code]`);
        for (const placeholderElement of placeholderElements) {
            const renderedElement = renderedElements.get(placeholderElement.dataset['code'] ?? '');
            if (renderedElement) {
                DOM.reset(placeholderElement, renderedElement);
            }
        }
    }
    // Signal size changes for image tags
    if (options.asyncRenderCallback) {
        for (const img of element.getElementsByTagName('img')) {
            const listener = disposables.add(DOM.addDisposableListener(img, 'load', () => {
                listener.dispose();
                options.asyncRenderCallback();
            }));
        }
    }
    // Add event listeners for links
    if (options.actionHandler) {
        const onClick = options.actionHandler.disposables.add(new DomEmitter(element, 'click'));
        const onAuxClick = options.actionHandler.disposables.add(new DomEmitter(element, 'auxclick'));
        options.actionHandler.disposables.add(Event.any(onClick.event, onAuxClick.event)(e => {
            const mouseEvent = new StandardMouseEvent(DOM.getWindow(element), e);
            if (!mouseEvent.leftButton && !mouseEvent.middleButton) {
                return;
            }
            activateLink(markdown, options, mouseEvent);
        }));
        options.actionHandler.disposables.add(DOM.addDisposableListener(element, 'keydown', (e) => {
            const keyboardEvent = new StandardKeyboardEvent(e);
            if (!keyboardEvent.equals(10 /* KeyCode.Space */) && !keyboardEvent.equals(3 /* KeyCode.Enter */)) {
                return;
            }
            activateLink(markdown, options, keyboardEvent);
        }));
    }
    return {
        element,
        dispose: () => {
            isDisposed = true;
            disposables.dispose();
        }
    };
}
function rewriteRenderedLinks(markdown, options, root) {
    for (const el of root.querySelectorAll('img, audio, video, source')) {
        const src = el.getAttribute('src'); // Get the raw 'src' attribute value as text, not the resolved 'src'
        if (src) {
            let href = src;
            try {
                if (markdown.baseUri) { // absolute or relative local path, or file: uri
                    href = resolveWithBaseUri(URI.from(markdown.baseUri), href);
                }
            }
            catch (err) { }
            el.setAttribute('src', massageHref(markdown, href, true));
            if (options.remoteImageIsAllowed) {
                const uri = URI.parse(href);
                if (uri.scheme !== Schemas.file && uri.scheme !== Schemas.data && !options.remoteImageIsAllowed(uri)) {
                    el.replaceWith(DOM.$('', undefined, el.outerHTML));
                }
            }
        }
    }
    for (const el of root.querySelectorAll('a')) {
        const href = el.getAttribute('href'); // Get the raw 'href' attribute value as text, not the resolved 'href'
        el.setAttribute('href', ''); // Clear out href. We use the `data-href` for handling clicks instead
        if (!href
            || /^data:|javascript:/i.test(href)
            || (/^command:/i.test(href) && !markdown.isTrusted)
            || /^command:(\/\/\/)?_workbench\.downloadResource/i.test(href)) {
            // drop the link
            el.replaceWith(...el.childNodes);
        }
        else {
            let resolvedHref = massageHref(markdown, href, false);
            if (markdown.baseUri) {
                resolvedHref = resolveWithBaseUri(URI.from(markdown.baseUri), href);
            }
            el.dataset.href = resolvedHref;
        }
    }
}
function createMarkdownRenderer(marked, options, markdown) {
    const renderer = new marked.Renderer(options.markedOptions);
    renderer.image = defaultMarkedRenderers.image;
    renderer.link = defaultMarkedRenderers.link;
    renderer.paragraph = defaultMarkedRenderers.paragraph;
    // Will collect [id, renderedElement] tuples
    const codeBlocks = [];
    const syncCodeBlocks = [];
    if (options.codeBlockRendererSync) {
        renderer.code = ({ text, lang, raw }) => {
            const id = defaultGenerator.nextId();
            const value = options.codeBlockRendererSync(postProcessCodeBlockLanguageId(lang), text, raw);
            syncCodeBlocks.push([id, value]);
            return `<div class="code" data-code="${id}">${escape(text)}</div>`;
        };
    }
    else if (options.codeBlockRenderer) {
        renderer.code = ({ text, lang }) => {
            const id = defaultGenerator.nextId();
            const value = options.codeBlockRenderer(postProcessCodeBlockLanguageId(lang), text);
            codeBlocks.push(value.then(element => [id, element]));
            return `<div class="code" data-code="${id}">${escape(text)}</div>`;
        };
    }
    if (!markdown.supportHtml) {
        // Note: we always pass the output through dompurify after this so that we don't rely on
        // marked for real sanitization.
        renderer.html = ({ text }) => {
            if (options.sanitizerOptions?.replaceWithPlaintext) {
                return escape(text);
            }
            const match = markdown.isTrusted ? text.match(/^(<span[^>]+>)|(<\/\s*span>)$/) : undefined;
            return match ? text : '';
        };
    }
    return { renderer, codeBlocks, syncCodeBlocks };
}
function preprocessMarkdownString(markdown) {
    let value = markdown.value;
    // values that are too long will freeze the UI
    if (value.length > 100_000) {
        value = `${value.substr(0, 100_000)}…`;
    }
    // escape theme icons
    if (markdown.supportThemeIcons) {
        value = markdownEscapeEscapedIcons(value);
    }
    return value;
}
function activateLink(markdown, options, event) {
    const target = event.target.closest('a[data-href]');
    if (!DOM.isHTMLElement(target)) {
        return;
    }
    try {
        let href = target.dataset['href'];
        if (href) {
            if (markdown.baseUri) {
                href = resolveWithBaseUri(URI.from(markdown.baseUri), href);
            }
            options.actionHandler.callback(href, event);
        }
    }
    catch (err) {
        onUnexpectedError(err);
    }
    finally {
        event.preventDefault();
    }
}
function uriMassage(markdown, part) {
    let data;
    try {
        data = parse(decodeURIComponent(part));
    }
    catch (e) {
        // ignore
    }
    if (!data) {
        return part;
    }
    data = cloneAndChange(data, value => {
        if (markdown.uris && markdown.uris[value]) {
            return URI.revive(markdown.uris[value]);
        }
        else {
            return undefined;
        }
    });
    return encodeURIComponent(JSON.stringify(data));
}
function massageHref(markdown, href, isDomUri) {
    const data = markdown.uris && markdown.uris[href];
    let uri = URI.revive(data);
    if (isDomUri) {
        if (href.startsWith(Schemas.data + ':')) {
            return href;
        }
        if (!uri) {
            uri = URI.parse(href);
        }
        // this URI will end up as "src"-attribute of a dom node
        // and because of that special rewriting needs to be done
        // so that the URI uses a protocol that's understood by
        // browsers (like http or https)
        return FileAccess.uriToBrowserUri(uri).toString(true);
    }
    if (!uri) {
        return href;
    }
    if (URI.parse(href).toString() === uri.toString()) {
        return href; // no transformation performed
    }
    if (uri.query) {
        uri = uri.with({ query: uriMassage(markdown, uri.query) });
    }
    return uri.toString();
}
function postProcessCodeBlockLanguageId(lang) {
    if (!lang) {
        return '';
    }
    const parts = lang.split(/[\s+|:|,|\{|\?]/, 1);
    if (parts.length) {
        return parts[0];
    }
    return lang;
}
function resolveWithBaseUri(baseUri, href) {
    const hasScheme = /^\w[\w\d+.-]*:/.test(href);
    if (hasScheme) {
        return href;
    }
    if (baseUri.path.endsWith('/')) {
        return resolvePath(baseUri, href).toString();
    }
    else {
        return resolvePath(dirname(baseUri), href).toString();
    }
}
const selfClosingTags = ['area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
function sanitizeRenderedMarkdown(options, renderedMarkdown) {
    const sanitizerConfig = getSanitizerOptions(options);
    return domSanitize.sanitizeHtml(renderedMarkdown, sanitizerConfig);
}
export const allowedMarkdownHtmlAttributes = [
    'align',
    'autoplay',
    'alt',
    'checked',
    'class',
    'colspan',
    'controls',
    'disabled',
    'draggable',
    'height',
    'href',
    'loop',
    'muted',
    'playsinline',
    'poster',
    'rowspan',
    'src',
    'target',
    'title',
    'type',
    'width',
    'start',
    // Custom markdown attributes
    'data-code',
    'data-href',
    // These attributes are sanitized in the hooks
    'style',
    'class',
];
function getSanitizerOptions(options) {
    const allowedLinkSchemes = [
        Schemas.http,
        Schemas.https,
        Schemas.mailto,
        Schemas.file,
        Schemas.vscodeFileResource,
        Schemas.vscodeRemote,
        Schemas.vscodeRemoteResource,
        Schemas.vscodeNotebookCell
    ];
    if (options.isTrusted) {
        allowedLinkSchemes.push(Schemas.command);
    }
    if (options.allowedProductProtocols) {
        allowedLinkSchemes.push(...options.allowedProductProtocols);
    }
    return {
        // allowedTags should included everything that markdown renders to.
        // Since we have our own sanitize function for marked, it's possible we missed some tag so let dompurify make sure.
        // HTML tags that can result from markdown are from reading https://spec.commonmark.org/0.29/
        // HTML table tags that can result from markdown are from https://github.github.com/gfm/#tables-extension-
        allowedTags: {
            override: options.allowedTags?.override ?? domSanitize.basicMarkupHtmlTags
        },
        allowedAttributes: {
            override: allowedMarkdownHtmlAttributes,
        },
        allowedLinkProtocols: {
            override: allowedLinkSchemes,
        },
        allowedMediaProtocols: {
            override: [
                Schemas.http,
                Schemas.https,
                Schemas.data,
                Schemas.file,
                Schemas.vscodeFileResource,
                Schemas.vscodeRemote,
                Schemas.vscodeRemoteResource,
            ]
        },
        _do_not_use_hooks: {
            uponSanitizeAttribute: (element, e) => {
                if (options.customAttrSanitizer) {
                    const result = options.customAttrSanitizer(e.attrName, e.attrValue);
                    if (typeof result === 'string') {
                        if (result) {
                            e.attrValue = result;
                            e.keepAttr = true;
                        }
                        else {
                            e.keepAttr = false;
                        }
                    }
                    else {
                        e.keepAttr = result;
                    }
                    return;
                }
                if (e.attrName === 'style' || e.attrName === 'class') {
                    if (element.tagName === 'SPAN') {
                        if (e.attrName === 'style') {
                            e.keepAttr = /^(color\:(#[0-9a-fA-F]+|var\(--vscode(-[a-zA-Z0-9]+)+\));)?(background-color\:(#[0-9a-fA-F]+|var\(--vscode(-[a-zA-Z0-9]+)+\));)?(border-radius:[0-9]+px;)?$/.test(e.attrValue);
                            return;
                        }
                        else if (e.attrName === 'class') {
                            e.keepAttr = /^codicon codicon-[a-z\-]+( codicon-modifier-[a-z\-]+)?$/.test(e.attrValue);
                            return;
                        }
                    }
                    e.keepAttr = false;
                    return;
                }
                else if (element.tagName === 'INPUT' && element.attributes.getNamedItem('type')?.value === 'checkbox') {
                    if ((e.attrName === 'type' && e.attrValue === 'checkbox') || e.attrName === 'disabled' || e.attrName === 'checked') {
                        e.keepAttr = true;
                        return;
                    }
                    e.keepAttr = false;
                }
            },
            uponSanitizeElement: (element, e) => {
                if (e.tagName === 'input') {
                    if (element.attributes.getNamedItem('type')?.value === 'checkbox') {
                        element.setAttribute('disabled', '');
                    }
                    else if (!options.replaceWithPlaintext) {
                        element.remove();
                    }
                }
                if (options.replaceWithPlaintext && !e.allowedTags[e.tagName] && e.tagName !== 'body') {
                    if (element.parentElement) {
                        let startTagText;
                        let endTagText;
                        if (e.tagName === '#comment') {
                            startTagText = `<!--${element.textContent}-->`;
                        }
                        else {
                            const isSelfClosing = selfClosingTags.includes(e.tagName);
                            const attrString = element.attributes.length ?
                                ' ' + Array.from(element.attributes)
                                    .map(attr => `${attr.name}="${attr.value}"`)
                                    .join(' ')
                                : '';
                            startTagText = `<${e.tagName}${attrString}>`;
                            if (!isSelfClosing) {
                                endTagText = `</${e.tagName}>`;
                            }
                        }
                        const fragment = document.createDocumentFragment();
                        const textNode = element.parentElement.ownerDocument.createTextNode(startTagText);
                        fragment.appendChild(textNode);
                        const endTagTextNode = endTagText ? element.parentElement.ownerDocument.createTextNode(endTagText) : undefined;
                        while (element.firstChild) {
                            fragment.appendChild(element.firstChild);
                        }
                        if (endTagTextNode) {
                            fragment.appendChild(endTagTextNode);
                        }
                        if (element.nodeType === Node.COMMENT_NODE) {
                            // Workaround for https://github.com/cure53/DOMPurify/issues/1005
                            // The comment will be deleted in the next phase. However if we try to remove it now, it will cause
                            // an exception. Instead we insert the text node before the comment.
                            element.parentElement.insertBefore(fragment, element);
                        }
                        else {
                            element.parentElement.replaceChild(fragment, element);
                        }
                    }
                }
            }
        }
    };
}
/**
 * Renders `str` as plaintext, stripping out Markdown syntax if it's a {@link IMarkdownString}.
 *
 * For example `# Header` would be output as `Header`.
 */
export function renderAsPlaintext(str, options) {
    if (typeof str === 'string') {
        return str;
    }
    // values that are too long will freeze the UI
    let value = str.value ?? '';
    if (value.length > 100_000) {
        value = `${value.substr(0, 100_000)}…`;
    }
    const html = marked.parse(value, { async: false, renderer: options?.includeCodeBlocksFences ? plainTextWithCodeBlocksRenderer.value : plainTextRenderer.value });
    return sanitizeRenderedMarkdown({ isTrusted: false }, html)
        .toString()
        .replace(/&(#\d+|[a-zA-Z]+);/g, m => unescapeInfo.get(m) ?? m)
        .trim();
}
const unescapeInfo = new Map([
    ['&quot;', '"'],
    ['&nbsp;', ' '],
    ['&amp;', '&'],
    ['&#39;', '\''],
    ['&lt;', '<'],
    ['&gt;', '>'],
]);
function createPlainTextRenderer() {
    const renderer = new marked.Renderer();
    renderer.code = ({ text }) => {
        return escape(text);
    };
    renderer.blockquote = ({ text }) => {
        return text + '\n';
    };
    renderer.html = (_) => {
        return '';
    };
    renderer.heading = function ({ tokens }) {
        return this.parser.parseInline(tokens) + '\n';
    };
    renderer.hr = () => {
        return '';
    };
    renderer.list = function ({ items }) {
        return items.map(x => this.listitem(x)).join('\n') + '\n';
    };
    renderer.listitem = ({ text }) => {
        return text + '\n';
    };
    renderer.paragraph = function ({ tokens }) {
        return this.parser.parseInline(tokens) + '\n';
    };
    renderer.table = function ({ header, rows }) {
        return header.map(cell => this.tablecell(cell)).join(' ') + '\n' + rows.map(cells => cells.map(cell => this.tablecell(cell)).join(' ')).join('\n') + '\n';
    };
    renderer.tablerow = ({ text }) => {
        return text;
    };
    renderer.tablecell = function ({ tokens }) {
        return this.parser.parseInline(tokens);
    };
    renderer.strong = ({ text }) => {
        return text;
    };
    renderer.em = ({ text }) => {
        return text;
    };
    renderer.codespan = ({ text }) => {
        return escape(text);
    };
    renderer.br = (_) => {
        return '\n';
    };
    renderer.del = ({ text }) => {
        return text;
    };
    renderer.image = (_) => {
        return '';
    };
    renderer.text = ({ text }) => {
        return text;
    };
    renderer.link = ({ text }) => {
        return text;
    };
    return renderer;
}
const plainTextRenderer = new Lazy(createPlainTextRenderer);
const plainTextWithCodeBlocksRenderer = new Lazy(() => {
    const renderer = createPlainTextRenderer();
    renderer.code = ({ text }) => {
        return `\n\`\`\`\n${escape(text)}\n\`\`\`\n`;
    };
    return renderer;
});
function mergeRawTokenText(tokens) {
    let mergedTokenText = '';
    tokens.forEach(token => {
        mergedTokenText += token.raw;
    });
    return mergedTokenText;
}
function completeSingleLinePattern(token) {
    if (!token.tokens) {
        return undefined;
    }
    for (let i = token.tokens.length - 1; i >= 0; i--) {
        const subtoken = token.tokens[i];
        if (subtoken.type === 'text') {
            const lines = subtoken.raw.split('\n');
            const lastLine = lines[lines.length - 1];
            if (lastLine.includes('`')) {
                return completeCodespan(token);
            }
            else if (lastLine.includes('**')) {
                return completeDoublestar(token);
            }
            else if (lastLine.match(/\*\w/)) {
                return completeStar(token);
            }
            else if (lastLine.match(/(^|\s)__\w/)) {
                return completeDoubleUnderscore(token);
            }
            else if (lastLine.match(/(^|\s)_\w/)) {
                return completeUnderscore(token);
            }
            else if (
            // Text with start of link target
            hasLinkTextAndStartOfLinkTarget(lastLine) ||
                // This token doesn't have the link text, eg if it contains other markdown constructs that are in other subtokens.
                // But some preceding token does have an unbalanced [ at least
                hasStartOfLinkTargetAndNoLinkText(lastLine) && token.tokens.slice(0, i).some(t => t.type === 'text' && t.raw.match(/\[[^\]]*$/))) {
                const nextTwoSubTokens = token.tokens.slice(i + 1);
                // A markdown link can look like
                // [link text](https://microsoft.com "more text")
                // Where "more text" is a title for the link or an argument to a vscode command link
                if (
                // If the link was parsed as a link, then look for a link token and a text token with a quote
                nextTwoSubTokens[0]?.type === 'link' && nextTwoSubTokens[1]?.type === 'text' && nextTwoSubTokens[1].raw.match(/^ *"[^"]*$/) ||
                    // And if the link was not parsed as a link (eg command link), just look for a single quote in this token
                    lastLine.match(/^[^"]* +"[^"]*$/)) {
                    return completeLinkTargetArg(token);
                }
                return completeLinkTarget(token);
            }
            // Contains the start of link text, and no following tokens contain the link target
            else if (lastLine.match(/(^|\s)\[\w*[^\]]*$/)) {
                return completeLinkText(token);
            }
        }
    }
    return undefined;
}
function hasLinkTextAndStartOfLinkTarget(str) {
    return !!str.match(/(^|\s)\[.*\]\(\w*/);
}
function hasStartOfLinkTargetAndNoLinkText(str) {
    return !!str.match(/^[^\[]*\]\([^\)]*$/);
}
function completeListItemPattern(list) {
    // Patch up this one list item
    const lastListItem = list.items[list.items.length - 1];
    const lastListSubToken = lastListItem.tokens ? lastListItem.tokens[lastListItem.tokens.length - 1] : undefined;
    /*
    Example list token structures:

    list
        list_item
            text
                text
                codespan
                link
        list_item
            text
            code // Complete indented codeblock
        list_item
            text
            space
            text
                text // Incomplete indented codeblock
        list_item
            text
            list // Nested list
                list_item
                    text
                        text

    Contrast with paragraph:
    paragraph
        text
        codespan
    */
    const listEndsInHeading = (list) => {
        // A list item can be rendered as a heading for some reason when it has a subitem where we haven't rendered the text yet like this:
        // 1. list item
        //    -
        const lastItem = list.items.at(-1);
        const lastToken = lastItem?.tokens.at(-1);
        return lastToken?.type === 'heading' || lastToken?.type === 'list' && listEndsInHeading(lastToken);
    };
    let newToken;
    if (lastListSubToken?.type === 'text' && !('inRawBlock' in lastListItem)) { // Why does Tag have a type of 'text'
        newToken = completeSingleLinePattern(lastListSubToken);
    }
    else if (listEndsInHeading(list)) {
        const newList = marked.lexer(list.raw.trim() + ' &nbsp;')[0];
        if (newList.type !== 'list') {
            // Something went wrong
            return;
        }
        return newList;
    }
    if (!newToken || newToken.type !== 'paragraph') { // 'text' item inside the list item turns into paragraph
        // Nothing to fix, or not a pattern we were expecting
        return;
    }
    const previousListItemsText = mergeRawTokenText(list.items.slice(0, -1));
    // Grabbing the `- ` or `1. ` or `* ` off the list item because I can't find a better way to do this
    const lastListItemLead = lastListItem.raw.match(/^(\s*(-|\d+\.|\*) +)/)?.[0];
    if (!lastListItemLead) {
        // Is badly formatted
        return;
    }
    const newListItemText = lastListItemLead +
        mergeRawTokenText(lastListItem.tokens.slice(0, -1)) +
        newToken.raw;
    const newList = marked.lexer(previousListItemsText + newListItemText)[0];
    if (newList.type !== 'list') {
        // Something went wrong
        return;
    }
    return newList;
}
function completeHeading(token, fullRawText) {
    if (token.raw.match(/-\s*$/)) {
        return marked.lexer(fullRawText + ' &nbsp;');
    }
}
const maxIncompleteTokensFixRounds = 3;
export function fillInIncompleteTokens(tokens) {
    for (let i = 0; i < maxIncompleteTokensFixRounds; i++) {
        const newTokens = fillInIncompleteTokensOnce(tokens);
        if (newTokens) {
            tokens = newTokens;
        }
        else {
            break;
        }
    }
    return tokens;
}
function fillInIncompleteTokensOnce(tokens) {
    let i;
    let newTokens;
    for (i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === 'paragraph' && token.raw.match(/(\n|^)\|/)) {
            newTokens = completeTable(tokens.slice(i));
            break;
        }
    }
    const lastToken = tokens.at(-1);
    if (!newTokens && lastToken?.type === 'list') {
        const newListToken = completeListItemPattern(lastToken);
        if (newListToken) {
            newTokens = [newListToken];
            i = tokens.length - 1;
        }
    }
    if (!newTokens && lastToken?.type === 'paragraph') {
        // Only operates on a single token, because any newline that follows this should break these patterns
        const newToken = completeSingleLinePattern(lastToken);
        if (newToken) {
            newTokens = [newToken];
            i = tokens.length - 1;
        }
    }
    if (newTokens) {
        const newTokensList = [
            ...tokens.slice(0, i),
            ...newTokens
        ];
        newTokensList.links = tokens.links;
        return newTokensList;
    }
    if (lastToken?.type === 'heading') {
        const completeTokens = completeHeading(lastToken, mergeRawTokenText(tokens));
        if (completeTokens) {
            return completeTokens;
        }
    }
    return null;
}
function completeCodespan(token) {
    return completeWithString(token, '`');
}
function completeStar(tokens) {
    return completeWithString(tokens, '*');
}
function completeUnderscore(tokens) {
    return completeWithString(tokens, '_');
}
function completeLinkTarget(tokens) {
    return completeWithString(tokens, ')', false);
}
function completeLinkTargetArg(tokens) {
    return completeWithString(tokens, '")', false);
}
function completeLinkText(tokens) {
    return completeWithString(tokens, '](https://microsoft.com)', false);
}
function completeDoublestar(tokens) {
    return completeWithString(tokens, '**');
}
function completeDoubleUnderscore(tokens) {
    return completeWithString(tokens, '__');
}
function completeWithString(tokens, closingString, shouldTrim = true) {
    const mergedRawText = mergeRawTokenText(Array.isArray(tokens) ? tokens : [tokens]);
    // If it was completed correctly, this should be a single token.
    // Expecting either a Paragraph or a List
    const trimmedRawText = shouldTrim ? mergedRawText.trimEnd() : mergedRawText;
    return marked.lexer(trimmedRawText + closingString)[0];
}
function completeTable(tokens) {
    const mergedRawText = mergeRawTokenText(tokens);
    const lines = mergedRawText.split('\n');
    let numCols; // The number of line1 col headers
    let hasSeparatorRow = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (typeof numCols === 'undefined' && line.match(/^\s*\|/)) {
            const line1Matches = line.match(/(\|[^\|]+)(?=\||$)/g);
            if (line1Matches) {
                numCols = line1Matches.length;
            }
        }
        else if (typeof numCols === 'number') {
            if (line.match(/^\s*\|/)) {
                if (i !== lines.length - 1) {
                    // We got the line1 header row, and the line2 separator row, but there are more lines, and it wasn't parsed as a table!
                    // That's strange and means that the table is probably malformed in the source, so I won't try to patch it up.
                    return undefined;
                }
                // Got a line2 separator row- partial or complete, doesn't matter, we'll replace it with a correct one
                hasSeparatorRow = true;
            }
            else {
                // The line after the header row isn't a valid separator row, so the table is malformed, don't fix it up
                return undefined;
            }
        }
    }
    if (typeof numCols === 'number' && numCols > 0) {
        const prefixText = hasSeparatorRow ? lines.slice(0, -1).join('\n') : mergedRawText;
        const line1EndsInPipe = !!prefixText.match(/\|\s*$/);
        const newRawText = prefixText + (line1EndsInPipe ? '' : '|') + `\n|${' --- |'.repeat(numCols)}`;
        return marked.lexer(newRawText);
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25SZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL21hcmtkb3duUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxrQkFBa0IsRUFBaUQsc0JBQXNCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUM1SixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUU1RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDekMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3pELE9BQU8sS0FBSyxNQUFNLE1BQU0sNEJBQTRCLENBQUM7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDOUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN2QyxPQUFPLEtBQUssR0FBRyxNQUFNLFVBQVUsQ0FBQztBQUNoQyxP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