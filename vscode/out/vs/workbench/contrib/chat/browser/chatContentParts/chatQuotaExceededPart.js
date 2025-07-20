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
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { asCssVariable, textLinkForeground } from '../../../../../platform/theme/common/colorRegistry.js';
import { ChatEntitlement, IChatEntitlementService } from '../../common/chatEntitlementService.js';
import { IChatWidgetService } from '../chat.js';
const $ = dom.$;
/**
 * Once the sign up button is clicked, and the retry button has been shown, it should be shown every time.
 */
let shouldShowRetryButton = false;
/**
 * Once the 'retry' button is clicked, the wait warning should be shown every time.
 */
let shouldShowWaitWarning = false;
let ChatQuotaExceededPart = class ChatQuotaExceededPart extends Disposable {
    constructor(element, content, renderer, chatWidgetService, commandService, telemetryService, chatEntitlementService) {
        super();
        this.content = content;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        const errorDetails = element.errorDetails;
        assertType(!!errorDetails, 'errorDetails');
        this.domNode = $('.chat-quota-error-widget');
        const icon = dom.append(this.domNode, $('span'));
        icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.warning));
        const messageContainer = dom.append(this.domNode, $('.chat-quota-error-message'));
        const markdownContent = renderer.render(new MarkdownString(errorDetails.message));
        dom.append(messageContainer, markdownContent.element);
        let button1Label = '';
        switch (chatEntitlementService.entitlement) {
            case ChatEntitlement.Pro:
            case ChatEntitlement.ProPlus:
                button1Label = localize('enableAdditionalUsage', "Manage paid premium requests");
                break;
            case ChatEntitlement.Free:
                button1Label = localize('upgradeToCopilotPro', "Upgrade to Copilot Pro");
                break;
            default:
                button1Label = '';
        }
        let hasAddedWaitWarning = false;
        const addWaitWarningIfNeeded = () => {
            if (!shouldShowWaitWarning || hasAddedWaitWarning) {
                return;
            }
            hasAddedWaitWarning = true;
            dom.append(messageContainer, $('.chat-quota-wait-warning', undefined, localize('waitWarning', "Changes may take a few minutes to take effect.")));
        };
        let hasAddedRetryButton = false;
        const addRetryButtonIfNeeded = () => {
            if (!shouldShowRetryButton || hasAddedRetryButton) {
                return;
            }
            hasAddedRetryButton = true;
            const button2 = this._register(new Button(messageContainer, {
                buttonBackground: undefined,
                buttonForeground: asCssVariable(textLinkForeground)
            }));
            button2.element.classList.add('chat-quota-error-secondary-button');
            button2.label = localize('clickToContinue', "Click to retry.");
            this._onDidChangeHeight.fire();
            this._register(button2.onDidClick(() => {
                const widget = chatWidgetService.getWidgetBySessionId(element.sessionId);
                if (!widget) {
                    return;
                }
                widget.rerunLastRequest();
                shouldShowWaitWarning = true;
                addWaitWarningIfNeeded();
            }));
        };
        if (button1Label) {
            const button1 = this._register(new Button(messageContainer, { ...defaultButtonStyles, supportIcons: true }));
            button1.label = button1Label;
            button1.element.classList.add('chat-quota-error-button');
            this._register(button1.onDidClick(async () => {
                const commandId = chatEntitlementService.entitlement === ChatEntitlement.Free ? 'workbench.action.chat.upgradePlan' : 'workbench.action.chat.manageOverages';
                telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'chat-response' });
                await commandService.executeCommand(commandId);
                shouldShowRetryButton = true;
                addRetryButtonIfNeeded();
            }));
        }
        addRetryButtonIfNeeded();
        addWaitWarningIfNeeded();
    }
    hasSameContent(other) {
        return other.kind === this.content.kind && !!other.errorDetails.isQuotaExceeded;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatQuotaExceededPart = __decorate([
    __param(3, IChatWidgetService),
    __param(4, ICommandService),
    __param(5, ITelemetryService),
    __param(6, IChatEntitlementService)
], ChatQuotaExceededPart);
export { ChatQuotaExceededPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFF1b3RhRXhjZWVkZWRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0UXVvdGFFeGNlZWRlZFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFFekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUcsT0FBTyxFQUFFLGVBQWUsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWxHLE9BQU8sRUFB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