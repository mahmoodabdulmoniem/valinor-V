/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from './arrays.js';
import { isThenable } from './async.js';
import { isEqualOrParent } from './extpath.js';
import { LRUCache } from './map.js';
import { basename, extname, posix, sep } from './path.js';
import { isLinux } from './platform.js';
import { escapeRegExpCharacters, ltrim } from './strings.js';
export function getEmptyExpression() {
    return Object.create(null);
}
export const GLOBSTAR = '**';
export const GLOB_SPLIT = '/';
const PATH_REGEX = '[/\\\\]'; // any slash or backslash
const NO_PATH_REGEX = '[^/\\\\]'; // any non-slash and non-backslash
const ALL_FORWARD_SLASHES = /\//g;
function starsToRegExp(starCount, isLastPattern) {
    switch (starCount) {
        case 0:
            return '';
        case 1:
            return `${NO_PATH_REGEX}*?`; // 1 star matches any number of characters except path separator (/ and \) - non greedy (?)
        default:
            // Matches:  (Path Sep OR Path Val followed by Path Sep) 0-many times except when it's the last pattern
            //           in which case also matches (Path Sep followed by Path Val)
            // Group is non capturing because we don't need to capture at all (?:...)
            // Overall we use non-greedy matching because it could be that we match too much
            return `(?:${PATH_REGEX}|${NO_PATH_REGEX}+${PATH_REGEX}${isLastPattern ? `|${PATH_REGEX}${NO_PATH_REGEX}+` : ''})*?`;
    }
}
export function splitGlobAware(pattern, splitChar) {
    if (!pattern) {
        return [];
    }
    const segments = [];
    let inBraces = false;
    let inBrackets = false;
    let curVal = '';
    for (const char of pattern) {
        switch (char) {
            case splitChar:
                if (!inBraces && !inBrackets) {
                    segments.push(curVal);
                    curVal = '';
                    continue;
                }
                break;
            case '{':
                inBraces = true;
                break;
            case '}':
                inBraces = false;
                break;
            case '[':
                inBrackets = true;
                break;
            case ']':
                inBrackets = false;
                break;
        }
        curVal += char;
    }
    // Tail
    if (curVal) {
        segments.push(curVal);
    }
    return segments;
}
function parseRegExp(pattern) {
    if (!pattern) {
        return '';
    }
    let regEx = '';
    // Split up into segments for each slash found
    const segments = splitGlobAware(pattern, GLOB_SPLIT);
    // Special case where we only have globstars
    if (segments.every(segment => segment === GLOBSTAR)) {
        regEx = '.*';
    }
    // Build regex over segments
    else {
        let previousSegmentWasGlobStar = false;
        segments.forEach((segment, index) => {
            // Treat globstar specially
            if (segment === GLOBSTAR) {
                // if we have more than one globstar after another, just ignore it
                if (previousSegmentWasGlobStar) {
                    return;
                }
                regEx += starsToRegExp(2, index === segments.length - 1);
            }
            // Anything else, not globstar
            else {
                // States
                let inBraces = false;
                let braceVal = '';
                let inBrackets = false;
                let bracketVal = '';
                for (const char of segment) {
                    // Support brace expansion
                    if (char !== '}' && inBraces) {
                        braceVal += char;
                        continue;
                    }
                    // Support brackets
                    if (inBrackets && (char !== ']' || !bracketVal) /* ] is literally only allowed as first character in brackets to match it */) {
                        let res;
                        // range operator
                        if (char === '-') {
                            res = char;
                        }
                        // negation operator (only valid on first index in bracket)
                        else if ((char === '^' || char === '!') && !bracketVal) {
                            res = '^';
                        }
                        // glob split matching is not allowed within character ranges
                        // see http://man7.org/linux/man-pages/man7/glob.7.html
                        else if (char === GLOB_SPLIT) {
                            res = '';
                        }
                        // anything else gets escaped
                        else {
                            res = escapeRegExpCharacters(char);
                        }
                        bracketVal += res;
                        continue;
                    }
                    switch (char) {
                        case '{':
                            inBraces = true;
                            continue;
                        case '[':
                            inBrackets = true;
                            continue;
                        case '}': {
                            const choices = splitGlobAware(braceVal, ',');
                            // Converts {foo,bar} => [foo|bar]
                            const braceRegExp = `(?:${choices.map(choice => parseRegExp(choice)).join('|')})`;
                            regEx += braceRegExp;
                            inBraces = false;
                            braceVal = '';
                            break;
                        }
                        case ']': {
                            regEx += ('[' + bracketVal + ']');
                            inBrackets = false;
                            bracketVal = '';
                            break;
                        }
                        case '?':
                            regEx += NO_PATH_REGEX; // 1 ? matches any single character except path separator (/ and \)
                            continue;
                        case '*':
                            regEx += starsToRegExp(1);
                            continue;
                        default:
                            regEx += escapeRegExpCharacters(char);
                    }
                }
                // Tail: Add the slash we had split on if there is more to
                // come and the remaining pattern is not a globstar
                // For example if pattern: some/**/*.js we want the "/" after
                // some to be included in the RegEx to prevent a folder called
                // "something" to match as well.
                if (index < segments.length - 1 && // more segments to come after this
                    (segments[index + 1] !== GLOBSTAR || // next segment is not **, or...
                        index + 2 < segments.length // ...next segment is ** but there is more segments after that
                    )) {
                    regEx += PATH_REGEX;
                }
            }
            // update globstar state
            previousSegmentWasGlobStar = (segment === GLOBSTAR);
        });
    }
    return regEx;
}
// regexes to check for trivial glob patterns that just check for String#endsWith
const T1 = /^\*\*\/\*\.[\w\.-]+$/; // **/*.something
const T2 = /^\*\*\/([\w\.-]+)\/?$/; // **/something
const T3 = /^{\*\*\/\*?[\w\.-]+\/?(,\*\*\/\*?[\w\.-]+\/?)*}$/; // {**/*.something,**/*.else} or {**/package.json,**/project.json}
const T3_2 = /^{\*\*\/\*?[\w\.-]+(\/(\*\*)?)?(,\*\*\/\*?[\w\.-]+(\/(\*\*)?)?)*}$/; // Like T3, with optional trailing /**
const T4 = /^\*\*((\/[\w\.-]+)+)\/?$/; // **/something/else
const T5 = /^([\w\.-]+(\/[\w\.-]+)*)\/?$/; // something/else
const CACHE = new LRUCache(10000); // bounded to 10000 elements
const FALSE = function () {
    return false;
};
const NULL = function () {
    return null;
};
/**
 * Check if a provided parsed pattern or expression
 * is empty - hence it won't ever match anything.
 *
 * See {@link FALSE} and {@link NULL}.
 */
export function isEmptyPattern(pattern) {
    if (pattern === FALSE) {
        return true;
    }
    if (pattern === NULL) {
        return true;
    }
    return false;
}
function parsePattern(arg1, options) {
    if (!arg1) {
        return NULL;
    }
    // Handle relative patterns
    let pattern;
    if (typeof arg1 !== 'string') {
        pattern = arg1.pattern;
    }
    else {
        pattern = arg1;
    }
    // Whitespace trimming
    pattern = pattern.trim();
    // Check cache
    const patternKey = `${pattern}_${!!options.trimForExclusions}`;
    let parsedPattern = CACHE.get(patternKey);
    if (parsedPattern) {
        return wrapRelativePattern(parsedPattern, arg1);
    }
    // Check for Trivials
    let match;
    if (T1.test(pattern)) {
        parsedPattern = trivia1(pattern.substr(4), pattern); // common pattern: **/*.txt just need endsWith check
    }
    else if (match = T2.exec(trimForExclusions(pattern, options))) { // common pattern: **/some.txt just need basename check
        parsedPattern = trivia2(match[1], pattern);
    }
    else if ((options.trimForExclusions ? T3_2 : T3).test(pattern)) { // repetition of common patterns (see above) {**/*.txt,**/*.png}
        parsedPattern = trivia3(pattern, options);
    }
    else if (match = T4.exec(trimForExclusions(pattern, options))) { // common pattern: **/something/else just need endsWith check
        parsedPattern = trivia4and5(match[1].substr(1), pattern, true);
    }
    else if (match = T5.exec(trimForExclusions(pattern, options))) { // common pattern: something/else just need equals check
        parsedPattern = trivia4and5(match[1], pattern, false);
    }
    // Otherwise convert to pattern
    else {
        parsedPattern = toRegExp(pattern);
    }
    // Cache
    CACHE.set(patternKey, parsedPattern);
    return wrapRelativePattern(parsedPattern, arg1);
}
function wrapRelativePattern(parsedPattern, arg2) {
    if (typeof arg2 === 'string') {
        return parsedPattern;
    }
    const wrappedPattern = function (path, basename) {
        if (!isEqualOrParent(path, arg2.base, !isLinux)) {
            // skip glob matching if `base` is not a parent of `path`
            return null;
        }
        // Given we have checked `base` being a parent of `path`,
        // we can now remove the `base` portion of the `path`
        // and only match on the remaining path components
        // For that we try to extract the portion of the `path`
        // that comes after the `base` portion. We have to account
        // for the fact that `base` might end in a path separator
        // (https://github.com/microsoft/vscode/issues/162498)
        return parsedPattern(ltrim(path.substr(arg2.base.length), sep), basename);
    };
    // Make sure to preserve associated metadata
    wrappedPattern.allBasenames = parsedPattern.allBasenames;
    wrappedPattern.allPaths = parsedPattern.allPaths;
    wrappedPattern.basenames = parsedPattern.basenames;
    wrappedPattern.patterns = parsedPattern.patterns;
    return wrappedPattern;
}
function trimForExclusions(pattern, options) {
    return options.trimForExclusions && pattern.endsWith('/**') ? pattern.substr(0, pattern.length - 2) : pattern; // dropping **, tailing / is dropped later
}
// common pattern: **/*.txt just need endsWith check
function trivia1(base, pattern) {
    return function (path, basename) {
        return typeof path === 'string' && path.endsWith(base) ? pattern : null;
    };
}
// common pattern: **/some.txt just need basename check
function trivia2(base, pattern) {
    const slashBase = `/${base}`;
    const backslashBase = `\\${base}`;
    const parsedPattern = function (path, basename) {
        if (typeof path !== 'string') {
            return null;
        }
        if (basename) {
            return basename === base ? pattern : null;
        }
        return path === base || path.endsWith(slashBase) || path.endsWith(backslashBase) ? pattern : null;
    };
    const basenames = [base];
    parsedPattern.basenames = basenames;
    parsedPattern.patterns = [pattern];
    parsedPattern.allBasenames = basenames;
    return parsedPattern;
}
// repetition of common patterns (see above) {**/*.txt,**/*.png}
function trivia3(pattern, options) {
    const parsedPatterns = aggregateBasenameMatches(pattern.slice(1, -1)
        .split(',')
        .map(pattern => parsePattern(pattern, options))
        .filter(pattern => pattern !== NULL), pattern);
    const patternsLength = parsedPatterns.length;
    if (!patternsLength) {
        return NULL;
    }
    if (patternsLength === 1) {
        return parsedPatterns[0];
    }
    const parsedPattern = function (path, basename) {
        for (let i = 0, n = parsedPatterns.length; i < n; i++) {
            if (parsedPatterns[i](path, basename)) {
                return pattern;
            }
        }
        return null;
    };
    const withBasenames = parsedPatterns.find(pattern => !!pattern.allBasenames);
    if (withBasenames) {
        parsedPattern.allBasenames = withBasenames.allBasenames;
    }
    const allPaths = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, []);
    if (allPaths.length) {
        parsedPattern.allPaths = allPaths;
    }
    return parsedPattern;
}
// common patterns: **/something/else just need endsWith check, something/else just needs and equals check
function trivia4and5(targetPath, pattern, matchPathEnds) {
    const usingPosixSep = sep === posix.sep;
    const nativePath = usingPosixSep ? targetPath : targetPath.replace(ALL_FORWARD_SLASHES, sep);
    const nativePathEnd = sep + nativePath;
    const targetPathEnd = posix.sep + targetPath;
    let parsedPattern;
    if (matchPathEnds) {
        parsedPattern = function (path, basename) {
            return typeof path === 'string' && ((path === nativePath || path.endsWith(nativePathEnd)) || !usingPosixSep && (path === targetPath || path.endsWith(targetPathEnd))) ? pattern : null;
        };
    }
    else {
        parsedPattern = function (path, basename) {
            return typeof path === 'string' && (path === nativePath || (!usingPosixSep && path === targetPath)) ? pattern : null;
        };
    }
    parsedPattern.allPaths = [(matchPathEnds ? '*/' : './') + targetPath];
    return parsedPattern;
}
function toRegExp(pattern) {
    try {
        const regExp = new RegExp(`^${parseRegExp(pattern)}$`);
        return function (path) {
            regExp.lastIndex = 0; // reset RegExp to its initial state to reuse it!
            return typeof path === 'string' && regExp.test(path) ? pattern : null;
        };
    }
    catch (error) {
        return NULL;
    }
}
export function match(arg1, path, hasSibling) {
    if (!arg1 || typeof path !== 'string') {
        return false;
    }
    return parse(arg1)(path, undefined, hasSibling);
}
export function parse(arg1, options = {}) {
    if (!arg1) {
        return FALSE;
    }
    // Glob with String
    if (typeof arg1 === 'string' || isRelativePattern(arg1)) {
        const parsedPattern = parsePattern(arg1, options);
        if (parsedPattern === NULL) {
            return FALSE;
        }
        const resultPattern = function (path, basename) {
            return !!parsedPattern(path, basename);
        };
        if (parsedPattern.allBasenames) {
            resultPattern.allBasenames = parsedPattern.allBasenames;
        }
        if (parsedPattern.allPaths) {
            resultPattern.allPaths = parsedPattern.allPaths;
        }
        return resultPattern;
    }
    // Glob with Expression
    return parsedExpression(arg1, options);
}
export function isRelativePattern(obj) {
    const rp = obj;
    if (!rp) {
        return false;
    }
    return typeof rp.base === 'string' && typeof rp.pattern === 'string';
}
export function getBasenameTerms(patternOrExpression) {
    return patternOrExpression.allBasenames || [];
}
export function getPathTerms(patternOrExpression) {
    return patternOrExpression.allPaths || [];
}
function parsedExpression(expression, options) {
    const parsedPatterns = aggregateBasenameMatches(Object.getOwnPropertyNames(expression)
        .map(pattern => parseExpressionPattern(pattern, expression[pattern], options))
        .filter(pattern => pattern !== NULL));
    const patternsLength = parsedPatterns.length;
    if (!patternsLength) {
        return NULL;
    }
    if (!parsedPatterns.some(parsedPattern => !!parsedPattern.requiresSiblings)) {
        if (patternsLength === 1) {
            return parsedPatterns[0];
        }
        const resultExpression = function (path, basename) {
            let resultPromises = undefined;
            for (let i = 0, n = parsedPatterns.length; i < n; i++) {
                const result = parsedPatterns[i](path, basename);
                if (typeof result === 'string') {
                    return result; // immediately return as soon as the first expression matches
                }
                // If the result is a promise, we have to keep it for
                // later processing and await the result properly.
                if (isThenable(result)) {
                    if (!resultPromises) {
                        resultPromises = [];
                    }
                    resultPromises.push(result);
                }
            }
            // With result promises, we have to loop over each and
            // await the result before we can return any result.
            if (resultPromises) {
                return (async () => {
                    for (const resultPromise of resultPromises) {
                        const result = await resultPromise;
                        if (typeof result === 'string') {
                            return result;
                        }
                    }
                    return null;
                })();
            }
            return null;
        };
        const withBasenames = parsedPatterns.find(pattern => !!pattern.allBasenames);
        if (withBasenames) {
            resultExpression.allBasenames = withBasenames.allBasenames;
        }
        const allPaths = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, []);
        if (allPaths.length) {
            resultExpression.allPaths = allPaths;
        }
        return resultExpression;
    }
    const resultExpression = function (path, base, hasSibling) {
        let name = undefined;
        let resultPromises = undefined;
        for (let i = 0, n = parsedPatterns.length; i < n; i++) {
            // Pattern matches path
            const parsedPattern = parsedPatterns[i];
            if (parsedPattern.requiresSiblings && hasSibling) {
                if (!base) {
                    base = basename(path);
                }
                if (!name) {
                    name = base.substr(0, base.length - extname(path).length);
                }
            }
            const result = parsedPattern(path, base, name, hasSibling);
            if (typeof result === 'string') {
                return result; // immediately return as soon as the first expression matches
            }
            // If the result is a promise, we have to keep it for
            // later processing and await the result properly.
            if (isThenable(result)) {
                if (!resultPromises) {
                    resultPromises = [];
                }
                resultPromises.push(result);
            }
        }
        // With result promises, we have to loop over each and
        // await the result before we can return any result.
        if (resultPromises) {
            return (async () => {
                for (const resultPromise of resultPromises) {
                    const result = await resultPromise;
                    if (typeof result === 'string') {
                        return result;
                    }
                }
                return null;
            })();
        }
        return null;
    };
    const withBasenames = parsedPatterns.find(pattern => !!pattern.allBasenames);
    if (withBasenames) {
        resultExpression.allBasenames = withBasenames.allBasenames;
    }
    const allPaths = parsedPatterns.reduce((all, current) => current.allPaths ? all.concat(current.allPaths) : all, []);
    if (allPaths.length) {
        resultExpression.allPaths = allPaths;
    }
    return resultExpression;
}
function parseExpressionPattern(pattern, value, options) {
    if (value === false) {
        return NULL; // pattern is disabled
    }
    const parsedPattern = parsePattern(pattern, options);
    if (parsedPattern === NULL) {
        return NULL;
    }
    // Expression Pattern is <boolean>
    if (typeof value === 'boolean') {
        return parsedPattern;
    }
    // Expression Pattern is <SiblingClause>
    if (value) {
        const when = value.when;
        if (typeof when === 'string') {
            const result = (path, basename, name, hasSibling) => {
                if (!hasSibling || !parsedPattern(path, basename)) {
                    return null;
                }
                const clausePattern = when.replace('$(basename)', () => name);
                const matched = hasSibling(clausePattern);
                return isThenable(matched) ?
                    matched.then(match => match ? pattern : null) :
                    matched ? pattern : null;
            };
            result.requiresSiblings = true;
            return result;
        }
    }
    // Expression is anything
    return parsedPattern;
}
function aggregateBasenameMatches(parsedPatterns, result) {
    const basenamePatterns = parsedPatterns.filter(parsedPattern => !!parsedPattern.basenames);
    if (basenamePatterns.length < 2) {
        return parsedPatterns;
    }
    const basenames = basenamePatterns.reduce((all, current) => {
        const basenames = current.basenames;
        return basenames ? all.concat(basenames) : all;
    }, []);
    let patterns;
    if (result) {
        patterns = [];
        for (let i = 0, n = basenames.length; i < n; i++) {
            patterns.push(result);
        }
    }
    else {
        patterns = basenamePatterns.reduce((all, current) => {
            const patterns = current.patterns;
            return patterns ? all.concat(patterns) : all;
        }, []);
    }
    const aggregate = function (path, basename) {
        if (typeof path !== 'string') {
            return null;
        }
        if (!basename) {
            let i;
            for (i = path.length; i > 0; i--) {
                const ch = path.charCodeAt(i - 1);
                if (ch === 47 /* CharCode.Slash */ || ch === 92 /* CharCode.Backslash */) {
                    break;
                }
            }
            basename = path.substr(i);
        }
        const index = basenames.indexOf(basename);
        return index !== -1 ? patterns[index] : null;
    };
    aggregate.basenames = basenames;
    aggregate.patterns = patterns;
    aggregate.allBasenames = basenames;
    const aggregatedPatterns = parsedPatterns.filter(parsedPattern => !parsedPattern.basenames);
    aggregatedPatterns.push(aggregate);
    return aggregatedPatterns;
}
export function patternsEquals(patternsA, patternsB) {
    return equals(patternsA, patternsB, (a, b) => {
        if (typeof a === 'string' && typeof b === 'string') {
            return a === b;
        }
        if (typeof a !== 'string' && typeof b !== 'string') {
            return a.base === b.base && a.pattern === b.pattern;
        }
        return false;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZ2xvYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3JDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFeEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMvQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN4QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBdUI3RCxNQUFNLFVBQVUsa0JBQWtCO0lBQ2pDLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBTUQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQztBQUM3QixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDO0FBRTlCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxDQUFFLHlCQUF5QjtBQUN4RCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsQ0FBQyxrQ0FBa0M7QUFDcEUsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUM7QUFFbEMsU0FBUyxhQUFhLENBQUMsU0FBaUIsRUFBRSxhQUF1QjtJQUNoRSxRQUFRLFNBQVMsRUFBRSxDQUFDO1FBQ25CLEtBQUssQ0FBQztZQUNMLE9BQU8sRUFBRSxDQUFDO1FBQ1gsS0FB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