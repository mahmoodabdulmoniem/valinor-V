/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, toDisposable } from '../common/lifecycle.js';
import { Schemas } from '../common/network.js';
import dompurify from './dompurify/dompurify.js';
/**
 * List of safe, non-input html tags.
 */
export const basicMarkupHtmlTags = Object.freeze([
    'a',
    'abbr',
    'b',
    'bdo',
    'blockquote',
    'br',
    'caption',
    'cite',
    'code',
    'col',
    'colgroup',
    'dd',
    'del',
    'details',
    'dfn',
    'div',
    'dl',
    'dt',
    'em',
    'figcaption',
    'figure',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'ins',
    'kbd',
    'label',
    'li',
    'mark',
    'ol',
    'p',
    'pre',
    'q',
    'rp',
    'rt',
    'ruby',
    'samp',
    'small',
    'small',
    'source',
    'span',
    'strike',
    'strong',
    'sub',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'tt',
    'u',
    'ul',
    'var',
    'video',
    'wbr',
]);
export const defaultAllowedAttrs = Object.freeze([
    'href',
    'target',
    'src',
    'alt',
    'title',
    'for',
    'name',
    'role',
    'tabindex',
    'x-dispatch',
    'required',
    'checked',
    'placeholder',
    'type',
    'start',
    'width',
    'height',
    'align',
]);
function addDompurifyHook(hook, cb) {
    dompurify.addHook(hook, cb);
    return toDisposable(() => dompurify.removeHook(hook));
}
/**
 * Hooks dompurify using `afterSanitizeAttributes` to check that all `href` and `src`
 * attributes are valid.
 */
function hookDomPurifyHrefAndSrcSanitizer(allowedLinkProtocols, allowedMediaProtocols) {
    // https://github.com/cure53/DOMPurify/blob/main/demos/hooks-scheme-allowlist.html
    // build an anchor to map URLs to
    const anchor = document.createElement('a');
    function validateLink(value, allowedProtocols) {
        if (allowedProtocols === '*') {
            return true; // allow all protocols
        }
        anchor.href = value;
        return allowedProtocols.includes(anchor.protocol.replace(/:$/, ''));
    }
    dompurify.addHook('afterSanitizeAttributes', (node) => {
        // check all href/src attributes for validity
        for (const attr of ['href', 'src']) {
            if (node.hasAttribute(attr)) {
                const attrValue = node.getAttribute(attr);
                if (attr === 'href') {
                    if (!attrValue.startsWith('#') && !validateLink(attrValue, allowedLinkProtocols)) {
                        node.removeAttribute(attr);
                    }
                }
                else { // 'src'
                    if (!validateLink(attrValue, allowedMediaProtocols)) {
                        node.removeAttribute(attr);
                    }
                }
            }
        }
    });
    return toDisposable(() => dompurify.removeHook('afterSanitizeAttributes'));
}
const defaultDomPurifyConfig = Object.freeze({
    ALLOWED_TAGS: [...basicMarkupHtmlTags],
    ALLOWED_ATTR: [...defaultAllowedAttrs],
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: true,
    // We sanitize the src/href attributes later if needed
    ALLOW_UNKNOWN_PROTOCOLS: true,
});
/**
 * Sanitizes an html string.
 *
 * @param untrusted The HTML string to sanitize.
 * @param config Optional configuration for sanitization. If not provided, defaults to a safe configuration.
 *
 * @returns A sanitized string of html.
 */
export function sanitizeHtml(untrusted, config) {
    const store = new DisposableStore();
    try {
        const resolvedConfig = { ...defaultDomPurifyConfig };
        if (config?.allowedTags) {
            if (config.allowedTags.override) {
                resolvedConfig.ALLOWED_TAGS = [...config.allowedTags.override];
            }
            if (config.allowedTags.augment) {
                resolvedConfig.ALLOWED_TAGS = [...(resolvedConfig.ALLOWED_TAGS ?? []), ...config.allowedTags.augment];
            }
        }
        if (config?.allowedAttributes) {
            if (config.allowedAttributes.override) {
                resolvedConfig.ALLOWED_ATTR = [...config.allowedAttributes.override];
            }
            if (config.allowedAttributes.augment) {
                resolvedConfig.ALLOWED_ATTR = [...(resolvedConfig.ALLOWED_ATTR ?? []), ...config.allowedAttributes.augment];
            }
        }
        store.add(hookDomPurifyHrefAndSrcSanitizer(config?.allowedLinkProtocols?.override ?? [Schemas.http, Schemas.https], config?.allowedMediaProtocols?.override ?? [Schemas.http, Schemas.https]));
        if (config?._do_not_use_hooks?.uponSanitizeElement) {
            store.add(addDompurifyHook('uponSanitizeElement', config?._do_not_use_hooks.uponSanitizeElement));
        }
        if (config?._do_not_use_hooks?.uponSanitizeAttribute) {
            store.add(addDompurifyHook('uponSanitizeAttribute', config._do_not_use_hooks.uponSanitizeAttribute));
        }
        return dompurify.sanitize(untrusted, {
            ...resolvedConfig,
            RETURN_TRUSTED_TYPE: true
        });
    }
    finally {
        store.dispose();
    }
}
/**
 * Sanitizes the given `value` and reset the given `node` with it.
 */
export function safeSetInnerHtml(node, untrusted, config) {
    node.innerHTML = sanitizeHtml(untrusted, config);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tU2FuaXRpemUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9kb21TYW5pdGl6ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUMvQyxPQUFPLFNBQVMsTUFBTSwwQkFBMEIsQ0FBQztBQUdqRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDaEQsR0FBRztJQUNILE1BQU07SUFDTixHQUFHO0lBQ0gsS0FBSztJQUNMLFlBQVk7SUFDWixJQUFJO0lBQ0osU0FBUztJQUNULE1BQU07SUFDTixNQUFNO0lBQ04sS0FBSztJQUNMLFVBQVU7SUFDVixJQUFJO0lBQ0osS0FBSztJQUNMLFNBQVM7SUFDVCxLQUFLO0lBQ0wsS0FBSztJQUNMLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLFlBQVk7SUFDWixRQUFRO0lBQ1IsSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLEdBQUc7SUFDSCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxPQUFPO0lBQ1AsSUFBSTtJQUNKLE1BQU07SUFDTixJQUFJO0lBQ0osR0FBRztJQUNILEtBQUs7SUFDTCxHQUFHO0lBQ0gsSUFBSTtJQUNKLElBQUk7SUFDSixNQUFNO0lBQ04sTUFBTTtJQUNOLE9BQU87SUFDUCxPQUFPO0lBQ1AsUUFBUTtJQUNSLE1BQU07SUFDTixRQUFRO0lBQ1IsUUFBUTtJQUNSLEtBQUs7SUFDTCxTQUFT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