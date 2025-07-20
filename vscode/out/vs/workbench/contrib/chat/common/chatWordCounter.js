/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const r = String.raw;
/**
 * Matches `[text](link title?)` or `[text](<link> title?)`
 *
 * Taken from vscode-markdown-languageservice
 */
const linkPattern = r `(?<!\\)` + // Must not start with escape
    // text
    r `(!?\[` + // open prefix match -->
    /**/ r `(?:` +
    /*****/ r `[^\[\]\\]|` + // Non-bracket chars, or...
    /*****/ r `\\.|` + // Escaped char, or...
    /*****/ r `\[[^\[\]]*\]` + // Matched bracket pair
    /**/ r `)*` +
    r `\])` + // <-- close prefix match
    // Destination
    r `(\(\s*)` + // Pre href
    /**/ r `(` +
    /*****/ r `[^\s\(\)<](?:[^\s\(\)]|\([^\s\(\)]*?\))*|` + // Link without whitespace, or...
    /*****/ r `<(?:\\[<>]|[^<>])+>` + // In angle brackets
    /**/ r `)` +
    // Title
    /**/ r `\s*(?:"[^"]*"|'[^']*'|\([^\(\)]*\))?\s*` +
    r `\)`;
export function getNWords(str, numWordsToCount) {
    // This regex matches each word and skips over whitespace and separators. A word is:
    // A markdown link
    // One chinese character
    // One or more + - =, handled so that code like "a=1+2-3" is broken up better
    // One or more characters that aren't whitepace or any of the above
    const backtick = '`';
    const allWordMatches = Array.from(str.matchAll(new RegExp(linkPattern + r `|\p{sc=Han}|=+|\++|-+|[^\s\|\p{sc=Han}|=|\+|\-|${backtick}]+`, 'gu')));
    const targetWords = allWordMatches.slice(0, numWordsToCount);
    const endIndex = numWordsToCount >= allWordMatches.length
        ? str.length // Reached end of string
        : targetWords.length ? targetWords.at(-1).index + targetWords.at(-1)[0].length : 0;
    const value = str.substring(0, endIndex);
    return {
        value,
        returnedWordCount: targetWords.length === 0 ? (value.length ? 1 : 0) : targetWords.length,
        isFullString: endIndex >= str.length,
        totalWordCount: allWordMatches.length
    };
}
export function countWords(str) {
    const result = getNWords(str, Number.MAX_SAFE_INTEGER);
    return result.returnedWordCount;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdvcmRDb3VudGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0V29yZENvdW50ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUVyQjs7OztHQUlHO0FBQ0gsTUFBTSxXQUFXLEdBQ2hCLENBQUMsQ0FBQSxTQUFTLEdBQUcsNkJBQTZCO0lBRTFDLE9BQU87SUFDUCxDQUFDLENBQUEsT0FBTyxHQUFHLHdCQUF3QjtJQUNuQyxJQUFJLENBQUEsQ0FBQyxDQUFBLEtBQUs7SUFDVixPQUFPLENBQUEsQ0FBQyxDQUFBLFlBQVksR0FBRywyQkFBMkI7SUFDbEQsT0FBTyxDQUFBLENBQUMsQ0FBQSxNQUFNLEdBQUcsc0JBQXNCO0lBQ3ZDLE9BQU8sQ0FBQSxDQUFDLENBQUEsY0FBYyxHQUFHLHVCQUF1QjtJQUNoRCxJQUFJLENBQUEsQ0FBQyxDQUFBLElBQUk7SUFDVCxDQUFDLENBQUEsS0FBSyxHQUFHLHlCQUF5QjtJQUVsQyxjQUFjO0lBQ2QsQ0FBQyxDQUFBLFNBQVMsR0FBRyxXQUFXO0lBQ3hCLElBQUksQ0FBQSxDQUFDLENBQUEsR0FBRztJQUNSLE9BQU8sQ0FBQSxDQUFDLENBQUEsMkNBQTJDLEdBQUcsaUNBQWlDO0lBQ3ZGLE9BQU8sQ0FBQSxDQUFDLENBQUEscUJBQXFCLEdBQUcsb0JBQW9CO0lBQ3BELElBQUksQ0FBQSxDQUFDLENBQUEsR0FBRztJQUVSLFFBQVE7SUFDUixJQUFJLENBQUEsQ0FBQyxDQUFBLHlDQUF5QztJQUM5QyxDQUFDLENBQUEsSUFBSSxDQUFDO0FBRVAsTUFBTSxVQUFVLFNBQVMsQ0FBQyxHQUFXLEVBQUUsZUFBdUI7SUFDN0Qsb0ZBQW9GO0lBQ3BGLGtCQUFrQjtJQUNsQix3QkFBd0I7SUFDeEIsNkVBQTZFO0lBQzdFLG1FQUFtRTtJQUNuRSxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUM7SUFDckIsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksTUFBTSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUEsa0RBQWtELFFBQVEsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVqSixNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUU3RCxNQUFNLFFBQVEsR0FBRyxlQUFlLElBQUksY0FBYyxDQUFDLE1BQU07UUFDeEQsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsd0JBQXdCO1FBQ3JDLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV0RixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN6QyxPQUFPO1FBQ04sS0FBSztRQUNMLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNO1FBQ3pGLFlBQVksRUFBRSxRQUFRLElBQUksR0FBRyxDQUFDLE1BQU07UUFDcEMsY0FBYyxFQUFFLGNBQWMsQ0FBQyxNQUFNO0tBQ3JDLENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxHQUFXO0lBQ3JDLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDdkQsT0FBTyxNQUFNLENBQUMsaUJBQWlCLENBQUM7QUFDakMsQ0FBQyJ9