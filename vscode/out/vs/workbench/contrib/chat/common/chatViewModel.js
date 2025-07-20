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
import { Emitter } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import * as marked from '../../../../base/common/marked/marked.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { annotateVulnerabilitiesInText } from './annotations.js';
import { getFullyQualifiedId, IChatAgentNameService } from './chatAgents.js';
import { countWords } from './chatWordCounter.js';
export function isRequestVM(item) {
    return !!item && typeof item === 'object' && 'message' in item;
}
export function isResponseVM(item) {
    return !!item && typeof item.setVote !== 'undefined';
}
export function isChatTreeItem(item) {
    return isRequestVM(item) || isResponseVM(item);
}
export function assertIsResponseVM(item) {
    if (!isResponseVM(item)) {
        throw new Error('Expected item to be IChatResponseViewModel');
    }
}
let ChatViewModel = class ChatViewModel extends Disposable {
    get inputPlaceholder() {
        return this._inputPlaceholder;
    }
    get model() {
        return this._model;
    }
    setInputPlaceholder(text) {
        this._inputPlaceholder = text;
        this._onDidChange.fire({ kind: 'changePlaceholder' });
    }
    resetInputPlaceholder() {
        this._inputPlaceholder = undefined;
        this._onDidChange.fire({ kind: 'changePlaceholder' });
    }
    get sessionId() {
        return this._model.sessionId;
    }
    get requestInProgress() {
        return this._model.requestInProgress;
    }
    get requestPausibility() {
        return this._model.requestPausibility;
    }
    constructor(_model, codeBlockModelCollection, instantiationService) {
        super();
        this._model = _model;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.instantiationService = instantiationService;
        this._onDidDisposeModel = this._register(new Emitter());
        this.onDidDisposeModel = this._onDidDisposeModel.event;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._items = [];
        this._inputPlaceholder = undefined;
        this._editing = undefined;
        _model.getRequests().forEach((request, i) => {
            const requestModel = this.instantiationService.createInstance(ChatRequestViewModel, request);
            this._items.push(requestModel);
            this.updateCodeBlockTextModels(requestModel);
            if (request.response) {
                this.onAddResponse(request.response);
            }
        });
        this._register(_model.onDidDispose(() => this._onDidDisposeModel.fire()));
        this._register(_model.onDidChange(e => {
            if (e.kind === 'addRequest') {
                const requestModel = this.instantiationService.createInstance(ChatRequestViewModel, e.request);
                this._items.push(requestModel);
                this.updateCodeBlockTextModels(requestModel);
                if (e.request.response) {
                    this.onAddResponse(e.request.response);
                }
            }
            else if (e.kind === 'addResponse') {
                this.onAddResponse(e.response);
            }
            else if (e.kind === 'removeRequest') {
                const requestIdx = this._items.findIndex(item => isRequestVM(item) && item.id === e.requestId);
                if (requestIdx >= 0) {
                    this._items.splice(requestIdx, 1);
                }
                const responseIdx = e.responseId && this._items.findIndex(item => isResponseVM(item) && item.id === e.responseId);
                if (typeof responseIdx === 'number' && responseIdx >= 0) {
                    const items = this._items.splice(responseIdx, 1);
                    const item = items[0];
                    if (item instanceof ChatResponseViewModel) {
                        item.dispose();
                    }
                }
            }
            const modelEventToVmEvent = e.kind === 'addRequest' ? { kind: 'addRequest' }
                : e.kind === 'initialize' ? { kind: 'initialize' }
                    : e.kind === 'setHidden' ? { kind: 'setHidden' }
                        : null;
            this._onDidChange.fire(modelEventToVmEvent);
        }));
    }
    onAddResponse(responseModel) {
        const response = this.instantiationService.createInstance(ChatResponseViewModel, responseModel, this);
        this._register(response.onDidChange(() => {
            if (response.isComplete) {
                this.updateCodeBlockTextModels(response);
            }
            return this._onDidChange.fire(null);
        }));
        this._items.push(response);
        this.updateCodeBlockTextModels(response);
    }
    getItems() {
        return this._items.filter((item) => !item.shouldBeRemovedOnSend || item.shouldBeRemovedOnSend.afterUndoStop);
    }
    get editing() {
        return this._editing;
    }
    setEditing(editing) {
        if (this.editing && editing && this.editing.id === editing.id) {
            return; // already editing this request
        }
        this._editing = editing;
    }
    dispose() {
        super.dispose();
        dispose(this._items.filter((item) => item instanceof ChatResponseViewModel));
    }
    updateCodeBlockTextModels(model) {
        let content;
        if (isRequestVM(model)) {
            content = model.messageText;
        }
        else {
            content = annotateVulnerabilitiesInText(model.response.value).map(x => x.content.value).join('');
        }
        let codeBlockIndex = 0;
        marked.walkTokens(marked.lexer(content), token => {
            if (token.type === 'code') {
                const lang = token.lang || '';
                const text = token.text;
                this.codeBlockModelCollection.update(this._model.sessionId, model, codeBlockIndex++, { text, languageId: lang, isComplete: true });
            }
        });
    }
};
ChatViewModel = __decorate([
    __param(2, IInstantiationService)
], ChatViewModel);
export { ChatViewModel };
export class ChatRequestViewModel {
    get id() {
        return this._model.id;
    }
    get dataId() {
        return this.id + `_${hash(this.variables)}_${hash(this.isComplete)}`;
    }
    get sessionId() {
        return this._model.session.sessionId;
    }
    get username() {
        return this._model.username;
    }
    get avatarIcon() {
        return this._model.avatarIconUri;
    }
    get message() {
        return this._model.message;
    }
    get messageText() {
        return this.message.text;
    }
    get attempt() {
        return this._model.attempt;
    }
    get variables() {
        return this._model.variableData.variables;
    }
    get contentReferences() {
        return this._model.response?.contentReferences;
    }
    get confirmation() {
        return this._model.confirmation;
    }
    get isComplete() {
        return this._model.response?.isComplete ?? false;
    }
    get isCompleteAddedRequest() {
        return this._model.isCompleteAddedRequest;
    }
    get shouldBeRemovedOnSend() {
        return this._model.shouldBeRemovedOnSend;
    }
    get shouldBeBlocked() {
        return this._model.shouldBeBlocked;
    }
    get slashCommand() {
        return this._model.response?.slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._model.response?.agentOrSlashCommandDetected ?? false;
    }
    get modelId() {
        return this._model.modelId;
    }
    constructor(_model) {
        this._model = _model;
    }
}
let ChatResponseViewModel = class ChatResponseViewModel extends Disposable {
    get model() {
        return this._model;
    }
    get id() {
        return this._model.id;
    }
    get dataId() {
        return this._model.id +
            `_${this._modelChangeCount}` +
            (this.isLast ? '_last' : '');
    }
    get sessionId() {
        return this._model.session.sessionId;
    }
    get username() {
        if (this.agent) {
            const isAllowed = this.chatAgentNameService.getAgentNameRestriction(this.agent);
            if (isAllowed) {
                return this.agent.fullName || this.agent.name;
            }
            else {
                return getFullyQualifiedId(this.agent);
            }
        }
        return this._model.username;
    }
    get avatarIcon() {
        return this._model.avatarIcon;
    }
    get agent() {
        return this._model.agent;
    }
    get slashCommand() {
        return this._model.slashCommand;
    }
    get agentOrSlashCommandDetected() {
        return this._model.agentOrSlashCommandDetected;
    }
    get response() {
        return this._model.response;
    }
    get usedContext() {
        return this._model.usedContext;
    }
    get contentReferences() {
        return this._model.contentReferences;
    }
    get codeCitations() {
        return this._model.codeCitations;
    }
    get progressMessages() {
        return this._model.progressMessages;
    }
    get isComplete() {
        return this._model.isComplete;
    }
    get isCanceled() {
        return this._model.isCanceled;
    }
    get shouldBeBlocked() {
        return this._model.shouldBeBlocked;
    }
    get shouldBeRemovedOnSend() {
        return this._model.shouldBeRemovedOnSend;
    }
    get isCompleteAddedRequest() {
        return this._model.isCompleteAddedRequest;
    }
    get replyFollowups() {
        return this._model.followups?.filter((f) => f.kind === 'reply');
    }
    get result() {
        return this._model.result;
    }
    get errorDetails() {
        return this.result?.errorDetails;
    }
    get vote() {
        return this._model.vote;
    }
    get voteDownReason() {
        return this._model.voteDownReason;
    }
    get requestId() {
        return this._model.requestId;
    }
    get isStale() {
        return this._model.isStale;
    }
    get isLast() {
        return this.session.getItems().at(-1) === this;
    }
    get usedReferencesExpanded() {
        if (typeof this._usedReferencesExpanded === 'boolean') {
            return this._usedReferencesExpanded;
        }
        return undefined;
    }
    set usedReferencesExpanded(v) {
        this._usedReferencesExpanded = v;
    }
    get vulnerabilitiesListExpanded() {
        return this._vulnerabilitiesListExpanded;
    }
    set vulnerabilitiesListExpanded(v) {
        this._vulnerabilitiesListExpanded = v;
    }
    get contentUpdateTimings() {
        return this._contentUpdateTimings;
    }
    get isPaused() {
        return this._model.isPaused;
    }
    constructor(_model, session, logService, chatAgentNameService) {
        super();
        this._model = _model;
        this.session = session;
        this.logService = logService;
        this.chatAgentNameService = chatAgentNameService;
        this._modelChangeCount = 0;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.renderData = undefined;
        this._vulnerabilitiesListExpanded = false;
        this._contentUpdateTimings = undefined;
        if (!_model.isComplete) {
            this._contentUpdateTimings = {
                totalTime: 0,
                lastUpdateTime: Date.now(),
                impliedWordLoadRate: 0,
                lastWordCount: 0,
            };
        }
        this._register(_model.onDidChange(() => {
            // This is set when the response is loading, but the model can change later for other reasons
            if (this._contentUpdateTimings) {
                const now = Date.now();
                const wordCount = countWords(_model.entireResponse.getMarkdown());
                if (wordCount === this._contentUpdateTimings.lastWordCount) {
                    this.trace('onDidChange', `Update- no new words`);
                }
                else {
                    if (this._contentUpdateTimings.lastWordCount === 0) {
                        this._contentUpdateTimings.lastUpdateTime = now;
                    }
                    const timeDiff = Math.min(now - this._contentUpdateTimings.lastUpdateTime, 500);
                    const newTotalTime = Math.max(this._contentUpdateTimings.totalTime + timeDiff, 250);
                    const impliedWordLoadRate = wordCount / (newTotalTime / 1000);
                    this.trace('onDidChange', `Update- got ${wordCount} words over last ${newTotalTime}ms = ${impliedWordLoadRate} words/s`);
                    this._contentUpdateTimings = {
                        totalTime: this._contentUpdateTimings.totalTime !== 0 || this.response.value.some(v => v.kind === 'markdownContent') ?
                            newTotalTime :
                            this._contentUpdateTimings.totalTime,
                        lastUpdateTime: now,
                        impliedWordLoadRate,
                        lastWordCount: wordCount
                    };
                }
            }
            // new data -> new id, new content to render
            this._modelChangeCount++;
            this._onDidChange.fire();
        }));
    }
    trace(tag, message) {
        this.logService.trace(`ChatResponseViewModel#${tag}: ${message}`);
    }
    setVote(vote) {
        this._modelChangeCount++;
        this._model.setVote(vote);
    }
    setVoteDownReason(reason) {
        this._modelChangeCount++;
        this._model.setVoteDownReason(reason);
    }
    setEditApplied(edit, editCount) {
        this._modelChangeCount++;
        this._model.setEditApplied(edit, editCount);
    }
};
ChatResponseViewModel = __decorate([
    __param(2, ILogService),
    __param(3, IChatAgentNameService)
], ChatResponseViewModel);
export { ChatResponseViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXZELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0UsT0FBTyxLQUFLLE1BQU0sTUFBTSwwQ0FBMEMsQ0FBQztBQUluRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFxQyxxQkFBcUIsRUFBb0IsTUFBTSxpQkFBaUIsQ0FBQztBQUtsSSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFHbEQsTUFBTSxVQUFVLFdBQVcsQ0FBQyxJQUFhO0lBQ3hDLE9BQU8sQ0FBQyxDQUFDLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksU0FBUyxJQUFJLElBQUksQ0FBQztBQUNoRSxDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxJQUFhO0lBQ3pDLE9BQU8sQ0FBQyxDQUFDLElBQUksSUFBSSxPQUFRLElBQStCLENBQUMsT0FBTyxLQUFLLFdBQVcsQ0FBQztBQUNsRixDQUFDO0FBRUQsTUFBTSxVQUFVLGNBQWMsQ0FBQyxJQUFhO0lBQzND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