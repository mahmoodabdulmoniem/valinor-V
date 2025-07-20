/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RunOnceScheduler } from '../../../base/common/async.js';
import { Color } from '../../../base/common/color.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as nls from '../../../nls.js';
import { Extensions as JSONExtensions } from '../../jsonschemas/common/jsonContributionRegistry.js';
import * as platform from '../../registry/common/platform.js';
const TOKEN_TYPE_WILDCARD = '*';
const TOKEN_CLASSIFIER_LANGUAGE_SEPARATOR = ':';
const CLASSIFIER_MODIFIER_SEPARATOR = '.';
const idPattern = '\\w+[-_\\w+]*';
export const typeAndModifierIdPattern = `^${idPattern}$`;
const selectorPattern = `^(${idPattern}|\\*)(\\${CLASSIFIER_MODIFIER_SEPARATOR}${idPattern})*(${TOKEN_CLASSIFIER_LANGUAGE_SEPARATOR}${idPattern})?$`;
const fontStylePattern = '^(\\s*(italic|bold|underline|strikethrough))*\\s*$';
export class TokenStyle {
    constructor(foreground, bold, underline, strikethrough, italic) {
        this.foreground = foreground;
        this.bold = bold;
        this.underline = underline;
        this.strikethrough = strikethrough;
        this.italic = italic;
    }
}
(function (TokenStyle) {
    function toJSONObject(style) {
        return {
            _foreground: style.foreground === undefined ? null : Color.Format.CSS.formatHexA(style.foreground, true),
            _bold: style.bold === undefined ? null : style.bold,
            _underline: style.underline === undefined ? null : style.underline,
            _italic: style.italic === undefined ? null : style.italic,
            _strikethrough: style.strikethrough === undefined ? null : style.strikethrough,
        };
    }
    TokenStyle.toJSONObject = toJSONObject;
    function fromJSONObject(obj) {
        if (obj) {
            const boolOrUndef = (b) => (typeof b === 'boolean') ? b : undefined;
            const colorOrUndef = (s) => (typeof s === 'string') ? Color.fromHex(s) : undefined;
            return new TokenStyle(colorOrUndef(obj._foreground), boolOrUndef(obj._bold), boolOrUndef(obj._underline), boolOrUndef(obj._strikethrough), boolOrUndef(obj._italic));
        }
        return undefined;
    }
    TokenStyle.fromJSONObject = fromJSONObject;
    function equals(s1, s2) {
        if (s1 === s2) {
            return true;
        }
        return s1 !== undefined && s2 !== undefined
            && (s1.foreground instanceof Color ? s1.foreground.equals(s2.foreground) : s2.foreground === undefined)
            && s1.bold === s2.bold
            && s1.underline === s2.underline
            && s1.strikethrough === s2.strikethrough
            && s1.italic === s2.italic;
    }
    TokenStyle.equals = equals;
    function is(s) {
        return s instanceof TokenStyle;
    }
    TokenStyle.is = is;
    function fromData(data) {
        return new TokenStyle(data.foreground, data.bold, data.underline, data.strikethrough, data.italic);
    }
    TokenStyle.fromData = fromData;
    function fromSettings(foreground, fontStyle, bold, underline, strikethrough, italic) {
        let foregroundColor = undefined;
        if (foreground !== undefined) {
            foregroundColor = Color.fromHex(foreground);
        }
        if (fontStyle !== undefined) {
            bold = italic = underline = strikethrough = false;
            const expression = /italic|bold|underline|strikethrough/g;
            let match;
            while ((match = expression.exec(fontStyle))) {
                switch (match[0]) {
                    case 'bold':
                        bold = true;
                        break;
                    case 'italic':
                        italic = true;
                        break;
                    case 'underline':
                        underline = true;
                        break;
                    case 'strikethrough':
                        strikethrough = true;
                        break;
                }
            }
        }
        return new TokenStyle(foregroundColor, bold, underline, strikethrough, italic);
    }
    TokenStyle.fromSettings = fromSettings;
})(TokenStyle || (TokenStyle = {}));
export var SemanticTokenRule;
(function (SemanticTokenRule) {
    function fromJSONObject(registry, o) {
        if (o && typeof o._selector === 'string' && o._style) {
            const style = TokenStyle.fromJSONObject(o._style);
            if (style) {
                try {
                    return { selector: registry.parseTokenSelector(o._selector), style };
                }
                catch (_ignore) {
                }
            }
        }
        return undefined;
    }
    SemanticTokenRule.fromJSONObject = fromJSONObject;
    function toJSONObject(rule) {
        return {
            _selector: rule.selector.id,
            _style: TokenStyle.toJSONObject(rule.style)
        };
    }
    SemanticTokenRule.toJSONObject = toJSONObject;
    function equals(r1, r2) {
        if (r1 === r2) {
            return true;
        }
        return r1 !== undefined && r2 !== undefined
            && r1.selector && r2.selector && r1.selector.id === r2.selector.id
            && TokenStyle.equals(r1.style, r2.style);
    }
    SemanticTokenRule.equals = equals;
    function is(r) {
        return r && r.selector && typeof r.selector.id === 'string' && TokenStyle.is(r.style);
    }
    SemanticTokenRule.is = is;
})(SemanticTokenRule || (SemanticTokenRule = {}));
// TokenStyle registry
const Extensions = {
    TokenClassificationContribution: 'base.contributions.tokenClassification'
};
class TokenClassificationRegistry extends Disposable {
    constructor() {
        super();
        this._onDidChangeSchema = this._register(new Emitter());
        this.onDidChangeSchema = this._onDidChangeSchema.event;
        this.currentTypeNumber = 0;
        this.currentModifierBit = 1;
        this.tokenStylingDefaultRules = [];
        this.tokenStylingSchema = {
            type: 'object',
            properties: {},
            patternProperties: {
                [selectorPattern]: getStylingSchemeEntry()
            },
            //errorMessage: nls.localize('schema.token.errors', 'Valid token selectors have the form (*|tokenType)(.tokenModifier)*(:tokenLanguage)?.'),
            additionalProperties: false,
            definitions: {
                style: {
                    type: 'object',
                    description: nls.localize('schema.token.settings', 'Colors and styles for the token.'),
                    properties: {
                        foreground: {
                            type: 'string',
                            description: nls.localize('schema.token.foreground', 'Foreground color for the token.'),
                            format: 'color-hex',
                            default: '#ff0000'
                        },
                        background: {
                            type: 'string',
                            deprecationMessage: nls.localize('schema.token.background.warning', 'Token background colors are currently not supported.')
                        },
                        fontStyle: {
                            type: 'string',
                            description: nls.localize('schema.token.fontStyle', 'Sets the all font styles of the rule: \'italic\', \'bold\', \'underline\' or \'strikethrough\' or a combination. All styles that are not listed are unset. The empty string unsets all styles.'),
                            pattern: fontStylePattern,
                            patternErrorMessage: nls.localize('schema.fontStyle.error', 'Font style must be \'italic\', \'bold\', \'underline\' or \'strikethrough\' or a combination. The empty string unsets all styles.'),
                            defaultSnippets: [
                                { label: nls.localize('schema.token.fontStyle.none', 'None (clear inherited style)'), bodyText: '""' },
                                { body: 'italic' },
                                { body: 'bold' },
                                { body: 'underline' },
                                { body: 'strikethrough' },
                                { body: 'italic bold' },
                                { body: 'italic underline' },
                                { body: 'italic strikethrough' },
                                { body: 'bold underline' },
                                { body: 'bold strikethrough' },
                                { body: 'underline strikethrough' },
                                { body: 'italic bold underline' },
                                { body: 'italic bold strikethrough' },
                                { body: 'italic underline strikethrough' },
                                { body: 'bold underline strikethrough' },
                                { body: 'italic bold underline strikethrough' }
                            ]
                        },
                        bold: {
                            type: 'boolean',
                            description: nls.localize('schema.token.bold', 'Sets or unsets the font style to bold. Note, the presence of \'fontStyle\' overrides this setting.'),
                        },
                        italic: {
                            type: 'boolean',
                            description: nls.localize('schema.token.italic', 'Sets or unsets the font style to italic. Note, the presence of \'fontStyle\' overrides this setting.'),
                        },
                        underline: {
                            type: 'boolean',
                            description: nls.localize('schema.token.underline', 'Sets or unsets the font style to underline. Note, the presence of \'fontStyle\' overrides this setting.'),
                        },
                        strikethrough: {
                            type: 'boolean',
                            description: nls.localize('schema.token.strikethrough', 'Sets or unsets the font style to strikethrough. Note, the presence of \'fontStyle\' overrides this setting.'),
                        }
                    },
                    defaultSnippets: [{ body: { foreground: '${1:#FF0000}', fontStyle: '${2:bold}' } }]
                }
            }
        };
        this.tokenTypeById = Object.create(null);
        this.tokenModifierById = Object.create(null);
        this.typeHierarchy = Object.create(null);
    }
    registerTokenType(id, description, superType, deprecationMessage) {
        if (!id.match(typeAndModifierIdPattern)) {
            throw new Error('Invalid token type id.');
        }
        if (superType && !superType.match(typeAndModifierIdPattern)) {
            throw new Error('Invalid token super type id.');
        }
        const num = this.currentTypeNumber++;
        const tokenStyleContribution = { num, id, superType, description, deprecationMessage };
        this.tokenTypeById[id] = tokenStyleContribution;
        const stylingSchemeEntry = getStylingSchemeEntry(description, deprecationMessage);
        this.tokenStylingSchema.properties[id] = stylingSchemeEntry;
        this.typeHierarchy = Object.create(null);
    }
    registerTokenModifier(id, description, deprecationMessage) {
        if (!id.match(typeAndModifierIdPattern)) {
            throw new Error('Invalid token modifier id.');
        }
        const num = this.currentModifierBit;
        this.currentModifierBit = this.currentModifierBit * 2;
        const tokenStyleContribution = { num, id, description, deprecationMessage };
        this.tokenModifierById[id] = tokenStyleContribution;
        this.tokenStylingSchema.properties[`*.${id}`] = getStylingSchemeEntry(description, deprecationMessage);
    }
    parseTokenSelector(selectorString, language) {
        const selector = parseClassifierString(selectorString, language);
        if (!selector.type) {
            return {
                match: () => -1,
                id: '$invalid'
            };
        }
        return {
            match: (type, modifiers, language) => {
                let score = 0;
                if (selector.language !== undefined) {
                    if (selector.language !== language) {
                        return -1;
                    }
                    score += 10;
                }
                if (selector.type !== TOKEN_TYPE_WILDCARD) {
                    const hierarchy = this.getTypeHierarchy(type);
                    const level = hierarchy.indexOf(selector.type);
                    if (level === -1) {
                        return -1;
                    }
                    score += (100 - level);
                }
                // all selector modifiers must be present
                for (const selectorModifier of selector.modifiers) {
                    if (modifiers.indexOf(selectorModifier) === -1) {
                        return -1;
                    }
                }
                return score + selector.modifiers.length * 100;
            },
            id: `${[selector.type, ...selector.modifiers.sort()].join('.')}${selector.language !== undefined ? ':' + selector.language : ''}`
        };
    }
    registerTokenStyleDefault(selector, defaults) {
        this.tokenStylingDefaultRules.push({ selector, defaults });
    }
    deregisterTokenStyleDefault(selector) {
        const selectorString = selector.id;
        this.tokenStylingDefaultRules = this.tokenStylingDefaultRules.filter(r => r.selector.id !== selectorString);
    }
    deregisterTokenType(id) {
        delete this.tokenTypeById[id];
        delete this.tokenStylingSchema.properties[id];
        this.typeHierarchy = Object.create(null);
    }
    deregisterTokenModifier(id) {
        delete this.tokenModifierById[id];
        delete this.tokenStylingSchema.properties[`*.${id}`];
    }
    getTokenTypes() {
        return Object.keys(this.tokenTypeById).map(id => this.tokenTypeById[id]);
    }
    getTokenModifiers() {
        return Object.keys(this.tokenModifierById).map(id => this.tokenModifierById[id]);
    }
    getTokenStylingSchema() {
        return this.tokenStylingSchema;
    }
    getTokenStylingDefaultRules() {
        return this.tokenStylingDefaultRules;
    }
    getTypeHierarchy(typeId) {
        let hierarchy = this.typeHierarchy[typeId];
        if (!hierarchy) {
            this.typeHierarchy[typeId] = hierarchy = [typeId];
            let type = this.tokenTypeById[typeId];
            while (type && type.superType) {
                hierarchy.push(type.superType);
                type = this.tokenTypeById[type.superType];
            }
        }
        return hierarchy;
    }
    toString() {
        const sorter = (a, b) => {
            const cat1 = a.indexOf('.') === -1 ? 0 : 1;
            const cat2 = b.indexOf('.') === -1 ? 0 : 1;
            if (cat1 !== cat2) {
                return cat1 - cat2;
            }
            return a.localeCompare(b);
        };
        return Object.keys(this.tokenTypeById).sort(sorter).map(k => `- \`${k}\`: ${this.tokenTypeById[k].description}`).join('\n');
    }
}
const CHAR_LANGUAGE = TOKEN_CLASSIFIER_LANGUAGE_SEPARATOR.charCodeAt(0);
const CHAR_MODIFIER = CLASSIFIER_MODIFIER_SEPARATOR.charCodeAt(0);
export function parseClassifierString(s, defaultLanguage) {
    let k = s.length;
    let language = defaultLanguage;
    const modifiers = [];
    for (let i = k - 1; i >= 0; i--) {
        const ch = s.charCodeAt(i);
        if (ch === CHAR_LANGUAGE || ch === CHAR_MODIFIER) {
            const segment = s.substring(i + 1, k);
            k = i;
            if (ch === CHAR_LANGUAGE) {
                language = segment;
            }
            else {
                modifiers.push(segment);
            }
        }
    }
    const type = s.substring(0, k);
    return { type, modifiers, language };
}
const tokenClassificationRegistry = createDefaultTokenClassificationRegistry();
platform.Registry.add(Extensions.TokenClassificationContribution, tokenClassificationRegistry);
function createDefaultTokenClassificationRegistry() {
    const registry = new TokenClassificationRegistry();
    function registerTokenType(id, description, scopesToProbe = [], superType, deprecationMessage) {
        registry.registerTokenType(id, description, superType, deprecationMessage);
        if (scopesToProbe) {
            registerTokenStyleDefault(id, scopesToProbe);
        }
        return id;
    }
    function registerTokenStyleDefault(selectorString, scopesToProbe) {
        try {
            const selector = registry.parseTokenSelector(selectorString);
            registry.registerTokenStyleDefault(selector, { scopesToProbe });
        }
        catch (e) {
            console.log(e);
        }
    }
    // default token types
    registerTokenType('comment', nls.localize('comment', "Style for comments."), [['comment']]);
    registerTokenType('string', nls.localize('string', "Style for strings."), [['string']]);
    registerTokenType('keyword', nls.localize('keyword', "Style for keywords."), [['keyword.control']]);
    registerTokenType('number', nls.localize('number', "Style for numbers."), [['constant.numeric']]);
    registerTokenType('regexp', nls.localize('regexp', "Style for expressions."), [['constant.regexp']]);
    registerTokenType('operator', nls.localize('operator', "Style for operators."), [['keyword.operator']]);
    registerTokenType('namespace', nls.localize('namespace', "Style for namespaces."), [['entity.name.namespace']]);
    registerTokenType('type', nls.localize('type', "Style for types."), [['entity.name.type'], ['support.type']]);
    registerTokenType('struct', nls.localize('struct', "Style for structs."), [['entity.name.type.struct']]);
    registerTokenType('class', nls.localize('class', "Style for classes."), [['entity.name.type.class'], ['support.class']]);
    registerTokenType('interface', nls.localize('interface', "Style for interfaces."), [['entity.name.type.interface']]);
    registerTokenType('enum', nls.localize('enum', "Style for enums."), [['entity.name.type.enum']]);
    registerTokenType('typeParameter', nls.localize('typeParameter', "Style for type parameters."), [['entity.name.type.parameter']]);
    registerTokenType('function', nls.localize('function', "Style for functions"), [['entity.name.function'], ['support.function']]);
    registerTokenType('member', nls.localize('member', "Style for member functions"), [], 'method', 'Deprecated use `method` instead');
    registerTokenType('method', nls.localize('method', "Style for method (member functions)"), [['entity.name.function.member'], ['support.function']]);
    registerTokenType('macro', nls.localize('macro', "Style for macros."), [['entity.name.function.preprocessor']]);
    registerTokenType('variable', nls.localize('variable', "Style for variables."), [['variable.other.readwrite'], ['entity.name.variable']]);
    registerTokenType('parameter', nls.localize('parameter', "Style for parameters."), [['variable.parameter']]);
    registerTokenType('property', nls.localize('property', "Style for properties."), [['variable.other.property']]);
    registerTokenType('enumMember', nls.localize('enumMember', "Style for enum members."), [['variable.other.enummember']]);
    registerTokenType('event', nls.localize('event', "Style for events."), [['variable.other.event']]);
    registerTokenType('decorator', nls.localize('decorator', "Style for decorators & annotations."), [['entity.name.decorator'], ['entity.name.function']]);
    registerTokenType('label', nls.localize('labels', "Style for labels. "), undefined);
    // default token modifiers
    registry.registerTokenModifier('declaration', nls.localize('declaration', "Style for all symbol declarations."), undefined);
    registry.registerTokenModifier('documentation', nls.localize('documentation', "Style to use for references in documentation."), undefined);
    registry.registerTokenModifier('static', nls.localize('static', "Style to use for symbols that are static."), undefined);
    registry.registerTokenModifier('abstract', nls.localize('abstract', "Style to use for symbols that are abstract."), undefined);
    registry.registerTokenModifier('deprecated', nls.localize('deprecated', "Style to use for symbols that are deprecated."), undefined);
    registry.registerTokenModifier('modification', nls.localize('modification', "Style to use for write accesses."), undefined);
    registry.registerTokenModifier('async', nls.localize('async', "Style to use for symbols that are async."), undefined);
    registry.registerTokenModifier('readonly', nls.localize('readonly', "Style to use for symbols that are read-only."), undefined);
    registerTokenStyleDefault('variable.readonly', [['variable.other.constant']]);
    registerTokenStyleDefault('property.readonly', [['variable.other.constant.property']]);
    registerTokenStyleDefault('type.defaultLibrary', [['support.type']]);
    registerTokenStyleDefault('class.defaultLibrary', [['support.class']]);
    registerTokenStyleDefault('interface.defaultLibrary', [['support.class']]);
    registerTokenStyleDefault('variable.defaultLibrary', [['support.variable'], ['support.other.variable']]);
    registerTokenStyleDefault('variable.defaultLibrary.readonly', [['support.constant']]);
    registerTokenStyleDefault('property.defaultLibrary', [['support.variable.property']]);
    registerTokenStyleDefault('property.defaultLibrary.readonly', [['support.constant.property']]);
    registerTokenStyleDefault('function.defaultLibrary', [['support.function']]);
    registerTokenStyleDefault('member.defaultLibrary', [['support.function']]);
    return registry;
}
export function getTokenClassificationRegistry() {
    return tokenClassificationRegistry;
}
function getStylingSchemeEntry(description, deprecationMessage) {
    return {
        description,
        deprecationMessage,
        defaultSnippets: [{ body: '${1:#ff0000}' }],
        anyOf: [
            {
                type: 'string',
                format: 'color-hex'
            },
            {
                $ref: '#/definitions/style'
            }
        ]
    };
}
export const tokenStylingSchemaId = 'vscode://schemas/token-styling';
const schemaRegistry = platform.Registry.as(JSONExtensions.JSONContribution);
schemaRegistry.registerSchema(tokenStylingSchemaId, tokenClassificationRegistry.getTokenStylingSchema());
const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(tokenStylingSchemaId), 200);
tokenClassificationRegistry.onDidChangeSchema(() => {
    if (!delayer.isScheduled()) {
        delayer.schedule();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9rZW5DbGFzc2lmaWNhdGlvblJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90aGVtZS9jb21tb24vdG9rZW5DbGFzc2lmaWNhdGlvblJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFFL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFFLFVBQVUsSUFBSSxjQUFjLEVBQTZCLE1BQU0sc0RBQXNELENBQUM7QUFDL0gsT0FBTyxLQUFLLFFBQVEsTUFBTSxtQ0FBbUMsQ0FBQztBQUc5RCxNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQztBQUNoQyxNQUFNLG1DQUFtQyxHQUFHLEdBQUcsQ0FBQztBQUNoRCxNQUFNLDZCQUE2QixHQUFHLEdBQUcsQ0FBQztBQUsxQyxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUM7QUFDbEMsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxTQUFTLEdBQUcsQ0FBQztBQUV6RCxNQUFNLGVBQWUsR0FBRyxLQUFLLFNBQVMsV0FBVyw2QkFBNkIsR0FBRyxTQUFTLE1BQU0sbUNBQW1DLEdBQUcsU0FBUyxLQUFLLENBQUM7QUFFckosTUFBTSxnQkFBZ0IsR0FBRyxvREFBb0QsQ0FBQztBQXdCOUUsTUFBTSxPQUFPLFVBQVU7SUFDdEIsWUFDaUIsVUFBNkIsRUFDN0IsSUFBeUIsRUFD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