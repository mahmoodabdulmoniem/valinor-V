/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class ViewModelDecoration {
    constructor(range, options) {
        this._viewModelDecorationBrand = undefined;
        this.range = range;
        this.options = options;
    }
}
export function isModelDecorationVisible(model, decoration) {
    if (decoration.options.hideInCommentTokens && isModelDecorationInComment(model, decoration)) {
        return false;
    }
    if (decoration.options.hideInStringTokens && isModelDecorationInString(model, decoration)) {
        return false;
    }
    return true;
}
export function isModelDecorationInComment(model, decoration) {
    return testTokensInRange(model, decoration.range, (tokenType) => tokenType === 1 /* StandardTokenType.Comment */);
}
export function isModelDecorationInString(model, decoration) {
    return testTokensInRange(model, decoration.range, (tokenType) => tokenType === 2 /* StandardTokenType.String */);
}
/**
 * Calls the callback for every token that intersects the range.
 * If the callback returns `false`, iteration stops and `false` is returned.
 * Otherwise, `true` is returned.
 */
function testTokensInRange(model, range, callback) {
    for (let lineNumber = range.startLineNumber; lineNumber <= range.endLineNumber; lineNumber++) {
        const lineTokens = model.tokenization.getLineTokens(lineNumber);
        const isFirstLine = lineNumber === range.startLineNumber;
        const isEndLine = lineNumber === range.endLineNumber;
        let tokenIdx = isFirstLine ? lineTokens.findTokenIndexAtOffset(range.startColumn - 1) : 0;
        while (tokenIdx < lineTokens.getCount()) {
            if (isEndLine) {
                const startOffset = lineTokens.getStartOffset(tokenIdx);
                if (startOffset > range.endColumn - 1) {
                    break;
                }
            }
            const callbackResult = callback(lineTokens.getStandardTokenType(tokenIdx));
            if (!callbackResult) {
                return false;
            }
            tokenIdx++;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsRGVjb3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi92aWV3TW9kZWwvdmlld01vZGVsRGVjb3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxNQUFNLE9BQU8sbUJBQW1CO0lBTS9CLFlBQVksS0FBWSxFQUFFLE9BQWdDO1FBTDFELDhCQUF5QixHQUFTLFNBQVMsQ0FBQztRQU0zQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUN4QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsS0FBaUIsRUFBRSxVQUE0QjtJQUN2RixJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLElBQUksMEJBQTBCLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDN0YsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLGtCQUFrQixJQUFJLHlCQUF5QixDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDO1FBQzNGLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxLQUFpQixFQUFFLFVBQTRCO0lBQ3pGLE9BQU8saUJBQWlCLENBQ3ZCLEtBQUssRUFDTCxVQUFVLENBQUMsS0FBSyxFQUNoQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxzQ0FBOEIsQ0FDdEQsQ0FBQztBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUseUJBQXlCLENBQUMsS0FBaUIsRUFBRSxVQUE0QjtJQUN4RixPQUFPLGlCQUFpQixDQUN2QixLQUFLLEVBQ0wsVUFBVSxDQUFDLEtBQUssRUFDaEIsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVMscUNBQTZCLENBQ3JELENBQUM7QUFDSCxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMsaUJBQWlCLENBQUMsS0FBaUIsRUFBRSxLQUFZLEVBQUUsUUFBbUQ7SUFDOUcsS0FBSyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsZUFBZSxFQUFFLFVBQVUsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUM7UUFDOUYsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDaEUsTUFBTSxXQUFXLEdBQUcsVUFBVSxLQUFLLEtBQUssQ0FBQyxlQUFlLENBQUM7UUFDekQsTUFBTSxTQUFTLEdBQUcsVUFBVSxLQUFLLEtBQUssQ0FBQyxhQUFhLENBQUM7UUFFckQsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFGLE9BQU8sUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDdkMsTUFBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUMzRSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3JCLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUNELFFBQVEsRUFBRSxDQUFDO1FBQ1osQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUMifQ==