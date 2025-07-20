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
import * as dom from '../../../../../../base/browser/dom.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { thenIfNotDisposed } from '../../../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { CancelChatActionId } from '../../actions/chatExecuteActions.js';
import { AcceptToolConfirmationActionId } from '../../actions/chatToolActions.js';
import { IChatWidgetService } from '../../chat.js';
import { ChatCustomConfirmationWidget } from '../chatConfirmationWidget.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let TerminalConfirmationWidgetSubPart = class TerminalConfirmationWidgetSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, terminalData, context, renderer, editorPool, currentWidthDelegate, codeBlockStartIndex, instantiationService, keybindingService, modelService, languageService, contextKeyService, chatWidgetService) {
        super(toolInvocation);
        this.context = context;
        this.renderer = renderer;
        this.editorPool = editorPool;
        this.currentWidthDelegate = currentWidthDelegate;
        this.codeBlockStartIndex = codeBlockStartIndex;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.contextKeyService = contextKeyService;
        this.chatWidgetService = chatWidgetService;
        this.codeblocks = [];
        if (!toolInvocation.confirmationMessages) {
            throw new Error('Confirmation messages are missing');
        }
        const title = toolInvocation.confirmationMessages.title;
        const message = toolInvocation.confirmationMessages.message;
        const continueLabel = localize('continue', "Continue");
        const continueKeybinding = keybindingService.lookupKeybinding(AcceptToolConfirmationActionId)?.getLabel();
        const continueTooltip = continueKeybinding ? `${continueLabel} (${continueKeybinding})` : continueLabel;
        const cancelLabel = localize('cancel', "Cancel");
        const cancelKeybinding = keybindingService.lookupKeybinding(CancelChatActionId)?.getLabel();
        const cancelTooltip = cancelKeybinding ? `${cancelLabel} (${cancelKeybinding})` : cancelLabel;
        const buttons = [
            {
                label: continueLabel,
                data: true,
                tooltip: continueTooltip
            },
            {
                label: cancelLabel,
                data: false,
                isSecondary: true,
                tooltip: cancelTooltip
            }
        ];
        const renderedMessage = this._register(this.renderer.render(typeof message === 'string' ? new MarkdownString(message) : message, { asyncRenderCallback: () => this._onDidChangeHeight.fire() }));
        const codeBlockRenderOptions = {
            hideToolbar: true,
            reserveWidth: 19,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on',
                readOnly: false,
                tabFocusMode: true,
                ariaLabel: typeof title === 'string' ? title : title.value
            }
        };
        const langId = this.languageService.getLanguageIdByLanguageName(terminalData.language ?? 'sh') ?? 'shellscript';
        const model = this.modelService.createModel(terminalData.kind === 'terminal' ? terminalData.command : terminalData.commandLine.toolEdited ?? terminalData.commandLine.original, this.languageService.createById(langId), undefined, true);
        const editor = this._register(this.editorPool.get());
        const renderPromise = editor.object.render({
            codeBlockIndex: this.codeBlockStartIndex,
            codeBlockPartIndex: 0,
            element: this.context.element,
            languageId: langId,
            renderOptions: codeBlockRenderOptions,
            textModel: Promise.resolve(model),
            chatSessionId: this.context.element.sessionId
        }, this.currentWidthDelegate());
        this._register(thenIfNotDisposed(renderPromise, () => this._onDidChangeHeight.fire()));
        this.codeblocks.push({
            codeBlockIndex: this.codeBlockStartIndex,
            codemapperUri: undefined,
            elementId: this.context.element.id,
            focus: () => editor.object.focus(),
            isStreaming: false,
            ownerMarkdownPartId: this.codeblocksPartId,
            uri: model.uri,
            uriPromise: Promise.resolve(model.uri),
            chatSessionId: this.context.element.sessionId
        });
        this._register(editor.object.onDidChangeContentHeight(() => {
            editor.object.layout(this.currentWidthDelegate());
            this._onDidChangeHeight.fire();
        }));
        this._register(model.onDidChangeContent(e => {
            if (terminalData.kind === 'terminal') {
                terminalData.command = model.getValue();
            }
            else {
                terminalData.commandLine.userEdited = model.getValue();
            }
        }));
        const element = dom.$('');
        dom.append(element, editor.object.element);
        dom.append(element, renderedMessage.element);
        const confirmWidget = this._register(this.instantiationService.createInstance(ChatCustomConfirmationWidget, title, undefined, element, buttons, this.context.container));
        ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService).set(true);
        this._register(confirmWidget.onDidClick(button => {
            toolInvocation.confirmed.complete(button.data);
            this.chatWidgetService.getWidgetBySessionId(this.context.element.sessionId)?.focusInput();
        }));
        this._register(confirmWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        toolInvocation.confirmed.p.then(() => {
            ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService).set(false);
            this._onNeedsRerender.fire();
        });
        this.domNode = confirmWidget.domNode;
    }
};
TerminalConfirmationWidgetSubPart = __decorate([
    __param(7, IInstantiationService),
    __param(8, IKeybindingService),
    __param(9, IModelService),
    __param(10, ILanguageService),
    __param(11, IContextKeyService),
    __param(12, IChatWidgetService)
], TerminalConfirmationWidgetSubPart);
export { TerminalConfirmationWidgetSubPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRlcm1pbmFsVG9vbFN1YlBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL3Rvb2xJbnZvY2F0aW9uUGFydHMvY2hhdFRlcm1pbmFsVG9vbFN1YlBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEYsT0FBTyxFQUFzQixrQkFBa0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUV2RSxPQUFPLEVBQUUsNEJBQTRCLEVBQTJCLE1BQU0sOEJBQThCLENBQUM7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