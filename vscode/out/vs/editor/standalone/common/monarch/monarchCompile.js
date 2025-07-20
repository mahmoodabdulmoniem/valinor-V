/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*
 * This module only exports 'compile' which compiles a JSON language definition
 * into a typed and checked ILexer definition.
 */
import { isString } from '../../../../base/common/types.js';
import * as monarchCommon from './monarchCommon.js';
/*
 * Type helpers
 *
 * Note: this is just for sanity checks on the JSON description which is
 * helpful for the programmer. No checks are done anymore once the lexer is
 * already 'compiled and checked'.
 *
 */
function isArrayOf(elemType, obj) {
    if (!obj) {
        return false;
    }
    if (!(Array.isArray(obj))) {
        return false;
    }
    for (const el of obj) {
        if (!(elemType(el))) {
            return false;
        }
    }
    return true;
}
function bool(prop, defValue) {
    if (typeof prop === 'boolean') {
        return prop;
    }
    return defValue;
}
function string(prop, defValue) {
    if (typeof (prop) === 'string') {
        return prop;
    }
    return defValue;
}
function arrayToHash(array) {
    const result = {};
    for (const e of array) {
        result[e] = true;
    }
    return result;
}
function createKeywordMatcher(arr, caseInsensitive = false) {
    if (caseInsensitive) {
        arr = arr.map(function (x) { return x.toLowerCase(); });
    }
    const hash = arrayToHash(arr);
    if (caseInsensitive) {
        return function (word) {
            return hash[word.toLowerCase()] !== undefined && hash.hasOwnProperty(word.toLowerCase());
        };
    }
    else {
        return function (word) {
            return hash[word] !== undefined && hash.hasOwnProperty(word);
        };
    }
}
function compileRegExp(lexer, str, handleSn) {
    // @@ must be interpreted as a literal @, so we replace all occurences of @@ with a placeholder character
    str = str.replace(/@@/g, `\x01`);
    let n = 0;
    let hadExpansion;
    do {
        hadExpansion = false;
        str = str.replace(/@(\w+)/g, function (s, attr) {
            hadExpansion = true;
            let sub = '';
            if (typeof (lexer[attr]) === 'string') {
                sub = lexer[attr];
            }
            else if (lexer[attr] && lexer[attr] instanceof RegExp) {
                sub = lexer[attr].source;
            }
            else {
                if (lexer[attr] === undefined) {
                    throw monarchCommon.createError(lexer, 'language definition does not contain attribute \'' + attr + '\', used at: ' + str);
                }
                else {
                    throw monarchCommon.createError(lexer, 'attribute reference \'' + attr + '\' must be a string, used at: ' + str);
                }
            }
            return (monarchCommon.empty(sub) ? '' : '(?:' + sub + ')');
        });
        n++;
    } while (hadExpansion && n < 5);
    // handle escaped @@
    str = str.replace(/\x01/g, '@');
    const flags = (lexer.ignoreCase ? 'i' : '') + (lexer.unicode ? 'u' : '');
    // handle $Sn
    if (handleSn) {
        const match = str.match(/\$[sS](\d\d?)/g);
        if (match) {
            let lastState = null;
            let lastRegEx = null;
            return (state) => {
                if (lastRegEx && lastState === state) {
                    return lastRegEx;
                }
                lastState = state;
                lastRegEx = new RegExp(monarchCommon.substituteMatchesRe(lexer, str, state), flags);
                return lastRegEx;
            };
        }
    }
    return new RegExp(str, flags);
}
/**
 * Compiles guard functions for case matches.
 * This compiles 'cases' attributes into efficient match functions.
 *
 */
function selectScrutinee(id, matches, state, num) {
    if (num < 0) {
        return id;
    }
    if (num < matches.length) {
        return matches[num];
    }
    if (num >= 100) {
        num = num - 100;
        const parts = state.split('.');
        parts.unshift(state);
        if (num < parts.length) {
            return parts[num];
        }
    }
    return null;
}
function createGuard(lexer, ruleName, tkey, val) {
    // get the scrutinee and pattern
    let scrut = -1; // -1: $!, 0-99: $n, 100+n: $Sn
    let oppat = tkey;
    let matches = tkey.match(/^\$(([sS]?)(\d\d?)|#)(.*)$/);
    if (matches) {
        if (matches[3]) { // if digits
            scrut = parseInt(matches[3]);
            if (matches[2]) {
                scrut = scrut + 100; // if [sS] present
            }
        }
        oppat = matches[4];
    }
    // get operator
    let op = '~';
    let pat = oppat;
    if (!oppat || oppat.length === 0) {
        op = '!=';
        pat = '';
    }
    else if (/^\w*$/.test(pat)) { // just a word
        op = '==';
    }
    else {
        matches = oppat.match(/^(@|!@|~|!~|==|!=)(.*)$/);
        if (matches) {
            op = matches[1];
            pat = matches[2];
        }
    }
    // set the tester function
    let tester;
    // special case a regexp that matches just words
    if ((op === '~' || op === '!~') && /^(\w|\|)*$/.test(pat)) {
        const inWords = createKeywordMatcher(pat.split('|'), lexer.ignoreCase);
        tester = function (s) { return (op === '~' ? inWords(s) : !inWords(s)); };
    }
    else if (op === '@' || op === '!@') {
        const words = lexer[pat];
        if (!words) {
            throw monarchCommon.createError(lexer, 'the @ match target \'' + pat + '\' is not defined, in rule: ' + ruleName);
        }
        if (!(isArrayOf(function (elem) { return (typeof (elem) === 'string'); }, words))) {
            throw monarchCommon.createError(lexer, 'the @ match target \'' + pat + '\' must be an array of strings, in rule: ' + ruleName);
        }
        const inWords = createKeywordMatcher(words, lexer.ignoreCase);
        tester = function (s) { return (op === '@' ? inWords(s) : !inWords(s)); };
    }
    else if (op === '~' || op === '!~') {
        if (pat.indexOf('$') < 0) {
            // precompile regular expression
            const re = compileRegExp(lexer, '^' + pat + '$', false);
            tester = function (s) { return (op === '~' ? re.test(s) : !re.test(s)); };
        }
        else {
            tester = function (s, id, matches, state) {
                const re = compileRegExp(lexer, '^' + monarchCommon.substituteMatches(lexer, pat, id, matches, state) + '$', false);
                return re.test(s);
            };
        }
    }
    else { // if (op==='==' || op==='!=') {
        if (pat.indexOf('$') < 0) {
            const patx = monarchCommon.fixCase(lexer, pat);
            tester = function (s) { return (op === '==' ? s === patx : s !== patx); };
        }
        else {
            const patx = monarchCommon.fixCase(lexer, pat);
            tester = function (s, id, matches, state, eos) {
                const patexp = monarchCommon.substituteMatches(lexer, patx, id, matches, state);
                return (op === '==' ? s === patexp : s !== patexp);
            };
        }
    }
    // return the branch object
    if (scrut === -1) {
        return {
            name: tkey, value: val, test: function (id, matches, state, eos) {
                return tester(id, id, matches, state, eos);
            }
        };
    }
    else {
        return {
            name: tkey, value: val, test: function (id, matches, state, eos) {
                const scrutinee = selectScrutinee(id, matches, state, scrut);
                return tester(!scrutinee ? '' : scrutinee, id, matches, state, eos);
            }
        };
    }
}
/**
 * Compiles an action: i.e. optimize regular expressions and case matches
 * and do many sanity checks.
 *
 * This is called only during compilation but if the lexer definition
 * contains user functions as actions (which is usually not allowed), then this
 * may be called during lexing. It is important therefore to compile common cases efficiently
 */
function compileAction(lexer, ruleName, action) {
    if (!action) {
        return { token: '' };
    }
    else if (typeof (action) === 'string') {
        return action; // { token: action };
    }
    else if (action.token || action.token === '') {
        if (typeof (action.token) !== 'string') {
            throw monarchCommon.createError(lexer, 'a \'token\' attribute must be of type string, in rule: ' + ruleName);
        }
        else {
            // only copy specific typed fields (only happens once during compile Lexer)
            const newAction = { token: action.token };
            if (action.token.indexOf('$') >= 0) {
                newAction.tokenSubst = true;
            }
            if (typeof (action.bracket) === 'string') {
                if (action.bracket === '@open') {
                    newAction.bracket = 1 /* monarchCommon.MonarchBracket.Open */;
                }
                else if (action.bracket === '@close') {
                    newAction.bracket = -1 /* monarchCommon.MonarchBracket.Close */;
                }
                else {
                    throw monarchCommon.createError(lexer, 'a \'bracket\' attribute must be either \'@open\' or \'@close\', in rule: ' + ruleName);
                }
            }
            if (action.next) {
                if (typeof (action.next) !== 'string') {
                    throw monarchCommon.createError(lexer, 'the next state must be a string value in rule: ' + ruleName);
                }
                else {
                    let next = action.next;
                    if (!/^(@pop|@push|@popall)$/.test(next)) {
                        if (next[0] === '@') {
                            next = next.substr(1); // peel off starting @ sign
                        }
                        if (next.indexOf('$') < 0) { // no dollar substitution, we can check if the state exists
                            if (!monarchCommon.stateExists(lexer, monarchCommon.substituteMatches(lexer, next, '', [], ''))) {
                                throw monarchCommon.createError(lexer, 'the next state \'' + action.next + '\' is not defined in rule: ' + ruleName);
                            }
                        }
                    }
                    newAction.next = next;
                }
            }
            if (typeof (action.goBack) === 'number') {
                newAction.goBack = action.goBack;
            }
            if (typeof (action.switchTo) === 'string') {
                newAction.switchTo = action.switchTo;
            }
            if (typeof (action.log) === 'string') {
                newAction.log = action.log;
            }
            if (typeof (action.nextEmbedded) === 'string') {
                newAction.nextEmbedded = action.nextEmbedded;
                lexer.usesEmbedded = true;
            }
            return newAction;
        }
    }
    else if (Array.isArray(action)) {
        const results = [];
        for (let i = 0, len = action.length; i < len; i++) {
            results[i] = compileAction(lexer, ruleName, action[i]);
        }
        return { group: results };
    }
    else if (action.cases) {
        // build an array of test cases
        const cases = [];
        let hasEmbeddedEndInCases = false;
        // for each case, push a test function and result value
        for (const tkey in action.cases) {
            if (action.cases.hasOwnProperty(tkey)) {
                const val = compileAction(lexer, ruleName, action.cases[tkey]);
                // what kind of case
                if (tkey === '@default' || tkey === '@' || tkey === '') {
                    cases.push({ test: undefined, value: val, name: tkey });
                }
                else if (tkey === '@eos') {
                    cases.push({ test: function (id, matches, state, eos) { return eos; }, value: val, name: tkey });
                }
                else {
                    cases.push(createGuard(lexer, ruleName, tkey, val)); // call separate function to avoid local variable capture
                }
                if (!hasEmbeddedEndInCases) {
                    hasEmbeddedEndInCases = !isString(val) && (val.hasEmbeddedEndInCases || ['@pop', '@popall'].includes(val.nextEmbedded || ''));
                }
            }
        }
        // create a matching function
        const def = lexer.defaultToken;
        return {
            hasEmbeddedEndInCases,
            test: function (id, matches, state, eos) {
                for (const _case of cases) {
                    const didmatch = (!_case.test || _case.test(id, matches, state, eos));
                    if (didmatch) {
                        return _case.value;
                    }
                }
                return def;
            }
        };
    }
    else {
        throw monarchCommon.createError(lexer, 'an action must be a string, an object with a \'token\' or \'cases\' attribute, or an array of actions; in rule: ' + ruleName);
    }
}
/**
 * Helper class for creating matching rules
 */
class Rule {
    constructor(name) {
        this.regex = new RegExp('');
        this.action = { token: '' };
        this.matchOnlyAtLineStart = false;
        this.name = '';
        this.name = name;
    }
    setRegex(lexer, re) {
        let sregex;
        if (typeof (re) === 'string') {
            sregex = re;
        }
        else if (re instanceof RegExp) {
            sregex = re.source;
        }
        else {
            throw monarchCommon.createError(lexer, 'rules must start with a match string or regular expression: ' + this.name);
        }
        this.matchOnlyAtLineStart = (sregex.length > 0 && sregex[0] === '^');
        this.name = this.name + ': ' + sregex;
        this.regex = compileRegExp(lexer, '^(?:' + (this.matchOnlyAtLineStart ? sregex.substr(1) : sregex) + ')', true);
    }
    setAction(lexer, act) {
        this.action = compileAction(lexer, this.name, act);
    }
    resolveRegex(state) {
        if (this.regex instanceof RegExp) {
            return this.regex;
        }
        else {
            return this.regex(state);
        }
    }
}
/**
 * Compiles a json description function into json where all regular expressions,
 * case matches etc, are compiled and all include rules are expanded.
 * We also compile the bracket definitions, supply defaults, and do many sanity checks.
 * If the 'jsonStrict' parameter is 'false', we allow at certain locations
 * regular expression objects and functions that get called during lexing.
 * (Currently we have no samples that need this so perhaps we should always have
 * jsonStrict to true).
 */
export function compile(languageId, json) {
    if (!json || typeof (json) !== 'object') {
        throw new Error('Monarch: expecting a language definition object');
    }
    // Create our lexer
    const lexer = {
        languageId: languageId,
        includeLF: bool(json.includeLF, false),
        noThrow: false, // raise exceptions during compilation
        maxStack: 100,
        start: (typeof json.start === 'string' ? json.start : null),
        ignoreCase: bool(json.ignoreCase, false),
        unicode: bool(json.unicode, false),
        tokenPostfix: string(json.tokenPostfix, '.' + languageId),
        defaultToken: string(json.defaultToken, 'source'),
        usesEmbedded: false, // becomes true if we find a nextEmbedded action
        stateNames: {},
        tokenizer: {},
        brackets: []
    };
    // For calling compileAction later on
    const lexerMin = json;
    lexerMin.languageId = languageId;
    lexerMin.includeLF = lexer.includeLF;
    lexerMin.ignoreCase = lexer.ignoreCase;
    lexerMin.unicode = lexer.unicode;
    lexerMin.noThrow = lexer.noThrow;
    lexerMin.usesEmbedded = lexer.usesEmbedded;
    lexerMin.stateNames = json.tokenizer;
    lexerMin.defaultToken = lexer.defaultToken;
    // Compile an array of rules into newrules where RegExp objects are created.
    function addRules(state, newrules, rules) {
        for (const rule of rules) {
            let include = rule.include;
            if (include) {
                if (typeof (include) !== 'string') {
                    throw monarchCommon.createError(lexer, 'an \'include\' attribute must be a string at: ' + state);
                }
                if (include[0] === '@') {
                    include = include.substr(1); // peel off starting @
                }
                if (!json.tokenizer[include]) {
                    throw monarchCommon.createError(lexer, 'include target \'' + include + '\' is not defined at: ' + state);
                }
                addRules(state + '.' + include, newrules, json.tokenizer[include]);
            }
            else {
                const newrule = new Rule(state);
                // Set up new rule attributes
                if (Array.isArray(rule) && rule.length >= 1 && rule.length <= 3) {
                    newrule.setRegex(lexerMin, rule[0]);
                    if (rule.length >= 3) {
                        if (typeof (rule[1]) === 'string') {
                            newrule.setAction(lexerMin, { token: rule[1], next: rule[2] });
                        }
                        else if (typeof (rule[1]) === 'object') {
                            const rule1 = rule[1];
                            rule1.next = rule[2];
                            newrule.setAction(lexerMin, rule1);
                        }
                        else {
                            throw monarchCommon.createError(lexer, 'a next state as the last element of a rule can only be given if the action is either an object or a string, at: ' + state);
                        }
                    }
                    else {
                        newrule.setAction(lexerMin, rule[1]);
                    }
                }
                else {
                    if (!rule.regex) {
                        throw monarchCommon.createError(lexer, 'a rule must either be an array, or an object with a \'regex\' or \'include\' field at: ' + state);
                    }
                    if (rule.name) {
                        if (typeof rule.name === 'string') {
                            newrule.name = rule.name;
                        }
                    }
                    if (rule.matchOnlyAtStart) {
                        newrule.matchOnlyAtLineStart = bool(rule.matchOnlyAtLineStart, false);
                    }
                    newrule.setRegex(lexerMin, rule.regex);
                    newrule.setAction(lexerMin, rule.action);
                }
                newrules.push(newrule);
            }
        }
    }
    // compile the tokenizer rules
    if (!json.tokenizer || typeof (json.tokenizer) !== 'object') {
        throw monarchCommon.createError(lexer, 'a language definition must define the \'tokenizer\' attribute as an object');
    }
    lexer.tokenizer = [];
    for (const key in json.tokenizer) {
        if (json.tokenizer.hasOwnProperty(key)) {
            if (!lexer.start) {
                lexer.start = key;
            }
            const rules = json.tokenizer[key];
            lexer.tokenizer[key] = new Array();
            addRules('tokenizer.' + key, lexer.tokenizer[key], rules);
        }
    }
    lexer.usesEmbedded = lexerMin.usesEmbedded; // can be set during compileAction
    // Set simple brackets
    if (json.brackets) {
        if (!(Array.isArray(json.brackets))) {
            throw monarchCommon.createError(lexer, 'the \'brackets\' attribute must be defined as an array');
        }
    }
    else {
        json.brackets = [
            { open: '{', close: '}', token: 'delimiter.curly' },
            { open: '[', close: ']', token: 'delimiter.square' },
            { open: '(', close: ')', token: 'delimiter.parenthesis' },
            { open: '<', close: '>', token: 'delimiter.angle' }
        ];
    }
    const brackets = [];
    for (const el of json.brackets) {
        let desc = el;
        if (desc && Array.isArray(desc) && desc.length === 3) {
            desc = { token: desc[2], open: desc[0], close: desc[1] };
        }
        if (desc.open === desc.close) {
            throw monarchCommon.createError(lexer, 'open and close brackets in a \'brackets\' attribute must be different: ' + desc.open +
                '\n hint: use the \'bracket\' attribute if matching on equal brackets is required.');
        }
        if (typeof desc.open === 'string' && typeof desc.token === 'string' && typeof desc.close === 'string') {
            brackets.push({
                token: desc.token + lexer.tokenPostfix,
                open: monarchCommon.fixCase(lexer, desc.open),
                close: monarchCommon.fixCase(lexer, desc.close)
            });
        }
        else {
            throw monarchCommon.createError(lexer, 'every element in the \'brackets\' array must be a \'{open,close,token}\' object or array');
        }
    }
    lexer.brackets = brackets;
    // Disable throw so the syntax highlighter goes, no matter what
    lexer.noThrow = true;
    return lexer;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaENvbXBpbGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2NvbW1vbi9tb25hcmNoL21vbmFyY2hDb21waWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7R0FHRztBQUVILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEtBQUssYUFBYSxNQUFNLG9CQUFvQixDQUFDO0FBR3BEOzs7Ozs7O0dBT0c7QUFFSCxTQUFTLFNBQVMsQ0FBQyxRQUE2QixFQUFFLEdBQVE7SUFDekQsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ1YsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ0QsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDM0IsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBQ0QsS0FBSyxNQUFNLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFTLElBQUksQ0FBQyxJQUFTLEVBQUUsUUFBaUI7SUFDekMsSUFBSSxPQUFPLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUMvQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDRCxPQUFPLFFBQVEsQ0FBQztBQUNqQixDQUFDO0FBRUQsU0FBUyxNQUFNLENBQUMsSUFBUyxFQUFFLFFBQWdCO0lBQzFDLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxL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