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
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { isToolResultInputOutputDetails } from '../../../common/languageModelToolsService.js';
import { ExtensionsInstallConfirmationWidgetSubPart } from './chatExtensionsInstallToolSubPart.js';
import { ChatInputOutputMarkdownProgressPart } from './chatInputOutputMarkdownProgressPart.js';
import { ChatResultListSubPart } from './chatResultListSubPart.js';
import { ChatTerminalMarkdownProgressPart } from './chatTerminalMarkdownProgressPart.js';
import { TerminalConfirmationWidgetSubPart } from './chatTerminalToolSubPart.js';
import { ToolConfirmationSubPart } from './chatToolConfirmationSubPart.js';
import { ChatToolProgressSubPart } from './chatToolProgressPart.js';
let ChatToolInvocationPart = class ChatToolInvocationPart extends Disposable {
    get codeblocks() {
        return this.subPart?.codeblocks ?? [];
    }
    get codeblocksPartId() {
        return this.subPart?.codeblocksPartId;
    }
    constructor(toolInvocation, context, renderer, listPool, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex, instantiationService) {
        super();
        this.toolInvocation = toolInvocation;
        this.context = context;
        this.renderer = renderer;
        this.listPool = listPool;
        this.editorPool = editorPool;
        this.currentWidthDelegate = currentWidthDelegate;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.codeBlockStartIndex = codeBlockStartIndex;
        this.instantiationService = instantiationService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.domNode = dom.$('.chat-tool-invocation-part');
        if (toolInvocation.presentation === 'hidden') {
            return;
        }
        // This part is a bit different, since IChatToolInvocation is not an immutable model object. So this part is able to rerender itself.
        // If this turns out to be a typical pattern, we could come up with a more reusable pattern, like telling the list to rerender an element
        // when the model changes, or trying to make the model immutable and swap out one content part for a new one based on user actions in the view.
        const partStore = this._register(new DisposableStore());
        const render = () => {
            dom.clearNode(this.domNode);
            partStore.clear();
            this.subPart = partStore.add(this.createToolInvocationSubPart());
            this.domNode.appendChild(this.subPart.domNode);
            partStore.add(this.subPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            partStore.add(this.subPart.onNeedsRerender(() => {
                render();
                this._onDidChangeHeight.fire();
            }));
        };
        render();
    }
    createToolInvocationSubPart() {
        if (this.toolInvocation.kind === 'toolInvocation') {
            if (this.toolInvocation.toolSpecificData?.kind === 'extensions') {
                return this.instantiationService.createInstance(ExtensionsInstallConfirmationWidgetSubPart, this.toolInvocation, this.context);
            }
            if (this.toolInvocation.confirmationMessages) {
                if (this.toolInvocation.toolSpecificData?.kind === 'terminal' || this.toolInvocation.toolSpecificData?.kind === 'terminal2') {
                    return this.instantiationService.createInstance(TerminalConfirmationWidgetSubPart, this.toolInvocation, this.toolInvocation.toolSpecificData, this.context, this.renderer, this.editorPool, this.currentWidthDelegate, this.codeBlockStartIndex);
                }
                else {
                    return this.instantiationService.createInstance(ToolConfirmationSubPart, this.toolInvocation, this.context, this.renderer, this.editorPool, this.currentWidthDelegate, this.codeBlockModelCollection, this.codeBlockStartIndex);
                }
            }
        }
        if (this.toolInvocation.toolSpecificData?.kind === 'terminal' || this.toolInvocation.toolSpecificData?.kind === 'terminal2') {
            return this.instantiationService.createInstance(ChatTerminalMarkdownProgressPart, this.toolInvocation, this.toolInvocation.toolSpecificData, this.context, this.renderer, this.editorPool, this.currentWidthDelegate, this.codeBlockStartIndex, this.codeBlockModelCollection);
        }
        if (Array.isArray(this.toolInvocation.resultDetails) && this.toolInvocation.resultDetails?.length) {
            return this.instantiationService.createInstance(ChatResultListSubPart, this.toolInvocation, this.context, this.toolInvocation.pastTenseMessage ?? this.toolInvocation.invocationMessage, this.toolInvocation.resultDetails, this.listPool);
        }
        if (isToolResultInputOutputDetails(this.toolInvocation.resultDetails)) {
            return this.instantiationService.createInstance(ChatInputOutputMarkdownProgressPart, this.toolInvocation, this.context, this.editorPool, this.codeBlockStartIndex, this.toolInvocation.pastTenseMessage ?? this.toolInvocation.invocationMessage, this.toolInvocation.originMessage, this.toolInvocation.resultDetails.input, this.toolInvocation.resultDetails.output, !!this.toolInvocation.resultDetails.isError, this.currentWidthDelegate);
        }
        if (this.toolInvocation.kind === 'toolInvocation' && this.toolInvocation.toolSpecificData?.kind === 'input' && !this.toolInvocation.isComplete) {
            return this.instantiationService.createInstance(ChatInputOutputMarkdownProgressPart, this.toolInvocation, this.context, this.editorPool, this.codeBlockStartIndex, this.toolInvocation.invocationMessage, this.toolInvocation.originMessage, typeof this.toolInvocation.toolSpecificData.rawInput === 'string' ? this.toolInvocation.toolSpecificData.rawInput : JSON.stringify(this.toolInvocation.toolSpecificData.rawInput, null, 2), undefined, false, this.currentWidthDelegate);
        }
        return this.instantiationService.createInstance(ChatToolProgressSubPart, this.toolInvocation, this.context, this.renderer);
    }
    hasSameContent(other, followingContent, element) {
        return (other.kind === 'toolInvocation' || other.kind === 'toolInvocationSerialized') && this.toolInvocation.toolCallId === other.toolCallId;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatToolInvocationPart = __decorate([
    __param(8, IInstantiationService)
], ChatToolInvocationPart);
export { ChatToolInvocationPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnZvY2F0aW9uUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvdG9vbEludm9jYXRpb25QYXJ0cy9jaGF0VG9vbEludm9jYXRpb25QYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sNENBQTRDLENBQUM7QUFFdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFJekcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFLOUYsT0FBTyxFQUFFLDBDQUEwQyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkcsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDL0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbkUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDakYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFN0QsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVO0lBTXJELElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxJQUFJLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRUQsSUFBVyxnQkFBZ0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDO0lBQ3ZDLENBQUM7SUFJRCxZQUNrQixjQUFtRSxFQUNuRSxPQUFzQyxFQUN0QyxRQUEwQixFQUMxQixRQUE2QixFQUM3QixVQUFzQixFQUN0QixvQkFBa0MsRUFDbEMsd0JBQWtELEVBQ2xELG1CQUEyQixFQUNyQixvQkFBNEQ7UUFFbkYsS0FBSyxFQUFFLENBQUM7UUFWUyxtQkFBYyxHQUFkLGNBQWMsQ0FBcUQ7UUFDbkUsWUFBTyxHQUFQLE9BQU8sQ0FBK0I7UUFDdEMsYUFBUSxHQUFSLFFBQVEsQ0FBa0I7UUFDMUIsYUFBUSxHQUFSLFFBQVEsQ0FBcUI7UUFDN0IsZUFBVSxHQUFWLFVBQVUsQ0FBWTtRQUN0Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQWM7UUFDbEMsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEwQjtRQUNsRCx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQVE7UUFDSix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBdEI1RSx1QkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNqRCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBeUJqRSxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQztRQUNuRCxJQUFJLGNBQWMsQ0FBQyxZQUFZLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUMsT0FBTztRQUNSLENBQUM7UUFFRCxxSUFBcUk7UUFDckkseUlBQXlJO1FBQ3pJLCtJQUErSTtRQUMvSSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUN4RCxNQUFNLE1BQU0sR0FBRyxHQUFHLEVBQUU7WUFDbkIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRWxCLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDL0MsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDcEYsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUU7Z0JBQy9DLE1BQU0sRUFBRSxDQUFDO2dCQUNULElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBQ0YsTUFBTSxFQUFFLENBQUM7SUFDVixDQUFDO0lBRUQsMkJBQTJCO1FBQzFCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztZQUNuRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxLQUFLLFlBQVksRUFBRSxDQUFDO2dCQUNqRSxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsMENBQTBDLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEksQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUM5QyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxLQUFLLFVBQVUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztvQkFDN0gsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlDQUFpQyxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQ2xQLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNqTyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxLQUFLLFVBQVUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUM3SCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDaFIsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQ25HLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1TyxDQUFDO1FBRUQsSUFBSSw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDdkUsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUM5QyxtQ0FBbUMsRUFDbkMsSUFBSSxDQUFDLGNBQWMsRUFDbkIsSUFBSSxDQUFDLE9BQU8sRUFDWixJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyxtQkFBbUIsRUFDeEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUM3RSxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFDakMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUN2QyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQ3hDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQzNDLElBQUksQ0FBQyxvQkFBb0IsQ0FDekIsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxLQUFLLGdCQUFnQixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxLQUFLLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEosT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUM5QyxtQ0FBbUMsRUFDbkMsSUFBSSxDQUFDLGNBQWMsRUFDbkIsSUFBSSxDQUFDLE9BQU8sRUFDWixJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyxtQkFBbUIsRUFDeEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFDckMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQ2pDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQzFMLFNBQVMsRUFDVCxLQUFLLEVBQ0wsSUFBSSxDQUFDLG9CQUFvQixDQUN6QixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQzVILENBQUM7SUFFRCxjQUFjLENBQUMsS0FBMkIsRUFBRSxnQkFBd0MsRUFBRSxPQUFxQjtRQUMxRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxnQkFBZ0IsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLDBCQUEwQixDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLEtBQUssS0FBSyxDQUFDLFVBQVUsQ0FBQztJQUM5SSxDQUFDO0lBRUQsYUFBYSxDQUFDLFVBQXVCO1FBQ3BDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUIsQ0FBQztDQUNELENBQUE7QUFySFksc0JBQXNCO0lBeUJoQyxXQUFBLHFCQUFxQixDQUFBO0dBekJYLHNCQUFzQixDQXFIbEMifQ==