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
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { compare, compareSubstring } from '../../../../base/common/strings.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { SnippetParser } from '../../../../editor/contrib/snippet/browser/snippetParser.js';
import { localize } from '../../../../nls.js';
import { ISnippetsService } from './snippets.js';
import { Snippet } from './snippetsFile.js';
import { isPatternInWord } from '../../../../base/common/filters.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
const markSnippetAsUsed = '_snippet.markAsUsed';
CommandsRegistry.registerCommand(markSnippetAsUsed, (accessor, ...args) => {
    const snippetsService = accessor.get(ISnippetsService);
    const [first] = args;
    if (first instanceof Snippet) {
        snippetsService.updateUsageTimestamp(first);
    }
});
export class SnippetCompletion {
    constructor(snippet, range) {
        this.snippet = snippet;
        this.label = { label: snippet.prefix, description: snippet.name };
        this.detail = localize('detail.snippet', "{0} ({1})", snippet.description || snippet.name, snippet.source);
        this.insertText = snippet.codeSnippet;
        this.extensionId = snippet.extensionId;
        this.range = range;
        this.sortText = `${snippet.snippetSource === 3 /* SnippetSource.Extension */ ? 'z' : 'a'}-${snippet.prefix}`;
        this.kind = 28 /* CompletionItemKind.Snippet */;
        this.insertTextRules = 4 /* CompletionItemInsertTextRule.InsertAsSnippet */;
        this.command = { id: markSnippetAsUsed, title: '', arguments: [snippet] };
    }
    resolve() {
        this.documentation = new MarkdownString().appendCodeblock('', SnippetParser.asInsertText(this.snippet.codeSnippet));
        return this;
    }
    static compareByLabel(a, b) {
        return compare(a.label.label, b.label.label);
    }
}
let SnippetCompletionProvider = class SnippetCompletionProvider {
    constructor(_languageService, _snippets, _languageConfigurationService) {
        this._languageService = _languageService;
        this._snippets = _snippets;
        this._languageConfigurationService = _languageConfigurationService;
        this._debugDisplayName = 'snippetCompletions';
        //
    }
    async provideCompletionItems(model, position, context) {
        const sw = new StopWatch();
        // compute all snippet anchors: word starts and every non word character
        const line = position.lineNumber;
        const word = model.getWordAtPosition(position) ?? { startColumn: position.column, endColumn: position.column, word: '' };
        const lineContentLow = model.getLineContent(position.lineNumber).toLowerCase();
        const lineContentWithWordLow = lineContentLow.substring(0, word.startColumn + word.word.length - 1);
        const anchors = this._computeSnippetPositions(model, line, word, lineContentWithWordLow);
        // loop over possible snippets and match them against the anchors
        const columnOffset = position.column - 1;
        const triggerCharacterLow = context.triggerCharacter?.toLowerCase() ?? '';
        const languageId = this._getLanguageIdAtPosition(model, position);
        const languageConfig = this._languageConfigurationService.getLanguageConfiguration(languageId);
        const snippets = new Set(await this._snippets.getSnippets(languageId));
        const suggestions = [];
        for (const snippet of snippets) {
            if (context.triggerKind === 1 /* CompletionTriggerKind.TriggerCharacter */ && !snippet.prefixLow.startsWith(triggerCharacterLow)) {
                // strict -> when having trigger characters they must prefix-match
                continue;
            }
            let candidate;
            for (const anchor of anchors) {
                if (anchor.prefixLow.match(/^\s/) && !snippet.prefixLow.match(/^\s/)) {
                    // only allow whitespace anchor when snippet prefix starts with whitespace too
                    continue;
                }
                if (isPatternInWord(anchor.prefixLow, 0, anchor.prefixLow.length, snippet.prefixLow, 0, snippet.prefixLow.length)) {
                    candidate = anchor;
                    break;
                }
            }
            if (!candidate) {
                continue;
            }
            const pos = candidate.startColumn - 1;
            const prefixRestLen = snippet.prefixLow.length - (columnOffset - pos);
            const endsWithPrefixRest = compareSubstring(lineContentLow, snippet.prefixLow, columnOffset, columnOffset + prefixRestLen, columnOffset - pos);
            const startPosition = position.with(undefined, pos + 1);
            let endColumn = endsWithPrefixRest === 0 ? position.column + prefixRestLen : position.column;
            // First check if there is anything to the right of the cursor
            if (columnOffset < lineContentLow.length) {
                const autoClosingPairs = languageConfig.getAutoClosingPairs();
                const standardAutoClosingPairConditionals = autoClosingPairs.autoClosingPairsCloseSingleChar.get(lineContentLow[columnOffset]);
                // If the character to the right of the cursor is a closing character of an autoclosing pair
                if (standardAutoClosingPairConditionals?.some(p => 
                // and the start position is the opening character of an autoclosing pair
                p.open === lineContentLow[startPosition.column - 1] &&
                    // and the snippet prefix contains the opening and closing pair at its edges
                    snippet.prefix.startsWith(p.open) &&
                    snippet.prefix[snippet.prefix.length - 1] === p.close)) {
                    // Eat the character that was likely inserted because of auto-closing pairs
                    endColumn++;
                }
            }
            const replace = Range.fromPositions({ lineNumber: line, column: candidate.startColumn }, { lineNumber: line, column: endColumn });
            const insert = replace.setEndPosition(line, position.column);
            suggestions.push(new SnippetCompletion(snippet, { replace, insert }));
            snippets.delete(snippet);
        }
        // add remaing snippets when the current prefix ends in whitespace or when line is empty
        // and when not having a trigger character
        if (!triggerCharacterLow && (/\s/.test(lineContentLow[position.column - 2]) /*end in whitespace */ || !lineContentLow /*empty line*/)) {
            for (const snippet of snippets) {
                const insert = Range.fromPositions(position);
                const replace = lineContentLow.indexOf(snippet.prefixLow, columnOffset) === columnOffset ? insert.setEndPosition(position.lineNumber, position.column + snippet.prefixLow.length) : insert;
                suggestions.push(new SnippetCompletion(snippet, { replace, insert }));
            }
        }
        // dismbiguate suggestions with same labels
        this._disambiguateSnippets(suggestions);
        return {
            suggestions,
            duration: sw.elapsed()
        };
    }
    _disambiguateSnippets(suggestions) {
        suggestions.sort(SnippetCompletion.compareByLabel);
        for (let i = 0; i < suggestions.length; i++) {
            const item = suggestions[i];
            let to = i + 1;
            for (; to < suggestions.length && item.label === suggestions[to].label; to++) {
                suggestions[to].label.label = localize('snippetSuggest.longLabel', "{0}, {1}", suggestions[to].label.label, suggestions[to].snippet.name);
            }
            if (to > i + 1) {
                suggestions[i].label.label = localize('snippetSuggest.longLabel', "{0}, {1}", suggestions[i].label.label, suggestions[i].snippet.name);
                i = to;
            }
        }
    }
    resolveCompletionItem(item) {
        return (item instanceof SnippetCompletion) ? item.resolve() : item;
    }
    _computeSnippetPositions(model, line, word, lineContentWithWordLow) {
        const result = [];
        for (let column = 1; column < word.startColumn; column++) {
            const wordInfo = model.getWordAtPosition(new Position(line, column));
            result.push({
                startColumn: column,
                prefixLow: lineContentWithWordLow.substring(column - 1),
                isWord: Boolean(wordInfo)
            });
            if (wordInfo) {
                column = wordInfo.endColumn;
                // the character right after a word is an anchor, always
                result.push({
                    startColumn: wordInfo.endColumn,
                    prefixLow: lineContentWithWordLow.substring(wordInfo.endColumn - 1),
                    isWord: false
                });
            }
        }
        if (word.word.length > 0 || result.length === 0) {
            result.push({
                startColumn: word.startColumn,
                prefixLow: lineContentWithWordLow.substring(word.startColumn - 1),
                isWord: true
            });
        }
        return result;
    }
    _getLanguageIdAtPosition(model, position) {
        // validate the `languageId` to ensure this is a user
        // facing language with a name and the chance to have
        // snippets, else fall back to the outer language
        model.tokenization.tokenizeIfCheap(position.lineNumber);
        let languageId = model.getLanguageIdAtPosition(position.lineNumber, position.column);
        if (!this._languageService.getLanguageName(languageId)) {
            languageId = model.getLanguageId();
        }
        return languageId;
    }
};
SnippetCompletionProvider = __decorate([
    __param(0, ILanguageService),
    __param(1, ISnippetsService),
    __param(2, ILanguageConfigurationService)
], SnippetCompletionProvider);
export { SnippetCompletionProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldENvbXBsZXRpb25Qcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvYnJvd3Nlci9zbmlwcGV0Q29tcGxldGlvblByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUd4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDNUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFpQixNQUFNLG1CQUFtQixDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0VBQXNFLENBQUM7QUFFckgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFJcEYsTUFBTSxpQkFBaUIsR0FBRyxxQkFBcUIsQ0FBQztBQUVoRCxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxJQUFJLEVBQUUsRUFBRTtJQUN6RSxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDdkQsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQztJQUNyQixJQUFJLEtBQUssWUFBWSxPQUFPLEVBQUUsQ0FBQztRQUM5QixlQUFlLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0MsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxPQUFPLGlCQUFpQjtJQWE3QixZQUNVLE9BQWdCLEVBQ3pCLEtBQW1EO1FBRDFDLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFHekIsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbEUsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0csSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQztRQUN2QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsT0FBTyxDQUFDLGFBQWEsb0NBQTRCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNyRyxJQUFJLENBQUMsSUFBSSxzQ0FBNkIsQ0FBQztRQUN2QyxJQUFJLENBQUMsZUFBZSx1REFBK0MsQ0FBQztRQUNwRSxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztJQUMzRSxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQ3BILE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBb0IsRUFBRSxDQUFvQjtRQUMvRCxPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzlDLENBQUM7Q0FDRDtBQVFNLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQXlCO0lBSXJDLFlBQ21CLGdCQUFtRCxFQUNuRCxTQUE0QyxFQUMvQiw2QkFBNkU7UUFGekUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUNsQyxjQUFTLEdBQVQsU0FBUyxDQUFrQjtRQUNkLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBK0I7UUFMcEcsc0JBQWlCLEdBQUcsb0JBQW9CLENBQUM7UUFPakQsRUFBRTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsc0JBQXNCLENBQUMsS0FBaUIsRUFBRSxRQUFrQixFQUFFLE9BQTBCO1FBRTdGLE1BQU0sRUFBRSxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7UUFFM0Isd0VBQXdFO1FBQ3hFLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUM7UUFDakMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBRXpILE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQy9FLE1BQU0sc0JBQXNCLEdBQUcsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNwRyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztRQUV6RixpRUFBaUU7UUFDakUsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDekMsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDO1FBQzFFLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLHdCQUF3QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQy9GLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN2RSxNQUFNLFdBQVcsR0FBd0IsRUFBRSxDQUFDO1FBRTVDLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7WUFFaEMsSUFBSSxPQUFPLENBQUMsV0FBVyxtREFBMkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztnQkFDMUgsa0VBQWtFO2dCQUNsRSxTQUFTO1lBQ1YsQ0FBQztZQUVELElBQUksU0FBdUMsQ0FBQztZQUM1QyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUU5QixJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDdEUsOEVBQThFO29CQUM5RSxTQUFTO2dCQUNWLENBQUM7Z0JBRUQsSUFBSSxlQUFlLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUNuSCxTQUFTLEdBQUcsTUFBTSxDQUFDO29CQUNuQixNQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoQixTQUFTO1lBQ1YsQ0FBQztZQUVELE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBRXRDLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ3RFLE1BQU0sa0JBQWtCLEdBQUcsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFlBQVksR0FBRyxhQUFhLEVBQUUsWUFBWSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQy9JLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUV4RCxJQUFJLFNBQVMsR0FBRyxrQkFBa0IsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1lBRTdGLDhEQUE4RDtZQUM5RCxJQUFJLFlBQVksR0FBRyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzFDLE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQzlELE1BQU0sbUNBQW1DLEdBQUcsZ0JBQWdCLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUMvSCw0RkFBNEY7Z0JBQzVGLElBQUksbUNBQW1DLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNqRCx5RUFBeUU7Z0JBQ3pFLENBQUMsQ0FBQyxJQUFJLEtBQUssY0FBYyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO29CQUNuRCw0RUFBNEU7b0JBQzVFLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQ2pDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUNyRCxDQUFDO29CQUNGLDJFQUEyRTtvQkFDM0UsU0FBUyxFQUFFLENBQUM7Z0JBQ2IsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztZQUNsSSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFN0QsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdEUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQixDQUFDO1FBRUQsd0ZBQXdGO1FBQ3hGLDBDQUEwQztRQUMxQyxJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUN2SSxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNoQyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBQzNMLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLENBQUM7UUFDRixDQUFDO1FBRUQsMkNBQTJDO1FBQzNDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV4QyxPQUFPO1lBQ04sV0FBVztZQUNYLFFBQVEsRUFBRSxFQUFFLENBQUMsT0FBTyxFQUFFO1NBQ3RCLENBQUM7SUFDSCxDQUFDO0lBRU8scUJBQXFCLENBQUMsV0FBZ0M7UUFDN0QsV0FBVyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2YsT0FBTyxFQUFFLEdBQUcsV0FBVyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDOUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLDBCQUEwQixFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNJLENBQUM7WUFDRCxJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hCLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNSLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELHFCQUFxQixDQUFDLElBQW9CO1FBQ3pDLE9BQU8sQ0FBQyxJQUFJLFlBQVksaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDcEUsQ0FBQztJQUVPLHdCQUF3QixDQUFDLEtBQWlCLEVBQUUsSUFBWSxFQUFFLElBQXFCLEVBQUUsc0JBQThCO1FBQ3RILE1BQU0sTUFBTSxHQUF1QixFQUFFLENBQUM7UUFFdEMsS0FBSyxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUMxRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDckUsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDWCxXQUFXLEVBQUUsTUFBTTtnQkFDbkIsU0FBUyxFQUFFLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO2dCQUN2RCxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQzthQUN6QixDQUFDLENBQUM7WUFDSCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLE1BQU0sR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDO2dCQUU1Qix3REFBd0Q7Z0JBQ3hELE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FBQyxTQUFTO29CQUMvQixTQUFTLEVBQUUsc0JBQXNCLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO29CQUNuRSxNQUFNLEVBQUUsS0FBSztpQkFDYixDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakQsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDWCxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7Z0JBQzdCLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUM7Z0JBQ2pFLE1BQU0sRUFBRSxJQUFJO2FBQ1osQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVPLHdCQUF3QixDQUFDLEtBQWlCLEVBQUUsUUFBa0I7UUFDckUscURBQXFEO1FBQ3JELHFEQUFxRDtRQUNyRCxpREFBaUQ7UUFDakQsS0FBSyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3hELElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNyRixJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3hELFVBQVUsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDcEMsQ0FBQztRQUNELE9BQU8sVUFBVSxDQUFDO0lBQ25CLENBQUM7Q0FDRCxDQUFBO0FBM0tZLHlCQUF5QjtJQUtuQyxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSw2QkFBNkIsQ0FBQTtHQVBuQix5QkFBeUIsQ0EyS3JDIn0=