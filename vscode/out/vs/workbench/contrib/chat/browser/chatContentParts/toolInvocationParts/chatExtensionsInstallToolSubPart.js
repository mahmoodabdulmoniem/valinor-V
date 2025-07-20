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
import { Emitter } from '../../../../../../base/common/event.js';
import { localize } from '../../../../../../nls.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IExtensionManagementService } from '../../../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { CancelChatActionId } from '../../actions/chatExecuteActions.js';
import { AcceptToolConfirmationActionId } from '../../actions/chatToolActions.js';
import { IChatWidgetService } from '../../chat.js';
import { ChatConfirmationWidget } from '../chatConfirmationWidget.js';
import { ChatExtensionsContentPart } from '../chatExtensionsContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let ExtensionsInstallConfirmationWidgetSubPart = class ExtensionsInstallConfirmationWidgetSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, context, keybindingService, contextKeyService, chatWidgetService, extensionManagementService, instantiationService) {
        super(toolInvocation);
        this.codeblocks = [];
        if (toolInvocation.toolSpecificData?.kind !== 'extensions') {
            throw new Error('Tool specific data is missing or not of kind extensions');
        }
        const extensionsContent = toolInvocation.toolSpecificData;
        this.domNode = dom.$('');
        const chatExtensionsContentPart = this._register(instantiationService.createInstance(ChatExtensionsContentPart, extensionsContent));
        this._register(chatExtensionsContentPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        dom.append(this.domNode, chatExtensionsContentPart.domNode);
        if (toolInvocation.isConfirmed === undefined) {
            const continueLabel = localize('continue', "Continue");
            const continueKeybinding = keybindingService.lookupKeybinding(AcceptToolConfirmationActionId)?.getLabel();
            const continueTooltip = continueKeybinding ? `${continueLabel} (${continueKeybinding})` : continueLabel;
            const cancelLabel = localize('cancel', "Cancel");
            const cancelKeybinding = keybindingService.lookupKeybinding(CancelChatActionId)?.getLabel();
            const cancelTooltip = cancelKeybinding ? `${cancelLabel} (${cancelKeybinding})` : cancelLabel;
            const enableContinueButtonEvent = this._register(new Emitter());
            const buttons = [
                {
                    label: continueLabel,
                    data: true,
                    tooltip: continueTooltip,
                    disabled: true,
                    onDidChangeDisablement: enableContinueButtonEvent.event
                },
                {
                    label: cancelLabel,
                    data: false,
                    isSecondary: true,
                    tooltip: cancelTooltip
                }
            ];
            const confirmWidget = this._register(instantiationService.createInstance(ChatConfirmationWidget, toolInvocation.confirmationMessages?.title ?? localize('installExtensions', "Install Extensions"), undefined, toolInvocation.confirmationMessages?.message ?? localize('installExtensionsConfirmation', "Click the Install button on the extension and then press Continue when finished."), buttons, context.container));
            this._register(confirmWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            dom.append(this.domNode, confirmWidget.domNode);
            this._register(confirmWidget.onDidClick(button => {
                toolInvocation.confirmed.complete(button.data);
                chatWidgetService.getWidgetBySessionId(context.element.sessionId)?.focusInput();
            }));
            toolInvocation.confirmed.p.then(() => {
                ChatContextKeys.Editing.hasToolConfirmation.bindTo(contextKeyService).set(false);
                this._onNeedsRerender.fire();
            });
            const disposable = this._register(extensionManagementService.onInstallExtension(e => {
                if (extensionsContent.extensions.some(id => areSameExtensions({ id }, e.identifier))) {
                    disposable.dispose();
                    enableContinueButtonEvent.fire(false);
                }
            }));
        }
    }
};
ExtensionsInstallConfirmationWidgetSubPart = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextKeyService),
    __param(4, IChatWidgetService),
    __param(5, IExtensionManagementService),
    __param(6, IInstantiationService)
], ExtensionsInstallConfirmationWidgetSubPart);
export { ExtensionsInstallConfirmationWidgetSubPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEV4dGVuc2lvbnNJbnN0YWxsVG9vbFN1YlBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL3Rvb2xJbnZvY2F0aW9uUGFydHMvY2hhdEV4dGVuc2lvbnNJbnN0YWxsVG9vbFN1YlBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDhFQUE4RSxDQUFDO0FBQzNILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQ3JILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRixPQUFPLEVBQXNCLGtCQUFrQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxzQkFBc0IsRUFBMkIsTUFBTSw4QkFBOEIsQ0FBQztBQUUvRixPQUFPLEVBQUUseUJBQXlCLEVB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