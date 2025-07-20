/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
/**
 * Normalizes a URL by removing trailing slashes and query/fragment components.
 * @param url The URL to normalize.
 * @returns URI - The normalized URI object.
 */
function normalizeURL(url) {
    const uri = typeof url === 'string' ? URI.parse(url) : url;
    return uri.with({
        // Remove trailing slashes
        path: uri.path.replace(/\/+$/, ''),
        // Remove query and fragment
        query: null,
        fragment: null,
    });
}
/**
 * Checks if a given URL matches a glob URL pattern.
 * The glob URL pattern can contain wildcards (*) and subdomain matching (*.)
 * @param uri The URL to check.
 * @param globUrl The glob URL pattern to match against.
 * @returns boolean - True if the URL matches the glob URL pattern, false otherwise.
 */
export function testUrlMatchesGlob(uri, globUrl) {
    const normalizedUrl = normalizeURL(uri);
    let normalizedGlobUrl;
    const globHasScheme = /^[^./:]*:\/\//.test(globUrl);
    // if the glob does not have a scheme we assume the scheme is http or https
    // so if the url doesn't have a scheme of http or https we return false
    if (!globHasScheme) {
        if (normalizedUrl.scheme !== 'http' && normalizedUrl.scheme !== 'https') {
            return false;
        }
        normalizedGlobUrl = normalizeURL(`${normalizedUrl.scheme}://${globUrl}`);
    }
    else {
        normalizedGlobUrl = normalizeURL(globUrl);
    }
    return (doMemoUrlMatch(normalizedUrl.scheme, normalizedGlobUrl.scheme) &&
        // The authority is the only thing that should do port logic.
        doMemoUrlMatch(normalizedUrl.authority, normalizedGlobUrl.authority, true) &&
        (
        //
        normalizedGlobUrl.path === '/' ||
            doMemoUrlMatch(normalizedUrl.path, normalizedGlobUrl.path)));
}
/**
 * @param normalizedUrlPart The normalized URL part to match.
 * @param normalizedGlobUrlPart The normalized glob URL part to match against.
 * @param includePortLogic Whether to include port logic in the matching process.
 * @returns boolean - True if the URL part matches the glob URL part, false otherwise.
 */
function doMemoUrlMatch(normalizedUrlPart, normalizedGlobUrlPart, includePortLogic = false) {
    const memo = Array.from({ length: normalizedUrlPart.length + 1 }).map(() => Array.from({ length: normalizedGlobUrlPart.length + 1 }).map(() => undefined));
    return doUrlPartMatch(memo, includePortLogic, normalizedUrlPart, normalizedGlobUrlPart, 0, 0);
}
/**
 * Recursively checks if a URL part matches a glob URL part.
 * This function uses memoization to avoid recomputing results for the same inputs.
 * It handles various cases such as exact matches, wildcard matches, and port logic.
 * @param memo A memoization table to avoid recomputing results for the same inputs.
 * @param includePortLogic Whether to include port logic in the matching process.
 * @param urlPart The URL part to match with.
 * @param globUrlPart The glob URL part to match against.
 * @param urlOffset The current offset in the URL part.
 * @param globUrlOffset The current offset in the glob URL part.
 * @returns boolean - True if the URL part matches the glob URL part, false otherwise.
 */
function doUrlPartMatch(memo, includePortLogic, urlPart, globUrlPart, urlOffset, globUrlOffset) {
    if (memo[urlOffset]?.[globUrlOffset] !== undefined) {
        return memo[urlOffset][globUrlOffset];
    }
    const options = [];
    // We've reached the end of the url.
    if (urlOffset === urlPart.length) {
        // We're also at the end of the glob url as well so we have an exact match.
        if (globUrlOffset === globUrlPart.length) {
            return true;
        }
        if (includePortLogic && globUrlPart[globUrlOffset] + globUrlPart[globUrlOffset + 1] === ':*') {
            // any port match. Consume a port if it exists otherwise nothing. Always consume the base.
            return globUrlOffset + 2 === globUrlPart.length;
        }
        return false;
    }
    // Some path remaining in url
    if (globUrlOffset === globUrlPart.length) {
        const remaining = urlPart.slice(urlOffset);
        return remaining[0] === '/';
    }
    if (urlPart[urlOffset] === globUrlPart[globUrlOffset]) {
        // Exact match.
        options.push(doUrlPartMatch(memo, includePortLogic, urlPart, globUrlPart, urlOffset + 1, globUrlOffset + 1));
    }
    if (globUrlPart[globUrlOffset] + globUrlPart[globUrlOffset + 1] === '*.') {
        // Any subdomain match. Either consume one thing that's not a / or : and don't advance base or consume nothing and do.
        if (!['/', ':'].includes(urlPart[urlOffset])) {
            options.push(doUrlPartMatch(memo, includePortLogic, urlPart, globUrlPart, urlOffset + 1, globUrlOffset));
        }
        options.push(doUrlPartMatch(memo, includePortLogic, urlPart, globUrlPart, urlOffset, globUrlOffset + 2));
    }
    if (globUrlPart[globUrlOffset] === '*') {
        // Any match. Either consume one thing and don't advance base or consume nothing and do.
        if (urlOffset + 1 === urlPart.length) {
            // If we're at the end of the input url consume one from both.
            options.push(doUrlPartMatch(memo, includePortLogic, urlPart, globUrlPart, urlOffset + 1, globUrlOffset + 1));
        }
        else {
            options.push(doUrlPartMatch(memo, includePortLogic, urlPart, globUrlPart, urlOffset + 1, globUrlOffset));
        }
        options.push(doUrlPartMatch(memo, includePortLogic, urlPart, globUrlPart, urlOffset, globUrlOffset + 1));
    }
    if (includePortLogic && globUrlPart[globUrlOffset] + globUrlPart[globUrlOffset + 1] === ':*') {
        // any port match. Consume a port if it exists otherwise nothing. Always consume the base.
        if (urlPart[urlOffset] === ':') {
            let endPortIndex = urlOffset + 1;
            do {
                endPortIndex++;
            } while (/[0-9]/.test(urlPart[endPortIndex]));
            options.push(doUrlPartMatch(memo, includePortLogic, urlPart, globUrlPart, endPortIndex, globUrlOffset + 2));
        }
        else {
            options.push(doUrlPartMatch(memo, includePortLogic, urlPart, globUrlPart, urlOffset, globUrlOffset + 2));
        }
    }
    return (memo[urlOffset][globUrlOffset] = options.some(a => a === true));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsR2xvYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdXJsL2NvbW1vbi91cmxHbG9iLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRDs7OztHQUlHO0FBQ0gsU0FBUyxZQUFZLENBQUMsR0FBaUI7SUFDdEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxHQUFHLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFDM0QsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2YsMEJBQTBCO1FBQzFCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1FBQ2xDLDRCQUE0QjtRQUM1QixLQUFLLEVBQUUsSUFBSTtRQUNYLFFBQVEsRUFBRSxJQUFJO0tBQ2QsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxHQUFpQixFQUFFLE9BQWU7SUFDcEUsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hDLElBQUksaUJBQXNCLENBQUM7SUFFM0IsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNwRCwyRUFBMkU7SUFDM0UsdUVBQXVFO0lBQ3ZFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNwQixJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssT0FBTyxFQUFFLENB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