/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule, resolveAmdNodeModulePath } from '../../../../amdX.js';
import { Lazy } from '../../../../base/common/lazy.js';
export class MarkedKatexSupport {
    static getSanitizerOptions(baseConfig) {
        return {
            allowedTags: {
                override: [
                    ...baseConfig.allowedTags,
                    ...trustedMathMlTags,
                ]
            },
            customAttrSanitizer: (attrName, attrValue) => {
                if (attrName === 'class') {
                    return true; // TODO: allows all classes for now since we don't have a list of possible katex classes
                }
                else if (attrName === 'style') {
                    return this.sanitizeKatexStyles(attrValue);
                }
                return baseConfig.allowedAttributes.includes(attrName);
            },
        };
    }
    static { this.tempSanitizerRule = new Lazy(() => {
        // Create a CSSStyleDeclaration object via a style sheet rule
        const styleSheet = new CSSStyleSheet();
        styleSheet.insertRule(`.temp{}`);
        const rule = styleSheet.cssRules[0];
        if (!(rule instanceof CSSStyleRule)) {
            throw new Error('Invalid CSS rule');
        }
        return rule.style;
    }); }
    static sanitizeStyles(styleString, allowedProperties) {
        const style = this.tempSanitizerRule.value;
        style.cssText = styleString;
        const sanitizedProps = [];
        for (let i = 0; i < style.length; i++) {
            const prop = style[i];
            if (allowedProperties.includes(prop)) {
                const value = style.getPropertyValue(prop);
                // Allow through lists of numbers with units or bare words like 'block'
                // Main goal is to block things like 'url()'.
                if (/^(([\d\.\-]+\w*\s?)+|\w+)$/.test(value)) {
                    sanitizedProps.push(`${prop}: ${value}`);
                }
            }
        }
        return sanitizedProps.join('; ');
    }
    static sanitizeKatexStyles(styleString) {
        const allowedProperties = [
            'display',
            'position',
            'font-family',
            'font-style',
            'font-weight',
            'font-size',
            'height',
            'width',
            'margin',
            'padding',
            'top',
            'left',
            'right',
            'bottom',
            'vertical-align',
            'transform',
            'border',
            'color',
            'white-space',
            'text-align',
            'line-height',
            'float',
            'clear',
        ];
        return this.sanitizeStyles(styleString, allowedProperties);
    }
    static { this._katexPromise = new Lazy(async () => {
        this._katex = await importAMDNodeModule('katex', 'dist/katex.min.js');
        return this._katex;
    }); }
    static getExtension(window, options = {}) {
        if (!this._katex) {
            return undefined;
        }
        this.ensureKatexStyles(window);
        return MarkedKatexExtension.extension(this._katex, options);
    }
    static async loadExtension(window, options = {}) {
        const katex = await this._katexPromise.value;
        this.ensureKatexStyles(window);
        return MarkedKatexExtension.extension(katex, options);
    }
    static ensureKatexStyles(window) {
        const doc = window.document;
        if (!doc.querySelector('link.katex')) {
            const katexStyle = document.createElement('link');
            katexStyle.classList.add('katex');
            katexStyle.rel = 'stylesheet';
            katexStyle.href = resolveAmdNodeModulePath('katex', 'dist/katex.min.css');
            doc.head.appendChild(katexStyle);
        }
    }
}
export var MarkedKatexExtension;
(function (MarkedKatexExtension) {
    const inlineRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1(?=[\s?!\.,:'\uff1f\uff01\u3002\uff0c\uff1a']|$)/;
    const inlineRuleNonStandard = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1/; // Non-standard, even if there are no spaces before and after $ or $$, try to parse
    const blockRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/;
    function extension(katex, options = {}) {
        return {
            extensions: [
                inlineKatex(options, createRenderer(katex, options, false)),
                blockKatex(options, createRenderer(katex, options, true)),
            ],
        };
    }
    MarkedKatexExtension.extension = extension;
    function createRenderer(katex, options, newlineAfter) {
        return (token) => {
            return katex.renderToString(token.text, {
                ...options,
                displayMode: token.displayMode,
            }) + (newlineAfter ? '\n' : '');
        };
    }
    function inlineKatex(options, renderer) {
        const nonStandard = true;
        const ruleReg = nonStandard ? inlineRuleNonStandard : inlineRule;
        return {
            name: 'inlineKatex',
            level: 'inline',
            start(src) {
                let index;
                let indexSrc = src;
                while (indexSrc) {
                    index = indexSrc.indexOf('$');
                    if (index === -1) {
                        return;
                    }
                    const f = nonStandard ? index > -1 : index === 0 || indexSrc.charAt(index - 1) === ' ';
                    if (f) {
                        const possibleKatex = indexSrc.substring(index);
                        if (possibleKatex.match(ruleReg)) {
                            return index;
                        }
                    }
                    indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, '');
                }
                return;
            },
            tokenizer(src, tokens) {
                const match = src.match(ruleReg);
                if (match) {
                    return {
                        type: 'inlineKatex',
                        raw: match[0],
                        text: match[2].trim(),
                        displayMode: match[1].length === 2,
                    };
                }
                return;
            },
            renderer,
        };
    }
    function blockKatex(options, renderer) {
        return {
            name: 'blockKatex',
            level: 'block',
            tokenizer(src, tokens) {
                const match = src.match(blockRule);
                if (match) {
                    return {
                        type: 'blockKatex',
                        raw: match[0],
                        text: match[2].trim(),
                        displayMode: match[1].length === 2,
                    };
                }
                return;
            },
            renderer,
        };
    }
})(MarkedKatexExtension || (MarkedKatexExtension = {}));
const trustedMathMlTags = Object.freeze([
    'semantics',
    'annotation',
    'math',
    'menclose',
    'merror',
    'mfenced',
    'mfrac',
    'mglyph',
    'mi',
    'mlabeledtr',
    'mmultiscripts',
    'mn',
    'mo',
    'mover',
    'mpadded',
    'mphantom',
    'mroot',
    'mrow',
    'ms',
    'mspace',
    'msqrt',
    'mstyle',
    'msub',
    'msup',
    'msubsup',
    'mtable',
    'mtd',
    'mtext',
    'mtr',
    'munder',
    'munderover',
    'mprescripts',
    // svg tags
    'svg',
    'altglyph',
    'altglyphdef',
    'altglyphitem',
    'circle',
    'clippath',
    'defs',
    'desc',
    'ellipse',
    'filter',
    'font',
    'g',
    'glyph',
    'glyphref',
    'hkern',
    'line',
    'lineargradient',
    'marker',
    'mask',
    'metadata',
    'mpath',
    'path',
    'pattern',
    'polygon',
    'polyline',
    'radialgradient',
    'rect',
    'stop',
    'style',
    'switch',
    'symbol',
    'text',
    'textpath',
    'title',
    'tref',
    'tspan',
    'view',
    'vkern',
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VkS2F0ZXhTdXBwb3J0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZG93bi9icm93c2VyL21hcmtlZEthdGV4U3VwcG9ydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUdwRixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHdkQsTUFBTSxPQUFPLGtCQUFrQjtJQUV2QixNQUFNLENBQUMsbUJBQW1CLENBQUMsVUFHakM7UUFDQSxPQUFPO1lBQ04sV0FBVyxFQUFFO2dCQUNaLFFBQVEsRUFBRTtvQkFDVCxHQUFHLFVBQVUsQ0FBQyxXQUFXO29CQUN6QixHQUFHLGlCQUFpQjtpQkFDcEI7YUFDRDtZQUNELG1CQUFtQixFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxFQUFFO2dCQUM1QyxJQUFJLFFBQVEsS0FBSyxPQUFPLEVBQUUsQ0FBQztvQkFDMUIsT0FBTyxJQUFJLENBQUMsQ0FBQyx3RkFBd0Y7Z0JBQ3RHLENBQUM7cUJBQU0sSUFBSSxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7b0JBQ2pDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUM1QyxDQUFDO2dCQUVELE9BQU8sVUFBVSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN4RCxDQUFDO1NBQ0QsQ0FBQztJQUNILENBQUM7YUFFYyxzQkFBaUIsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDaEQsNkRBQTZEO1FBQzdELE1BQU0sVUFBVSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7UUFDdkMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqQyxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ25CLENBQUMsQ0FBQyxDQUFDO0lBRUssTUFBTSxDQUFDLGNBQWMsQ0FBQyxXQUFtQixFQUFFLGlCQUFvQztRQUN0RixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO1FBQzNDLEtBQUssQ0FBQyxPQUFPLEdBQUcsV0FBVyxDQUFDO1FBRTVCLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQztRQUUxQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QixJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN0QyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzNDLHVFQUF1RTtnQkFDdkUsNkNBQTZDO2dCQUM3QyxJQUFJLDRCQUE0QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUM5QyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQzFDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRU8sTUFBTSxDQUFDLG1CQUFtQixDQUFDLFdBQW1CO1FBQ3JELE1BQU0saUJBQWlCLEdBQUc7WUFDekIsU0FBUztZQUNULFVBQVU7WUFDVixhQUFhO1lBQ2IsWUFBWTtZQUNaLGFBQWE7WUFDYixXQUFXO1lBQ1gsUUFBUTtZQUNSLE9BQU87WUFDUCxRQUFRO1lBQ1IsU0FBUztZQUNULEtBQUs7WUFDTCxNQUFNO1lBQ04sT0FBTztZQUNQLFFBQVE7WUFDUixnQkFBZ0I7WUFDaEIsV0FBVztZQUNYLFFBQVE7WUFDUixPQUFPO1lBQ1AsYUFBYTtZQUNiLFlBQVk7WUFDWixhQUFhO1lBQ2IsT0FBTztZQUNQLE9BQU87U0FDUCxDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQzVELENBQUM7YUFHYyxrQkFBYSxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2xELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUN0RSxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFFSSxNQUFNLENBQUMsWUFBWSxDQUFDLE1BQWtCLEVBQUUsVUFBbUQsRUFBRTtRQUNuRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0IsT0FBTyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBa0IsRUFBRSxVQUFtRCxFQUFFO1FBQzFHLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7UUFDN0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9CLE9BQU8sb0JBQW9CLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRU0sTUFBTSxDQUFDLGlCQUFpQixDQUFDLE1BQWtCO1FBQ2pELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDNUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUN0QyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2xELFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsWUFBWSxDQUFDO1lBQzlCLFVBQVUsQ0FBQyxJQUFJLEdBQUcsd0JBQXdCLENBQUMsT0FBTyxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDMUUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDbEMsQ0FBQztJQUNGLENBQUM7O0FBSUYsTUFBTSxLQUFXLG9CQUFvQixDQTZGcEM7QUE3RkQsV0FBaUIsb0JBQW9CO0lBT3BDLE1BQU0sVUFBVSxHQUFHLHdHQUF3RyxDQUFDO0lBQzVILE1BQU0scUJBQXFCLEdBQUcsd0RBQXdELENBQUMsQ0FBQyxtRkFBbUY7SUFFM0ssTUFBTSxTQUFTLEdBQUcsNkNBQTZDLENBQUM7SUFFaEUsU0FBZ0IsU0FBUyxDQUFDLEtBQXFDLEVBQUUsVUFBOEIsRUFBRTtRQUNoRyxPQUFPO1lBQ04sVUFBVSxFQUFFO2dCQUNYLFdBQVcsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzNELFVBQVUsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDekQ7U0FDRCxDQUFDO0lBQ0gsQ0FBQztJQVBlLDhCQUFTLFlBT3hCLENBQUE7SUFFRCxTQUFTLGNBQWMsQ0FBQyxLQUFxQyxFQUFFLE9BQTJCLEVBQUUsWUFBcUI7UUFDaEgsT0FBTyxDQUFDLEtBQTRCLEVBQUUsRUFBRTtZQUN2QyxPQUFPLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRTtnQkFDdkMsR0FBRyxPQUFPO2dCQUNWLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVzthQUM5QixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDakMsQ0FBQyxDQUFDO0lBQ0gsQ0FBQztJQUVELFNBQVMsV0FBVyxDQUFDLE9BQTJCLEVBQUUsUUFBMEM7UUFDM0YsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUNqRSxPQUFPO1lBQ04sSUFBSSxFQUFFLGFBQWE7WUFDbkIsS0FBSyxFQUFFLFFBQVE7WUFDZixLQUFLLENBQUMsR0FBVztnQkFDaEIsSUFBSSxLQUFLLENBQUM7Z0JBQ1YsSUFBSSxRQUFRLEdBQUcsR0FBRyxDQUFDO2dCQUVuQixPQUFPLFFBQVEsRUFBRSxDQUFDO29CQUNqQixLQUFLLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDOUIsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDbEIsT0FBTztvQkFDUixDQUFDO29CQUNELE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQztvQkFDdkYsSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDUCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUVoRCxJQUFJLGFBQWEsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzs0QkFDbEMsT0FBTyxLQUFLLENBQUM7d0JBQ2QsQ0FBQztvQkFDRixDQUFDO29CQUVELFFBQVEsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RCxDQUFDO2dCQUNELE9BQU87WUFDUixDQUFDO1lBQ0QsU0FBUyxDQUFDLEdBQVcsRUFBRSxNQUFzQjtnQkFDNUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDakMsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDWCxPQUFPO3dCQUNOLElBQUksRUFBRSxhQUFhO3dCQUNuQixHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDYixJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTt3QkFDckIsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQztxQkFDbEMsQ0FBQztnQkFDSCxDQUFDO2dCQUNELE9BQU87WUFDUixDQUFDO1lBQ0QsUUFBUTtTQUNSLENBQUM7SUFDSCxDQUFDO0lBRUQsU0FBUyxVQUFVLENBQUMsT0FBMkIsRUFBRSxRQUEwQztRQUMxRixPQUFPO1lBQ04sSUFBSSxFQUFFLFlBQVk7WUFDbEIsS0FBSyxFQUFFLE9BQU87WUFDZCxTQUFTLENBQUMsR0FBVyxFQUFFLE1BQXNCO2dCQUM1QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNuQyxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNYLE9BQU87d0JBQ04sSUFBSSxFQUFFLFlBQVk7d0JBQ2xCLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUNiLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO3dCQUNyQixXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDO3FCQUNsQyxDQUFDO2dCQUNILENBQUM7Z0JBQ0QsT0FBTztZQUNSLENBQUM7WUFDRCxRQUFRO1NBQ1IsQ0FBQztJQUNILENBQUM7QUFDRixDQUFDLEVBN0ZnQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBNkZwQztBQUNELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUN2QyxXQUFXO0lBQ1gsWUFBWTtJQUNaLE1BQU07SUFDTixVQUFVO0lBQ1YsUUFBUTtJQUNSLFNBQVM7SUFDVCxPQUFPO0lBQ1AsUUFBUTtJQUNSLElBQUk7SUFDSixZQUFZO0lBQ1osZUFBZTtJQUNmLElBQUk7SUFDSixJQUFJO0lBQ0osT0FBTztJQUNQLFNBQVM7SUFDVCxVQUFVO0lBQ1YsT0FBTztJQUNQLE1BQU07SUFDTixJQUFJO0lBQ0osUUFBUTtJQUNSLE9BQU87SUFDUCxRQUFRO0lBQ1IsTUFBTTtJQUNOLE1BQU07SUFDTixTQUFTO0lBQ1QsUUFBUTtJQUNSLEtBQUs7SUFDTCxPQUFPO0lBQ1AsS0FBSztJQUNMLFFBQVE7SUFDUixZQUFZO0lBQ1osYUFBYTtJQUViLFdBQVc7SUFDWCxLQUFLO0lBQ0wsVUFBVTtJQUNWLGFBQWE7SUFDYixjQUFjO0lBQ2QsUUFBUTtJQUNSLFVBQVU7SUFDVixNQUFNO0lBQ04sTUFBTTtJQUNOLFNBQVM7SUFDVCxRQUFRO0lBQ1IsTUFBTTtJQUNOLEdBQUc7SUFDSCxPQUFPO0lBQ1AsVUFBVTtJQUNWLE9BQU87SUFDUCxNQUFNO0lBQ04sZ0JBQWdCO0lBQ2hCLFFBQVE7SUFDUixNQUFNO0lBQ04sVUFBVTtJQUNWLE9BQU87SUFDUCxNQUFNO0lBQ04sU0FBUztJQUNULFNBQVM7SUFDVCxVQUFVO0lBQ1YsZ0JBQWdCO0lBQ2hCLE1BQU07SUFDTixNQUFNO0lBQ04sT0FBTztJQUNQLFFBQVE7SUFDUixRQUFRO0lBQ1IsTUFBTTtJQUNOLFVBQVU7SUFDVixPQUFPO0lBQ1AsTUFBTTtJQUNOLE9BQU87SUFDUCxNQUFNO0lBQ04sT0FBTztDQUNQLENBQUMsQ0FBQyJ9