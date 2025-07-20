/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Represents an RFC 6570 URI Template.
 */
export class UriTemplate {
    constructor(template, components) {
        this.template = template;
        this.template = template;
        this.components = components;
    }
    /**
     * Parses a URI template string into a UriTemplate instance.
     */
    static parse(template) {
        const components = [];
        const regex = /\{([^{}]+)\}/g;
        let match;
        let lastPos = 0;
        while ((match = regex.exec(template))) {
            const [expression, inner] = match;
            components.push(template.slice(lastPos, match.index));
            lastPos = match.index + expression.length;
            // Handle escaped braces: treat '{{' and '}}' as literals, not expressions
            if (template[match.index - 1] === '{' || template[lastPos] === '}') {
                components.push(inner);
                continue;
            }
            let operator = '';
            let rest = inner;
            if (rest.length > 0 && UriTemplate._isOperator(rest[0])) {
                operator = rest[0];
                rest = rest.slice(1);
            }
            const variables = rest.split(',').map((v) => {
                let name = v;
                let explodable = false;
                let repeatable = false;
                let prefixLength = undefined;
                let optional = false;
                if (name.endsWith('*')) {
                    explodable = true;
                    repeatable = true;
                    name = name.slice(0, -1);
                }
                const prefixMatch = name.match(/^(.*?):(\d+)$/);
                if (prefixMatch) {
                    name = prefixMatch[1];
                    prefixLength = parseInt(prefixMatch[2], 10);
                }
                if (name.endsWith('?')) {
                    optional = true;
                    name = name.slice(0, -1);
                }
                return { explodable, name, optional, prefixLength, repeatable };
            });
            components.push({ expression, operator, variables });
        }
        components.push(template.slice(lastPos));
        return new UriTemplate(template, components);
    }
    static { this._operators = ['+', '#', '.', '/', ';', '?', '&']; }
    static _isOperator(ch) {
        return UriTemplate._operators.includes(ch);
    }
    /**
     * Resolves the template with the given variables.
     */
    resolve(variables) {
        let result = '';
        for (const comp of this.components) {
            if (typeof comp === 'string') {
                result += comp;
            }
            else {
                result += this._expand(comp, variables);
            }
        }
        return result;
    }
    _expand(comp, variables) {
        const op = comp.operator;
        const varSpecs = comp.variables;
        if (varSpecs.length === 0) {
            return comp.expression;
        }
        const vals = [];
        const isNamed = op === ';' || op === '?' || op === '&';
        const isReserved = op === '+' || op === '#';
        const isFragment = op === '#';
        const isLabel = op === '.';
        const isPath = op === '/';
        const isForm = op === '?';
        const isFormCont = op === '&';
        const isParam = op === ';';
        let prefix = '';
        if (op === '+') {
            prefix = '';
        }
        else if (op === '#') {
            prefix = '#';
        }
        else if (op === '.') {
            prefix = '.';
        }
        else if (op === '/') {
            prefix = '';
        }
        else if (op === ';') {
            prefix = ';';
        }
        else if (op === '?') {
            prefix = '?';
        }
        else if (op === '&') {
            prefix = '&';
        }
        for (const v of varSpecs) {
            const value = variables[v.name];
            const defined = Object.prototype.hasOwnProperty.call(variables, v.name);
            if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
                if (isParam) {
                    if (defined && (value === null || value === undefined)) {
                        vals.push(v.name);
                    }
                    continue;
                }
                if (isForm || isFormCont) {
                    if (defined) {
                        vals.push(UriTemplate._formPair(v.name, '', isNamed));
                    }
                    continue;
                }
                continue;
            }
            if (typeof value === 'object' && !Array.isArray(value)) {
                if (v.explodable) {
                    const pairs = [];
                    for (const k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            const thisVal = String(value[k]);
                            if (isParam) {
                                pairs.push(k + '=' + thisVal);
                            }
                            else if (isForm || isFormCont) {
                                pairs.push(k + '=' + thisVal);
                            }
                            else if (isLabel) {
                                pairs.push(k + '=' + thisVal);
                            }
                            else if (isPath) {
                                pairs.push('/' + k + '=' + UriTemplate._encode(thisVal, isReserved));
                            }
                            else {
                                pairs.push(k + '=' + UriTemplate._encode(thisVal, isReserved));
                            }
                        }
                    }
                    if (isLabel) {
                        vals.push(pairs.join('.'));
                    }
                    else if (isPath) {
                        vals.push(pairs.join(''));
                    }
                    else if (isParam) {
                        vals.push(pairs.join(';'));
                    }
                    else if (isForm || isFormCont) {
                        vals.push(pairs.join('&'));
                    }
                    else {
                        vals.push(pairs.join(','));
                    }
                }
                else {
                    // Not explodable: join as k1,v1,k2,v2,... and assign to variable name
                    const pairs = [];
                    for (const k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            pairs.push(k);
                            pairs.push(String(value[k]));
                        }
                    }
                    // For label, param, form, join as keys=semi,;,dot,.,comma,, (no encoding of , or ;)
                    const joined = pairs.join(',');
                    if (isLabel) {
                        vals.push(joined);
                    }
                    else if (isParam || isForm || isFormCont) {
                        vals.push(v.name + '=' + joined);
                    }
                    else {
                        vals.push(joined);
                    }
                }
                continue;
            }
            if (Array.isArray(value)) {
                if (v.explodable) {
                    if (isLabel) {
                        vals.push(value.join('.'));
                    }
                    else if (isPath) {
                        vals.push(value.map(x => '/' + UriTemplate._encode(x, isReserved)).join(''));
                    }
                    else if (isParam) {
                        vals.push(value.map(x => v.name + '=' + String(x)).join(';'));
                    }
                    else if (isForm || isFormCont) {
                        vals.push(value.map(x => v.name + '=' + String(x)).join('&'));
                    }
                    else {
                        vals.push(value.map(x => UriTemplate._encode(x, isReserved)).join(','));
                    }
                }
                else {
                    if (isLabel) {
                        vals.push(value.join(','));
                    }
                    else if (isParam) {
                        vals.push(v.name + '=' + value.join(','));
                    }
                    else if (isForm || isFormCont) {
                        vals.push(v.name + '=' + value.join(','));
                    }
                    else {
                        vals.push(value.map(x => UriTemplate._encode(x, isReserved)).join(','));
                    }
                }
                continue;
            }
            let str = String(value);
            if (v.prefixLength !== undefined) {
                str = str.substring(0, v.prefixLength);
            }
            // For simple expansion, encode ! as well (not reserved)
            // Only + and # are reserved
            const enc = UriTemplate._encode(str, op === '+' || op === '#');
            if (isParam) {
                vals.push(v.name + '=' + enc);
            }
            else if (isForm || isFormCont) {
                vals.push(v.name + '=' + enc);
            }
            else if (isLabel) {
                vals.push(enc);
            }
            else if (isPath) {
                vals.push('/' + enc);
            }
            else {
                vals.push(enc);
            }
        }
        let joined = '';
        if (isLabel) {
            // Remove trailing dot for missing values
            const filtered = vals.filter(v => v !== '');
            joined = filtered.length ? prefix + filtered.join('.') : '';
        }
        else if (isPath) {
            // Remove empty segments for undefined/null
            const filtered = vals.filter(v => v !== '');
            joined = filtered.length ? filtered.join('') : '';
            if (joined && !joined.startsWith('/')) {
                joined = '/' + joined;
            }
        }
        else if (isParam) {
            // For param, if value is empty string, just append ;name
            joined = vals.length ? prefix + vals.map(v => v.replace(/=\s*$/, '')).join(';') : '';
        }
        else if (isForm) {
            joined = vals.length ? prefix + vals.join('&') : '';
        }
        else if (isFormCont) {
            joined = vals.length ? prefix + vals.join('&') : '';
        }
        else if (isFragment) {
            joined = prefix + vals.join(',');
        }
        else if (isReserved) {
            joined = vals.join(',');
        }
        else {
            joined = vals.join(',');
        }
        return joined;
    }
    static _encode(str, reserved) {
        return reserved ? encodeURI(str) : pctEncode(str);
    }
    static _formPair(k, v, named) {
        return named ? k + '=' + encodeURIComponent(String(v)) : encodeURIComponent(String(v));
    }
}
function pctEncode(str) {
    let out = '';
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        if (
        // alphanum ranges:
        (chr >= 0x30 && chr <= 0x39 || chr >= 0x41 && chr <= 0x5a || chr >= 0x61 && chr <= 0x7a) ||
            // unreserved characters:
            (chr === 0x2d || chr === 0x2e || chr === 0x5f || chr === 0x7e)) {
            out += str[i];
        }
        else {
            out += '%' + chr.toString(16).toUpperCase();
        }
    }
    return out;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpVGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vdXJpVGVtcGxhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFnQmhHOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFdBQVc7SUFNdkIsWUFDaUIsUUFBZ0IsRUFDaEMsVUFBeUQ7UUFEekMsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUdoQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUM5QixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQWdCO1FBQ25DLE1BQU0sVUFBVSxHQUEwQyxFQUFFLENBQUM7UUFDN0QsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDO1FBQzlCLElBQUksS0FBNkIsQ0FBQztRQUNsQyxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFDaEIsT0FBTyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN2QyxNQUFNLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztZQUNsQyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sR0FBRyxLQUFLLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7WUFFMUMsMEVBQTBFO1lBQzFFLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLFFBQVEsQ0FBQyxPQUFP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