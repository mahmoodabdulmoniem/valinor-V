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
var MonarchTokenizer_1;
/**
 * Create a syntax highighter with a fully declarative JSON style lexer description
 * using regular expressions.
 */
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as languages from '../../../common/languages.js';
import { NullState, nullTokenizeEncoded, nullTokenize } from '../../../common/languages/nullTokenize.js';
import * as monarchCommon from './monarchCommon.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const CACHE_STACK_DEPTH = 5;
/**
 * Reuse the same stack elements up to a certain depth.
 */
class MonarchStackElementFactory {
    static { this._INSTANCE = new MonarchStackElementFactory(CACHE_STACK_DEPTH); }
    static create(parent, state) {
        return this._INSTANCE.create(parent, state);
    }
    constructor(maxCacheDepth) {
        this._maxCacheDepth = maxCacheDepth;
        this._entries = Object.create(null);
    }
    create(parent, state) {
        if (parent !== null && parent.depth >= this._maxCacheDepth) {
            // no caching above a certain depth
            return new MonarchStackElement(parent, state);
        }
        let stackElementId = MonarchStackElement.getStackElementId(parent);
        if (stackElementId.length > 0) {
            stackElementId += '|';
        }
        stackElementId += state;
        let result = this._entries[stackElementId];
        if (result) {
            return result;
        }
        result = new MonarchStackElement(parent, state);
        this._entries[stackElementId] = result;
        return result;
    }
}
class MonarchStackElement {
    constructor(parent, state) {
        this.parent = parent;
        this.state = state;
        this.depth = (this.parent ? this.parent.depth : 0) + 1;
    }
    static getStackElementId(element) {
        let result = '';
        while (element !== null) {
            if (result.length > 0) {
                result += '|';
            }
            result += element.state;
            element = element.parent;
        }
        return result;
    }
    static _equals(a, b) {
        while (a !== null && b !== null) {
            if (a === b) {
                return true;
            }
            if (a.state !== b.state) {
                return false;
            }
            a = a.parent;
            b = b.parent;
        }
        if (a === null && b === null) {
            return true;
        }
        return false;
    }
    equals(other) {
        return MonarchStackElement._equals(this, other);
    }
    push(state) {
        return MonarchStackElementFactory.create(this, state);
    }
    pop() {
        return this.parent;
    }
    popall() {
        let result = this;
        while (result.parent) {
            result = result.parent;
        }
        return result;
    }
    switchTo(state) {
        return MonarchStackElementFactory.create(this.parent, state);
    }
}
class EmbeddedLanguageData {
    constructor(languageId, state) {
        this.languageId = languageId;
        this.state = state;
    }
    equals(other) {
        return (this.languageId === other.languageId
            && this.state.equals(other.state));
    }
    clone() {
        const stateClone = this.state.clone();
        // save an object
        if (stateClone === this.state) {
            return this;
        }
        return new EmbeddedLanguageData(this.languageId, this.state);
    }
}
/**
 * Reuse the same line states up to a certain depth.
 */
class MonarchLineStateFactory {
    static { this._INSTANCE = new MonarchLineStateFactory(CACHE_STACK_DEPTH); }
    static create(stack, embeddedLanguageData) {
        return this._INSTANCE.create(stack, embeddedLanguageData);
    }
    constructor(maxCacheDepth) {
        this._maxCacheDepth = maxCacheDepth;
        this._entries = Object.create(null);
    }
    create(stack, embeddedLanguageData) {
        if (embeddedLanguageData !== null) {
            // no caching when embedding
            return new MonarchLineState(stack, embeddedLanguageData);
        }
        if (stack !== null && stack.depth >= this._maxCacheDepth) {
            // no caching above a certain depth
            return new MonarchLineState(stack, embeddedLanguageData);
        }
        const stackElementId = MonarchStackElement.getStackElementId(stack);
        let result = this._entries[stackElementId];
        if (result) {
            return result;
        }
        result = new MonarchLineState(stack, null);
        this._entries[stackElementId] = result;
        return result;
    }
}
class MonarchLineState {
    constructor(stack, embeddedLanguageData) {
        this.stack = stack;
        this.embeddedLanguageData = embeddedLanguageData;
    }
    clone() {
        const embeddedlanguageDataClone = this.embeddedLanguageData ? this.embeddedLanguageData.clone() : null;
        // save an object
        if (embeddedlanguageDataClone === this.embeddedLanguageData) {
            return this;
        }
        return MonarchLineStateFactory.create(this.stack, this.embeddedLanguageData);
    }
    equals(other) {
        if (!(other instanceof MonarchLineState)) {
            return false;
        }
        if (!this.stack.equals(other.stack)) {
            return false;
        }
        if (this.embeddedLanguageData === null && other.embeddedLanguageData === null) {
            return true;
        }
        if (this.embeddedLanguageData === null || other.embeddedLanguageData === null) {
            return false;
        }
        return this.embeddedLanguageData.equals(other.embeddedLanguageData);
    }
}
class MonarchClassicTokensCollector {
    constructor() {
        this._tokens = [];
        this._languageId = null;
        this._lastTokenType = null;
        this._lastTokenLanguage = null;
    }
    enterLanguage(languageId) {
        this._languageId = languageId;
    }
    emit(startOffset, type) {
        if (this._lastTokenType === type && this._lastTokenLanguage === this._languageId) {
            return;
        }
        this._lastTokenType = type;
        this._lastTokenLanguage = this._languageId;
        this._tokens.push(new languages.Token(startOffset, type, this._languageId));
    }
    nestedLanguageTokenize(embeddedLanguageLine, hasEOL, embeddedLanguageData, offsetDelta) {
        const nestedLanguageId = embeddedLanguageData.languageId;
        const embeddedModeState = embeddedLanguageData.state;
        const nestedLanguageTokenizationSupport = languages.TokenizationRegistry.get(nestedLanguageId);
        if (!nestedLanguageTokenizationSupport) {
            this.enterLanguage(nestedLanguageId);
            this.emit(offsetDelta, '');
            return embeddedModeState;
        }
        const nestedResult = nestedLanguageTokenizationSupport.tokenize(embeddedLanguageLine, hasEOL, embeddedModeState);
        if (offsetDelta !== 0) {
            for (const token of nestedResult.tokens) {
                this._tokens.push(new languages.Token(token.offset + offsetDelta, token.type, token.language));
            }
        }
        else {
            this._tokens = this._tokens.concat(nestedResult.tokens);
        }
        this._lastTokenType = null;
        this._lastTokenLanguage = null;
        this._languageId = null;
        return nestedResult.endState;
    }
    finalize(endState) {
        return new languages.TokenizationResult(this._tokens, endState);
    }
}
class MonarchModernTokensCollector {
    constructor(languageService, theme) {
        this._languageService = languageService;
        this._theme = theme;
        this._prependTokens = null;
        this._tokens = [];
        this._currentLanguageId = 0 /* LanguageId.Null */;
        this._lastTokenMetadata = 0;
    }
    enterLanguage(languageId) {
        this._currentLanguageId = this._languageService.languageIdCodec.encodeLanguageId(languageId);
    }
    emit(startOffset, type) {
        const metadata = this._theme.match(this._currentLanguageId, type) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */;
        if (this._lastTokenMetadata === metadata) {
            return;
        }
        this._lastTokenMetadata = metadata;
        this._tokens.push(startOffset);
        this._tokens.push(metadata);
    }
    static _merge(a, b, c) {
        const aLen = (a !== null ? a.length : 0);
        const bLen = b.length;
        const cLen = (c !== null ? c.length : 0);
        if (aLen === 0 && bLen === 0 && cLen === 0) {
            return new Uint32Array(0);
        }
        if (aLen === 0 && bLen === 0) {
            return c;
        }
        if (bLen === 0 && cLen === 0) {
            return a;
        }
        const result = new Uint32Array(aLen + bLen + cLen);
        if (a !== null) {
            result.set(a);
        }
        for (let i = 0; i < bLen; i++) {
            result[aLen + i] = b[i];
        }
        if (c !== null) {
            result.set(c, aLen + bLen);
        }
        return result;
    }
    nestedLanguageTokenize(embeddedLanguageLine, hasEOL, embeddedLanguageData, offsetDelta) {
        const nestedLanguageId = embeddedLanguageData.languageId;
        const embeddedModeState = embeddedLanguageData.state;
        const nestedLanguageTokenizationSupport = languages.TokenizationRegistry.get(nestedLanguageId);
        if (!nestedLanguageTokenizationSupport) {
            this.enterLanguage(nestedLanguageId);
            this.emit(offsetDelta, '');
            return embeddedModeState;
        }
        const nestedResult = nestedLanguageTokenizationSupport.tokenizeEncoded(embeddedLanguageLine, hasEOL, embeddedModeState);
        if (offsetDelta !== 0) {
            for (let i = 0, len = nestedResult.tokens.length; i < len; i += 2) {
                nestedResult.tokens[i] += offsetDelta;
            }
        }
        this._prependTokens = MonarchModernTokensCollector._merge(this._prependTokens, this._tokens, nestedResult.tokens);
        this._tokens = [];
        this._currentLanguageId = 0;
        this._lastTokenMetadata = 0;
        return nestedResult.endState;
    }
    finalize(endState) {
        return new languages.EncodedTokenizationResult(MonarchModernTokensCollector._merge(this._prependTokens, this._tokens, null), endState);
    }
}
let MonarchTokenizer = MonarchTokenizer_1 = class MonarchTokenizer extends Disposable {
    constructor(languageService, standaloneThemeService, languageId, lexer, _configurationService) {
        super();
        this._configurationService = _configurationService;
        this._languageService = languageService;
        this._standaloneThemeService = standaloneThemeService;
        this._languageId = languageId;
        this._lexer = lexer;
        this._embeddedLanguages = Object.create(null);
        this.embeddedLoaded = Promise.resolve(undefined);
        // Set up listening for embedded modes
        let emitting = false;
        this._register(languages.TokenizationRegistry.onDidChange((e) => {
            if (emitting) {
                return;
            }
            let isOneOfMyEmbeddedModes = false;
            for (let i = 0, len = e.changedLanguages.length; i < len; i++) {
                const language = e.changedLanguages[i];
                if (this._embeddedLanguages[language]) {
                    isOneOfMyEmbeddedModes = true;
                    break;
                }
            }
            if (isOneOfMyEmbeddedModes) {
                emitting = true;
                languages.TokenizationRegistry.handleChange([this._languageId]);
                emitting = false;
            }
        }));
        this._maxTokenizationLineLength = this._configurationService.getValue('editor.maxTokenizationLineLength', {
            overrideIdentifier: this._languageId
        });
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('editor.maxTokenizationLineLength')) {
                this._maxTokenizationLineLength = this._configurationService.getValue('editor.maxTokenizationLineLength', {
                    overrideIdentifier: this._languageId
                });
            }
        }));
    }
    getLoadStatus() {
        const promises = [];
        for (const nestedLanguageId in this._embeddedLanguages) {
            const tokenizationSupport = languages.TokenizationRegistry.get(nestedLanguageId);
            if (tokenizationSupport) {
                // The nested language is already loaded
                if (tokenizationSupport instanceof MonarchTokenizer_1) {
                    const nestedModeStatus = tokenizationSupport.getLoadStatus();
                    if (nestedModeStatus.loaded === false) {
                        promises.push(nestedModeStatus.promise);
                    }
                }
                continue;
            }
            if (!languages.TokenizationRegistry.isResolved(nestedLanguageId)) {
                // The nested language is in the process of being loaded
                promises.push(languages.TokenizationRegistry.getOrCreate(nestedLanguageId));
            }
        }
        if (promises.length === 0) {
            return {
                loaded: true
            };
        }
        return {
            loaded: false,
            promise: Promise.all(promises).then(_ => undefined)
        };
    }
    getInitialState() {
        const rootState = MonarchStackElementFactory.create(null, this._lexer.start);
        return MonarchLineStateFactory.create(rootState, null);
    }
    tokenize(line, hasEOL, lineState) {
        if (line.length >= this._maxTokenizationLineLength) {
            return nullTokenize(this._languageId, lineState);
        }
        const tokensCollector = new MonarchClassicTokensCollector();
        const endLineState = this._tokenize(line, hasEOL, lineState, tokensCollector);
        return tokensCollector.finalize(endLineState);
    }
    tokenizeEncoded(line, hasEOL, lineState) {
        if (line.length >= this._maxTokenizationLineLength) {
            return nullTokenizeEncoded(this._languageService.languageIdCodec.encodeLanguageId(this._languageId), lineState);
        }
        const tokensCollector = new MonarchModernTokensCollector(this._languageService, this._standaloneThemeService.getColorTheme().tokenTheme);
        const endLineState = this._tokenize(line, hasEOL, lineState, tokensCollector);
        return tokensCollector.finalize(endLineState);
    }
    _tokenize(line, hasEOL, lineState, collector) {
        if (lineState.embeddedLanguageData) {
            return this._nestedTokenize(line, hasEOL, lineState, 0, collector);
        }
        else {
            return this._myTokenize(line, hasEOL, lineState, 0, collector);
        }
    }
    _findLeavingNestedLanguageOffset(line, state) {
        let rules = this._lexer.tokenizer[state.stack.state];
        if (!rules) {
            rules = monarchCommon.findRules(this._lexer, state.stack.state); // do parent matching
            if (!rules) {
                throw monarchCommon.createError(this._lexer, 'tokenizer state is not defined: ' + state.stack.state);
            }
        }
        let popOffset = -1;
        let hasEmbeddedPopRule = false;
        for (const rule of rules) {
            if (!monarchCommon.isIAction(rule.action) || !(rule.action.nextEmbedded === '@pop' || rule.action.hasEmbeddedEndInCases)) {
                continue;
            }
            hasEmbeddedPopRule = true;
            let regex = rule.resolveRegex(state.stack.state);
            const regexSource = regex.source;
            if (regexSource.substr(0, 4) === '^(?:' && regexSource.substr(regexSource.length - 1, 1) === ')') {
                const flags = (regex.ignoreCase ? 'i' : '') + (regex.unicode ? 'u' : '');
                regex = new RegExp(regexSource.substr(4, regexSource.length - 5), flags);
            }
            const result = line.search(regex);
            if (result === -1 || (result !== 0 && rule.matchOnlyAtLineStart)) {
                continue;
            }
            if (popOffset === -1 || result < popOffset) {
                popOffset = result;
            }
        }
        if (!hasEmbeddedPopRule) {
            throw monarchCommon.createError(this._lexer, 'no rule containing nextEmbedded: "@pop" in tokenizer embedded state: ' + state.stack.state);
        }
        return popOffset;
    }
    _nestedTokenize(line, hasEOL, lineState, offsetDelta, tokensCollector) {
        const popOffset = this._findLeavingNestedLanguageOffset(line, lineState);
        if (popOffset === -1) {
            // tokenization will not leave nested language
            const nestedEndState = tokensCollector.nestedLanguageTokenize(line, hasEOL, lineState.embeddedLanguageData, offsetDelta);
            return MonarchLineStateFactory.create(lineState.stack, new EmbeddedLanguageData(lineState.embeddedLanguageData.languageId, nestedEndState));
        }
        const nestedLanguageLine = line.substring(0, popOffset);
        if (nestedLanguageLine.length > 0) {
            // tokenize with the nested language
            tokensCollector.nestedLanguageTokenize(nestedLanguageLine, false, lineState.embeddedLanguageData, offsetDelta);
        }
        const restOfTheLine = line.substring(popOffset);
        return this._myTokenize(restOfTheLine, hasEOL, lineState, offsetDelta + popOffset, tokensCollector);
    }
    _safeRuleName(rule) {
        if (rule) {
            return rule.name;
        }
        return '(unknown)';
    }
    _myTokenize(lineWithoutLF, hasEOL, lineState, offsetDelta, tokensCollector) {
        tokensCollector.enterLanguage(this._languageId);
        const lineWithoutLFLength = lineWithoutLF.length;
        const line = (hasEOL && this._lexer.includeLF ? lineWithoutLF + '\n' : lineWithoutLF);
        const lineLength = line.length;
        let embeddedLanguageData = lineState.embeddedLanguageData;
        let stack = lineState.stack;
        let pos = 0;
        let groupMatching = null;
        // See https://github.com/microsoft/monaco-editor/issues/1235
        // Evaluate rules at least once for an empty line
        let forceEvaluation = true;
        while (forceEvaluation || pos < lineLength) {
            const pos0 = pos;
            const stackLen0 = stack.depth;
            const groupLen0 = groupMatching ? groupMatching.groups.length : 0;
            const state = stack.state;
            let matches = null;
            let matched = null;
            let action = null;
            let rule = null;
            let enteringEmbeddedLanguage = null;
            // check if we need to process group matches first
            if (groupMatching) {
                matches = groupMatching.matches;
                const groupEntry = groupMatching.groups.shift();
                matched = groupEntry.matched;
                action = groupEntry.action;
                rule = groupMatching.rule;
                // cleanup if necessary
                if (groupMatching.groups.length === 0) {
                    groupMatching = null;
                }
            }
            else {
                // otherwise we match on the token stream
                if (!forceEvaluation && pos >= lineLength) {
                    // nothing to do
                    break;
                }
                forceEvaluation = false;
                // get the rules for this state
                let rules = this._lexer.tokenizer[state];
                if (!rules) {
                    rules = monarchCommon.findRules(this._lexer, state); // do parent matching
                    if (!rules) {
                        throw monarchCommon.createError(this._lexer, 'tokenizer state is not defined: ' + state);
                    }
                }
                // try each rule until we match
                const restOfLine = line.substr(pos);
                for (const rule of rules) {
                    if (pos === 0 || !rule.matchOnlyAtLineStart) {
                        matches = restOfLine.match(rule.resolveRegex(state));
                        if (matches) {
                            matched = matches[0];
                            action = rule.action;
                            break;
                        }
                    }
                }
            }
            // We matched 'rule' with 'matches' and 'action'
            if (!matches) {
                matches = [''];
                matched = '';
            }
            if (!action) {
                // bad: we didn't match anything, and there is no action to take
                // we need to advance the stream or we get progress trouble
                if (pos < lineLength) {
                    matches = [line.charAt(pos)];
                    matched = matches[0];
                }
                action = this._lexer.defaultToken;
            }
            if (matched === null) {
                // should never happen, needed for strict null checking
                break;
            }
            // advance stream
            pos += matched.length;
            // maybe call action function (used for 'cases')
            while (monarchCommon.isFuzzyAction(action) && monarchCommon.isIAction(action) && action.test) {
                action = action.test(matched, matches, state, pos === lineLength);
            }
            let result = null;
            // set the result: either a string or an array of actions
            if (typeof action === 'string' || Array.isArray(action)) {
                result = action;
            }
            else if (action.group) {
                result = action.group;
            }
            else if (action.token !== null && action.token !== undefined) {
                // do $n replacements?
                if (action.tokenSubst) {
                    result = monarchCommon.substituteMatches(this._lexer, action.token, matched, matches, state);
                }
                else {
                    result = action.token;
                }
                // enter embedded language?
                if (action.nextEmbedded) {
                    if (action.nextEmbedded === '@pop') {
                        if (!embeddedLanguageData) {
                            throw monarchCommon.createError(this._lexer, 'cannot pop embedded language if not inside one');
                        }
                        embeddedLanguageData = null;
                    }
                    else if (embeddedLanguageData) {
                        throw monarchCommon.createError(this._lexer, 'cannot enter embedded language from within an embedded language');
                    }
                    else {
                        enteringEmbeddedLanguage = monarchCommon.substituteMatches(this._lexer, action.nextEmbedded, matched, matches, state);
                    }
                }
                // state transformations
                if (action.goBack) { // back up the stream..
                    pos = Math.max(0, pos - action.goBack);
                }
                if (action.switchTo && typeof action.switchTo === 'string') {
                    let nextState = monarchCommon.substituteMatches(this._lexer, action.switchTo, matched, matches, state); // switch state without a push...
                    if (nextState[0] === '@') {
                        nextState = nextState.substr(1); // peel off starting '@'
                    }
                    if (!monarchCommon.findRules(this._lexer, nextState)) {
                        throw monarchCommon.createError(this._lexer, 'trying to switch to a state \'' + nextState + '\' that is undefined in rule: ' + this._safeRuleName(rule));
                    }
                    else {
                        stack = stack.switchTo(nextState);
                    }
                }
                else if (action.transform && typeof action.transform === 'function') {
                    throw monarchCommon.createError(this._lexer, 'action.transform not supported');
                }
                else if (action.next) {
                    if (action.next === '@push') {
                        if (stack.depth >= this._lexer.maxStack) {
                            throw monarchCommon.createError(this._lexer, 'maximum tokenizer stack size reached: [' +
                                stack.state + ',' + stack.parent.state + ',...]');
                        }
                        else {
                            stack = stack.push(state);
                        }
                    }
                    else if (action.next === '@pop') {
                        if (stack.depth <= 1) {
                            throw monarchCommon.createError(this._lexer, 'trying to pop an empty stack in rule: ' + this._safeRuleName(rule));
                        }
                        else {
                            stack = stack.pop();
                        }
                    }
                    else if (action.next === '@popall') {
                        stack = stack.popall();
                    }
                    else {
                        let nextState = monarchCommon.substituteMatches(this._lexer, action.next, matched, matches, state);
                        if (nextState[0] === '@') {
                            nextState = nextState.substr(1); // peel off starting '@'
                        }
                        if (!monarchCommon.findRules(this._lexer, nextState)) {
                            throw monarchCommon.createError(this._lexer, 'trying to set a next state \'' + nextState + '\' that is undefined in rule: ' + this._safeRuleName(rule));
                        }
                        else {
                            stack = stack.push(nextState);
                        }
                    }
                }
                if (action.log && typeof (action.log) === 'string') {
                    monarchCommon.log(this._lexer, this._lexer.languageId + ': ' + monarchCommon.substituteMatches(this._lexer, action.log, matched, matches, state));
                }
            }
            // check result
            if (result === null) {
                throw monarchCommon.createError(this._lexer, 'lexer rule has no well-defined action in rule: ' + this._safeRuleName(rule));
            }
            const computeNewStateForEmbeddedLanguage = (enteringEmbeddedLanguage) => {
                // support language names, mime types, and language ids
                const languageId = (this._languageService.getLanguageIdByLanguageName(enteringEmbeddedLanguage)
                    || this._languageService.getLanguageIdByMimeType(enteringEmbeddedLanguage)
                    || enteringEmbeddedLanguage);
                const embeddedLanguageData = this._getNestedEmbeddedLanguageData(languageId);
                if (pos < lineLength) {
                    // there is content from the embedded language on this line
                    const restOfLine = lineWithoutLF.substr(pos);
                    return this._nestedTokenize(restOfLine, hasEOL, MonarchLineStateFactory.create(stack, embeddedLanguageData), offsetDelta + pos, tokensCollector);
                }
                else {
                    return MonarchLineStateFactory.create(stack, embeddedLanguageData);
                }
            };
            // is the result a group match?
            if (Array.isArray(result)) {
                if (groupMatching && groupMatching.groups.length > 0) {
                    throw monarchCommon.createError(this._lexer, 'groups cannot be nested: ' + this._safeRuleName(rule));
                }
                if (matches.length !== result.length + 1) {
                    throw monarchCommon.createError(this._lexer, 'matched number of groups does not match the number of actions in rule: ' + this._safeRuleName(rule));
                }
                let totalLen = 0;
                for (let i = 1; i < matches.length; i++) {
                    totalLen += matches[i].length;
                }
                if (totalLen !== matched.length) {
                    throw monarchCommon.createError(this._lexer, 'with groups, all characters should be matched in consecutive groups in rule: ' + this._safeRuleName(rule));
                }
                groupMatching = {
                    rule: rule,
                    matches: matches,
                    groups: []
                };
                for (let i = 0; i < result.length; i++) {
                    groupMatching.groups[i] = {
                        action: result[i],
                        matched: matches[i + 1]
                    };
                }
                pos -= matched.length;
                // call recursively to initiate first result match
                continue;
            }
            else {
                // regular result
                // check for '@rematch'
                if (result === '@rematch') {
                    pos -= matched.length;
                    matched = ''; // better set the next state too..
                    matches = null;
                    result = '';
                    // Even though `@rematch` was specified, if `nextEmbedded` also specified,
                    // a state transition should occur.
                    if (enteringEmbeddedLanguage !== null) {
                        return computeNewStateForEmbeddedLanguage(enteringEmbeddedLanguage);
                    }
                }
                // check progress
                if (matched.length === 0) {
                    if (lineLength === 0 || stackLen0 !== stack.depth || state !== stack.state || (!groupMatching ? 0 : groupMatching.groups.length) !== groupLen0) {
                        continue;
                    }
                    else {
                        throw monarchCommon.createError(this._lexer, 'no progress in tokenizer in rule: ' + this._safeRuleName(rule));
                    }
                }
                // return the result (and check for brace matching)
                // todo: for efficiency we could pre-sanitize tokenPostfix and substitutions
                let tokenType = null;
                if (monarchCommon.isString(result) && result.indexOf('@brackets') === 0) {
                    const rest = result.substr('@brackets'.length);
                    const bracket = findBracket(this._lexer, matched);
                    if (!bracket) {
                        throw monarchCommon.createError(this._lexer, '@brackets token returned but no bracket defined as: ' + matched);
                    }
                    tokenType = monarchCommon.sanitize(bracket.token + rest);
                }
                else {
                    const token = (result === '' ? '' : result + this._lexer.tokenPostfix);
                    tokenType = monarchCommon.sanitize(token);
                }
                if (pos0 < lineWithoutLFLength) {
                    tokensCollector.emit(pos0 + offsetDelta, tokenType);
                }
            }
            if (enteringEmbeddedLanguage !== null) {
                return computeNewStateForEmbeddedLanguage(enteringEmbeddedLanguage);
            }
        }
        return MonarchLineStateFactory.create(stack, embeddedLanguageData);
    }
    _getNestedEmbeddedLanguageData(languageId) {
        if (!this._languageService.isRegisteredLanguageId(languageId)) {
            return new EmbeddedLanguageData(languageId, NullState);
        }
        if (languageId !== this._languageId) {
            // Fire language loading event
            this._languageService.requestBasicLanguageFeatures(languageId);
            languages.TokenizationRegistry.getOrCreate(languageId);
            this._embeddedLanguages[languageId] = true;
        }
        const tokenizationSupport = languages.TokenizationRegistry.get(languageId);
        if (tokenizationSupport) {
            return new EmbeddedLanguageData(languageId, tokenizationSupport.getInitialState());
        }
        return new EmbeddedLanguageData(languageId, NullState);
    }
};
MonarchTokenizer = MonarchTokenizer_1 = __decorate([
    __param(4, IConfigurationService)
], MonarchTokenizer);
export { MonarchTokenizer };
/**
 * Searches for a bracket in the 'brackets' attribute that matches the input.
 */
function findBracket(lexer, matched) {
    if (!matched) {
        return null;
    }
    matched = monarchCommon.fixCase(lexer, matched);
    const brackets = lexer.brackets;
    for (const bracket of brackets) {
        if (bracket.open === matched) {
            return { token: bracket.token, bracketType: 1 /* monarchCommon.MonarchBracket.Open */ };
        }
        else if (bracket.close === matched) {
            return { token: bracket.token, bracketType: -1 /* monarchCommon.MonarchBracket.Close */ };
        }
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uYXJjaExleGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9jb21tb24vbW9uYXJjaC9tb25hcmNoTGV4ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHOzs7R0FHRztBQUVILE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEtBQUssU0FBUyxNQUFNLDhCQUE4QixDQUFDO0FBQzFELE9BQU8sRUFBRSxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFHekcsT0FBTyxLQUFLLGFBQWEsTUFBTSxvQkFBb0IsQ0FBQztBQUVwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUduRyxNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQztBQUU1Qjs7R0FFRztBQUNILE1BQU0sMEJBQTBCO2FBRVAsY0FBUyxHQUFHLElBQUksMEJBQTBCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMvRSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQWtDLEVBQUUsS0FBYTtRQUNyRSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBS0QsWUFBWSxhQUFxQjtRQUNoQyxJQUFJLENBQUMsY0FBYyxHQUFHLGFBQWEsQ0FBQztRQUNwQyxJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVNLE1BQU0sQ0FBQyxNQUFrQyxFQUFFLEtBQWE7UUFDOUQsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sQ0FBQyxLQUFL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