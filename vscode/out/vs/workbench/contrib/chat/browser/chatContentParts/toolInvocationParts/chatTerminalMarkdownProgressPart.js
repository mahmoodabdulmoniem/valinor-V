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
import { Codicon } from '../../../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ChatMarkdownContentPart } from '../chatMarkdownContentPart.js';
import { ChatCustomProgressPart } from '../chatProgressContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let ChatTerminalMarkdownProgressPart = class ChatTerminalMarkdownProgressPart extends BaseChatToolInvocationSubPart {
    get codeblocks() {
        return this.markdownPart?.codeblocks ?? [];
    }
    constructor(toolInvocation, terminalData, context, renderer, editorPool, currentWidthDelegate, codeBlockStartIndex, codeBlockModelCollection, instantiationService) {
        super(toolInvocation);
        const command = terminalData.kind === 'terminal'
            ? terminalData.command
            : terminalData.commandLine.userEdited ?? terminalData.commandLine.toolEdited ?? terminalData.commandLine.original;
        const content = new MarkdownString(`\`\`\`${terminalData.language}\n${command}\n\`\`\``);
        const chatMarkdownContent = {
            kind: 'markdownContent',
            content: content,
        };
        const codeBlockRenderOptions = {
            hideToolbar: true,
            reserveWidth: 19,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on'
            }
        };
        this.markdownPart = this._register(instantiationService.createInstance(ChatMarkdownContentPart, chatMarkdownContent, context, editorPool, false, codeBlockStartIndex, renderer, currentWidthDelegate(), codeBlockModelCollection, { codeBlockRenderOptions }));
        this._register(this.markdownPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        const icon = !toolInvocation.isConfirmed ?
            Codicon.error :
            toolInvocation.isComplete ?
                Codicon.check : ThemeIcon.modify(Codicon.loading, 'spin');
        const progressPart = instantiationService.createInstance(ChatCustomProgressPart, this.markdownPart.domNode, icon);
        this.domNode = progressPart.domNode;
    }
};
ChatTerminalMarkdownProgressPart = __decorate([
    __param(8, IInstantiationService)
], ChatTerminalMarkdownProgressPart);
export { ChatTerminalMarkdownProgressPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRlcm1pbmFsTWFya2Rvd25Qcm9ncmVzc1BhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL3Rvb2xJbnZvY2F0aW9uUGFydHMvY2hhdFRlcm1pbmFsTWFya2Rvd25Qcm9ncmVzc1BhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFNekcsT0FBTyxFQUFFLHVCQUF1QixFQUFjLE1BQU0sK0JBQStCLENBQUM7QUFDcEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdkUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFeEUsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSw2QkFBNkI7SUFJbEYsSUFBVyxVQUFVO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFlBQVksRUFBRSxVQUFVLElBQUksRUFBRSxDQUFDO0lBQzVDLENBQUM7SUFFRCxZQUNDLGNBQW1FLEVBQ25FLFlBQWdGLEVBQ2hGLE9BQXNDLEVBQ3RDLFFBQTBCLEVBQzFCLFVBQXNCLEVBQ3RCLG9CQUFrQyxFQUNsQyxtQkFBMkIsRUFDM0Isd0JBQWtELEVBQzNCLG9CQUEyQztRQUVsRSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFdEIsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksS0FBSyxVQUFVO1lBQy9DLENBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTztZQUN0QixDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxVQUFVLElBQUksWUFBWSxDQUFDLFdBQVcsQ0FBQyxVQUFVLElBQUksWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUM7UUFFbkgsTUFBTSxPQUFPLEdBQUcsSUFBSSxjQUFjLENBQUMsU0FBUyxZQUFZLENBQUMsUUFBUSxLQUFLLE9BQU8sVUFBVSxDQUFDLENBQUM7UUFDekYsTUFBTSxtQkFBbUIsR0FBeUI7WUFDakQsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixPQUFPLEVBQUUsT0FBTztTQUNoQixDQUFDO1FBRUYsTUFBTSxzQkFBc0IsR0FBNEI7WUFDdkQsV0FBVyxFQUFFLElBQUk7WUFDakIsWUFBWSxFQUFFLEVBQUU7WUFDaEIsZUFBZSxFQUFFLENBQUM7WUFDbEIsYUFBYSxFQUFFO2dCQUNkLFFBQVEsRUFBRSxJQUFJO2FBQ2Q7U0FDRCxDQUFDO1FBQ0YsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSx3QkFBd0IsRUFBRSxFQUFFLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9QLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFGLE1BQU0sSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3pDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNmLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDMUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzVELE1BQU0sWUFBWSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsSCxJQUFJLENBQUMsT0FBTyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUM7SUFDckMsQ0FBQztDQUNELENBQUE7QUFoRFksZ0NBQWdDO0lBaUIxQyxXQUFBLHFCQUFxQixDQUFBO0dBakJYLGdDQUFnQyxDQWdENUMifQ==