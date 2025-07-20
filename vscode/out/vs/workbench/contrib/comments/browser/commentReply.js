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
import * as dom from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from '../../../../base/browser/ui/mouseCursor/mouseCursor.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { CommentFormActions } from './commentFormActions.js';
import { ICommentService } from './commentService.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { MIN_EDITOR_HEIGHT, SimpleCommentEditor, calculateEditorHeight } from './simpleCommentEditor.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { Position } from '../../../../editor/common/core/position.js';
let INMEM_MODEL_ID = 0;
export const COMMENTEDITOR_DECORATION_KEY = 'commenteditordecoration';
let CommentReply = class CommentReply extends Disposable {
    constructor(owner, container, _parentEditor, _commentThread, _scopedInstatiationService, _contextKeyService, _commentMenus, _commentOptions, _pendingComment, _parentThread, focus, _actionRunDelegate, commentService, configurationService, keybindingService, contextMenuService, hoverService, textModelService) {
        super();
        this.owner = owner;
        this._parentEditor = _parentEditor;
        this._commentThread = _commentThread;
        this._scopedInstatiationService = _scopedInstatiationService;
        this._contextKeyService = _contextKeyService;
        this._commentMenus = _commentMenus;
        this._commentOptions = _commentOptions;
        this._pendingComment = _pendingComment;
        this._parentThread = _parentThread;
        this._actionRunDelegate = _actionRunDelegate;
        this.commentService = commentService;
        this.keybindingService = keybindingService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this.textModelService = textModelService;
        this._commentThreadDisposables = [];
        this._editorHeight = MIN_EDITOR_HEIGHT;
        this._container = dom.append(container, dom.$('.comment-form-container'));
        this._form = dom.append(this._container, dom.$('.comment-form'));
        this.commentEditor = this._register(this._scopedInstatiationService.createInstance(SimpleCommentEditor, this._form, SimpleCommentEditor.getEditorOptions(configurationService), _contextKeyService, this._parentThread));
        this.commentEditorIsEmpty = CommentContextKeys.commentIsEmpty.bindTo(this._contextKeyService);
        this.commentEditorIsEmpty.set(!this._pendingComment);
        this.initialize(focus);
    }
    async initialize(focus) {
        this.avatar = dom.append(this._form, dom.$('.avatar-container'));
        this.updateAuthorInfo();
        const hasExistingComments = this._commentThread.comments && this._commentThread.comments.length > 0;
        const modeId = generateUuid() + '-' + (hasExistingComments ? this._commentThread.threadId : ++INMEM_MODEL_ID);
        const params = JSON.stringify({
            extensionId: this._commentThread.extensionId,
            commentThreadId: this._commentThread.threadId
        });
        let resource = URI.from({
            scheme: Schemas.commentsInput,
            path: `/${this._commentThread.extensionId}/commentinput-${modeId}.md?${params}` // TODO. Remove params once extensions adopt authority.
        });
        const commentController = this.commentService.getCommentController(this.owner);
        if (commentController) {
            resource = resource.with({ authority: commentController.id });
        }
        const model = await this.textModelService.createModelReference(resource);
        model.object.textEditorModel.setValue(this._pendingComment?.body || '');
        this._register(model);
        this.commentEditor.setModel(model.object.textEditorModel);
        if (this._pendingComment) {
            this.commentEditor.setPosition(this._pendingComment.cursor);
        }
        this.calculateEditorHeight();
        this._register(model.object.textEditorModel.onDidChangeContent(() => {
            this.setCommentEditorDecorations();
            this.commentEditorIsEmpty?.set(!this.commentEditor.getValue());
            if (this.calculateEditorHeight()) {
                this.commentEditor.layout({ height: this._editorHeight, width: this.commentEditor.getLayoutInfo().width });
                this.commentEditor.render(true);
            }
        }));
        this.createTextModelListener(this.commentEditor, this._form);
        this.setCommentEditorDecorations();
        // Only add the additional step of clicking a reply button to expand the textarea when there are existing comments
        if (this._pendingComment) {
            this.expandReplyArea();
        }
        else if (hasExistingComments) {
            this.createReplyButton(this.commentEditor, this._form);
        }
        else if (focus && (this._commentThread.comments && this._commentThread.comments.length === 0)) {
            this.expandReplyArea();
        }
        this._error = dom.append(this._container, dom.$('.validation-error.hidden'));
        const formActions = dom.append(this._container, dom.$('.form-actions'));
        this._formActions = dom.append(formActions, dom.$('.other-actions'));
        this.createCommentWidgetFormActions(this._formActions, model.object.textEditorModel);
        this._editorActions = dom.append(formActions, dom.$('.editor-actions'));
        this.createCommentWidgetEditorActions(this._editorActions, model.object.textEditorModel);
    }
    calculateEditorHeight() {
        const newEditorHeight = calculateEditorHeight(this._parentEditor, this.commentEditor, this._editorHeight);
        if (newEditorHeight !== this._editorHeight) {
            this._editorHeight = newEditorHeight;
            return true;
        }
        return false;
    }
    updateCommentThread(commentThread) {
        const isReplying = this.commentEditor.hasTextFocus();
        const oldAndNewBothEmpty = !this._commentThread.comments?.length && !commentThread.comments?.length;
        if (!this._reviewThreadReplyButton) {
            this.createReplyButton(this.commentEditor, this._form);
        }
        if (this._commentThread.comments && this._commentThread.comments.length === 0 && !oldAndNewBothEmpty) {
            this.expandReplyArea();
        }
        if (isReplying) {
            this.commentEditor.focus();
        }
    }
    getPendingComment() {
        const model = this.commentEditor.getModel();
        if (model && model.getValueLength() > 0) { // checking length is cheap
            return { body: model.getValue(), cursor: this.commentEditor.getPosition() ?? new Position(1, 1) };
        }
        return undefined;
    }
    setPendingComment(pending) {
        this._pendingComment = pending;
        this.expandReplyArea();
        this.commentEditor.setValue(pending.body);
        this.commentEditor.setPosition(pending.cursor);
    }
    layout(widthInPixel) {
        this.commentEditor.layout({ height: this._editorHeight, width: widthInPixel - 54 /* margin 20px * 10 + scrollbar 14px*/ });
    }
    focusIfNeeded() {
        if (!this._commentThread.comments || !this._commentThread.comments.length) {
            this.commentEditor.focus();
        }
        else if ((this.commentEditor.getModel()?.getValueLength() ?? 0) > 0) {
            this.expandReplyArea();
        }
    }
    focusCommentEditor() {
        this.commentEditor.focus();
    }
    expandReplyAreaAndFocusCommentEditor() {
        this.expandReplyArea();
        this.commentEditor.focus();
    }
    isCommentEditorFocused() {
        return this.commentEditor.hasWidgetFocus();
    }
    updateAuthorInfo() {
        this.avatar.textContent = '';
        if (typeof this._commentThread.canReply !== 'boolean' && this._commentThread.canReply.iconPath) {
            this.avatar.style.display = 'block';
            const img = dom.append(this.avatar, dom.$('img.avatar'));
            img.src = FileAccess.uriToBrowserUri(URI.revive(this._commentThread.canReply.iconPath)).toString(true);
        }
        else {
            this.avatar.style.display = 'none';
        }
    }
    updateCanReply() {
        this.updateAuthorInfo();
        if (!this._commentThread.canReply) {
            this._container.style.display = 'none';
        }
        else {
            this._container.style.display = 'block';
        }
    }
    async submitComment() {
        await this._commentFormActions?.triggerDefaultAction();
        this._pendingComment = undefined;
    }
    setCommentEditorDecorations() {
        const hasExistingComments = this._commentThread.comments && this._commentThread.comments.length > 0;
        const placeholder = hasExistingComments
            ? (this._commentOptions?.placeHolder || nls.localize('reply', "Reply..."))
            : (this._commentOptions?.placeHolder || nls.localize('newComment', "Type a new comment"));
        this.commentEditor.updateOptions({ placeholder });
    }
    createTextModelListener(commentEditor, commentForm) {
        this._commentThreadDisposables.push(commentEditor.onDidFocusEditorWidget(() => {
            this._commentThread.input = {
                uri: commentEditor.getModel().uri,
                value: commentEditor.getValue()
            };
            this.commentService.setActiveEditingCommentThread(this._commentThread);
            this.commentService.setActiveCommentAndThread(this.owner, { thread: this._commentThread });
        }));
        this._commentThreadDisposables.push(commentEditor.getModel().onDidChangeContent(() => {
            const modelContent = commentEditor.getValue();
            if (this._commentThread.input && this._commentThread.input.uri === commentEditor.getModel().uri && this._commentThread.input.value !== modelContent) {
                const newInput = this._commentThread.input;
                newInput.value = modelContent;
                this._commentThread.input = newInput;
            }
            this.commentService.setActiveEditingCommentThread(this._commentThread);
        }));
        this._commentThreadDisposables.push(this._commentThread.onDidChangeInput(input => {
            const thread = this._commentThread;
            const model = commentEditor.getModel();
            if (thread.input && model && (thread.input.uri !== model.uri)) {
                return;
            }
            if (!input) {
                return;
            }
            if (commentEditor.getValue() !== input.value) {
                commentEditor.setValue(input.value);
                if (input.value === '') {
                    this._pendingComment = { body: '', cursor: new Position(1, 1) };
                    commentForm.classList.remove('expand');
                    commentEditor.getDomNode().style.outline = '';
                    this._error.textContent = '';
                    this._error.classList.add('hidden');
                }
            }
        }));
    }
    /**
     * Command based actions.
     */
    createCommentWidgetFormActions(container, model) {
        const menu = this._commentMenus.getCommentThreadActions(this._contextKeyService);
        this._register(menu);
        this._register(menu.onDidChange(() => {
            this._commentFormActions.setActions(menu);
        }));
        this._commentFormActions = new CommentFormActions(this.keybindingService, this._contextKeyService, this.contextMenuService, container, async (action) => {
            await this._actionRunDelegate?.();
            await action.run({
                thread: this._commentThread,
                text: this.commentEditor.getValue(),
                $mid: 9 /* MarshalledId.CommentThreadReply */
            });
            this.hideReplyArea();
        });
        this._register(this._commentFormActions);
        this._commentFormActions.setActions(menu);
    }
    createCommentWidgetEditorActions(container, model) {
        const editorMenu = this._commentMenus.getCommentEditorActions(this._contextKeyService);
        this._register(editorMenu);
        this._register(editorMenu.onDidChange(() => {
            this._commentEditorActions.setActions(editorMenu, true);
        }));
        this._commentEditorActions = new CommentFormActions(this.keybindingService, this._contextKeyService, this.contextMenuService, container, async (action) => {
            this._actionRunDelegate?.();
            action.run({
                thread: this._commentThread,
                text: this.commentEditor.getValue(),
                $mid: 9 /* MarshalledId.CommentThreadReply */
            });
            this.focusCommentEditor();
        });
        this._register(this._commentEditorActions);
        this._commentEditorActions.setActions(editorMenu, true);
    }
    get isReplyExpanded() {
        return this._container.classList.contains('expand');
    }
    expandReplyArea() {
        if (!this.isReplyExpanded) {
            this._container.classList.add('expand');
            this.commentEditor.focus();
            this.commentEditor.layout();
        }
    }
    clearAndExpandReplyArea() {
        if (!this.isReplyExpanded) {
            this.commentEditor.setValue('');
            this.expandReplyArea();
        }
    }
    hideReplyArea() {
        const domNode = this.commentEditor.getDomNode();
        if (domNode) {
            domNode.style.outline = '';
        }
        this.commentEditor.setValue('');
        this._pendingComment = { body: '', cursor: new Position(1, 1) };
        this._container.classList.remove('expand');
        this._error.textContent = '';
        this._error.classList.add('hidden');
    }
    createReplyButton(commentEditor, commentForm) {
        this._reviewThreadReplyButton = dom.append(commentForm, dom.$(`button.review-thread-reply-button.${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`));
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this._reviewThreadReplyButton, this._commentOptions?.prompt || nls.localize('reply', "Reply...")));
        this._reviewThreadReplyButton.textContent = this._commentOptions?.prompt || nls.localize('reply', "Reply...");
        // bind click/escape actions for reviewThreadReplyButton and textArea
        this._register(dom.addDisposableListener(this._reviewThreadReplyButton, 'click', _ => this.clearAndExpandReplyArea()));
        this._register(dom.addDisposableListener(this._reviewThreadReplyButton, 'focus', _ => this.clearAndExpandReplyArea()));
        this._register(commentEditor.onDidBlurEditorWidget(() => {
            if (commentEditor.getModel().getValueLength() === 0 && commentForm.classList.contains('expand')) {
                commentForm.classList.remove('expand');
            }
        }));
    }
    dispose() {
        super.dispose();
        dispose(this._commentThreadDisposables);
    }
};
CommentReply = __decorate([
    __param(12, ICommentService),
    __param(13, IConfigurationService),
    __param(14, IKeybindingService),
    __param(15, IContextMenuService),
    __param(16, IHoverService),
    __param(17, ITextModelService)
], CommentReply);
export { CommentReply };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFJlcGx5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRSZXBseS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTFHLE9BQU8sRUFBRSxVQUFVLEVBQWUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFeEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBSy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFHbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBR3JFLE9BQU8sRUFBb0IsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUscUJB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