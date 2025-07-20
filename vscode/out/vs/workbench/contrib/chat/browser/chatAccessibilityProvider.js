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
import { marked } from '../../../../base/common/marked/marked.js';
import { localize } from '../../../../nls.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { isRequestVM, isResponseVM } from '../common/chatViewModel.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { AcceptToolConfirmationActionId } from './actions/chatToolActions.js';
import { CancelChatActionId } from './actions/chatExecuteActions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
export const getToolConfirmationAlert = (accessor, toolInvocation) => {
    const keybindingService = accessor.get(IKeybindingService);
    const contextKeyService = accessor.get(IContextKeyService);
    const acceptKb = keybindingService.lookupKeybinding(AcceptToolConfirmationActionId, contextKeyService)?.getAriaLabel();
    const cancelKb = keybindingService.lookupKeybinding(CancelChatActionId, contextKeyService)?.getAriaLabel();
    const titles = toolInvocation.filter(t => t.confirmationMessages?.title).map(v => {
        let input = '';
        if (v.toolSpecificData) {
            if (v.toolSpecificData.kind === 'terminal') {
                input = v.toolSpecificData.command;
            }
            else if (v.toolSpecificData.kind === 'terminal2') {
                input = v.toolSpecificData.commandLine.toolEdited ?? v.toolSpecificData.commandLine.original;
            }
            else if (v.toolSpecificData.kind === 'extensions') {
                input = JSON.stringify(v.toolSpecificData.extensions);
            }
            else if (v.toolSpecificData.kind === 'input') {
                input = JSON.stringify(v.toolSpecificData.rawInput);
            }
        }
        const titleObj = v.confirmationMessages?.title;
        const title = typeof titleObj === 'string' ? titleObj : titleObj?.value || '';
        return (title + (input ? ': ' + input : '')).trim();
    }).filter(v => !!v);
    return acceptKb && cancelKb
        ? localize('toolInvocationsHintKb', "Chat confirmation required: {0}. Press {1} to accept or {2} to cancel.", titles.join(', '), acceptKb, cancelKb)
        : localize('toolInvocationsHint', "Chat confirmation required: {0}", titles.join(', '));
};
let ChatAccessibilityProvider = class ChatAccessibilityProvider {
    constructor(_accessibleViewService, _instantiationService) {
        this._accessibleViewService = _accessibleViewService;
        this._instantiationService = _instantiationService;
    }
    getWidgetRole() {
        return 'list';
    }
    getRole(element) {
        return 'listitem';
    }
    getWidgetAriaLabel() {
        return localize('chat', "Chat");
    }
    getAriaLabel(element) {
        if (isRequestVM(element)) {
            return element.messageText;
        }
        if (isResponseVM(element)) {
            return this._getLabelWithInfo(element);
        }
        return '';
    }
    _getLabelWithInfo(element) {
        const accessibleViewHint = this._accessibleViewService.getOpenAriaHint("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */);
        let label = '';
        const toolInvocation = element.response.value.filter(v => v.kind === 'toolInvocation');
        let toolInvocationHint = '';
        if (toolInvocation.length) {
            const waitingForConfirmation = toolInvocation.filter(v => !v.isComplete);
            if (waitingForConfirmation.length) {
                toolInvocationHint = this._instantiationService.invokeFunction(getToolConfirmationAlert, toolInvocation);
            }
            else { // all completed
                for (const invocation of toolInvocation) {
                    const titleObj = invocation.confirmationMessages?.title;
                    let title = '';
                    if (typeof titleObj === 'string' && titleObj.trim()) {
                        title = titleObj;
                    }
                    else if (titleObj && typeof titleObj === 'object' && 'value' in titleObj && titleObj.value && titleObj.value.trim()) {
                        title = titleObj.value;
                    }
                    else {
                        // Fallback to toolId if no valid title
                        title = invocation.toolId;
                    }
                    toolInvocationHint += localize('toolCompletedHint', "Tool {0} completed.", title);
                }
            }
        }
        const tableCount = marked.lexer(element.response.toString()).filter(token => token.type === 'table')?.length ?? 0;
        let tableCountHint = '';
        switch (tableCount) {
            case 0:
                break;
            case 1:
                tableCountHint = localize('singleTableHint', "1 table ");
                break;
            default:
                tableCountHint = localize('multiTableHint', "{0} tables ", tableCount);
                break;
        }
        const fileTreeCount = element.response.value.filter(v => v.kind === 'treeData').length ?? 0;
        let fileTreeCountHint = '';
        switch (fileTreeCount) {
            case 0:
                break;
            case 1:
                fileTreeCountHint = localize('singleFileTreeHint', "1 file tree ");
                break;
            default:
                fileTreeCountHint = localize('multiFileTreeHint', "{0} file trees ", fileTreeCount);
                break;
        }
        const codeBlockCount = marked.lexer(element.response.toString()).filter(token => token.type === 'code')?.length ?? 0;
        switch (codeBlockCount) {
            case 0:
                label = accessibleViewHint ? localize('noCodeBlocksHint', "{0}{1}{2}{3} {4}", toolInvocationHint, fileTreeCountHint, tableCountHint, element.response.toString(), accessibleViewHint) : localize('noCodeBlocks', "{0} {1}", fileTreeCountHint, element.response.toString());
                break;
            case 1:
                label = accessibleViewHint ? localize('singleCodeBlockHint', "{0}{1}1 code block: {2} {3}{4}", toolInvocationHint, fileTreeCountHint, tableCountHint, element.response.toString(), accessibleViewHint) : localize('singleCodeBlock', "{0} 1 code block: {1}", fileTreeCountHint, element.response.toString());
                break;
            default:
                label = accessibleViewHint ? localize('multiCodeBlockHint', "{0}{1}{2} code blocks: {3}{4}", toolInvocationHint, fileTreeCountHint, tableCountHint, codeBlockCount, element.response.toString(), accessibleViewHint) : localize('multiCodeBlock', "{0} {1} code blocks", fileTreeCountHint, codeBlockCount, element.response.toString());
                break;
        }
        return label;
    }
};
ChatAccessibilityProvider = __decorate([
    __param(0, IAccessibleViewService),
    __param(1, IInstantiationService)
], ChatAccessibilityProvider);
export { ChatAccessibilityProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjY2Vzc2liaWxpdHlQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRBY2Nlc3NpYmlsaXR5UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUV0RyxPQUFPLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBMEIsTUFBTSw0QkFBNEIsQ0FBQztBQUMvRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFHckgsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsQ0FBQyxRQUEwQixFQUFFLGNBQXFDLEVBQUUsRUFBRTtJQUM3RyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMzRCxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUUzRCxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyw4QkFBOEIs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