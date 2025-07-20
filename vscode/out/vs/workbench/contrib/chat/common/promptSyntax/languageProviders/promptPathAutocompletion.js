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
/**
 * Notes on what to implement next:
 *   - re-trigger suggestions dialog on `folder` selection because the `#file:` references take
 *     `file` paths, therefore a "folder" completion is never final
 *   - provide the same suggestions that the `#file:` variables in the chat input have, e.g.,
 *     recently used files, related files, etc.
 *   - support markdown links; markdown extension does sometimes provide the paths completions, but
 *     the prompt completions give more options (e.g., recently used files, related files, etc.)
 *   - add `Windows` support
 */
import { IPromptsService } from '../service/promptsService.js';
import { isOneOf } from '../../../../../../base/common/types.js';
import { dirname, extUri } from '../../../../../../base/common/resources.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { ALL_PROMPTS_LANGUAGE_SELECTOR } from '../promptTypes.js';
import { assert, assertNever } from '../../../../../../base/common/assert.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
/**
 * Finds a file reference that suites the provided `position`.
 */
function findFileReference(references, position) {
    for (const reference of references) {
        const { range } = reference;
        // ignore any other types of references
        if (reference.type !== 'file') {
            return undefined;
        }
        // this ensures that we handle only the `#file:` references for now
        if (reference.subtype !== 'prompt') {
            return undefined;
        }
        // reference must match the provided position
        const { startLineNumber, endColumn } = range;
        if ((startLineNumber !== position.lineNumber) || (endColumn !== position.column)) {
            continue;
        }
        return reference;
    }
    return undefined;
}
/**
 * Provides reference paths autocompletion for the `#file:` variables inside prompts.
 */
let PromptPathAutocompletion = class PromptPathAutocompletion extends Disposable {
    constructor(fileService, promptsService, languageService) {
        super();
        this.fileService = fileService;
        this.promptsService = promptsService;
        this.languageService = languageService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptPathAutocompletion';
        /**
         * List of trigger characters handled by this provider.
         */
        this.triggerCharacters = [':', '.', '/'];
        this._register(this.languageService.completionProvider.register(ALL_PROMPTS_LANGUAGE_SELECTOR, this));
    }
    /**
     * The main function of this provider that calculates
     * completion items based on the provided arguments.
     */
    async provideCompletionItems(model, position, context, token) {
        assert(!token.isCancellationRequested, new CancellationError());
        const { triggerCharacter } = context;
        // it must always have been triggered by a character
        if (!triggerCharacter) {
            return undefined;
        }
        assert(isOneOf(triggerCharacter, this.triggerCharacters), `Prompt path autocompletion provider`);
        const parser = this.promptsService.getSyntaxParserFor(model);
        assert(parser.isDisposed === false, 'Prompt parser must not be disposed.');
        // start the parser in case it was not started yet,
        // and wait for it to settle to a final result
        const completed = await parser.start(token).settled();
        if (!completed || token.isCancellationRequested) {
            return undefined;
        }
        const { references } = parser;
        const fileReference = findFileReference(references, position);
        if (!fileReference) {
            return undefined;
        }
        const parentFolder = dirname(parser.uri);
        // in the case of the '.' trigger character, we must check if this is the first
        // dot in the link path, otherwise the dot could be a part of a folder name
        if (triggerCharacter === ':' || (triggerCharacter === '.' && fileReference.path === '.')) {
            return {
                suggestions: await this.getFirstFolderSuggestions(triggerCharacter, parentFolder, fileReference),
            };
        }
        if (triggerCharacter === '/' || triggerCharacter === '.') {
            return {
                suggestions: await this.getNonFirstFolderSuggestions(triggerCharacter, parentFolder, fileReference),
            };
        }
        assertNever(triggerCharacter, `Unexpected trigger character '${triggerCharacter}'.`);
    }
    /**
     * Gets "raw" folder suggestions. Unlike the full completion items,
     * these ones do not have `insertText` and `range` properties which
     * are meant to be added by the caller later on.
     */
    async getFolderSuggestions(uri) {
        const { children } = await this.fileService.resolve(uri);
        const suggestions = [];
        // no `children` - no suggestions
        if (!children) {
            return suggestions;
        }
        for (const child of children) {
            const kind = child.isDirectory
                ? 23 /* CompletionItemKind.Folder */
                : 20 /* CompletionItemKind.File */;
            const sortText = child.isDirectory
                ? '1'
                : '2';
            suggestions.push({
                label: child.name,
                kind,
                sortText,
            });
        }
        return suggestions;
    }
    /**
     * Gets suggestions for a first folder/file name in the path. E.g., the one
     * that follows immediately after the `:` character of the `#file:` variable.
     *
     * The main difference between this and "subsequent" folder cases is that in
     * the beginning of the path the suggestions also contain the `..` item and
     * the `./` normalization prefix for relative paths.
     *
     * See also {@link getNonFirstFolderSuggestions}.
     */
    async getFirstFolderSuggestions(character, fileFolderUri, fileReference) {
        const { linkRange } = fileReference;
        // when character is `:`, there must be no link present yet
        // otherwise the `:` was used in the middle of the link hence
        // we don't want to provide suggestions for that
        if ((character === ':') && (linkRange !== undefined)) {
            return [];
        }
        // otherwise when the `.` character is present, it is inside the link part
        // of the reference, hence we always expect the link range to be present
        if ((character === '.') && (linkRange === undefined)) {
            return [];
        }
        const suggestions = await this.getFolderSuggestions(fileFolderUri);
        // replacement range for suggestions; when character is `.`, we want to also
        // replace it, because we add `./` at the beginning of all the relative paths
        const startColumnOffset = (character === '.') ? 1 : 0;
        const range = {
            ...fileReference.range,
            endColumn: fileReference.range.endColumn,
            startColumn: fileReference.range.endColumn - startColumnOffset,
        };
        return [
            {
                label: '..',
                kind: 23 /* CompletionItemKind.Folder */,
                insertText: '..',
                range,
                sortText: '0',
            },
            ...suggestions
                .map((suggestion) => {
                // add space at the end of file names since no completions
                // that follow the file name are expected anymore
                const suffix = (suggestion.kind === 20 /* CompletionItemKind.File */)
                    ? ' '
                    : '';
                return {
                    ...suggestion,
                    range,
                    label: `./${suggestion.label}${suffix}`,
                    // we use the `./` prefix for consistency
                    insertText: `./${suggestion.label}${suffix}`,
                };
            }),
        ];
    }
    /**
     * Gets suggestions for a folder/file name that follows after the first one.
     * See also {@link getFirstFolderSuggestions}.
     */
    async getNonFirstFolderSuggestions(character, fileFolderUri, fileReference) {
        const { linkRange, path } = fileReference;
        if (linkRange === undefined) {
            return [];
        }
        const currentFolder = extUri.resolvePath(fileFolderUri, path);
        let suggestions = await this.getFolderSuggestions(currentFolder);
        // when trigger character was a `.`, which is we know is inside
        // the folder/file name in the path, filter out to only items
        // that start with the dot instead of showing all of them
        if (character === '.') {
            suggestions = suggestions.filter((suggestion) => {
                return suggestion.label.startsWith('.');
            });
        }
        // replacement range of the suggestions
        // when character is `.` we want to also replace it too
        const startColumnOffset = (character === '.') ? 1 : 0;
        const range = {
            ...fileReference.range,
            endColumn: fileReference.range.endColumn,
            startColumn: fileReference.range.endColumn - startColumnOffset,
        };
        return suggestions
            .map((suggestion) => {
            // add space at the end of file names since no completions
            // that follow the file name are expected anymore
            const suffix = (suggestion.kind === 20 /* CompletionItemKind.File */)
                ? ' '
                : '';
            return {
                ...suggestion,
                insertText: `${suggestion.label}${suffix}`,
                range,
            };
        });
    }
};
PromptPathAutocompletion = __decorate([
    __param(0, IFileService),
    __param(1, IPromptsService),
    __param(2, ILanguageFeaturesService)
], PromptPathAutocompletion);
export { PromptPathAutocompletion };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0UGF0aEF1dG9jb21wbGV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VQcm92aWRlcnMvcHJvbXB0UGF0aEF1dG9jb21wbGV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHOzs7Ozs7Ozs7R0FTRztBQUVILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUUvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUU3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFHbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFaEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFxQnhHOztHQUVHO0FBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxVQUF1QyxFQUFFLFFBQWtCO0lBQ3JGLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7UUFDcEMsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLFNBQVMsQ0FBQztRQUU1Qix1Q0FBdUM7UUFDdkMsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRSxD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