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
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { autorun } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { ICodeMapperService } from '../../common/chatCodeMapperService.js';
import { IChatService } from '../../common/chatService.js';
import { ToolDataSource } from '../../common/languageModelToolsService.js';
export const ExtensionEditToolId = 'vscode_editFile';
export const InternalEditToolId = 'vscode_editFile_internal';
export const EditToolData = {
    id: InternalEditToolId,
    displayName: '', // not used
    modelDescription: '', // Not used
    source: ToolDataSource.Internal,
};
let EditTool = class EditTool {
    constructor(chatService, codeMapperService, notebookService) {
        this.chatService = chatService;
        this.codeMapperService = codeMapperService;
        this.notebookService = notebookService;
    }
    async invoke(invocation, countTokens, _progress, token) {
        if (!invocation.context) {
            throw new Error('toolInvocationToken is required for this tool');
        }
        const parameters = invocation.parameters;
        const fileUri = URI.revive(parameters.uri);
        const uri = CellUri.parse(fileUri)?.notebook || fileUri;
        const model = this.chatService.getSession(invocation.context?.sessionId);
        const request = model.getRequests().at(-1);
        model.acceptResponseProgress(request, {
            kind: 'markdownContent',
            content: new MarkdownString('\n````\n')
        });
        model.acceptResponseProgress(request, {
            kind: 'codeblockUri',
            uri,
            isEdit: true
        });
        model.acceptResponseProgress(request, {
            kind: 'markdownContent',
            content: new MarkdownString('\n````\n')
        });
        // Signal start.
        if (this.notebookService.hasSupportedNotebooks(uri) && (this.notebookService.getNotebookTextModel(uri))) {
            model.acceptResponseProgress(request, {
                kind: 'notebookEdit',
                edits: [],
                uri
            });
        }
        else {
            model.acceptResponseProgress(request, {
                kind: 'textEdit',
                edits: [],
                uri
            });
        }
        const editSession = model.editingSession;
        if (!editSession) {
            throw new Error('This tool must be called from within an editing session');
        }
        const result = await this.codeMapperService.mapCode({
            codeBlocks: [{ code: parameters.code, resource: uri, markdownBeforeBlock: parameters.explanation }],
            location: 'tool',
            chatRequestId: invocation.chatRequestId,
            chatRequestModel: invocation.modelId,
            chatSessionId: invocation.context.sessionId,
        }, {
            textEdit: (target, edits) => {
                model.acceptResponseProgress(request, { kind: 'textEdit', uri: target, edits });
            },
            notebookEdit(target, edits) {
                model.acceptResponseProgress(request, { kind: 'notebookEdit', uri: target, edits });
            },
        }, token);
        // Signal end.
        if (this.notebookService.hasSupportedNotebooks(uri) && (this.notebookService.getNotebookTextModel(uri))) {
            model.acceptResponseProgress(request, { kind: 'notebookEdit', uri, edits: [], done: true });
        }
        else {
            model.acceptResponseProgress(request, { kind: 'textEdit', uri, edits: [], done: true });
        }
        if (result?.errorMessage) {
            throw new Error(result.errorMessage);
        }
        let dispose;
        await new Promise((resolve) => {
            // The file will not be modified until the first edits start streaming in,
            // so wait until we see that it _was_ modified before waiting for it to be done.
            let wasFileBeingModified = false;
            dispose = autorun((r) => {
                const entries = editSession.entries.read(r);
                const currentFile = entries?.find((e) => e.modifiedURI.toString() === uri.toString());
                if (currentFile) {
                    if (currentFile.isCurrentlyBeingModifiedBy.read(r)) {
                        wasFileBeingModified = true;
                    }
                    else if (wasFileBeingModified) {
                        resolve(true);
                    }
                }
            });
        }).finally(() => {
            dispose.dispose();
        });
        return {
            content: [{ kind: 'text', value: 'The file was edited successfully' }]
        };
    }
    async prepareToolInvocation(context, token) {
        return {
            presentation: 'hidden'
        };
    }
};
EditTool = __decorate([
    __param(0, IChatService),
    __param(1, ICodeMapperService),
    __param(2, INotebookService)
], EditTool);
export { EditTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdEZpbGVUb29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi90b29scy9lZGl0RmlsZVRvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0QsT0FBTyxFQUF1SSxjQUFjLEVBQWdCLE1BQU0sMkNBQTJDLENBQUM7QUFFOU4sTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsaUJBQWlCLENBQUM7QUFDckQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsMEJBQTBCLENBQUM7QUFDN0QsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFjO0lBQ3RDLEVBQUUsRUFBRSxrQkFBa0I7SUFDdEIsV0FBVyxFQUFFLEVBQUUsRUFBRSxXQUFXO0lBQzVCLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxXQUFXO0lBQ2pDLE1BQU0sRUFBRSxjQUFjLENBQUMsUUFBUTtDQUMvQixDQUFDO0FBUUssSUFBTSxRQUFRLEdBQWQsTUFBTSxRQUFRO0lBRXBCLFlBQ2dDLFdBQXlCLEVBQ25CLGlCQUFxQyxFQUN2Qyxl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