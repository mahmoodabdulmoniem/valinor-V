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
import { Emitter } from '../../../../../base/common/event.js';
import { isMarkdownString, MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ChatConfirmationWidget } from './chatConfirmationWidget.js';
let ChatElicitationContentPart = class ChatElicitationContentPart extends Disposable {
    constructor(elicitation, context, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        const buttons = [
            { label: localize('accept', "Respond"), data: true },
            { label: localize('dismiss', "Cancel"), data: false, isSecondary: true },
        ];
        const confirmationWidget = this._register(this.instantiationService.createInstance(ChatConfirmationWidget, elicitation.title, elicitation.originMessage, this.getMessageToRender(elicitation), buttons, context.container));
        confirmationWidget.setShowButtons(elicitation.state === 'pending');
        this._register(confirmationWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this._register(confirmationWidget.onDidClick(async (e) => {
            if (e.data) {
                await elicitation.accept();
            }
            else {
                await elicitation.reject();
            }
            confirmationWidget.setShowButtons(false);
            confirmationWidget.updateMessage(this.getMessageToRender(elicitation));
            this._onDidChangeHeight.fire();
        }));
        this.domNode = confirmationWidget.domNode;
    }
    getMessageToRender(elicitation) {
        if (!elicitation.acceptedResult) {
            return elicitation.message;
        }
        const messageMd = isMarkdownString(elicitation.message) ? MarkdownString.lift(elicitation.message) : new MarkdownString(elicitation.message);
        messageMd.appendCodeblock('json', JSON.stringify(elicitation.acceptedResult, null, 2));
        return messageMd;
    }
    hasSameContent(other) {
        // No other change allowed for this content type
        return other.kind === 'elicitation';
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatElicitationContentPart = __decorate([
    __param(2, IInstantiationService)
], ChatElicitationContentPart);
export { ChatElicitationContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVsaWNpdGF0aW9uQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRFbGljaXRhdGlvbkNvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQW1CLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzlHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFHdEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFHOUQsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO0lBTXpELFlBQ0MsV0FBb0MsRUFDcEMsT0FBc0MsRUFDZixvQkFBNEQ7UUFFbkYsS0FBSyxFQUFFLENBQUM7UUFGZ0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQU5uRSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUMxRCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBU2pFLE1BQU0sT0FBTyxHQUFHO1lBQ2YsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO1lBQ3BE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