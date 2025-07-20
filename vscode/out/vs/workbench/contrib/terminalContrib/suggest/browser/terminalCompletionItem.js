/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { SimpleCompletionItem } from '../../../../services/suggest/browser/simpleCompletionItem.js';
export var TerminalCompletionItemKind;
(function (TerminalCompletionItemKind) {
    TerminalCompletionItemKind[TerminalCompletionItemKind["File"] = 0] = "File";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Folder"] = 1] = "Folder";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Method"] = 2] = "Method";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Alias"] = 3] = "Alias";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Argument"] = 4] = "Argument";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Option"] = 5] = "Option";
    TerminalCompletionItemKind[TerminalCompletionItemKind["OptionValue"] = 6] = "OptionValue";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Flag"] = 7] = "Flag";
    TerminalCompletionItemKind[TerminalCompletionItemKind["SymbolicLinkFile"] = 8] = "SymbolicLinkFile";
    TerminalCompletionItemKind[TerminalCompletionItemKind["SymbolicLinkFolder"] = 9] = "SymbolicLinkFolder";
    // Kinds only for core
    TerminalCompletionItemKind[TerminalCompletionItemKind["InlineSuggestion"] = 100] = "InlineSuggestion";
    TerminalCompletionItemKind[TerminalCompletionItemKind["InlineSuggestionAlwaysOnTop"] = 101] = "InlineSuggestionAlwaysOnTop";
})(TerminalCompletionItemKind || (TerminalCompletionItemKind = {}));
// Maps CompletionItemKind from language server based completion to TerminalCompletionItemKind
export function mapLspKindToTerminalKind(lspKind) {
    // TODO: Add more types for different [LSP providers](https://github.com/microsoft/vscode/issues/249480)
    switch (lspKind) {
        case 20 /* CompletionItemKind.File */:
            return TerminalCompletionItemKind.File;
        case 23 /* CompletionItemKind.Folder */:
            return TerminalCompletionItemKind.Folder;
        case 0 /* CompletionItemKind.Method */:
            return TerminalCompletionItemKind.Method;
        case 18 /* CompletionItemKind.Text */:
            return TerminalCompletionItemKind.Argument; // consider adding new type?
        case 4 /* CompletionItemKind.Variable */:
            return TerminalCompletionItemKind.Argument; // ""
        case 16 /* CompletionItemKind.EnumMember */:
            return TerminalCompletionItemKind.OptionValue; // ""
        case 17 /* CompletionItemKind.Keyword */:
            return TerminalCompletionItemKind.Alias;
        default:
            return TerminalCompletionItemKind.Method;
    }
}
export class TerminalCompletionItem extends SimpleCompletionItem {
    constructor(completion) {
        super(completion);
        this.completion = completion;
        /**
         * The file extension part from {@link labelLow}.
         */
        this.fileExtLow = '';
        /**
         * A penalty that applies to completions that are comprised of only punctuation characters or
         * that applies to files or folders starting with the underscore character.
         */
        this.punctuationPenalty = 0;
        // ensure lower-variants (perf)
        this.labelLowExcludeFileExt = this.labelLow;
        this.labelLowNormalizedPath = this.labelLow;
        if (isFile(completion)) {
            if (isWindows) {
                this.labelLow = this.labelLow.replaceAll('/', '\\');
            }
            // Don't include dotfiles as extensions when sorting
            const extIndex = this.labelLow.lastIndexOf('.');
            if (extIndex > 0) {
                this.labelLowExcludeFileExt = this.labelLow.substring(0, extIndex);
                this.fileExtLow = this.labelLow.substring(extIndex + 1);
            }
        }
        if (isFile(completion) || completion.kind === TerminalCompletionItemKind.Folder) {
            if (isWindows) {
                this.labelLowNormalizedPath = this.labelLow.replaceAll('\\', '/');
            }
            if (completion.kind === TerminalCompletionItemKind.Folder) {
                this.labelLowNormalizedPath = this.labelLowNormalizedPath.replace(/\/$/, '');
            }
        }
        this.punctuationPenalty = shouldPenalizeForPunctuation(this.labelLowExcludeFileExt) ? 1 : 0;
    }
}
function isFile(completion) {
    return !!(completion.kind === TerminalCompletionItemKind.File || completion.isFileOverride);
}
function shouldPenalizeForPunctuation(label) {
    return basename(label).startsWith('_') || /^[\[\]\{\}\(\)\.,;:!?\/\\\-_@#~*%^=$]+$/.test(label);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uSXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvYnJvd3Nlci90ZXJtaW5hbENvbXBsZXRpb25JdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFbkUsT0FBTyxFQUFxQixvQkFBb0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRXZILE1BQU0sQ0FBTixJQUFZLDBCQWNYO0FBZEQsV0FBWSwwQkFBMEI7SUFDckMsMkVBQVEsQ0FBQTtJQUNSLCtFQUFVLENBQUE7SUFDViwrRUFBVSxDQUFBO0lBQ1YsNkVBQVMsQ0FBQTtJQUNULG1GQUFZLENBQUE7SUFDWiwrRUFBVSxDQUFBO0lBQ1YseUZBQWUsQ0FBQTtJQUNmLDJFQUFRLENBQUE7SUFDUixtR0FBb0IsQ0FBQTtJQUNwQix1R0FBc0IsQ0FBQTtJQUN0QixzQkFBc0I7SUFDdEIscUdBQXNCLENBQUE7SUFDdEIsMkhBQWlDLENBQUE7QUFDbEMsQ0FBQyxFQWRXLDBCQUEwQixLQUExQiwwQkFBMEIsUUFjckM7QUFFRCw4RkFBOEY7QUFDOUYsTUFBTSxVQUFVLHdCQUF3QixDQUFDLE9BQTJCO0lBQ25FLHdHQUF3RztJQUV4RyxRQUFRLE9BQU8sRUFBRSxDQUFDO1FBQ2pCO1lBQ0MsT0FBTywwQkFBMEIsQ0FBQyxJQUFJLENBQUM7UUFDeEM7WUFDQyxPQUFPLDBCQUEwQixDQUFDLE1BQU0sQ0FBQztRQUMxQztZQUNDLE9BQU8sMEJBQTBCLENBQUMsTUFBTSxDQUFDO1FBQzFDO1lBQ0MsT0FBTywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQyw0QkFBNEI7UUFDekU7WUFDQyxPQUFPLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUs7UUFDbEQ7WUFDQyxPQUFPLDBCQUEwQixDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUs7UUFDckQ7WUFDQyxPQUFPLDBCQUEwQixDQUFDLEtBQUssQ0FBQztRQUN6QztZQUNDLE9BQU8sMEJBQTBCLENBQUMsTUFBTSxDQUFDO0lBQzNDLENBQUM7QUFDRixDQUFDO0FBMkJELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxvQkFBb0I7SUF1Qi9ELFlBQ21CLFVBQStCO1FBRWpELEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUZBLGVBQVUsR0FBVixVQUFVLENBQXFCO1FBWmxEOztXQUVHO1FBQ0gsZUFBVSxHQUFXLEVBQUUsQ0FBQztRQUV4Qjs7O1dBR0c7UUFDSCx1QkFBa0IsR0FBVSxDQUFDLENBQUM7UUFPN0IsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQzVDLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBRTVDLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDeEIsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNyRCxDQUFDO1lBQ0Qsb0RBQW9EO1lBQ3BELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hELElBQUksUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNsQixJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNuRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN6RCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssMEJBQTBCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakYsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ25FLENBQUM7WUFDRCxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssMEJBQTBCLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzNELElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM5RSxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxrQkFBa0IsR0FBRyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0YsQ0FBQztDQUNEO0FBRUQsU0FBUyxNQUFNLENBQUMsVUFBK0I7SUFDOUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLElBQUksSUFBSSxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDN0YsQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQUMsS0FBYTtJQUNsRCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUkseUNBQXlDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2pHLENBQUMifQ==