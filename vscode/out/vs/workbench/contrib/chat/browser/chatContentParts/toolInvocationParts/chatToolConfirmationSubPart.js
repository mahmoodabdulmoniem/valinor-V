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
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { count } from '../../../../../../base/common/strings.js';
import { isEmptyObject } from '../../../../../../base/common/types.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { ElementSizeObserver } from '../../../../../../editor/browser/config/elementSizeObserver.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IMarkerService, MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { createToolInputUri, createToolSchemaUri, ILanguageModelToolsService } from '../../../common/languageModelToolsService.js';
import { CancelChatActionId } from '../../actions/chatExecuteActions.js';
import { AcceptToolConfirmationActionId } from '../../actions/chatToolActions.js';
import { IChatWidgetService } from '../../chat.js';
import { renderFileWidgets } from '../../chatInlineAnchorWidget.js';
import { ChatConfirmationWidget, ChatCustomConfirmationWidget } from '../chatConfirmationWidget.js';
import { IChatMarkdownAnchorService } from '../chatMarkdownAnchorService.js';
import { ChatMarkdownContentPart } from '../chatMarkdownContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
const SHOW_MORE_MESSAGE_HEIGHT_TRIGGER = 30;
let ToolConfirmationSubPart = class ToolConfirmationSubPart extends BaseChatToolInvocationSubPart {
    get codeblocks() {
        return this.markdownParts.flatMap(part => part.codeblocks);
    }
    constructor(toolInvocation, context, renderer, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex, instantiationService, keybindingService, modelService, languageService, contextKeyService, chatWidgetService, commandService, markerService, languageModelToolsService, chatMarkdownAnchorService) {
        super(toolInvocation);
        this.context = context;
        this.renderer = renderer;
        this.editorPool = editorPool;
        this.currentWidthDelegate = currentWidthDelegate;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.codeBlockStartIndex = codeBlockStartIndex;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.contextKeyService = contextKeyService;
        this.chatWidgetService = chatWidgetService;
        this.commandService = commandService;
        this.markerService = markerService;
        this.languageModelToolsService = languageModelToolsService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
        this.markdownParts = [];
        if (!toolInvocation.confirmationMessages) {
            throw new Error('Confirmation messages are missing');
        }
        const { title, message, allowAutoConfirm, disclaimer } = toolInvocation.confirmationMessages;
        const continueLabel = localize('continue', "Continue");
        const continueKeybinding = keybindingService.lookupKeybinding(AcceptToolConfirmationActionId)?.getLabel();
        const continueTooltip = continueKeybinding ? `${continueLabel} (${continueKeybinding})` : continueLabel;
        const cancelLabel = localize('cancel', "Cancel");
        const cancelKeybinding = keybindingService.lookupKeybinding(CancelChatActionId)?.getLabel();
        const cancelTooltip = cancelKeybinding ? `${cancelLabel} (${cancelKeybinding})` : cancelLabel;
        var ConfirmationOutcome;
        (function (ConfirmationOutcome) {
            ConfirmationOutcome[ConfirmationOutcome["Allow"] = 0] = "Allow";
            ConfirmationOutcome[ConfirmationOutcome["Disallow"] = 1] = "Disallow";
            ConfirmationOutcome[ConfirmationOutcome["AllowWorkspace"] = 2] = "AllowWorkspace";
            ConfirmationOutcome[ConfirmationOutcome["AllowGlobally"] = 3] = "AllowGlobally";
            ConfirmationOutcome[ConfirmationOutcome["AllowSession"] = 4] = "AllowSession";
        })(ConfirmationOutcome || (ConfirmationOutcome = {}));
        const buttons = [
            {
                label: continueLabel,
                data: 0 /* ConfirmationOutcome.Allow */,
                tooltip: continueTooltip,
                moreActions: !allowAutoConfirm ? undefined : [
                    { label: localize('allowSession', 'Allow in this Session'), data: 4 /* ConfirmationOutcome.AllowSession */, tooltip: localize('allowSesssionTooltip', 'Allow this tool to run in this session without confirmation.') },
                    { label: localize('allowWorkspace', 'Allow in this Workspace'), data: 2 /* ConfirmationOutcome.AllowWorkspace */, tooltip: localize('allowWorkspaceTooltip', 'Allow this tool to run in this workspace without confirmation.') },
                    { label: localize('allowGlobally', 'Always Allow'), data: 3 /* ConfirmationOutcome.AllowGlobally */, tooltip: localize('allowGloballTooltip', 'Always allow this tool to run without confirmation.') },
                ],
            },
            {
                label: localize('cancel', "Cancel"),
                data: 1 /* ConfirmationOutcome.Disallow */,
                isSecondary: true,
                tooltip: cancelTooltip
            }
        ];
        let confirmWidget;
        if (typeof message === 'string') {
            confirmWidget = this._register(this.instantiationService.createInstance(ChatConfirmationWidget, title, toolInvocation.originMessage, message, buttons, this.context.container));
        }
        else {
            const codeBlockRenderOptions = {
                hideToolbar: true,
                reserveWidth: 19,
                verticalPadding: 5,
                editorOptions: {
                    tabFocusMode: true,
                    ariaLabel: typeof title === 'string' ? title : title.value
                },
            };
            const elements = dom.h('div', [
                dom.h('.message@messageContainer', [
                    dom.h('.message-wrapper@message'),
                    dom.h('a.see-more@showMore'),
                ]),
                dom.h('.editor@editor'),
                dom.h('.disclaimer@disclaimer'),
            ]);
            if (toolInvocation.toolSpecificData?.kind === 'input' && toolInvocation.toolSpecificData.rawInput && !isEmptyObject(toolInvocation.toolSpecificData.rawInput)) {
                const title = document.createElement('h3');
                title.textContent = localize('chat.input', "Input");
                elements.editor.appendChild(title);
                const inputData = toolInvocation.toolSpecificData;
                const codeBlockRenderOptions = {
                    hideToolbar: true,
                    reserveWidth: 19,
                    maxHeightInLines: 13,
                    verticalPadding: 5,
                    editorOptions: {
                        wordWrap: 'off',
                        readOnly: false,
                        ariaLabel: typeof toolInvocation.confirmationMessages.title === 'string' ? toolInvocation.confirmationMessages.title : toolInvocation.confirmationMessages.title.value
                    }
                };
                const langId = this.languageService.getLanguageIdByLanguageName('json');
                const rawJsonInput = JSON.stringify(inputData.rawInput ?? {}, null, 1);
                const canSeeMore = count(rawJsonInput, '\n') > 2; // if more than one key:value
                const model = this._register(this.modelService.createModel(
                // View a single JSON line by default until they 'see more'
                rawJsonInput.replace(/\n */g, ' '), this.languageService.createById(langId), createToolInputUri(toolInvocation.toolId), true));
                const markerOwner = generateUuid();
                const schemaUri = createToolSchemaUri(toolInvocation.toolId);
                const validator = new RunOnceScheduler(async () => {
                    const newMarker = [];
                    const result = await this.commandService.executeCommand('json.validate', schemaUri, model.getValue());
                    for (const item of result) {
                        if (item.range && item.message) {
                            newMarker.push({
                                severity: item.severity === 'Error' ? MarkerSeverity.Error : MarkerSeverity.Warning,
                                message: item.message,
                                startLineNumber: item.range[0].line + 1,
                                startColumn: item.range[0].character + 1,
                                endLineNumber: item.range[1].line + 1,
                                endColumn: item.range[1].character + 1,
                                code: item.code ? String(item.code) : undefined
                            });
                        }
                    }
                    this.markerService.changeOne(markerOwner, model.uri, newMarker);
                }, 500);
                validator.schedule();
                this._register(model.onDidChangeContent(() => validator.schedule()));
                this._register(toDisposable(() => this.markerService.remove(markerOwner, [model.uri])));
                this._register(validator);
                const editor = this._register(this.editorPool.get());
                editor.object.render({
                    codeBlockIndex: this.codeBlockStartIndex,
                    codeBlockPartIndex: 0,
                    element: this.context.element,
                    languageId: langId ?? 'json',
                    renderOptions: codeBlockRenderOptions,
                    textModel: Promise.resolve(model),
                    chatSessionId: this.context.element.sessionId
                }, this.currentWidthDelegate());
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
                    try {
                        inputData.rawInput = JSON.parse(model.getValue());
                    }
                    catch {
                        // ignore
                    }
                }));
                elements.editor.append(editor.object.element);
                if (canSeeMore) {
                    const seeMore = dom.h('div.see-more', [dom.h('a@link')]);
                    seeMore.link.textContent = localize('seeMore', "See more");
                    this._register(dom.addDisposableGenericMouseDownListener(seeMore.link, () => {
                        try {
                            const parsed = JSON.parse(model.getValue());
                            model.setValue(JSON.stringify(parsed, null, 2));
                            editor.object.editor.updateOptions({ tabFocusMode: false });
                            editor.object.editor.updateOptions({ wordWrap: 'on' });
                        }
                        catch {
                            // ignored
                        }
                        seeMore.root.remove();
                    }));
                    elements.editor.append(seeMore.root);
                }
            }
            this._makeMarkdownPart(elements.message, message, codeBlockRenderOptions);
            elements.showMore.textContent = localize('seeMore', "See more");
            const messageSeeMoreObserver = this._register(new ElementSizeObserver(elements.message, undefined));
            const updateSeeMoreDisplayed = () => {
                const show = messageSeeMoreObserver.getHeight() > SHOW_MORE_MESSAGE_HEIGHT_TRIGGER;
                if (elements.messageContainer.classList.contains('can-see-more') !== show) {
                    elements.messageContainer.classList.toggle('can-see-more', show);
                    this._onDidChangeHeight.fire();
                }
            };
            this._register(dom.addDisposableListener(elements.showMore, 'click', () => {
                elements.messageContainer.classList.toggle('can-see-more', false);
                this._onDidChangeHeight.fire();
                messageSeeMoreObserver.dispose();
            }));
            this._register(messageSeeMoreObserver.onDidChange(updateSeeMoreDisplayed));
            messageSeeMoreObserver.startObserving();
            if (disclaimer) {
                this._makeMarkdownPart(elements.disclaimer, disclaimer, codeBlockRenderOptions);
            }
            else {
                elements.disclaimer.remove();
            }
            confirmWidget = this._register(this.instantiationService.createInstance(ChatCustomConfirmationWidget, title, toolInvocation.originMessage, elements.root, buttons, this.context.container));
        }
        const hasToolConfirmation = ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService);
        hasToolConfirmation.set(true);
        this._register(confirmWidget.onDidClick(button => {
            switch (button.data) {
                case 3 /* ConfirmationOutcome.AllowGlobally */:
                    this.languageModelToolsService.setToolAutoConfirmation(toolInvocation.toolId, 'profile', true);
                    toolInvocation.confirmed.complete(true);
                    break;
                case 2 /* ConfirmationOutcome.AllowWorkspace */:
                    this.languageModelToolsService.setToolAutoConfirmation(toolInvocation.toolId, 'workspace', true);
                    toolInvocation.confirmed.complete(true);
                    break;
                case 4 /* ConfirmationOutcome.AllowSession */:
                    this.languageModelToolsService.setToolAutoConfirmation(toolInvocation.toolId, 'memory', true);
                    toolInvocation.confirmed.complete(true);
                    break;
                case 0 /* ConfirmationOutcome.Allow */:
                    toolInvocation.confirmed.complete(true);
                    break;
                case 1 /* ConfirmationOutcome.Disallow */:
                    toolInvocation.confirmed.complete(false);
                    break;
            }
            this.chatWidgetService.getWidgetBySessionId(this.context.element.sessionId)?.focusInput();
        }));
        this._register(confirmWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this._register(toDisposable(() => hasToolConfirmation.reset()));
        toolInvocation.confirmed.p.then(() => {
            hasToolConfirmation.reset();
            this._onNeedsRerender.fire();
        });
        this.domNode = confirmWidget.domNode;
    }
    _makeMarkdownPart(container, message, codeBlockRenderOptions) {
        const part = this._register(this.instantiationService.createInstance(ChatMarkdownContentPart, { kind: 'markdownContent', content: typeof message === 'string' ? new MarkdownString().appendText(message) : message }, this.context, this.editorPool, false, this.codeBlockStartIndex, this.renderer, this.currentWidthDelegate(), this.codeBlockModelCollection, { codeBlockRenderOptions }));
        renderFileWidgets(part.domNode, this.instantiationService, this.chatMarkdownAnchorService, this._store);
        container.append(part.domNode);
        this._register(part.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
    }
};
ToolConfirmationSubPart = __decorate([
    __param(7, IInstantiationService),
    __param(8, IKeybindingService),
    __param(9, IModelService),
    __param(10, ILanguageService),
    __param(11, IContextKeyService),
    __param(12, IChatWidgetService),
    __param(13, ICommandService),
    __param(14, IMarkerService),
    __param(15, ILanguageModelToolsService),
    __param(16, IChatMarkdownAnchorService)
], ToolConfirmationSubPart);
export { ToolConfirmationSubPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xDb25maXJtYXRpb25TdWJQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy90b29sSW52b2NhdGlvblBhcnRzL2NoYXRUb29sQ29uZmlybWF0aW9uU3ViUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFDO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzFFLE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBRXJHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hHLE9BQU8sRUFBZSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbkgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBR3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ25JLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xGLE9BQU8sRUFBc0Isa0JBQWtCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFcEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLDRCQUE0QixFQUEyQixNQUFNLDhCQUE4QixDQUFDO0FBRTdILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx1QkFBdUIsRUFBYyxNQUFNLCtCQUErQixDQUFDO0FBQ3BGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRS9FLE1BQU0sZ0NBQWdDLEdBQUcsRUFBRSxDQUFDO0FBRXJDLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsNkJBQTZCO0lBSXpFLElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRCxZQUNDLGNBQW1DLEVBQ2xCLE9BQXNDLEVBQ3RDLFFBQTBCLEVBQzFCLFVBQXNCLEVBQ3RCLG9CQUFrQyxFQUNsQyx3QkFBa0QsRUFDbEQsbUJBQTJCLEVBQ3JCLG9CQUE0RCxFQUMvRCxpQkFBcUMsRUFDMUMsWUFBNEMsRUFDekMsZUFBa0QsRUFDaEQsaUJBQXNELEVBQ3RELGlCQUFzRCxFQUN6RCxjQUFnRCxFQUNqRCxhQUE4QyxFQUNsQyx5QkFBc0UsRUFDdEUseUJBQXNFO1FBRWxHLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztRQWpCTCxZQUFPLEdBQVAsT0FBTyxDQUErQjtRQUN0QyxhQUFRLEdBQVIsUUFBUSxDQUFrQjtRQUMxQixlQUFVLEdBQVYsVUFBVSxDQUFZO1FBQ3RCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBYztRQUNsQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQ2xELHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUTtRQUNKLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFbkQsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDeEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQy9CLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUN4QyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDaEMsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQ2pCLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBNEI7UUFDckQsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUE0QjtRQXRCM0Ysa0JBQWEsR0FBOEIsRUFBRSxDQUFDO1FBMEJyRCxJQUFJLENBQUMsY0FBYyxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFDRCxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsR0FBRyxjQUFjLENBQUMsb0JBQW9CLENBQUM7UUFDN0YsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUN2RCxNQUFNLGtCQUFrQixHQUFHLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLDhCQUE4QixDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUM7UUFDMUcsTUFBTSxlQUFlLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEdBQUcsYUFBYSxLQUFLLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztRQUN4RyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQztRQUM1RixNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLEtBQUssZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO1FBRTlGLElBQVcsbUJBTVY7UUFORCxXQUFXLG1CQUFtQjtZQUM3QiwrREFBSyxDQUFBO1lBQ0wscUVBQVEsQ0FBQTtZQUNSLGlGQUFjLENBQUE7WUFDZCwrRUFBYSxDQUFBO1lBQ2IsNkVBQVksQ0FBQTtRQUNiLENBQUMsRUFOVSxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBTTdCO1FBRUQsTUFBTSxPQUFPLEdBQThCO1lBQzFDO2dCQUNDLEtBQUssRUFBRSxhQUFhO2dCQUNwQixJQUFJLG1DQUEyQjtnQkFDL0IsT0FBTyxFQUFFLGVBQWU7Z0JBQ3hCLFdBQVcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUM1QyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLHVCQUF1QixDQUFDLEVBQUUsSUFBSSwwQ0FBa0MsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLDhEQUE4RCxDQUFDLEVBQUU7b0JBQy9NLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSx5QkFBeUIsQ0FBQyxFQUFFLElBQUksNENBQW9DLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxnRUFBZ0UsQ0FBQyxFQUFFO29CQUN4TixFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLGNBQWMsQ0FBQyxFQUFFLElBQUksMkNBQW1DLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxxREFBcUQsQ0FBQyxFQUFFO2lCQUM5TDthQUNEO1lBQ0Q7Z0JBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO2dCQUNuQyxJQUFJLHNDQUE4QjtnQkFDbEMsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLE9BQU8sRUFBRSxhQUFhO2FBQ3RCO1NBQUMsQ0FBQztRQUNKLElBQUksYUFBb0UsQ0FBQztRQUN6RSxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2pDLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3RFLHNCQUFzQixFQUN0QixLQUFLLEVBQ0wsY0FBYyxDQUFDLGFBQWEsRUFDNUIsT0FBTyxFQUNQLE9BQU8sRUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FDdEIsQ0FBQyxDQUFDO1FBQ0osQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLHNCQUFzQixHQUE0QjtnQkFDdkQsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLFlBQVksRUFBRSxFQUFFO2dCQUNoQixlQUFlLEVBQUUsQ0FBQztnQkFDbEIsYUFBYSxFQUFFO29CQUNkLFlBQVksRUFBRSxJQUFJO29CQUNsQixTQUFTLEVBQUUsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLO2lCQUMxRDthQUNELENBQUM7WUFFRixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRTtnQkFDN0IsR0FBRyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsRUFBRTtvQkFDbEMsR0FBRyxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQztvQkFDakMsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztpQkFDNUIsQ0FBQztnQkFDRixHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDO2dCQUN2QixHQUFHLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDO2FBQy9CLENBQUMsQ0FBQztZQUVILElBQUksY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksS0FBSyxPQUFPLElBQUksY0FBYyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFFL0osTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDM0MsS0FBSyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNwRCxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFFbkMsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDO2dCQUVsRCxNQUFNLHNCQUFzQixHQUE0QjtvQkFDdkQsV0FBVyxFQUFFLElBQUk7b0JBQ2pCLFlBQVksRUFBRSxFQUFFO29CQUNoQixnQkFBZ0IsRUFBRSxFQUFFO29CQUNwQixlQUFlLEVBQUUsQ0FBQztvQkFDbEIsYUFBYSxFQUFFO3dCQUNkLFFBQVEsRUFBRSxLQUFLO3dCQUNmLFFBQVEsRUFBRSxLQUFLO3dCQUNmLFNBQVMsRUFBRSxPQUFPLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEtBQUs7cUJBQ3RLO2lCQUNELENBQUM7Z0JBRUYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDeEUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsUUFBUSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZFLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsNkJBQTZCO2dCQUMvRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVztnQkFDekQsMkRBQTJEO2dCQUMzRCxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFDbEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQ3ZDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFDekMsSUFBSSxDQUNKLENBQUMsQ0FBQztnQkFFSCxNQUFNLFdBQVcsR0FBRyxZQUFZLEVBQUUsQ0FBQztnQkFDbkMsTUFBTSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM3RCxNQUFNLFNBQVMsR0FBRyxJQUFJLGdCQUFnQixDQUFDLEtBQUssSUFBSSxFQUFFO29CQUVqRCxNQUFNLFNBQVMsR0FBa0IsRUFBRSxDQUFDO29CQUVwQyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7b0JBQ3RHLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxFQUFFLENBQUM7d0JBQzNCLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7NEJBQ2hDLFNBQVMsQ0FBQyxJQUFJLENBQUM7Z0NBQ2QsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTztnQ0FDbkYsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dDQUNyQixlQUFlLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQztnQ0FDdkMsV0FBVyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUM7Z0NBQ3hDLGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDO2dDQUNyQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQztnQ0FDdEMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7NkJBQy9DLENBQUMsQ0FBQzt3QkFDSixDQUFDO29CQUNGLENBQUM7b0JBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ2pFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFFUixTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFFMUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ3JELE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO29CQUNwQixjQUFjLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtvQkFDeEMsa0JBQWtCLEVBQUUsQ0FBQztvQkFDckIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTztvQkFDN0IsVUFBVSxFQUFFLE1BQU0sSUFBSSxNQUFNO29CQUM1QixhQUFhLEVBQUUsc0JBQXNCO29CQUNyQyxTQUFTLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7b0JBQ2pDLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTO2lCQUM3QyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO29CQUNwQixjQUFjLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtvQkFDeEMsYUFBYSxFQUFFLFNBQVM7b0JBQ3hCLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNsQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUU7b0JBQ2xDLFdBQVcsRUFBRSxLQUFLO29CQUNsQixtQkFBbUIsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO29CQUMxQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7b0JBQ2QsVUFBVSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztvQkFDdEMsYUFBYSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVM7aUJBQzdDLENBQUMsQ0FBQztnQkFDSCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFO29CQUMxRCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO29CQUNsRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQzNDLElBQUksQ0FBQzt3QkFDSixTQUFTLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7b0JBQ25ELENBQUM7b0JBQUMsTUFBTSxDQUFDO3dCQUNSLFNBQVM7b0JBQ1YsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUVKLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBRTlDLElBQUksVUFBVSxFQUFFLENBQUM7b0JBQ2hCLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3pELE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7b0JBQzNELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFDQUFxQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFO3dCQUMzRSxJQUFJLENBQUM7NEJBQ0osTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQzs0QkFDNUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDaEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7NEJBQzVELE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO3dCQUN4RCxDQUFDO3dCQUFDLE1BQU0sQ0FBQzs0QkFDUixVQUFVO3dCQUNYLENBQUM7d0JBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDSixRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3RDLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLHNCQUFzQixDQUFDLENBQUM7WUFDMUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUVoRSxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDcEcsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLEVBQUU7Z0JBQ25DLE1BQU0sSUFBSSxHQUFHLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxHQUFHLGdDQUFnQyxDQUFDO2dCQUNuRixJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUMzRSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ2pFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDaEMsQ0FBQztZQUNGLENBQUMsQ0FBQztZQUVGLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDekUsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQy9CLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFHSixJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7WUFDM0Usc0JBQXNCLENBQUMsY0FBYyxFQUFFLENBQUM7WUFFeEMsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLHNCQUFzQixDQUFDLENBQUM7WUFDakYsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDOUIsQ0FBQztZQUVELGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3RFLDRCQUE0QixFQUM1QixLQUFLLEVBQ0wsY0FBYyxDQUFDLGFBQWEsRUFDNUIsUUFBUSxDQUFDLElBQUksRUFDYixPQUFPLEVBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQ3RCLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3ZHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU5QixJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDaEQsUUFBUSxNQUFNLENBQUMsSUFBMkIsRUFBRSxDQUFDO2dCQUM1QztvQkFDQyxJQUFJLENBQUMseUJBQXlCLENBQUMsdUJBQXVCLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQy9GLGNBQWMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN4QyxNQUFNO2dCQUNQO29CQUNDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDakcsY0FBYyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3hDLE1BQU07Z0JBQ1A7b0JBQ0MsSUFBSSxDQUFDLHlCQUF5QixDQUFDLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUM5RixjQUFjLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDeEMsTUFBTTtnQkFDUDtvQkFDQyxjQUFjLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDeEMsTUFBTTtnQkFDUDtvQkFDQyxjQUFjLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDekMsTUFBTTtZQUNSLENBQUM7WUFFRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUM7UUFDM0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDcEMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDO0lBQ3RDLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxTQUFzQixFQUFFLE9BQWlDLEVBQUUsc0JBQStDO1FBQ25JLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsT0FBTyxPQUFPLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5WCxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hHLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRS9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUUsQ0FBQztDQUNELENBQUE7QUFqU1ksdUJBQXVCO0lBZ0JqQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxhQUFhLENBQUE7SUFDYixZQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFlBQUEsa0JBQWtCLENBQUE7SUFDbEIsWUFBQSxrQkFBa0IsQ0FBQTtJQUNsQixZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSwwQkFBMEIsQ0FBQTtJQUMxQixZQUFBLDBCQUEwQixDQUFBO0dBekJoQix1QkFBdUIsQ0FpU25DIn0=