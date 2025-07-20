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
import { $, addDisposableListener, append, EventType } from '../../../../../base/browser/dom.js';
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { renderFileWidgets } from '../chatInlineAnchorWidget.js';
import { IChatMarkdownAnchorService } from './chatMarkdownAnchorService.js';
let ChatProgressContentPart = class ChatProgressContentPart extends Disposable {
    constructor(progress, renderer, context, forceShowSpinner, forceShowMessage, icon, instantiationService, chatMarkdownAnchorService) {
        super();
        this.instantiationService = instantiationService;
        this.chatMarkdownAnchorService = chatMarkdownAnchorService;
        const followingContent = context.content.slice(context.contentIndex + 1);
        this.showSpinner = forceShowSpinner ?? shouldShowSpinner(followingContent, context.element);
        this.isHidden = forceShowMessage !== true && followingContent.some(part => part.kind !== 'progressMessage');
        if (this.isHidden) {
            // Placeholder, don't show the progress message
            this.domNode = $('');
            return;
        }
        if (this.showSpinner) {
            // TODO@roblourens is this the right place for this?
            // this step is in progress, communicate it to SR users
            alert(progress.content.value);
        }
        const codicon = icon ? icon : this.showSpinner ? ThemeIcon.modify(Codicon.loading, 'spin') : Codicon.check;
        const result = this._register(renderer.render(progress.content));
        result.element.classList.add('progress-step');
        renderFileWidgets(result.element, this.instantiationService, this.chatMarkdownAnchorService, this._store);
        this.domNode = $('.progress-container');
        const iconElement = $('div');
        iconElement.classList.add(...ThemeIcon.asClassNameArray(codicon));
        append(this.domNode, iconElement);
        append(this.domNode, result.element);
    }
    hasSameContent(other, followingContent, element) {
        // Progress parts render render until some other content shows up, then they hide.
        // When some other content shows up, need to signal to be rerendered as hidden.
        if (followingContent.some(part => part.kind !== 'progressMessage') && !this.isHidden) {
            return false;
        }
        // Needs rerender when spinner state changes
        const showSpinner = shouldShowSpinner(followingContent, element);
        return other.kind === 'progressMessage' && this.showSpinner === showSpinner;
    }
};
ChatProgressContentPart = __decorate([
    __param(6, IInstantiationService),
    __param(7, IChatMarkdownAnchorService)
], ChatProgressContentPart);
export { ChatProgressContentPart };
function shouldShowSpinner(followingContent, element) {
    return isResponseVM(element) && !element.isComplete && followingContent.length === 0;
}
let ChatWorkingProgressContentPart = class ChatWorkingProgressContentPart extends ChatProgressContentPart {
    constructor(workingProgress, renderer, context, instantiationService, chatMarkdownAnchorService) {
        const progressMessage = {
            kind: 'progressMessage',
            content: workingProgress.isPaused ?
                new MarkdownString().appendText(localize('pausedMessage', "Paused")) :
                new MarkdownString().appendText(localize('workingMessage', "Working..."))
        };
        super(progressMessage, renderer, context, undefined, undefined, workingProgress.isPaused ? Codicon.debugPause : undefined, instantiationService, chatMarkdownAnchorService);
        this.workingProgress = workingProgress;
        if (workingProgress.isPaused) {
            this.domNode.style.cursor = 'pointer';
            this.domNode.title = localize('resume', "Click to resume");
            this._register(addDisposableListener(this.domNode, EventType.CLICK, () => {
                workingProgress.setPaused(false);
            }));
        }
    }
    hasSameContent(other, followingContent, element) {
        return other.kind === 'working' && this.workingProgress.isPaused === other.isPaused;
    }
};
ChatWorkingProgressContentPart = __decorate([
    __param(3, IInstantiationService),
    __param(4, IChatMarkdownAnchorService)
], ChatWorkingProgressContentPart);
export { ChatWorkingProgressContentPart };
export class ChatCustomProgressPart {
    constructor(messageElement, icon) {
        this.domNode = $('.progress-container');
        const iconElement = $('div');
        iconElement.classList.add(...ThemeIcon.asClassNameArray(icon));
        append(this.domNode, iconElement);
        messageElement.classList.add('progress-step');
        append(this.domNode, messageElement);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb2dyZXNzQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRQcm9ncmVzc0NvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBOEMsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFekcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFakUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFckUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBTXRELFlBQ0MsUUFBZ0UsRUFDaEUsUUFBMEIsRUFDMUIsT0FBc0MsRUFDdEMsZ0JBQXFDLEVBQ3JDLGdCQUFxQyxFQUNyQyxJQUEy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