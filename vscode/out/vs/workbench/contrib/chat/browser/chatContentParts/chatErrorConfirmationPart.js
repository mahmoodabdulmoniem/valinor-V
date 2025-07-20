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
import * as dom from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IChatService } from '../../common/chatService.js';
import { assertIsResponseVM } from '../../common/chatViewModel.js';
import { IChatWidgetService } from '../chat.js';
import { ChatErrorWidget } from './chatErrorContentPart.js';
const $ = dom.$;
let ChatErrorConfirmationContentPart = class ChatErrorConfirmationContentPart extends Disposable {
    constructor(kind, content, errorDetails, confirmationButtons, renderer, context, instantiationService, chatWidgetService, chatService) {
        super();
        this.errorDetails = errorDetails;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        const element = context.element;
        assertIsResponseVM(element);
        this.domNode = $('.chat-error-confirmation');
        this.domNode.append(this._register(new ChatErrorWidget(kind, content, renderer)).domNode);
        const buttonOptions = { ...defaultButtonStyles };
        const buttonContainer = dom.append(this.domNode, $('.chat-buttons-container'));
        confirmationButtons.forEach(buttonData => {
            const button = this._register(new Button(buttonContainer, buttonOptions));
            button.label = buttonData.label;
            this._register(button.onDidClick(async () => {
                const prompt = buttonData.label;
                const options = buttonData.isSecondary ?
                    { rejectedConfirmationData: [buttonData.data] } :
                    { acceptedConfirmationData: [buttonData.data] };
                options.agentId = element.agent?.id;
                options.slashCommand = element.slashCommand?.name;
                options.confirmation = buttonData.label;
                const widget = chatWidgetService.getWidgetBySessionId(element.sessionId);
                options.userSelectedModelId = widget?.input.currentLanguageModel;
                Object.assign(options, widget?.getModeRequestOptions());
                if (await chatService.sendRequest(element.sessionId, prompt, options)) {
                    this._onDidChangeHeight.fire();
                }
            }));
        });
    }
    hasSameContent(other) {
        return other.kind === this.errorDetails.kind && other.isLast === this.errorDetails.isLast;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatErrorConfirmationContentPart = __decorate([
    __param(6, IInstantiationService),
    __param(7, IChatWidgetService),
    __param(8, IChatService)
], ChatErrorConfirmationContentPart);
export { ChatErrorConfirmationContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVycm9yQ29uZmlybWF0aW9uUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdEVycm9yQ29uZmlybWF0aW9uUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxNQUFNLEVBQWtCLE1BQU0saURBQWlELENBQUM7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQXdGLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2pKLE9BQU8sRUFBRSxrQkFBa0IsRUFBK0MsTUFBTSwrQkFBK0IsQ0FBQztBQUNoSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFaEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRTVELE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFVCxJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFpQyxTQUFRLFVBQVU7SUFNL0QsWUFDQyxJQUFvQixFQUNwQixPQUF3QixFQUNQLFlBQW1DLEVBQ3BELG1CQUFrRSxFQUNsRSxRQUEwQixFQUMxQixPQUFzQyxFQUNmLG9CQUEyQyxFQUM5QyxpQkFBcUMsRUFDM0MsV0FB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