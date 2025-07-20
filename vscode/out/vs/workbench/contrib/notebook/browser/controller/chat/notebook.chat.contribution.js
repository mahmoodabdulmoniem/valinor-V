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
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { codiconsLibrary } from '../../../../../../base/common/codiconsLibrary.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { registerWorkbenchContribution2 } from '../../../../../common/contributions.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IChatWidgetService, showChatView } from '../../../../chat/browser/chat.js';
import { ChatDynamicVariableModel } from '../../../../chat/browser/contrib/chatDynamicVariables.js';
import { computeCompletionRanges } from '../../../../chat/browser/contrib/chatInputCompletions.js';
import { IChatAgentService } from '../../../../chat/common/chatAgents.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
import { ChatContextKeys } from '../../../../chat/common/chatContextKeys.js';
import { chatVariableLeader } from '../../../../chat/common/chatParserTypes.js';
import { NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT, NOTEBOOK_CELL_OUTPUT_MIMETYPE } from '../../../common/notebookContextKeys.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { getNotebookEditorFromEditorPane } from '../../notebookBrowser.js';
import * as icons from '../../notebookIcons.js';
import { getOutputViewModelFromId } from '../cellOutputActions.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from '../coreActions.js';
import './cellChatActions.js';
import { CTX_NOTEBOOK_CHAT_HAS_AGENT } from './notebookChatContext.js';
import { IViewsService } from '../../../../../services/views/common/viewsService.js';
import { createNotebookOutputVariableEntry, NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST } from '../../contrib/chat/notebookChatUtils.js';
import { IChatContextPickService } from '../../../../chat/browser/chatContextPickService.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
const NotebookKernelVariableKey = 'kernelVariable';
let NotebookChatContribution = class NotebookChatContribution extends Disposable {
    static { this.ID = 'workbench.contrib.notebookChatContribution'; }
    constructor(contextKeyService, chatAgentService, editorService, chatWidgetService, notebookKernelService, languageFeaturesService, chatContextPickService) {
        super();
        this.editorService = editorService;
        this.chatWidgetService = chatWidgetService;
        this.notebookKernelService = notebookKernelService;
        this.languageFeaturesService = languageFeaturesService;
        this._register(chatContextPickService.registerChatContextItem(new KernelVariableContextPicker(this.editorService, this.notebookKernelService)));
        this._ctxHasProvider = CTX_NOTEBOOK_CHAT_HAS_AGENT.bindTo(contextKeyService);
        const updateNotebookAgentStatus = () => {
            const hasNotebookAgent = Boolean(chatAgentService.getDefaultAgent(ChatAgentLocation.Notebook));
            this._ctxHasProvider.set(hasNotebookAgent);
        };
        updateNotebookAgentStatus();
        this._register(chatAgentService.onDidChangeAgents(updateNotebookAgentStatus));
        this._register(this.languageFeaturesService.completionProvider.register({ scheme: Schemas.vscodeChatInput, hasAccessToAllModels: true }, {
            _debugDisplayName: 'chatKernelDynamicCompletions',
            triggerCharacters: [chatVariableLeader],
            provideCompletionItems: async (model, position, _context, token) => {
                const widget = this.chatWidgetService.getWidgetByInputUri(model.uri);
                if (!widget || !widget.supportsFileReferences) {
                    return null;
                }
                if (widget.location !== ChatAgentLocation.Notebook) {
                    return null;
                }
                const variableNameDef = new RegExp(`${chatVariableLeader}\\w*`, 'g');
                const range = computeCompletionRanges(model, position, variableNameDef, true);
                if (!range) {
                    return null;
                }
                const result = { suggestions: [] };
                const afterRange = new Range(position.lineNumber, range.replace.startColumn, position.lineNumber, range.replace.startColumn + `${chatVariableLeader}${NotebookKernelVariableKey}:`.length);
                result.suggestions.push({
                    label: `${chatVariableLeader}${NotebookKernelVariableKey}`,
                    insertText: `${chatVariableLeader}${NotebookKernelVariableKey}:`,
                    detail: localize('pickKernelVariableLabel', "Pick a variable from the kernel"),
                    range,
                    kind: 18 /* CompletionItemKind.Text */,
                    command: { id: SelectAndInsertKernelVariableAction.ID, title: SelectAndInsertKernelVariableAction.ID, arguments: [{ widget, range: afterRange }] },
                    sortText: 'z'
                });
                await this.addKernelVariableCompletion(widget, result, range, token);
                return result;
            }
        }));
        // output context
        NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT.bindTo(contextKeyService).set(NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST);
    }
    async addKernelVariableCompletion(widget, result, info, token) {
        let pattern;
        if (info.varWord?.word && info.varWord.word.startsWith(chatVariableLeader)) {
            pattern = info.varWord.word.toLowerCase().slice(1);
        }
        const notebook = getNotebookEditorFromEditorPane(this.editorService.activeEditorPane)?.getViewModel()?.notebookDocument;
        if (!notebook) {
            return;
        }
        const selectedKernel = this.notebookKernelService.getMatchingKernel(notebook).selected;
        const hasVariableProvider = selectedKernel?.hasVariableProvider;
        if (!hasVariableProvider) {
            return;
        }
        const variables = await selectedKernel.provideVariables(notebook.uri, undefined, 'named', 0, CancellationToken.None);
        for await (const variable of variables) {
            if (pattern && !variable.name.toLowerCase().includes(pattern)) {
                continue;
            }
            result.suggestions.push({
                label: { label: variable.name, description: variable.type },
                insertText: `${chatVariableLeader}${NotebookKernelVariableKey}:${variable.name} `,
                filterText: `${chatVariableLeader}${variable.name}`,
                range: info,
                kind: 4 /* CompletionItemKind.Variable */,
                sortText: 'z',
                command: { id: SelectAndInsertKernelVariableAction.ID, title: SelectAndInsertKernelVariableAction.ID, arguments: [{ widget, range: info.insert, variable: variable.name }] },
                detail: variable.type,
                documentation: variable.value,
            });
        }
    }
};
NotebookChatContribution = __decorate([
    __param(0, IContextKeyService),
    __param(1, IChatAgentService),
    __param(2, IEditorService),
    __param(3, IChatWidgetService),
    __param(4, INotebookKernelService),
    __param(5, ILanguageFeaturesService),
    __param(6, IChatContextPickService)
], NotebookChatContribution);
export class SelectAndInsertKernelVariableAction extends Action2 {
    constructor() {
        super({
            id: SelectAndInsertKernelVariableAction.ID,
            title: '' // not displayed
        });
    }
    static { this.ID = 'notebook.chat.selectAndInsertKernelVariable'; }
    async run(accessor, ...args) {
        const editorService = accessor.get(IEditorService);
        const notebookKernelService = accessor.get(INotebookKernelService);
        const quickInputService = accessor.get(IQuickInputService);
        const notebook = getNotebookEditorFromEditorPane(editorService.activeEditorPane)?.getViewModel()?.notebookDocument;
        if (!notebook) {
            return;
        }
        const context = args[0];
        if (!context || !('widget' in context) || !('range' in context)) {
            return;
        }
        const widget = context.widget;
        const range = context.range;
        const variable = context.variable;
        if (variable !== undefined) {
            this.addVariableReference(widget, variable, range, false);
            return;
        }
        const selectedKernel = notebookKernelService.getMatchingKernel(notebook).selected;
        const hasVariableProvider = selectedKernel?.hasVariableProvider;
        if (!hasVariableProvider) {
            return;
        }
        const variables = await selectedKernel.provideVariables(notebook.uri, undefined, 'named', 0, CancellationToken.None);
        const quickPickItems = [];
        for await (const variable of variables) {
            quickPickItems.push({
                label: variable.name,
                description: variable.value,
                detail: variable.type,
            });
        }
        const placeHolder = quickPickItems.length > 0
            ? localize('selectKernelVariablePlaceholder', "Select a kernel variable")
            : localize('noKernelVariables', "No kernel variables found");
        const pickedVariable = await quickInputService.pick(quickPickItems, { placeHolder });
        if (!pickedVariable) {
            return;
        }
        this.addVariableReference(widget, pickedVariable.label, range, true);
    }
    addVariableReference(widget, variableName, range, updateText) {
        if (range) {
            const text = `#kernelVariable:${variableName}`;
            if (updateText) {
                const editor = widget.inputEditor;
                const success = editor.executeEdits('chatInsertFile', [{ range, text: text + ' ' }]);
                if (!success) {
                    return;
                }
            }
            widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
                id: 'vscode.notebook.variable',
                range: { startLineNumber: range.startLineNumber, startColumn: range.startColumn, endLineNumber: range.endLineNumber, endColumn: range.startColumn + text.length },
                data: variableName,
                fullName: variableName,
                icon: codiconsLibrary.variable,
            });
        }
        else {
            widget.attachmentModel.addContext({
                id: 'vscode.notebook.variable',
                name: variableName,
                value: variableName,
                icon: codiconsLibrary.variable,
                kind: 'generic'
            });
        }
    }
}
let KernelVariableContextPicker = class KernelVariableContextPicker {
    constructor(editorService, notebookKernelService) {
        this.editorService = editorService;
        this.notebookKernelService = notebookKernelService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.notebook.kernelVariable', 'Kernel Variable...');
        this.icon = Codicon.serverEnvironment;
    }
    isEnabled(widget) {
        return widget.location === ChatAgentLocation.Notebook && Boolean(getNotebookEditorFromEditorPane(this.editorService.activeEditorPane)?.getViewModel()?.notebookDocument);
    }
    asPicker() {
        const picks = (async () => {
            const notebook = getNotebookEditorFromEditorPane(this.editorService.activeEditorPane)?.getViewModel()?.notebookDocument;
            if (!notebook) {
                return [];
            }
            const selectedKernel = this.notebookKernelService.getMatchingKernel(notebook).selected;
            const hasVariableProvider = selectedKernel?.hasVariableProvider;
            if (!hasVariableProvider) {
                return [];
            }
            const variables = selectedKernel.provideVariables(notebook.uri, undefined, 'named', 0, CancellationToken.None);
            const result = [];
            for await (const variable of variables) {
                result.push({
                    label: variable.name,
                    description: variable.value,
                    asAttachment: () => {
                        return {
                            kind: 'generic',
                            id: 'vscode.notebook.variable',
                            name: variable.name,
                            value: variable.value,
                            icon: codiconsLibrary.variable,
                        };
                    },
                });
            }
            return result;
        })();
        return {
            placeholder: localize('chatContext.notebook.kernelVariable.placeholder', 'Select a kernel variable'),
            picks
        };
    }
};
KernelVariableContextPicker = __decorate([
    __param(0, IEditorService),
    __param(1, INotebookKernelService)
], KernelVariableContextPicker);
registerAction2(class CopyCellOutputAction extends Action2 {
    constructor() {
        super({
            id: 'notebook.cellOutput.addToChat',
            title: localize('notebookActions.addOutputToChat', "Add Cell Output to Chat"),
            menu: {
                id: MenuId.NotebookOutputToolbar,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_HAS_OUTPUTS, ContextKeyExpr.in(NOTEBOOK_CELL_OUTPUT_MIMETYPE.key, NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT.key)),
                order: 10,
                group: 'notebook_chat_actions'
            },
            category: NOTEBOOK_ACTIONS_CATEGORY,
            icon: icons.copyIcon,
            precondition: ChatContextKeys.enabled
        });
    }
    getNoteboookEditor(editorService, outputContext) {
        if (outputContext && 'notebookEditor' in outputContext) {
            return outputContext.notebookEditor;
        }
        return getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    }
    async run(accessor, outputContext) {
        const notebookEditor = this.getNoteboookEditor(accessor.get(IEditorService), outputContext);
        const viewService = accessor.get(IViewsService);
        if (!notebookEditor) {
            return;
        }
        let outputViewModel;
        if (outputContext && 'outputId' in outputContext && typeof outputContext.outputId === 'string') {
            outputViewModel = getOutputViewModelFromId(outputContext.outputId, notebookEditor);
        }
        else if (outputContext && 'outputViewModel' in outputContext) {
            outputViewModel = outputContext.outputViewModel;
        }
        if (!outputViewModel) {
            // not able to find the output from the provided context, use the active cell
            const activeCell = notebookEditor.getActiveCell();
            if (!activeCell) {
                return;
            }
            if (activeCell.focusedOutputId !== undefined) {
                outputViewModel = activeCell.outputsViewModels.find(output => {
                    return output.model.outputId === activeCell.focusedOutputId;
                });
            }
            else {
                outputViewModel = activeCell.outputsViewModels.find(output => output.pickedMimeType?.isTrusted);
            }
        }
        if (!outputViewModel) {
            return;
        }
        const mimeType = outputViewModel.pickedMimeType?.mimeType;
        const chatWidgetService = accessor.get(IChatWidgetService);
        let widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            const widgets = chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Panel);
            if (widgets.length === 0) {
                return;
            }
            widget = widgets[0];
        }
        if (mimeType && NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST.includes(mimeType)) {
            const entry = createNotebookOutputVariableEntry(outputViewModel, mimeType, notebookEditor);
            if (!entry) {
                return;
            }
            widget.attachmentModel.addContext(entry);
            (await showChatView(viewService))?.focusInput();
        }
    }
});
registerAction2(SelectAndInsertKernelVariableAction);
registerWorkbenchContribution2(NotebookChatContribution.ID, NotebookChatContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2suY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9jaGF0L25vdGVib29rLmNoYXQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUl0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDeEcsT0FBTyxFQUFFLGNBQWMsRUFBZSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdILE9BQU8sRUFBRSxrQkFBa0IsRUFBa0IsTUFBTSw0REFBNEQsQ0FBQztBQUNoSCxPQUFPLEVBQTBCLDhCQUE4QixFQUFrQixNQUFNLHdDQUF3QyxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUN4RixPQUFPLEVBQWUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDakcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDcEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSw0Q0FBNEMsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hLLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSwrQkFBK0IsRUFBeUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNsSCxPQUFPLEtBQUssS0FBSyxNQUFNLHdCQUF3QixDQUFDO0FBQ2hELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ25FLE9BQU8sRUFBZ0MseUJBQXlCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM1RixPQUFPLHNCQUFzQixDQUFDO0FBQzlCLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsa0RBQWtELEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoSixPQUFPLEVBQXNELHVCQUF1QixFQUFzQixNQUFNLG9EQUFvRCxDQUFDO0FBQ3JLLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVwRSxNQUFNLHlCQUF5QixHQUFHLGdCQUFnQixDQUFDO0FBRW5ELElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTthQUNoQyxPQUFFLEdBQUcsNENBQTRDLEFBQS9DLENBQWdEO0lBSWxFLFlBQ3FCLGlCQUFxQyxFQUN0QyxnQkFBbUMsRUFDckIsYUFBNkIsRUFDekIsaUJBQXFDLEVBQ2pDLHFCQUE2QyxFQUMzQyx1QkFBaUQsRUFDbkUsc0JBQStDO1FBRXhFLEtBQUssRUFBRSxDQUFDO1FBTnlCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN6QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ2pDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7UUFDM0MsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtRQUs1RixJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLHVCQUF1QixDQUFDLElBQUksMkJBQTJCLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFaEosSUFBSSxDQUFDLGVBQWUsR0FBRywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUU3RSxNQUFNLHlCQUF5QixHQUFHLEdBQUcsRUFBRTtZQUN0QyxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUMvRixJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQztRQUVGLHlCQUF5QixFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUM7UUFFOUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDeEksaUJBQWlCLEVBQUUsOEJBQThCO1lBQ2pELGlCQUFpQixFQUFFLENBQUMsa0JBQWtCLENBQUM7WUFDdkMsc0JBQXNCLEVBQUUsS0FBSyxFQUFFLEtBQWlCLEVBQUUsUUFBa0IsRUFBRSxRQUEyQixFQUFFLEtBQXdCLEVBQUUsRUFBRTtnQkFDOUgsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckUsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO29CQUMvQyxPQUFPLElBQUksQ0FBQztnQkFDYixDQUFDO2dCQUVELElBQUksTUFBTSxDQUFDLFFBQVEsS0FBSyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDcEQsT0FBTyxJQUFJLENBQUM7Z0JBQ2IsQ0FBQztnQkFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLGtCQUFrQixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3JFLE1BQU0sS0FBSyxHQUFHLHVCQUF1QixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUM5RSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ1osT0FBTyxJQUFJLENBQUM7Z0JBQ2IsQ0FBQztnQkFFRCxNQUFNLE1BQU0sR0FBbUIsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUM7Z0JBRW5ELE1BQU0sVUFBVSxHQUFHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsR0FBRyxHQUFHLGtCQUFrQixHQUFHLHlCQUF5QixHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzNMLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO29CQUN2QixLQUFLLEVBQUUsR0FBRyxrQkFBa0IsR0FBRyx5QkFBeUIsRUFBRTtvQkFDMUQsVUFBVSxFQUFFLEdBQUcsa0JBQWtCLEdBQUcseUJBQXlCLEdBQUc7b0JBQ2hFLE1BQU0sRUFBRSxRQUFRLENBQUMseUJBQXlCLEVBQUUsaUNBQWlDLENBQUM7b0JBQzlFLEtBQUs7b0JBQ0wsSUFBSSxrQ0FBeUI7b0JBQzdCLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRTtvQkFDbEosUUFBUSxFQUFFLEdBQUc7aUJBQ2IsQ0FBQyxDQUFDO2dCQUVILE1BQU0sSUFBSSxDQUFDLDJCQUEyQixDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUVyRSxPQUFPLE1BQU0sQ0FBQztZQUNmLENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQztRQUVKLGlCQUFpQjtRQUNqQiw0Q0FBNEMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxHQUFHLENBQUMsa0RBQWtELENBQUMsQ0FBQztJQUNoSSxDQUFDO0lBRU8sS0FBSyxDQUFDLDJCQUEyQixDQUFDLE1BQW1CLEVBQUUsTUFBc0IsRUFBRSxJQUF3RSxFQUFFLEtBQXdCO1FBQ3hMLElBQUksT0FBMkIsQ0FBQztRQUNoQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7WUFDNUUsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsK0JBQStCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLFlBQVksRUFBRSxFQUFFLGdCQUFnQixDQUFDO1FBRXhILElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUN2RixNQUFNLG1CQUFtQixHQUFHLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQztRQUVoRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUMxQixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0sY0FBYyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFckgsSUFBSSxLQUFLLEVBQUUsTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7WUFDeEMsSUFBSSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUMvRCxTQUFTO1lBQ1YsQ0FBQztZQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO2dCQUN2QixLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRTtnQkFDM0QsVUFBVSxFQUFFLEdBQUcsa0JBQWtCLEdBQUcseUJBQXlCLElBQUksUUFBUSxDQUFDLElBQUksR0FBRztnQkFDakYsVUFBVSxFQUFFLEdBQUcsa0JBQWtCLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRTtnQkFDbkQsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsSUFBSSxxQ0FBNkI7Z0JBQ2pDLFFBQVEsRUFBRSxHQUFHO2dCQUNiLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLG1DQUFtQyxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7Z0JBQzVLLE1BQU0sRUFBRSxRQUFRLENBQUMsSUFBSTtnQkFDckIsYUFBYSxFQUFFLFFBQVEsQ0FBQyxLQUFLO2FBQzdCLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDOztBQTVHSSx3QkFBd0I7SUFNM0IsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSx1QkFBdUIsQ0FBQTtHQVpwQix3QkFBd0IsQ0E2RzdCO0FBRUQsTUFBTSxPQUFPLG1DQUFvQyxTQUFRLE9BQU87SUFDL0Q7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsbUNBQW1DLENBQUMsRUFBRTtZQUMxQyxLQUFLLEVBQUUsRUFBRSxDQUFDLGdCQUFnQjtTQUMxQixDQUFDLENBQUM7SUFDSixDQUFDO2FBRWUsT0FBRSxHQUFHLDZDQUE2QyxDQUFDO0lBRTFELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFDNUQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNuRSxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUUzRCxNQUFNLFFBQVEsR0FBRywrQkFBK0IsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxZQUFZLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQztRQUVuSCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pFLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQWdCLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDM0MsTUFBTSxLQUFLLEdBQXNCLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDL0MsTUFBTSxRQUFRLEdBQXVCLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFFdEQsSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFELE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQ2xGLE1BQU0sbUJBQW1CLEdBQUcsY0FBYyxFQUFFLG1CQUFtQixDQUFDO1FBRWhFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzFCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsTUFBTSxjQUFjLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVySCxNQUFNLGNBQWMsR0FBcUIsRUFBRSxDQUFDO1FBQzVDLElBQUksS0FBSyxFQUFFLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ3hDLGNBQWMsQ0FBQyxJQUFJLENBQUM7Z0JBQ25CLEtBQUssRUFBRSxRQUFRLENBQUMsSUFBSTtnQkFDcEIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxLQUFLO2dCQUMzQixNQUFNLEVBQUUsUUFBUSxDQUFDLElBQUk7YUFDckIsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUM1QyxDQUFDLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLDBCQUEwQixDQUFDO1lBQ3pFLENBQUMsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUU5RCxNQUFNLGNBQWMsR0FBRyxNQUFNLGlCQUFpQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3JGLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVPLG9CQUFvQixDQUFDLE1BQW1CLEVBQUUsWUFBb0IsRUFBRSxLQUFhLEVBQUUsVUFBb0I7UUFDMUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE1BQU0sSUFBSSxHQUFHLG1CQUFtQixZQUFZLEVBQUUsQ0FBQztZQUUvQyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDO2dCQUNsQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JGLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDZCxPQUFPO2dCQUNSLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBMkIsd0JBQXdCLENBQUMsRUFBRSxDQUFDLEVBQUUsWUFBWSxDQUFDO2dCQUN0RixFQUFFLEVBQUUsMEJBQTBCO2dCQUM5QixLQUFLLEVBQUUsRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLGVBQWUsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVcsRUFBRSxhQUFhLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNqSyxJQUFJLEVBQUUsWUFBWTtnQkFDbEIsUUFBUSxFQUFFLFlBQVk7Z0JBQ3RCLElBQUksRUFBRSxlQUFlLENBQUMsUUFBUTthQUM5QixDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDO2dCQUNqQyxFQUFFLEVBQUUsMEJBQTBCO2dCQUM5QixJQUFJLEVBQUUsWUFBWTtnQkFDbEIsS0FBSyxFQUFFLFlBQVk7Z0JBQ25CLElBQUksRUFBRSxlQUFlLENBQUMsUUFBUTtnQkFDOUIsSUFBSSxFQUFFLFNBQVM7YUFDZixDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQzs7QUFHRixJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUEyQjtJQU1oQyxZQUNpQixhQUE4QyxFQUN0QyxxQkFBOEQ7UUFEckQsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ3JCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7UUFOOUUsU0FBSSxHQUFHLFlBQVksQ0FBQztRQUNwQixVQUFLLEdBQUcsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDOUUsU0FBSSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztJQUt0QyxDQUFDO0lBRUwsU0FBUyxDQUFDLE1BQW1CO1FBQzVCLE9BQU8sTUFBTSxDQUFDLFFBQVEsS0FBSyxpQkFBaUIsQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxZQUFZLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQzFLLENBQUM7SUFFRCxRQUFRO1FBRVAsTUFBTSxLQUFLLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUV6QixNQUFNLFFBQVEsR0FBRywrQkFBK0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsWUFBWSxFQUFFLEVBQUUsZ0JBQWdCLENBQUM7WUFFeEgsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQztZQUVELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDdkYsTUFBTSxtQkFBbUIsR0FBRyxjQUFjLEVBQUUsbUJBQW1CLENBQUM7WUFFaEUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQzFCLE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQztZQUVELE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBRS9HLE1BQU0sTUFBTSxHQUFpQyxFQUFFLENBQUM7WUFDaEQsSUFBSSxLQUFLLEVBQUUsTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsS0FBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJO29CQUNwQixXQUFXLEVBQUUsUUFBUSxDQUFDLEtBQUs7b0JBQzNCLFlBQVksRUFBRSxHQUFHLEVBQUU7d0JBQ2xCLE9BQU87NEJBQ04sSUFBSSxFQUFFLFNBQVM7NEJBQ2YsRUFBRSxFQUFFLDBCQUEwQjs0QkFDOUIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJOzRCQUNuQixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7NEJBQ3JCLElBQUksRUFBRSxlQUFlLENBQUMsUUFBUTt5QkFDOUIsQ0FBQztvQkFDSCxDQUFDO2lCQUNELENBQUMsQ0FBQztZQUNKLENBQUM7WUFFRCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFTCxPQUFPO1lBQ04sV0FBVyxFQUFFLFFBQVEsQ0FBQyxpREFBaUQsRUFBRSwwQkFBMEIsQ0FBQztZQUNwRyxLQUFLO1NBQ0wsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBM0RLLDJCQUEyQjtJQU85QixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsc0JBQXNCLENBQUE7R0FSbkIsMkJBQTJCLENBMkRoQztBQUdELGVBQWUsQ0FBQyxNQUFNLG9CQUFxQixTQUFRLE9BQU87SUFDekQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsK0JBQStCO1lBQ25DLEtBQUssRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUseUJBQXlCLENBQUM7WUFDN0UsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMscUJBQXFCO2dCQUNoQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxjQUFjLENBQUMsRUFBRSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRSw0Q0FBNEMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0osS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsS0FBSyxFQUFFLHVCQUF1QjthQUM5QjtZQUNELFFBQVEsRUFBRSx5QkFBeUI7WUFDbkMsSUFBSSxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQ3BCLFlBQVksRUFBRSxlQUFlLENBQUMsT0FBTztTQUNyQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sa0JBQWtCLENBQUMsYUFBNkIsRUFBRSxhQUFtRztRQUM1SixJQUFJLGFBQWEsSUFBSSxnQkFBZ0IsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUN4RCxPQUFPLGFBQWEsQ0FBQyxjQUFjLENBQUM7UUFDckMsQ0FBQztRQUNELE9BQU8sK0JBQStCLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxhQUFtRztRQUN4SSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUM1RixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRWhELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksZUFBaUQsQ0FBQztRQUN0RCxJQUFJLGFBQWEsSUFBSSxVQUFVLElBQUksYUFBYSxJQUFJLE9BQU8sYUFBYSxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRyxlQUFlLEdBQUcsd0JBQXdCLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNwRixDQUFDO2FBQU0sSUFBSSxhQUFhLElBQUksaUJBQWlCLElBQUksYUFBYSxFQUFFLENBQUM7WUFDaEUsZUFBZSxHQUFHLGFBQWEsQ0FBQyxlQUFlLENBQUM7UUFDakQsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0Qiw2RUFBNkU7WUFDN0UsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ2xELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDakIsT0FBTztZQUNSLENBQUM7WUFFRCxJQUFJLFVBQVUsQ0FBQyxlQUFlLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzlDLGVBQWUsR0FBRyxVQUFVLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO29CQUM1RCxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxLQUFLLFVBQVUsQ0FBQyxlQUFlLENBQUM7Z0JBQzdELENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGVBQWUsR0FBRyxVQUFVLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNqRyxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDO1FBRTFELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELElBQUksTUFBTSxHQUFHLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDO1FBQ2pELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2pGLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsT0FBTztZQUNSLENBQUM7WUFDRCxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLENBQUM7UUFDRCxJQUFJLFFBQVEsSUFBSSxrREFBa0QsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUV2RixNQUFNLEtBQUssR0FBRyxpQ0FBaUMsQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzNGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFPO1lBQ1IsQ0FBQztZQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pDLENBQUMsTUFBTSxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQztRQUNqRCxDQUFDO0lBQ0YsQ0FBQztDQUVELENBQUMsQ0FBQztBQUVILGVBQWUsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBQ3JELDhCQUE4QixDQUFDLHdCQUF3QixDQUFDLEVBQUUsRUFBRSx3QkFBd0Isc0NBQThCLENBQUMifQ==