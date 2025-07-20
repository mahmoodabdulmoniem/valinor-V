/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../../base/browser/dom.js';
import { localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { CHAT_CATEGORY, stringifyItem } from './chatActions.js';
import { IChatWidgetService } from '../chat.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { isChatTreeItem, isRequestVM, isResponseVM } from '../../common/chatViewModel.js';
export function registerChatCopyActions() {
    registerAction2(class CopyAllAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.copyAll',
                title: localize2('interactive.copyAll.label', "Copy All"),
                f1: false,
                category: CHAT_CATEGORY,
                menu: {
                    id: MenuId.ChatContext,
                    when: ChatContextKeys.responseIsFiltered.negate(),
                    group: 'copy',
                }
            });
        }
        run(accessor, ...args) {
            const clipboardService = accessor.get(IClipboardService);
            const chatWidgetService = accessor.get(IChatWidgetService);
            const widget = chatWidgetService.lastFocusedWidget;
            if (widget) {
                const viewModel = widget.viewModel;
                const sessionAsText = viewModel?.getItems()
                    .filter((item) => isRequestVM(item) || (isResponseVM(item) && !item.errorDetails?.responseIsFiltered))
                    .map(item => stringifyItem(item))
                    .join('\n\n');
                if (sessionAsText) {
                    clipboardService.writeText(sessionAsText);
                }
            }
        }
    });
    registerAction2(class CopyItemAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.copyItem',
                title: localize2('interactive.copyItem.label', "Copy"),
                f1: false,
                category: CHAT_CATEGORY,
                menu: {
                    id: MenuId.ChatContext,
                    when: ChatContextKeys.responseIsFiltered.negate(),
                    group: 'copy',
                }
            });
        }
        async run(accessor, ...args) {
            const chatWidgetService = accessor.get(IChatWidgetService);
            const clipboardService = accessor.get(IClipboardService);
            const widget = chatWidgetService.lastFocusedWidget;
            let item = args[0];
            if (!isChatTreeItem(item)) {
                item = widget?.getFocus();
                if (!item) {
                    return;
                }
            }
            // If there is a text selection, and focus is inside the widget, copy the selected text.
            // Otherwise, context menu with no selection -> copy the full item
            const nativeSelection = dom.getActiveWindow().getSelection();
            const selectedText = nativeSelection?.toString();
            if (widget && selectedText && selectedText.length > 0 && dom.isAncestor(dom.getActiveElement(), widget.domNode)) {
                await clipboardService.writeText(selectedText);
                return;
            }
            const text = stringifyItem(item, false);
            await clipboardService.writeText(text);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvcHlBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0Q29weUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUUxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDakcsT0FBTyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNoRSxPQUFPLEVBQWdCLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNsRSxPQUFPLEVBQWlELGNBQWMsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFekksTUFBTSxVQUFVLHVCQUF1QjtJQUN0QyxlQUFlLENBQUMsTUFBTSxhQUFjLFNBQVEsT0FBTztRQUNsRDtZQUNDLEtBQUssQ0FBQztnQkFDTCxFQUFFLEVBQUUsK0JBQStCO2dCQUNuQyxLQUFLLEVBQUUsU0FBUyxDQUFDLDJCQUEyQixFQUFFLFVBQVUsQ0FBQztnQkFDekQsRUFBRSxFQUFFLEtBQUs7Z0JBQ1QsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLElBQUksRUFBRTtvQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLFdBQVc7b0JBQ3RCLElBQUksRUFBRSxlQUFlLENBQUMsa0JBQWtC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