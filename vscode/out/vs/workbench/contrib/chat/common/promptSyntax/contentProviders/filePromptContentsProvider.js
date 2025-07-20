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
var FilePromptContentProvider_1;
import { PROMPT_LANGUAGE_ID } from '../promptTypes.js';
import { assert } from '../../../../../../base/common/assert.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { isPromptOrInstructionsFile } from '../config/promptFileLocations.js';
import { PromptContentsProviderBase } from './promptContentsProviderBase.js';
import { OpenFailed, NotPromptFile, ResolveError, FolderReference } from '../../promptFileReferenceErrors.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
/**
 * Prompt contents provider for a file on the disk referenced by
 * a provided {@link URI}.
 */
let FilePromptContentProvider = FilePromptContentProvider_1 = class FilePromptContentProvider extends PromptContentsProviderBase {
    get sourceName() {
        return 'file';
    }
    get languageId() {
        if (this.options.languageId) {
            return this.options.languageId;
        }
        const model = this.modelService.getModel(this.uri);
        if (model !== null) {
            return model.getLanguageId();
        }
        const inferredId = this.languageService
            .guessLanguageIdByFilepathOrFirstLine(this.uri);
        if (inferredId !== null) {
            return inferredId;
        }
        // fallback to the default prompt language ID
        return PROMPT_LANGUAGE_ID;
    }
    constructor(uri, options, fileService, modelService, languageService) {
        super(options);
        this.uri = uri;
        this.fileService = fileService;
        this.modelService = modelService;
        this.languageService = languageService;
        if (options.updateOnChange) {
            // make sure the object is updated on file changes
            this._register(this.fileService.onDidFilesChange((event) => {
                // if file was added or updated, forward the event to
                // the `getContentsStream()` produce a new stream for file contents
                if (event.contains(this.uri, 1 /* FileChangeType.ADDED */, 0 /* FileChangeType.UPDATED */)) {
                    // we support only full file parsing right now because
                    // the event doesn't contain a list of changed lines
                    this.onChangeEmitter.fire('full');
                    return;
                }
                // if file was deleted, forward the event to
                // the `getContentsStream()` produce an error
                if (event.contains(this.uri, 2 /* FileChangeType.DELETED */)) {
                    this.onChangeEmitter.fire(event);
                    return;
                }
            }));
        }
    }
    /**
     * Creates a stream of lines from the file based on the changes listed in
     * the provided event.
     *
     * @param event - event that describes the changes in the file; `'full'` is
     * 				  the special value that means that all contents have changed
     * @param cancellationToken - token that cancels this operation
     */
    async getContentsStream(_event, cancellationToken) {
        assert(!cancellationToken?.isCancellationRequested, new CancellationError());
        // get the binary stream of the file contents
        let fileStream;
        try {
            // ensure that the referenced URI points to a file before
            // trying to get a stream for its contents
            const info = await this.fileService.resolve(this.uri);
            // validate that the cancellation was not yet requested
            assert(!cancellationToken?.isCancellationRequested, new CancellationError());
            assert(info.isFile, new FolderReference(this.uri));
            const { allowNonPromptFiles } = this.options;
            // if URI doesn't point to a prompt file, don't try to resolve it,
            // unless the `allowNonPromptFiles` option is set to `true`
            if ((allowNonPromptFiles !== true) && (isPromptOrInstructionsFile(this.uri) === false)) {
                throw new NotPromptFile(this.uri);
            }
            fileStream = await this.fileService.readFileStream(this.uri);
            // after the promise above complete, this object can be already disposed or
            // the cancellation could be requested, in that case destroy the stream and
            // throw cancellation error
            if (this.isDisposed || cancellationToken?.isCancellationRequested) {
                fileStream.value.destroy();
                throw new CancellationError();
            }
            return fileStream.value;
        }
        catch (error) {
            if ((error instanceof ResolveError) || (error instanceof CancellationError)) {
                throw error;
            }
            throw new OpenFailed(this.uri, error);
        }
    }
    createNew(promptContentsSource, options) {
        return new FilePromptContentProvider_1(promptContentsSource.uri, options, this.fileService, this.modelService, this.languageService);
    }
    /**
     * String representation of this object.
     */
    toString() {
        return `file-prompt-contents-provider:${this.uri.path}`;
    }
};
FilePromptContentProvider = FilePromptContentProvider_1 = __decorate([
    __param(2, IFileService),
    __param(3, IModelService),
    __param(4, ILanguageService)
], FilePromptContentProvider);
export { FilePromptContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb250ZW50UHJvdmlkZXJzL2ZpbGVQcm9tcHRDb250ZW50c1Byb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUd2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFHNUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzlFLE9BQU8sRUFBa0MsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUcsT0FBTyxFQUFvQyxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVsSDs7O0dBR0c7QUFDSSxJQUFNLHlCQUF5QixpQ0FBL0IsTUFBTSx5QkFBMEIsU0FBUSwwQkFBNEM7SUFDMUYsSUFBb0IsVUFBVTtRQUM3QixPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxJQUFvQixVQUFVO1FBQzdCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM3QixPQUFPLElBQUks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