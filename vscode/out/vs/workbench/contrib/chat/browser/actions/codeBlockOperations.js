var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AsyncIterableObject } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import { isEqual } from '../../../../../base/common/resources.js';
import * as strings from '../../../../../base/common/strings.js';
import { URI } from '../../../../../base/common/uri.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { IBulkEditService, ResourceTextEdit } from '../../../../../editor/browser/services/bulkEditService.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { localize } from '../../../../../nls.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { reviewEdits, reviewNotebookEdits } from '../../../inlineChat/browser/inlineChatController.js';
import { insertCell } from '../../../notebook/browser/controller/cellOperations.js';
import { CellKind, NOTEBOOK_EDITOR_ID } from '../../../notebook/common/notebookCommon.js';
import { ICodeMapperService } from '../../common/chatCodeMapperService.js';
import { IChatService } from '../../common/chatService.js';
import { isRequestVM, isResponseVM } from '../../common/chatViewModel.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
let InsertCodeBlockOperation = class InsertCodeBlockOperation {
    constructor(editorService, textFileService, bulkEditService, codeEditorService, chatService, languageService, dialogService) {
        this.editorService = editorService;
        this.textFileService = textFileService;
        this.bulkEditService = bulkEditService;
        this.codeEditorService = codeEditorService;
        this.chatService = chatService;
        this.languageService = languageService;
        this.dialogService = dialogService;
    }
    async run(context) {
        const activeEditorControl = getEditableActiveCodeEditor(this.editorService);
        if (activeEditorControl) {
            await this.handleTextEditor(activeEditorControl, context);
        }
        else {
            const activeNotebookEditor = getActiveNotebookEditor(this.editorService);
            if (activeNotebookEditor) {
                await this.handleNotebookEditor(activeNotebookEditor, context);
            }
            else {
                this.notify(localize('insertCodeBlock.noActiveEditor', "To insert the code block, open a code editor or notebook editor and set the cursor at the location where to insert the code block."));
            }
        }
        if (isResponseVM(context.element)) {
            const requestId = context.element.requestId;
            const request = context.element.session.getItems().find(item => item.id === requestId && isRequestVM(item));
            notifyUserAction(this.chatService, context, {
                kind: 'insert',
                codeBlockIndex: context.codeBlockIndex,
                totalCharacters: context.code.length,
                totalLines: context.code.split('\n').length,
                languageId: context.languageId,
                modelId: request?.modelId ?? '',
            });
        }
    }
    async handleNotebookEditor(notebookEditor, codeBlockContext) {
        if (notebookEditor.isReadOnly) {
            this.notify(localize('insertCodeBlock.readonlyNotebook', "Cannot insert the code block to read-only notebook editor."));
            return false;
        }
        const focusRange = notebookEditor.getFocus();
        const next = Math.max(focusRange.end - 1, 0);
        insertCell(this.languageService, notebookEditor, next, CellKind.Code, 'below', codeBlockContext.code, true);
        return true;
    }
    async handleTextEditor(codeEditor, codeBlockContext) {
        const activeModel = codeEditor.getModel();
        if (isReadOnly(activeModel, this.textFileService)) {
            this.notify(localize('insertCodeBlock.readonly', "Cannot insert the code block to read-only code editor."));
            return false;
        }
        const range = codeEditor.getSelection() ?? new Range(activeModel.getLineCount(), 1, activeModel.getLineCount(), 1);
        const text = reindent(codeBlockContext.code, activeModel, range.startLineNumber);
        const edits = [new ResourceTextEdit(activeModel.uri, { range, text })];
        await this.bulkEditService.apply(edits);
        this.codeEditorService.listCodeEditors().find(editor => editor.getModel()?.uri.toString() === activeModel.uri.toString())?.focus();
        return true;
    }
    notify(message) {
        //this.notificationService.notify({ severity: Severity.Info, message });
        this.dialogService.info(message);
    }
};
InsertCodeBlockOperation = __decorate([
    __param(0, IEditorService),
    __param(1, ITextFileService),
    __param(2, IBulkEditService),
    __param(3, ICodeEditorService),
    __param(4, IChatService),
    __param(5, ILanguageService),
    __param(6, IDialogService)
], InsertCodeBlockOperation);
export { InsertCodeBlockOperation };
let ApplyCodeBlockOperation = class ApplyCodeBlockOperation {
    constructor(editorService, textFileService, chatService, fileService, dialogService, logService, codeMapperService, progressService, quickInputService, labelService, instantiationService, notebookService) {
        this.editorService = editorService;
        this.textFileService = textFileService;
        this.chatService = chatService;
        this.fileService = fileService;
        this.dialogService = dialogService;
        this.logService = logService;
        this.codeMapperService = codeMapperService;
        this.progressService = progressService;
        this.quickInputService = quickInputService;
        this.labelService = labelService;
        this.instantiationService = instantiationService;
        this.notebookService = notebookService;
    }
    async run(context) {
        let activeEditorControl = getEditableActiveCodeEditor(this.editorService);
        const codemapperUri = await this.evaluateURIToUse(context.codemapperUri, activeEditorControl);
        if (!codemapperUri) {
            return;
        }
        if (codemapperUri && !isEqual(activeEditorControl?.getModel().uri, codemapperUri) && !this.notebookService.hasSupportedNotebooks(codemapperUri)) {
            // reveal the target file
            try {
                const editorPane = await this.editorService.openEditor({ resource: codemapperUri });
                const codeEditor = getCodeEditor(editorPane?.getControl());
                if (codeEditor && codeEditor.hasModel()) {
                    this.tryToRevealCodeBlock(codeEditor, context.code);
                    activeEditorControl = codeEditor;
                }
                else {
                    this.notify(localize('applyCodeBlock.errorOpeningFile', "Failed to open {0} in a code editor.", codemapperUri.toString()));
                    return;
                }
            }
            catch (e) {
                this.logService.info('[ApplyCodeBlockOperation] error opening code mapper file', codemapperUri, e);
                return;
            }
        }
        let result = undefined;
        if (activeEditorControl && !this.notebookService.hasSupportedNotebooks(codemapperUri)) {
            result = await this.handleTextEditor(activeEditorControl, context.chatSessionId, context.code);
        }
        else {
            const activeNotebookEditor = getActiveNotebookEditor(this.editorService);
            if (activeNotebookEditor) {
                result = await this.handleNotebookEditor(activeNotebookEditor, context.chatSessionId, context.code);
            }
            else {
                this.notify(localize('applyCodeBlock.noActiveEditor', "To apply this code block, open a code or notebook editor."));
            }
        }
        if (isResponseVM(context.element)) {
            const requestId = context.element.requestId;
            const request = context.element.session.getItems().find(item => item.id === requestId && isRequestVM(item));
            notifyUserAction(this.chatService, context, {
                kind: 'apply',
                codeBlockIndex: context.codeBlockIndex,
                totalCharacters: context.code.length,
                codeMapper: result?.codeMapper,
                editsProposed: !!result?.editsProposed,
                totalLines: context.code.split('\n').length,
                modelId: request?.modelId ?? '',
                languageId: context.languageId,
            });
        }
    }
    async evaluateURIToUse(resource, activeEditorControl) {
        if (resource && await this.fileService.exists(resource)) {
            return resource;
        }
        const activeEditorOption = activeEditorControl?.getModel().uri ? { label: localize('activeEditor', "Active editor '{0}'", this.labelService.getUriLabel(activeEditorControl.getModel().uri, { relative: true })), id: 'activeEditor' } : undefined;
        const untitledEditorOption = { label: localize('newUntitledFile', "New untitled editor"), id: 'newUntitledFile' };
        const options = [];
        if (resource) {
            // code block had an URI, but it doesn't exist
            options.push({ label: localize('createFile', "New file '{0}'", this.labelService.getUriLabel(resource, { relative: true })), id: 'createFile' });
            options.push(untitledEditorOption);
            if (activeEditorOption) {
                options.push(activeEditorOption);
            }
        }
        else {
            // code block had no URI
            if (activeEditorOption) {
                options.push(activeEditorOption);
            }
            options.push(untitledEditorOption);
        }
        const selected = options.length > 1 ? await this.quickInputService.pick(options, { placeHolder: localize('selectOption', "Select where to apply the code block") }) : options[0];
        if (selected) {
            switch (selected.id) {
                case 'createFile':
                    if (resource) {
                        try {
                            await this.fileService.writeFile(resource, VSBuffer.fromString(''));
                        }
                        catch (error) {
                            this.notify(localize('applyCodeBlock.fileWriteError', "Failed to create file: {0}", error.message));
                            return URI.from({ scheme: 'untitled', path: resource.path });
                        }
                    }
                    return resource;
                case 'newUntitledFile':
                    return URI.from({ scheme: 'untitled', path: resource ? resource.path : 'Untitled-1' });
                case 'activeEditor':
                    return activeEditorControl?.getModel().uri;
            }
        }
        return undefined;
    }
    async handleNotebookEditor(notebookEditor, chatSessionId, code) {
        if (notebookEditor.isReadOnly) {
            this.notify(localize('applyCodeBlock.readonlyNotebook', "Cannot apply code block to read-only notebook editor."));
            return undefined;
        }
        const uri = notebookEditor.textModel.uri;
        const codeBlock = { code, resource: uri, markdownBeforeBlock: undefined };
        const codeMapper = this.codeMapperService.providers[0]?.displayName;
        if (!codeMapper) {
            this.notify(localize('applyCodeBlock.noCodeMapper', "No code mapper available."));
            return undefined;
        }
        let editsProposed = false;
        const cancellationTokenSource = new CancellationTokenSource();
        try {
            const iterable = await this.progressService.withProgress({ location: 15 /* ProgressLocation.Notification */, delay: 500, sticky: true, cancellable: true }, async (progress) => {
                progress.report({ message: localize('applyCodeBlock.progress', "Applying code block using {0}...", codeMapper) });
                const editsIterable = this.getNotebookEdits(codeBlock, chatSessionId, cancellationTokenSource.token);
                return await this.waitForFirstElement(editsIterable);
            }, () => cancellationTokenSource.cancel());
            editsProposed = await this.applyNotebookEditsWithInlinePreview(iterable, uri, cancellationTokenSource);
        }
        catch (e) {
            if (!isCancellationError(e)) {
                this.notify(localize('applyCodeBlock.error', "Failed to apply code block: {0}", e.message));
            }
        }
        finally {
            cancellationTokenSource.dispose();
        }
        return {
            editsProposed,
            codeMapper
        };
    }
    async handleTextEditor(codeEditor, chatSessionId, code) {
        const activeModel = codeEditor.getModel();
        if (isReadOnly(activeModel, this.textFileService)) {
            this.notify(localize('applyCodeBlock.readonly', "Cannot apply code block to read-only file."));
            return undefined;
        }
        const codeBlock = { code, resource: activeModel.uri, chatSessionId, markdownBeforeBlock: undefined };
        const codeMapper = this.codeMapperService.providers[0]?.displayName;
        if (!codeMapper) {
            this.notify(localize('applyCodeBlock.noCodeMapper', "No code mapper available."));
            return undefined;
        }
        let editsProposed = false;
        const cancellationTokenSource = new CancellationTokenSource();
        try {
            const iterable = await this.progressService.withProgress({ location: 15 /* ProgressLocation.Notification */, delay: 500, sticky: true, cancellable: true }, async (progress) => {
                progress.report({ message: localize('applyCodeBlock.progress', "Applying code block using {0}...", codeMapper) });
                const editsIterable = this.getTextEdits(codeBlock, chatSessionId, cancellationTokenSource.token);
                return await this.waitForFirstElement(editsIterable);
            }, () => cancellationTokenSource.cancel());
            editsProposed = await this.applyWithInlinePreview(iterable, codeEditor, cancellationTokenSource);
        }
        catch (e) {
            if (!isCancellationError(e)) {
                this.notify(localize('applyCodeBlock.error', "Failed to apply code block: {0}", e.message));
            }
        }
        finally {
            cancellationTokenSource.dispose();
        }
        return {
            editsProposed,
            codeMapper
        };
    }
    getTextEdits(codeBlock, chatSessionId, token) {
        return new AsyncIterableObject(async (executor) => {
            const request = {
                codeBlocks: [codeBlock],
                chatSessionId
            };
            const response = {
                textEdit: (target, edit) => {
                    executor.emitOne(edit);
                },
                notebookEdit(_resource, _edit) {
                    //
                },
            };
            const result = await this.codeMapperService.mapCode(request, response, token);
            if (result?.errorMessage) {
                executor.reject(new Error(result.errorMessage));
            }
        });
    }
    getNotebookEdits(codeBlock, chatSessionId, token) {
        return new AsyncIterableObject(async (executor) => {
            const request = {
                codeBlocks: [codeBlock],
                chatSessionId,
                location: 'panel'
            };
            const response = {
                textEdit: (target, edits) => {
                    executor.emitOne([target, edits]);
                },
                notebookEdit(_resource, edit) {
                    executor.emitOne(edit);
                },
            };
            const result = await this.codeMapperService.mapCode(request, response, token);
            if (result?.errorMessage) {
                executor.reject(new Error(result.errorMessage));
            }
        });
    }
    async waitForFirstElement(iterable) {
        const iterator = iterable[Symbol.asyncIterator]();
        let result = await iterator.next();
        if (result.done) {
            return {
                async *[Symbol.asyncIterator]() {
                    return;
                }
            };
        }
        return {
            async *[Symbol.asyncIterator]() {
                while (!result.done) {
                    yield result.value;
                    result = await iterator.next();
                }
            }
        };
    }
    async applyWithInlinePreview(edits, codeEditor, tokenSource) {
        return this.instantiationService.invokeFunction(reviewEdits, codeEditor, edits, tokenSource.token);
    }
    async applyNotebookEditsWithInlinePreview(edits, uri, tokenSource) {
        return this.instantiationService.invokeFunction(reviewNotebookEdits, uri, edits, tokenSource.token);
    }
    tryToRevealCodeBlock(codeEditor, codeBlock) {
        const match = codeBlock.match(/(\S[^\n]*)\n/); // substring that starts with a non-whitespace character and ends with a newline
        if (match && match[1].length > 10) {
            const findMatch = codeEditor.getModel().findNextMatch(match[1], { lineNumber: 1, column: 1 }, false, false, null, false);
            if (findMatch) {
                codeEditor.revealRangeInCenter(findMatch.range);
            }
        }
    }
    notify(message) {
        //this.notificationService.notify({ severity: Severity.Info, message });
        this.dialogService.info(message);
    }
};
ApplyCodeBlockOperation = __decorate([
    __param(0, IEditorService),
    __param(1, ITextFileService),
    __param(2, IChatService),
    __param(3, IFileService),
    __param(4, IDialogService),
    __param(5, ILogService),
    __param(6, ICodeMapperService),
    __param(7, IProgressService),
    __param(8, IQuickInputService),
    __param(9, ILabelService),
    __param(10, IInstantiationService),
    __param(11, INotebookService)
], ApplyCodeBlockOperation);
export { ApplyCodeBlockOperation };
function notifyUserAction(chatService, context, action) {
    if (isResponseVM(context.element)) {
        chatService.notifyUserAction({
            agentId: context.element.agent?.id,
            command: context.element.slashCommand?.name,
            sessionId: context.element.sessionId,
            requestId: context.element.requestId,
            result: context.element.result,
            action
        });
    }
}
function getActiveNotebookEditor(editorService) {
    const activeEditorPane = editorService.activeEditorPane;
    if (activeEditorPane?.getId() === NOTEBOOK_EDITOR_ID) {
        const notebookEditor = activeEditorPane.getControl();
        if (notebookEditor.hasModel()) {
            return notebookEditor;
        }
    }
    return undefined;
}
function getEditableActiveCodeEditor(editorService) {
    const activeCodeEditorInNotebook = getActiveNotebookEditor(editorService)?.activeCodeEditor;
    if (activeCodeEditorInNotebook && activeCodeEditorInNotebook.hasTextFocus() && activeCodeEditorInNotebook.hasModel()) {
        return activeCodeEditorInNotebook;
    }
    let codeEditor = getCodeEditor(editorService.activeTextEditorControl);
    if (!codeEditor) {
        for (const editor of editorService.visibleTextEditorControls) {
            codeEditor = getCodeEditor(editor);
            if (codeEditor) {
                break;
            }
        }
    }
    if (!codeEditor || !codeEditor.hasModel()) {
        return undefined;
    }
    return codeEditor;
}
function isReadOnly(model, textFileService) {
    // Check if model is editable, currently only support untitled and text file
    const activeTextModel = textFileService.files.get(model.uri) ?? textFileService.untitled.get(model.uri);
    return !!activeTextModel?.isReadonly();
}
function reindent(codeBlockContent, model, seletionStartLine) {
    const newContent = strings.splitLines(codeBlockContent);
    if (newContent.length === 0) {
        return codeBlockContent;
    }
    const formattingOptions = model.getFormattingOptions();
    const codeIndentLevel = computeIndentation(model.getLineContent(seletionStartLine), formattingOptions.tabSize).level;
    const indents = newContent.map(line => computeIndentation(line, formattingOptions.tabSize));
    // find the smallest indent level in the code block
    const newContentIndentLevel = indents.reduce((min, indent, index) => {
        if (indent.length !== newContent[index].length) { // ignore empty lines
            return Math.min(indent.level, min);
        }
        return min;
    }, Number.MAX_VALUE);
    if (newContentIndentLevel === Number.MAX_VALUE || newContentIndentLevel === codeIndentLevel) {
        // all lines are empty or the indent is already correct
        return codeBlockContent;
    }
    const newLines = [];
    for (let i = 0; i < newContent.length; i++) {
        const { level, length } = indents[i];
        const newLevel = Math.max(0, codeIndentLevel + level - newContentIndentLevel);
        const newIndentation = formattingOptions.insertSpaces ? ' '.repeat(formattingOptions.tabSize * newLevel) : '\t'.repeat(newLevel);
        newLines.push(newIndentation + newContent[i].substring(length));
    }
    return newLines.join('\n');
}
/**
 * Returns:
 *  - level: the line's the ident level in tabs
 *  - length: the number of characters of the leading whitespace
 */
export function computeIndentation(line, tabSize) {
    let nSpaces = 0;
    let level = 0;
    let i = 0;
    let length = 0;
    const len = line.length;
    while (i < len) {
        const chCode = line.charCodeAt(i);
        if (chCode === 32 /* CharCode.Space */) {
            nSpaces++;
            if (nSpaces === tabSize) {
                level++;
                nSpaces = 0;
                length = i + 1;
            }
        }
        else if (chCode === 9 /* CharCode.Tab */) {
            level++;
            nSpaces = 0;
            length = i + 1;
        }
        else {
            break;
        }
        i++;
    }
    return { level, length };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUJsb2NrT3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY29kZUJsb2NrT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRXhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEtBQUssT0FBTyxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsYUFBYSxFQUFxQixNQUFNLGdEQUFnRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFB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