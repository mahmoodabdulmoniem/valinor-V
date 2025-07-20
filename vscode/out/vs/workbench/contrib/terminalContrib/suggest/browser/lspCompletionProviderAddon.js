/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { mapLspKindToTerminalKind, TerminalCompletionItemKind } from './terminalCompletionItem.js';
import { Position } from '../../../../../editor/common/core/position.js';
export class LspCompletionProviderAddon extends Disposable {
    constructor(provider, textVirtualModel, lspTerminalModelContentProvider) {
        super();
        this.id = 'lsp';
        this.isBuiltin = true;
        this._provider = provider;
        this._textVirtualModel = textVirtualModel;
        this._lspTerminalModelContentProvider = lspTerminalModelContentProvider;
        this.triggerCharacters = provider.triggerCharacters ? [...provider.triggerCharacters, ' '] : [' '];
    }
    activate(terminal) {
        // console.log('activate');
    }
    async provideCompletions(value, cursorPosition, allowFallbackCompletions, token) {
        // Apply edit for non-executed current commandline --> Pretend we are typing in the real-document.
        this._lspTerminalModelContentProvider.trackPromptInputToVirtualFile(value);
        const textBeforeCursor = value.substring(0, cursorPosition);
        const lines = textBeforeCursor.split('\n');
        const column = lines[lines.length - 1].length + 1;
        // Get line from virtualDocument, not from terminal
        const lineNum = this._textVirtualModel.object.textEditorModel.getLineCount();
        const positionVirtualDocument = new Position(lineNum, column);
        // TODO: Scan back to start of nearest word like other providers? Is this needed for `ILanguageFeaturesService`?
        const completions = [];
        if (this._provider && this._provider._debugDisplayName !== 'wordbasedCompletions') {
            const result = await this._provider.provideCompletionItems(this._textVirtualModel.object.textEditorModel, positionVirtualDocument, { triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */ }, token);
            completions.push(...(result?.suggestions || []).map((e) => {
                // TODO: Support more terminalCompletionItemKind for [different LSP providers](https://github.com/microsoft/vscode/issues/249479)
                const convertedKind = e.kind ? mapLspKindToTerminalKind(e.kind) : TerminalCompletionItemKind.Method;
                const completionItemTemp = createCompletionItemPython(cursorPosition, textBeforeCursor, convertedKind, 'lspCompletionItem', undefined);
                return {
                    label: e.insertText,
                    provider: `lsp:${this._provider._debugDisplayName}`,
                    detail: e.detail,
                    documentation: e.documentation,
                    kind: convertedKind,
                    replacementIndex: completionItemTemp.replacementIndex,
                    replacementLength: completionItemTemp.replacementLength,
                };
            }));
        }
        return completions;
    }
}
export function createCompletionItemPython(cursorPosition, prefix, kind, label, detail) {
    const endsWithDot = prefix.endsWith('.');
    const endsWithSpace = prefix.endsWith(' ');
    if (endsWithSpace) {
        // Case where user is triggering completion with space:
        // For example, typing `import  ` to request completion for list of modules
        // This is similar to completions we are used to seeing in upstream shell (such as typing `ls  ` inside bash).
        const lastWord = endsWithSpace ? '' : prefix.split(' ').at(-1) ?? '';
        return {
            label: label,
            detail: detail ?? detail ?? '',
            replacementIndex: cursorPosition - lastWord.length,
            replacementLength: lastWord.length,
            kind: kind ?? kind ?? TerminalCompletionItemKind.Method
        };
    }
    else {
        // Case where user is triggering completion with dot:
        // For example, typing `pathlib.` to request completion for list of methods, attributes from the pathlib module.
        const lastWord = endsWithDot ? '' : prefix.split('.').at(-1) ?? '';
        return {
            label,
            detail: detail ?? detail ?? '',
            replacementIndex: cursorPosition - lastWord.length,
            replacementLength: lastWord.length,
            kind: kind ?? kind ?? TerminalCompletionItemKind.Method
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibHNwQ29tcGxldGlvblByb3ZpZGVyQWRkb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvbHNwQ29tcGxldGlvblByb3ZpZGVyQWRkb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBYyxNQUFNLHlDQUF5QyxDQUFDO0FBR2pGLE9BQU8sRUFBdUIsd0JBQXdCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV4SCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFLekUsTUFBTSxPQUFPLDBCQUEyQixTQUFRLFVBQVU7SUFRekQsWUFDQyxRQUFnQyxFQUNoQyxnQkFBc0QsRUFDdEQsK0JBQWdFO1FBRWhFLEtBQUssRUFBRSxDQUFDO1FBWkEsT0FBRSxHQUFHLEtBQUssQ0FBQztRQUNYLGNBQVMsR0FBRyxJQUFJLENBQUM7UUFZekIsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7UUFDMUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGdCQUFnQixDQUFDO1FBQzFDLElBQUksQ0FBQyxnQ0FBZ0MsR0FBRywrQkFBK0IsQ0FBQztRQUN4RSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BHLENBQUM7SUFFRCxRQUFRLENBQUMsUUFBa0I7UUFDMUIsMkJBQTJCO0lBQzVCLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBYSxFQUFF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