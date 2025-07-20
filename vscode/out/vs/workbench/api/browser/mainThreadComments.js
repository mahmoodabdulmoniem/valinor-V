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
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { Range } from '../../../editor/common/core/range.js';
import * as languages from '../../../editor/common/languages.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ICommentService } from '../../contrib/comments/browser/commentService.js';
import { CommentsPanel } from '../../contrib/comments/browser/commentsView.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { COMMENTS_VIEW_ID, COMMENTS_VIEW_STORAGE_ID, COMMENTS_VIEW_TITLE } from '../../contrib/comments/browser/commentsTreeViewer.js';
import { Extensions as ViewExtensions, IViewDescriptorService } from '../../common/views.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../browser/parts/views/viewPaneContainer.js';
import { Codicon } from '../../../base/common/codicons.js';
import { registerIcon } from '../../../platform/theme/common/iconRegistry.js';
import { localize } from '../../../nls.js';
import { Schemas } from '../../../base/common/network.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
import { revealCommentThread } from '../../contrib/comments/browser/commentsController.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
export class MainThreadCommentThread {
    get input() {
        return this._input;
    }
    set input(value) {
        this._input = value;
        this._onDidChangeInput.fire(value);
    }
    get onDidChangeInput() { return this._onDidChangeInput.event; }
    get label() {
        return this._label;
    }
    set label(label) {
        this._label = label;
        this._onDidChangeLabel.fire(this._label);
    }
    get contextValue() {
        return this._contextValue;
    }
    set contextValue(context) {
        this._contextValue = context;
    }
    get comments() {
        return this._comments;
    }
    set comments(newComments) {
        this._comments = newComments;
        this._onDidChangeComments.fire(this._comments);
    }
    get onDidChangeComments() { return this._onDidChangeComments.event; }
    set range(range) {
        this._range = range;
    }
    get range() {
        return this._range;
    }
    get onDidChangeCanReply() { return this._onDidChangeCanReply.event; }
    set canReply(state) {
        this._canReply = state;
        this._onDidChangeCanReply.fire(!!this._canReply);
    }
    get canReply() {
        return this._canReply;
    }
    get collapsibleState() {
        return this._collapsibleState;
    }
    set collapsibleState(newState) {
        if (this.initialCollapsibleState === undefined) {
            this.initialCollapsibleState = newState;
        }
        if (newState !== this._collapsibleState) {
            this._collapsibleState = newState;
            this._onDidChangeCollapsibleState.fire(this._collapsibleState);
        }
    }
    get initialCollapsibleState() {
        return this._initialCollapsibleState;
    }
    set initialCollapsibleState(initialCollapsibleState) {
        this._initialCollapsibleState = initialCollapsibleState;
        this._onDidChangeInitialCollapsibleState.fire(initialCollapsibleState);
    }
    get isDisposed() {
        return this._isDisposed;
    }
    isDocumentCommentThread() {
        return this._range === undefined || Range.isIRange(this._range);
    }
    get state() {
        return this._state;
    }
    set state(newState) {
        this._state = newState;
        this._onDidChangeState.fire(this._state);
    }
    get applicability() {
        return this._applicability;
    }
    set applicability(value) {
        this._applicability = value;
        this._onDidChangeApplicability.fire(value);
    }
    get isTemplate() {
        return this._isTemplate;
    }
    constructor(commentThreadHandle, controllerHandle, extensionId, threadId, resource, _range, comments, _canReply, _isTemplate, editorId) {
        this.commentThreadHandle = commentThreadHandle;
        this.controllerHandle = controllerHandle;
        this.extensionId = extensionId;
        this.threadId = threadId;
        this.resource = resource;
        this._range = _range;
        this._canReply = _canReply;
        this._isTemplate = _isTemplate;
        this.editorId = editorId;
        this._onDidChangeInput = new Emitter();
        this._onDidChangeLabel = new Emitter();
        this.onDidChangeLabel = this._onDidChangeLabel.event;
        this._onDidChangeComments = new Emitter();
        this._onDidChangeCanReply = new Emitter();
        this._collapsibleState = languages.CommentThreadCollapsibleState.Collapsed;
        this._onDidChangeCollapsibleState = new Emitter();
        this.onDidChangeCollapsibleState = this._onDidChangeCollapsibleState.event;
        this._onDidChangeInitialCollapsibleState = new Emitter();
        this.onDidChangeInitialCollapsibleState = this._onDidChangeInitialCollapsibleState.event;
        this._onDidChangeApplicability = new Emitter();
        this.onDidChangeApplicability = this._onDidChangeApplicability.event;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        this._isDisposed = false;
        if (_isTemplate) {
            this.comments = [];
        }
        else if (comments) {
            this._comments = comments;
        }
    }
    batchUpdate(changes) {
        const modified = (value) => Object.prototype.hasOwnProperty.call(changes, value);
        if (modified('range')) {
            this._range = changes.range;
        }
        if (modified('label')) {
            this._label = changes.label;
        }
        if (modified('contextValue')) {
            this._contextValue = changes.contextValue === null ? undefined : changes.contextValue;
        }
        if (modified('comments')) {
            this.comments = changes.comments;
        }
        if (modified('collapseState')) {
            this.collapsibleState = changes.collapseState;
        }
        if (modified('canReply')) {
            this.canReply = changes.canReply;
        }
        if (modified('state')) {
            this.state = changes.state;
        }
        if (modified('applicability')) {
            this.applicability = changes.applicability;
        }
        if (modified('isTemplate')) {
            this._isTemplate = changes.isTemplate;
        }
    }
    hasComments() {
        return !!this.comments && this.comments.length > 0;
    }
    dispose() {
        this._isDisposed = true;
        this._onDidChangeCollapsibleState.dispose();
        this._onDidChangeComments.dispose();
        this._onDidChangeInput.dispose();
        this._onDidChangeLabel.dispose();
        this._onDidChangeState.dispose();
    }
    toJSON() {
        return {
            $mid: 7 /* MarshalledId.CommentThread */,
            commentControlHandle: this.controllerHandle,
            commentThreadHandle: this.commentThreadHandle,
        };
    }
}
class CommentThreadWithDisposable {
    constructor(thread) {
        this.thread = thread;
        this.disposableStore = new DisposableStore();
    }
    dispose() {
        this.disposableStore.dispose();
    }
}
export class MainThreadCommentController extends Disposable {
    get handle() {
        return this._handle;
    }
    get id() {
        return this._id;
    }
    get contextValue() {
        return this._id;
    }
    get proxy() {
        return this._proxy;
    }
    get label() {
        return this._label;
    }
    get reactions() {
        return this._reactions;
    }
    set reactions(reactions) {
        this._reactions = reactions;
    }
    get options() {
        return this._features.options;
    }
    get features() {
        return this._features;
    }
    get owner() {
        return this._id;
    }
    constructor(_proxy, _commentService, _handle, _uniqueId, _id, _label, _features) {
        super();
        this._proxy = _proxy;
        this._commentService = _commentService;
        this._handle = _handle;
        this._uniqueId = _uniqueId;
        this._id = _id;
        this._label = _label;
        this._features = _features;
        this._threads = this._register(new DisposableMap());
    }
    get activeComment() {
        return this._activeComment;
    }
    async setActiveCommentAndThread(commentInfo) {
        this._activeComment = commentInfo;
        return this._proxy.$setActiveComment(this._handle, commentInfo ? { commentThreadHandle: commentInfo.thread.commentThreadHandle, uniqueIdInThread: commentInfo.comment?.uniqueIdInThread } : undefined);
    }
    updateFeatures(features) {
        this._features = features;
    }
    createCommentThread(extensionId, commentThreadHandle, threadId, resource, range, comments, isTemplate, editorId) {
        const thread = new MainThreadCommentThread(commentThreadHandle, this.handle, extensionId, threadId, URI.revive(resource).toString(), range, comments, true, isTemplate, editorId);
        const threadWithDisposable = new CommentThreadWithDisposable(thread);
        this._threads.set(commentThreadHandle, threadWithDisposable);
        threadWithDisposable.disposableStore.add(thread.onDidChangeCollapsibleState(() => {
            this.proxy.$updateCommentThread(this.handle, thread.commentThreadHandle, { collapseState: thread.collapsibleState });
        }));
        if (thread.isDocumentCommentThread()) {
            this._commentService.updateComments(this._uniqueId, {
                added: [thread],
                removed: [],
                changed: [],
                pending: []
            });
        }
        else {
            this._commentService.updateNotebookComments(this._uniqueId, {
                added: [thread],
                removed: [],
                changed: [],
                pending: []
            });
        }
        return thread;
    }
    updateCommentThread(commentThreadHandle, threadId, resource, changes) {
        const thread = this.getKnownThread(commentThreadHandle);
        thread.batchUpdate(changes);
        if (thread.isDocumentCommentThread()) {
            this._commentService.updateComments(this._uniqueId, {
                added: [],
                removed: [],
                changed: [thread],
                pending: []
            });
        }
        else {
            this._commentService.updateNotebookComments(this._uniqueId, {
                added: [],
                removed: [],
                changed: [thread],
                pending: []
            });
        }
    }
    deleteCommentThread(commentThreadHandle) {
        const thread = this.getKnownThread(commentThreadHandle);
        this._threads.deleteAndDispose(commentThreadHandle);
        thread.dispose();
        if (thread.isDocumentCommentThread()) {
            this._commentService.updateComments(this._uniqueId, {
                added: [],
                removed: [thread],
                changed: [],
                pending: []
            });
        }
        else {
            this._commentService.updateNotebookComments(this._uniqueId, {
                added: [],
                removed: [thread],
                changed: [],
                pending: []
            });
        }
    }
    deleteCommentThreadMain(commentThreadId) {
        for (const { thread } of this._threads.values()) {
            if (thread.threadId === commentThreadId) {
                this._proxy.$deleteCommentThread(this._handle, thread.commentThreadHandle);
            }
        }
    }
    updateInput(input) {
        const thread = this.activeEditingCommentThread;
        if (thread && thread.input) {
            const commentInput = thread.input;
            commentInput.value = input;
            thread.input = commentInput;
        }
    }
    updateCommentingRanges(resourceHints) {
        this._commentService.updateCommentingRanges(this._uniqueId, resourceHints);
    }
    getKnownThread(commentThreadHandle) {
        const thread = this._threads.get(commentThreadHandle);
        if (!thread) {
            throw new Error('unknown thread');
        }
        return thread.thread;
    }
    async getDocumentComments(resource, token) {
        if (resource.scheme === Schemas.vscodeNotebookCell) {
            return {
                uniqueOwner: this._uniqueId,
                label: this.label,
                threads: [],
                commentingRanges: {
                    resource: resource,
                    ranges: [],
                    fileComments: false
                }
            };
        }
        const ret = [];
        for (const thread of [...this._threads.keys()]) {
            const commentThread = this._threads.get(thread);
            if (commentThread.thread.resource === resource.toString()) {
                if (commentThread.thread.isDocumentCommentThread()) {
                    ret.push(commentThread.thread);
                }
            }
        }
        const commentingRanges = await this._proxy.$provideCommentingRanges(this.handle, resource, token);
        return {
            uniqueOwner: this._uniqueId,
            label: this.label,
            threads: ret,
            commentingRanges: {
                resource: resource,
                ranges: commentingRanges?.ranges || [],
                fileComments: !!commentingRanges?.fileComments
            }
        };
    }
    async getNotebookComments(resource, token) {
        if (resource.scheme !== Schemas.vscodeNotebookCell) {
            return {
                uniqueOwner: this._uniqueId,
                label: this.label,
                threads: []
            };
        }
        const ret = [];
        for (const thread of [...this._threads.keys()]) {
            const commentThread = this._threads.get(thread);
            if (commentThread.thread.resource === resource.toString()) {
                if (!commentThread.thread.isDocumentCommentThread()) {
                    ret.push(commentThread.thread);
                }
            }
        }
        return {
            uniqueOwner: this._uniqueId,
            label: this.label,
            threads: ret
        };
    }
    async toggleReaction(uri, thread, comment, reaction, token) {
        return this._proxy.$toggleReaction(this._handle, thread.commentThreadHandle, uri, comment, reaction);
    }
    getAllComments() {
        const ret = [];
        for (const thread of [...this._threads.keys()]) {
            ret.push(this._threads.get(thread).thread);
        }
        return ret;
    }
    createCommentThreadTemplate(resource, range, editorId) {
        return this._proxy.$createCommentThreadTemplate(this.handle, resource, range, editorId);
    }
    async updateCommentThreadTemplate(threadHandle, range) {
        await this._proxy.$updateCommentThreadTemplate(this.handle, threadHandle, range);
    }
    toJSON() {
        return {
            $mid: 6 /* MarshalledId.CommentController */,
            handle: this.handle
        };
    }
}
const commentsViewIcon = registerIcon('comments-view-icon', Codicon.commentDiscussion, localize('commentsViewIcon', 'View icon of the comments view.'));
let MainThreadComments = class MainThreadComments extends Disposable {
    constructor(extHostContext, _commentService, _viewsService, _viewDescriptorService, _uriIdentityService, _editorService) {
        super();
        this._commentService = _commentService;
        this._viewsService = _viewsService;
        this._viewDescriptorService = _viewDescriptorService;
        this._uriIdentityService = _uriIdentityService;
        this._editorService = _editorService;
        this._handlers = new Map();
        this._commentControllers = new Map();
        this._activeEditingCommentThreadDisposables = this._register(new DisposableStore());
        this._openViewListener = this._register(new MutableDisposable());
        this._onChangeContainerListener = this._register(new MutableDisposable());
        this._onChangeContainerLocationListener = this._register(new MutableDisposable());
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostComments);
        this._commentService.unregisterCommentController();
        this._register(this._commentService.onDidChangeActiveEditingCommentThread(async (thread) => {
            const handle = thread.controllerHandle;
            const controller = this._commentControllers.get(handle);
            if (!controller) {
                return;
            }
            this._activeEditingCommentThreadDisposables.clear();
            this._activeEditingCommentThread = thread;
            controller.activeEditingCommentThread = this._activeEditingCommentThread;
        }));
    }
    $registerCommentController(handle, id, label, extensionId) {
        const providerId = `${id}-${extensionId}`;
        this._handlers.set(handle, providerId);
        const provider = new MainThreadCommentController(this._proxy, this._commentService, handle, providerId, id, label, {});
        this._commentService.registerCommentController(providerId, provider);
        this._commentControllers.set(handle, provider);
        this._register(this._commentService.onResourceHasCommentingRanges(e => {
            this.registerView();
        }));
        this._register(this._commentService.onDidUpdateCommentThreads(e => {
            this.registerView();
        }));
        this._commentService.setWorkspaceComments(String(handle), []);
    }
    $unregisterCommentController(handle) {
        const providerId = this._handlers.get(handle);
        this._handlers.delete(handle);
        this._commentControllers.get(handle)?.dispose();
        this._commentControllers.delete(handle);
        if (typeof providerId !== 'string') {
            return;
            // throw new Error('unknown handler');
        }
        else {
            this._commentService.unregisterCommentController(providerId);
        }
    }
    $updateCommentControllerFeatures(handle, features) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return undefined;
        }
        provider.updateFeatures(features);
    }
    $createCommentThread(handle, commentThreadHandle, threadId, resource, range, comments, extensionId, isTemplate, editorId) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return undefined;
        }
        return provider.createCommentThread(extensionId.value, commentThreadHandle, threadId, resource, range, comments, isTemplate, editorId);
    }
    $updateCommentThread(handle, commentThreadHandle, threadId, resource, changes) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return undefined;
        }
        return provider.updateCommentThread(commentThreadHandle, threadId, resource, changes);
    }
    $deleteCommentThread(handle, commentThreadHandle) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return;
        }
        return provider.deleteCommentThread(commentThreadHandle);
    }
    $updateCommentingRanges(handle, resourceHints) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return;
        }
        provider.updateCommentingRanges(resourceHints);
    }
    async $revealCommentThread(handle, commentThreadHandle, commentUniqueIdInThread, options) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return Promise.resolve();
        }
        const thread = provider.getAllComments().find(thread => thread.commentThreadHandle === commentThreadHandle);
        if (!thread || !thread.isDocumentCommentThread()) {
            return Promise.resolve();
        }
        const comment = thread.comments?.find(comment => comment.uniqueIdInThread === commentUniqueIdInThread);
        revealCommentThread(this._commentService, this._editorService, this._uriIdentityService, thread, comment, options.focusReply, undefined, options.preserveFocus);
    }
    async $hideCommentThread(handle, commentThreadHandle) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return Promise.resolve();
        }
        const thread = provider.getAllComments().find(thread => thread.commentThreadHandle === commentThreadHandle);
        if (!thread || !thread.isDocumentCommentThread()) {
            return Promise.resolve();
        }
        thread.collapsibleState = languages.CommentThreadCollapsibleState.Collapsed;
    }
    registerView() {
        const commentsPanelAlreadyConstructed = !!this._viewDescriptorService.getViewDescriptorById(COMMENTS_VIEW_ID);
        if (!commentsPanelAlreadyConstructed) {
            const VIEW_CONTAINER = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
                id: COMMENTS_VIEW_ID,
                title: COMMENTS_VIEW_TITLE,
                ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [COMMENTS_VIEW_ID, { mergeViewWithContainerWhenSingleView: true }]),
                storageId: COMMENTS_VIEW_STORAGE_ID,
                hideIfEmpty: true,
                icon: commentsViewIcon,
                order: 10,
            }, 1 /* ViewContainerLocation.Panel */);
            Registry.as(ViewExtensions.ViewsRegistry).registerViews([{
                    id: COMMENTS_VIEW_ID,
                    name: COMMENTS_VIEW_TITLE,
                    canToggleVisibility: false,
                    ctorDescriptor: new SyncDescriptor(CommentsPanel),
                    canMoveView: true,
                    containerIcon: commentsViewIcon,
                    focusCommand: {
                        id: 'workbench.action.focusCommentsPanel'
                    }
                }], VIEW_CONTAINER);
        }
        this.registerViewListeners(commentsPanelAlreadyConstructed);
    }
    setComments() {
        [...this._commentControllers.keys()].forEach(handle => {
            const threads = this._commentControllers.get(handle).getAllComments();
            if (threads.length) {
                const providerId = this.getHandler(handle);
                this._commentService.setWorkspaceComments(providerId, threads);
            }
        });
    }
    registerViewOpenedListener() {
        if (!this._openViewListener.value) {
            this._openViewListener.value = this._viewsService.onDidChangeViewVisibility(e => {
                if (e.id === COMMENTS_VIEW_ID && e.visible) {
                    this.setComments();
                    if (this._openViewListener) {
                        this._openViewListener.dispose();
                    }
                }
            });
        }
    }
    /**
     * If the comments view has never been opened, the constructor for it has not yet run so it has
     * no listeners for comment threads being set or updated. Listen for the view opening for the
     * first time and send it comments then.
     */
    registerViewListeners(commentsPanelAlreadyConstructed) {
        if (!commentsPanelAlreadyConstructed) {
            this.registerViewOpenedListener();
        }
        if (!this._onChangeContainerListener.value) {
            this._onChangeContainerListener.value = this._viewDescriptorService.onDidChangeContainer(e => {
                if (e.views.find(view => view.id === COMMENTS_VIEW_ID)) {
                    this.setComments();
                    this.registerViewOpenedListener();
                }
            });
        }
        if (!this._onChangeContainerLocationListener.value) {
            this._onChangeContainerLocationListener.value = this._viewDescriptorService.onDidChangeContainerLocation(e => {
                const commentsContainer = this._viewDescriptorService.getViewContainerByViewId(COMMENTS_VIEW_ID);
                if (e.viewContainer.id === commentsContainer?.id) {
                    this.setComments();
                    this.registerViewOpenedListener();
                }
            });
        }
    }
    getHandler(handle) {
        if (!this._handlers.has(handle)) {
            throw new Error('Unknown handler');
        }
        return this._handlers.get(handle);
    }
};
MainThreadComments = __decorate([
    extHostNamedCustomer(MainContext.MainThreadComments),
    __param(1, ICommentService),
    __param(2, IViewsService),
    __param(3, IViewDescriptorService),
    __param(4, IUriIdentityService),
    __param(5, IEditorService)
], MainThreadComments);
export { MainThreadComments };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbW1lbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZENvbW1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvSCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRSxPQUFPLEtBQUssU0FBUyxNQUFNLHFDQUFxQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFzQixlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFpRCxjQUFjLEVBQUUsV0FBVyxFQUFpRCxNQUFNLCtCQUErQixDQUFDO0FBQzFLLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSx3QkFBd0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZJLE9BQU8sRUFBMEMsVUFBVSxJQUFJLGNBQWMsRUFBeUMsc0JBQXNCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1SyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDdkYsT0FBTyxFQUFFLGlC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