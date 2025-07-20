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
var ChatInputOutputMarkdownProgressPart_1;
import { decodeBase64 } from '../../../../../../base/common/buffer.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { getExtensionForMimeType } from '../../../../../../base/common/mime.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { basename } from '../../../../../../base/common/resources.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ChatResponseResource } from '../../../common/chatModel.js';
import { isResponseVM } from '../../../common/chatViewModel.js';
import { ChatCollapsibleInputOutputContentPart } from '../chatToolInputOutputContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let ChatInputOutputMarkdownProgressPart = class ChatInputOutputMarkdownProgressPart extends BaseChatToolInvocationSubPart {
    static { ChatInputOutputMarkdownProgressPart_1 = this; }
    /** Remembers expanded tool parts on re-render */
    static { this._expandedByDefault = new WeakMap(); }
    get codeblocks() {
        return this._codeblocks;
    }
    constructor(toolInvocation, context, editorPool, codeBlockStartIndex, message, subtitle, input, output, isError, currentWidthDelegate, instantiationService, modelService, languageService) {
        super(toolInvocation);
        this._codeblocks = [];
        let codeBlockIndex = codeBlockStartIndex;
        const toCodePart = (data) => {
            const model = this._register(modelService.createModel(data, languageService.createById('json'), undefined, true));
            return {
                kind: 'code',
                textModel: model,
                languageId: model.getLanguageId(),
                options: {
                    hideToolbar: true,
                    reserveWidth: 19,
                    maxHeightInLines: 13,
                    verticalPadding: 5,
                    editorOptions: {
                        wordWrap: 'on'
                    }
                },
                codeBlockInfo: {
                    codeBlockIndex: codeBlockIndex++,
                    codemapperUri: undefined,
                    elementId: context.element.id,
                    focus: () => { },
                    isStreaming: false,
                    ownerMarkdownPartId: this.codeblocksPartId,
                    uri: model.uri,
                    chatSessionId: context.element.sessionId,
                    uriPromise: Promise.resolve(model.uri)
                }
            };
        };
        let processedOutput = output;
        if (typeof output === 'string') { // back compat with older stored versions
            processedOutput = [{ value: output, isText: true }];
        }
        const requestId = isResponseVM(context.element) ? context.element.requestId : context.element.id;
        const collapsibleListPart = this._register(instantiationService.createInstance(ChatCollapsibleInputOutputContentPart, message, subtitle, context, editorPool, toCodePart(input), processedOutput && {
            parts: processedOutput.map((o, i) => {
                const permalinkBasename = o.uri
                    ? basename(o.uri)
                    : o.mimeType && getExtensionForMimeType(o.mimeType)
                        ? `file${getExtensionForMimeType(o.mimeType)}`
                        : 'file' + (o.isText ? '.txt' : '.bin');
                const permalinkUri = ChatResponseResource.createUri(context.element.sessionId, requestId, toolInvocation.toolCallId, i, permalinkBasename);
                if (o.isText && !o.asResource) {
                    return toCodePart(o.value);
                }
                else {
                    let decoded;
                    try {
                        if (!o.isText) {
                            decoded = decodeBase64(o.value).buffer;
                        }
                    }
                    catch {
                        // ignored
                    }
                    // Fall back to text if it's not valid base64
                    return { kind: 'data', value: decoded || new TextEncoder().encode(o.value), mimeType: o.mimeType, uri: permalinkUri };
                }
            }),
        }, isError, ChatInputOutputMarkdownProgressPart_1._expandedByDefault.get(toolInvocation) ?? false, currentWidthDelegate()));
        this._codeblocks.push(...collapsibleListPart.codeblocks);
        this._register(collapsibleListPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this._register(toDisposable(() => ChatInputOutputMarkdownProgressPart_1._expandedByDefault.set(toolInvocation, collapsibleListPart.expanded)));
        const progressObservable = toolInvocation.kind === 'toolInvocation' ? toolInvocation.progress : undefined;
        if (progressObservable) {
            this._register(autorun(reader => {
                const progress = progressObservable?.read(reader);
                if (progress.message) {
                    collapsibleListPart.title = progress.message;
                }
            }));
        }
        this.domNode = collapsibleListPart.domNode;
    }
};
ChatInputOutputMarkdownProgressPart = ChatInputOutputMarkdownProgressPart_1 = __decorate([
    __param(10, IInstantiationService),
    __param(11, IModelService),
    __param(12, ILanguageService)
], ChatInputOutputMarkdownProgressPart);
export { ChatInputOutputMarkdownProgressPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0T3V0cHV0TWFya2Rvd25Qcm9ncmVzc1BhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL3Rvb2xJbnZvY2F0aW9uUGFydHMvY2hhdElucHV0T3V0cHV0TWFya2Rvd25Qcm9ncmVzc1BhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBS2hFLE9BQU8sRUFBRSxxQ0FBcUMsRUFBcUQsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoSixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV4RSxJQUFNLG1DQUFtQyxHQUF6QyxNQUFNLG1DQUFvQyxTQUFRLDZCQUE2Qjs7SUFDckYsaURBQWlE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