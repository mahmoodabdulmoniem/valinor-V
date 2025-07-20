var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LspTerminalModelContentProvider_1;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { URI } from '../../../../../base/common/uri.js';
import { Schemas } from '../../../../../base/common/network.js';
import { PYTHON_LANGUAGE_ID, VSCODE_LSP_TERMINAL_PROMPT_TRACKER } from './lspTerminalUtil.js';
let LspTerminalModelContentProvider = class LspTerminalModelContentProvider extends Disposable {
    static { LspTerminalModelContentProvider_1 = this; }
    static { this.scheme = Schemas.vscodeTerminal; }
    constructor(capabilityStore, terminalId, virtualTerminalDocument, shellType, textModelService, _modelService, _languageService) {
        super();
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._onCommandFinishedListener = this._register(new MutableDisposable());
        this._register(textModelService.registerTextModelContentProvider(LspTerminalModelContentProvider_1.scheme, this));
        this._capabilitiesStore = capabilityStore;
        this._commandDetection = this._capabilitiesStore.get(2 /* TerminalCapability.CommandDetection */);
        this._registerTerminalCommandFinishedListener();
        this._virtualTerminalDocumentUri = virtualTerminalDocument;
        this._shellType = shellType;
    }
    // Listens to onDidChangeShellType event from `terminal.suggest.contribution.ts`
    shellTypeChanged(shellType) {
        this._shellType = shellType;
    }
    /**
     * Sets or updates content for a terminal virtual document.
     * This is when user has executed succesful command in terminal.
     * Transfer the content to virtual document, and relocate delimiter to get terminal prompt ready for next prompt.
     */
    setContent(content) {
        const model = this._modelService.getModel(this._virtualTerminalDocumentUri);
        // Trailing coming from Python itself shouldn't be included in the REPL.
        if (content !== 'exit()' && this._shellType === "python" /* GeneralShellType.Python */) {
            if (model) {
                const existingContent = model.getValue();
                if (existingContent === '') {
                    model.setValue(VSCODE_LSP_TERMINAL_PROMPT_TRACKER);
                }
                else {
                    // If we are appending to existing content, remove delimiter, attach new content, and re-add delimiter
                    const delimiterIndex = existingContent.lastIndexOf(VSCODE_LSP_TERMINAL_PROMPT_TRACKER);
                    const sanitizedExistingContent = delimiterIndex !== -1 ?
                        existingContent.substring(0, delimiterIndex) :
                        existingContent;
                    const newContent = sanitizedExistingContent + '\n' + content + '\n' + VSCODE_LSP_TERMINAL_PROMPT_TRACKER;
                    model.setValue(newContent);
                }
            }
        }
    }
    /**
     * Real-time conversion of terminal input to virtual document happens here.
     * This is when user types in terminal, and we want to track the input.
     * We want to track the input and update the virtual document.
     * Note: This is for non-executed command.
    */
    trackPromptInputToVirtualFile(content) {
        this._commandDetection = this._capabilitiesStore.get(2 /* TerminalCapability.CommandDetection */);
        const model = this._modelService.getModel(this._virtualTerminalDocumentUri);
        if (content !== 'exit()' && this._shellType === "python" /* GeneralShellType.Python */) {
            if (model) {
                const existingContent = model.getValue();
                const delimiterIndex = existingContent.lastIndexOf(VSCODE_LSP_TERMINAL_PROMPT_TRACKER);
                // Keep content only up to delimiter
                const sanitizedExistingContent = delimiterIndex !== -1 ?
                    existingContent.substring(0, delimiterIndex) :
                    existingContent;
                // Combine base content with new content
                const newContent = sanitizedExistingContent + VSCODE_LSP_TERMINAL_PROMPT_TRACKER + content;
                model.setValue(newContent);
            }
        }
    }
    _registerTerminalCommandFinishedListener() {
        const attachListener = () => {
            if (this._onCommandFinishedListener.value) {
                return;
            }
            // Inconsistent repro: Covering case where commandDetection is available but onCommandFinished becomes available later
            if (this._commandDetection && this._commandDetection.onCommandFinished) {
                this._onCommandFinishedListener.value = this._register(this._commandDetection.onCommandFinished((e) => {
                    if (e.exitCode === 0 && this._shellType === "python" /* GeneralShellType.Python */) {
                        this.setContent(e.command);
                    }
                }));
            }
        };
        attachListener();
        // Listen to onDidAddCapabilityType because command detection is not available until later
        this._register(this._capabilitiesStore.onDidAddCapabilityType(e => {
            if (e === 2 /* TerminalCapability.CommandDetection */) {
                this._commandDetection = this._capabilitiesStore.get(2 /* TerminalCapability.CommandDetection */);
                attachListener();
            }
        }));
    }
    // TODO: Adapt to support non-python virtual document for non-python REPLs.
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        const extension = resource.path.split('.').pop();
        let languageId = undefined;
        if (extension) {
            languageId = this._languageService.getLanguageIdByLanguageName(extension);
            if (!languageId) {
                switch (extension) {
                    case 'py':
                        languageId = PYTHON_LANGUAGE_ID;
                        break;
                    // case 'ps1': languageId = 'powershell'; break;
                    // case 'js': languageId = 'javascript'; break;
                    // case 'ts': languageId = 'typescript'; break; etc...
                }
            }
        }
        const languageSelection = languageId ?
            this._languageService.createById(languageId) :
            this._languageService.createById('plaintext');
        return this._modelService.createModel('', languageSelection, resource, false);
    }
};
LspTerminalModelContentProvider = LspTerminalModelContentProvider_1 = __decorate([
    __param(4, ITextModelService),
    __param(5, IModelService),
    __param(6, ILanguageService)
], LspTerminalModelContentProvider);
export { LspTerminalModelContentProvider };
/**
 * Creates a terminal language virtual URI.
 */
// TODO: Make this [OS generic](https://github.com/microsoft/vscode/issues/249477)
export function createTerminalLanguageVirtualUri(terminalId, languageExtension) {
    return URI.from({
        scheme: Schemas.vscodeTerminal,
        path: `/terminal${terminalId}.${languageExtension}`,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibHNwVGVybWluYWxNb2RlbENvbnRlbnRQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvYnJvd3Nlci9sc3BUZXJtaW5hbE1vZGVsQ29udGVudFByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3RGLE9BQU8sRUFBNkIsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN4SCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBR2hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBT3ZGLElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQWdDLFNBQVEsVUFBVTs7YUFDOUMsV0FBTSxHQUFHLE9BQU8sQ0FBQyxjQUFjLEFBQXpCLENBQTBCO0lBT2hELFlBQ0MsZUFBeUMsRUFDekMsVUFBa0IsRUFDbEIsdUJBQTRCLEVBQzVCLFNBQXdDLEVBQ3JCLGdCQUFtQyxFQUN2QyxhQUE2QyxFQUMxQyxnQkFBbUQ7UUFHckUsS0FBSyxFQUFFLENBQUM7UUFKd0Isa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDekIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQVRyRCwrQkFBMEIsR0FBRyxJQUFJ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