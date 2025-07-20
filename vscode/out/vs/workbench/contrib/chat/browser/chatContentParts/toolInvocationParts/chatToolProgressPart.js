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
import { Codicon } from '../../../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ChatProgressContentPart } from '../chatProgressContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let ChatToolProgressSubPart = class ChatToolProgressSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, context, renderer, instantiationService) {
        super(toolInvocation);
        this.toolInvocation = toolInvocation;
        this.context = context;
        this.renderer = renderer;
        this.instantiationService = instantiationService;
        this.codeblocks = [];
        this.domNode = this.createProgressPart();
    }
    createProgressPart() {
        if (this.toolInvocation.isComplete && this.toolInvocation.isConfirmed !== false && this.toolInvocation.pastTenseMessage) {
            const part = this.renderProgressContent(this.toolInvocation.pastTenseMessage);
            this._register(part);
            return part.domNode;
        }
        else {
            const container = document.createElement('div');
            const progressObservable = this.toolInvocation.kind === 'toolInvocation' ? this.toolInvocation.progress : undefined;
            this._register(autorun(reader => {
                const progress = progressObservable?.read(reader);
                const part = reader.store.add(this.renderProgressContent(progress?.message || this.toolInvocation.invocationMessage));
                dom.reset(container, part.domNode);
            }));
            return container;
        }
    }
    renderProgressContent(content) {
        if (typeof content === 'string') {
            content = new MarkdownString().appendText(content);
        }
        const progressMessage = {
            kind: 'progressMessage',
            content
        };
        const iconOverride = !this.toolInvocation.isConfirmed ?
            Codicon.error :
            this.toolInvocation.isComplete ?
                Codicon.check : undefined;
        return this.instantiationService.createInstance(ChatProgressContentPart, progressMessage, this.renderer, this.context, undefined, true, iconOverride);
    }
};
ChatToolProgressSubPart = __decorate([
    __param(3, IInstantiationService)
], ChatToolProgressSubPart);
export { ChatToolProgressSubPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xQcm9ncmVzc1BhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL3Rvb2xJbnZvY2F0aW9uUGFydHMvY2hhdFRvb2xQcm9ncmVzc1BhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMvRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFJekcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFeEUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSw2QkFBNkI7SUFLekUsWUFDa0IsY0FBbUUsRUFDbkUsT0FBc0MsRUFDdEMsUUFBMEIsRUFDcEIsb0JBQTREO1FBRW5GLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUxMLG1CQUFjLEdBQWQsY0FBYyxDQUFxRDtRQUNuRSxZQUFPLEdBQVAsT0FBTyxDQUErQjtRQUN0QyxhQUFRLEdBQVIsUUFBUSxDQUFrQjtRQUNILHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFOM0QsZUFBVSxHQUF5QixFQUFFLENBQUM7UUFVOUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUMxQyxDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEtBQUssS0FBSyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN6SCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzlFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ3JCLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxLQUFLLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQ3BILElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUMvQixNQUFNLFFBQVEsR0FBRyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2xELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUN0SCxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRU8scUJBQXFCLENBQUMsT0FBaUM7UUFDOUQsSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqQyxPQUFPLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEQsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUF5QjtZQUM3QyxJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLE9BQU87U0FDUCxDQUFDO1FBRUYsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNmLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQy9CLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUM1QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3ZKLENBQUM7Q0FDRCxDQUFBO0FBakRZLHVCQUF1QjtJQVNqQyxXQUFBLHFCQUFxQixDQUFBO0dBVFgsdUJBQXVCLENBaURuQyJ9