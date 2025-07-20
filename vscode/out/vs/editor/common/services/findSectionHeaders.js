/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMultilineRegexSource } from '../model/textModelSearch.js';
import { regExpLeadsToEndlessLoop } from '../../../base/common/strings.js';
const trimDashesRegex = /^-+|-+$/g;
const CHUNK_SIZE = 100;
const MAX_SECTION_LINES = 5;
/**
 * Find section headers in the model.
 *
 * @param model the text model to search in
 * @param options options to search with
 * @returns an array of section headers
 */
export function findSectionHeaders(model, options) {
    let headers = [];
    if (options.findRegionSectionHeaders && options.foldingRules?.markers) {
        const regionHeaders = collectRegionHeaders(model, options);
        headers = headers.concat(regionHeaders);
    }
    if (options.findMarkSectionHeaders) {
        const markHeaders = collectMarkHeaders(model, options);
        headers = headers.concat(markHeaders);
    }
    return headers;
}
function collectRegionHeaders(model, options) {
    const regionHeaders = [];
    const endLineNumber = model.getLineCount();
    for (let lineNumber = 1; lineNumber <= endLineNumber; lineNumber++) {
        const lineContent = model.getLineContent(lineNumber);
        const match = lineContent.match(options.foldingRules.markers.start);
        if (match) {
            const range = { startLineNumber: lineNumber, startColumn: match[0].length + 1, endLineNumber: lineNumber, endColumn: lineContent.length + 1 };
            if (range.endColumn > range.startColumn) {
                const sectionHeader = {
                    range,
                    ...getHeaderText(lineContent.substring(match[0].length)),
                    shouldBeInComments: false
                };
                if (sectionHeader.text || sectionHeader.hasSeparatorLine) {
                    regionHeaders.push(sectionHeader);
                }
            }
        }
    }
    return regionHeaders;
}
export function collectMarkHeaders(model, options) {
    const markHeaders = [];
    const endLineNumber = model.getLineCount();
    // Validate regex to prevent infinite loops
    if (!options.markSectionHeaderRegex || options.markSectionHeaderRegex.trim() === '') {
        return markHeaders;
    }
    // Create regex with flags for:
    // - 'd' for indices to get proper match positions
    // - 'm' for multi-line mode so ^ and $ match line starts/ends
    // - 's' for dot-all mode so . matches newlines
    const multiline = isMultilineRegexSource(options.markSectionHeaderRegex);
    const regex = new RegExp(options.markSectionHeaderRegex, `gdm${multiline ? 's' : ''}`);
    // Check if the regex would lead to an endless loop
    if (regExpLeadsToEndlessLoop(regex)) {
        return markHeaders;
    }
    // Process text in overlapping chunks for better performance
    for (let startLine = 1; startLine <= endLineNumber; startLine += CHUNK_SIZE - MAX_SECTION_LINES) {
        const endLine = Math.min(startLine + CHUNK_SIZE - 1, endLineNumber);
        const lines = [];
        // Collect lines for the current chunk
        for (let i = startLine; i <= endLine; i++) {
            lines.push(model.getLineContent(i));
        }
        const text = lines.join('\n');
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            // Calculate which line this match starts on by counting newlines before it
            const precedingText = text.substring(0, match.index);
            const lineOffset = (precedingText.match(/\n/g) || []).length;
            const lineNumber = startLine + lineOffset;
            // Calculate match height to check overlap properly
            const matchLines = match[0].split('\n');
            const matchHeight = matchLines.length;
            const matchEndLine = lineNumber + matchHeight - 1;
            // Calculate start column - need to find the start of the line containing the match
            const lineStartIndex = precedingText.lastIndexOf('\n') + 1;
            const startColumn = match.index - lineStartIndex + 1;
            // Calculate end column - need to handle multi-line matches
            const lastMatchLine = matchLines[matchLines.length - 1];
            const endColumn = matchHeight === 1 ? startColumn + match[0].length : lastMatchLine.length + 1;
            const range = {
                startLineNumber: lineNumber,
                startColumn,
                endLineNumber: matchEndLine,
                endColumn
            };
            const text2 = (match.groups ?? {})['label'] ?? '';
            const hasSeparatorLine = ((match.groups ?? {})['separator'] ?? '') !== '';
            const sectionHeader = {
                range,
                text: text2,
                hasSeparatorLine,
                shouldBeInComments: true
            };
            if (sectionHeader.text || sectionHeader.hasSeparatorLine) {
                // only push if the previous one doesn't have this same linbe
                if (markHeaders.length === 0 || markHeaders[markHeaders.length - 1].range.endLineNumber < sectionHeader.range.startLineNumber) {
                    markHeaders.push(sectionHeader);
                }
            }
            // Move lastIndex past the current match to avoid infinite loop
            regex.lastIndex = match.index + match[0].length;
        }
    }
    return markHeaders;
}
function getHeaderText(text) {
    text = text.trim();
    const hasSeparatorLine = text.startsWith('-');
    text = text.replace(trimDashesRegex, '');
    return { text, hasSeparatorLine };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFNlY3Rpb25IZWFkZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL2ZpbmRTZWN0aW9uSGVhZGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQWlDM0UsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDO0FBRW5DLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQztBQUN2QixNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQztBQUU1Qjs7Ozs7O0dBTUc7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsS0FBaUMsRUFBRSxPQUFpQztJQUN0RyxJQUFJLE9BQU8sR0FBb0IsRUFBRSxDQUFDO0lBQ2xDLElBQUksT0FBTyxDQUFDLHdCQUF3QixJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDdkUsTUFBTSxhQUFhLEdBQUcsb0JBQW9CLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzNELE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFDRCxJQUFJLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLGtCQUFrQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2RCxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBQ0QsT0FBTyxPQUFPLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsS0FB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