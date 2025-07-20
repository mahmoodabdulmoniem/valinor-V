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
import { ToolSet } from '../common/languageModelToolsService.js';
import { IChatWidgetService } from './chat.js';
import { ChatDynamicVariableModel } from './contrib/chatDynamicVariables.js';
let ChatVariablesService = class ChatVariablesService {
    constructor(chatWidgetService) {
        this.chatWidgetService = chatWidgetService;
    }
    getDynamicVariables(sessionId) {
        // This is slightly wrong... the parser pulls dynamic references from the input widget, but there is no guarantee that message came from the input here.
        // Need to ...
        // - Parser takes list of dynamic references (annoying)
        // - Or the parser is known to implicitly act on the input widget, and we need to call it before calling the chat service (maybe incompatible with the future, but easy)
        const widget = this.chatWidgetService.getWidgetBySessionId(sessionId);
        if (!widget || !widget.viewModel || !widget.supportsFileReferences) {
            return [];
        }
        const model = widget.getContrib(ChatDynamicVariableModel.ID);
        if (!model) {
            return [];
        }
        return model.variables;
    }
    getSelectedTools(sessionId) {
        const widget = this.chatWidgetService.getWidgetBySessionId(sessionId);
        if (!widget) {
            return [];
        }
        return Array.from(widget.input.selectedToolsModel.entries.get())
            .filter((t) => !(t instanceof ToolSet));
    }
    getSelectedToolSets(sessionId) {
        const widget = this.chatWidgetService.getWidgetBySessionId(sessionId);
        if (!widget) {
            return [];
        }
        return Array.from(widget.input.selectedToolsModel.entries.get())
            .filter((t) => t instanceof ToolSet);
    }
};
ChatVariablesService = __decorate([
    __param(0, IChatWidgetService)
], ChatVariablesService);
export { ChatVariablesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRWYXJpYWJsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFhLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUMvQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV0RSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFvQjtJQUdoQyxZQUNzQyxpQkFBcUM7UUFBckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtJQUN2RSxDQUFDO0lBRUwsbUJBQW1CLENBQUMsU0FBaUI7UUFDcEMsd0pBQXdKO1FBQ3hKLGNBQWM7UUFDZCx1REFBdUQ7UUFDdkQsd0tBQXdLO1FBQ3hLLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ3BFLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQTJCLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQztJQUN4QixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsU0FBaUI7UUFDakMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQzthQUM5RCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFMUQsQ0FBQztJQUNELG1CQUFtQixDQUFDLFNBQWlCO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7YUFDOUQsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFnQixFQUFFLENBQUMsQ0FBQyxZQUFZLE9BQU8sQ0FBQyxDQUFDO0lBQ3JELENBQUM7Q0FFRCxDQUFBO0FBM0NZLG9CQUFvQjtJQUk5QixXQUFBLGtCQUFrQixDQUFBO0dBSlIsb0JBQW9CLENBMkNoQyJ9