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
import '../media/chatEditingEditorOverlay.css';
import { combinedDisposable, Disposable, DisposableMap, DisposableStore, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, derived, derivedOpts, observableFromEvent, observableFromEventOpts, observableSignalFromEvent, observableValue, transaction } from '../../../../../base/common/observable.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { ActionViewItem } from '../../../../../base/browser/ui/actionbar/actionViewItems.js';
import { $, addDisposableGenericMouseMoveListener, append } from '../../../../../base/browser/dom.js';
import { assertType } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { AcceptAction, navigationBearingFakeActionId, RejectAction } from './chatEditingEditorActions.js';
import { IChatService } from '../../common/chatService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { EditorGroupView } from '../../../../browser/parts/editor/editorGroupView.js';
import { Event } from '../../../../../base/common/event.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { IInlineChatSessionService } from '../../../inlineChat/browser/inlineChatSessionService.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { ObservableEditorSession } from './chatEditingEditorContextKeys.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import * as arrays from '../../../../../base/common/arrays.js';
import { renderAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
let ChatEditorOverlayWidget = class ChatEditorOverlayWidget extends Disposable {
    constructor(_editor, _chatService, _keybindingService, _instaService) {
        super();
        this._editor = _editor;
        this._chatService = _chatService;
        this._keybindingService = _keybindingService;
        this._instaService = _instaService;
        this._showStore = this._store.add(new DisposableStore());
        this._session = observableValue(this, undefined);
        this._entry = observableValue(this, undefined);
        this._navigationBearings = observableValue(this, { changeCount: -1, activeIdx: -1, entriesCount: -1 });
        this._domNode = document.createElement('div');
        this._domNode.classList.add('chat-editor-overlay-widget');
        this._isBusy = derived(r => {
            const entry = this._entry.read(r);
            const session = this._session.read(r);
            return entry?.waitsForLastEdits.read(r) ?? !session?.isGlobalEditingSession; // aka inline chat
        });
        const requestMessage = derived(r => {
            const session = this._session.read(r);
            const chatModel = this._chatService.getSession(session?.chatSessionId ?? '');
            if (!session || !chatModel) {
                return undefined;
            }
            const response = this._entry.read(r)?.lastModifyingResponse.read(r);
            if (!response) {
                return { message: localize('working', "Working...") };
            }
            if (response.isPaused.read(r)) {
                return { message: localize('paused', "Paused"), paused: true };
            }
            const lastPart = observableFromEventOpts({ equalsFn: arrays.equals }, response.onDidChange, () => response.response.value)
                .read(r)
                .filter(part => part.kind === 'progressMessage' || part.kind === 'toolInvocation')
                .at(-1);
            if (lastPart?.kind === 'toolInvocation') {
                return { message: lastPart.invocationMessage };
            }
            else if (lastPart?.kind === 'progressMessage') {
                return { message: lastPart.content };
            }
            else {
                return { message: localize('working', "Working...") };
            }
        });
        const progressNode = document.createElement('div');
        progressNode.classList.add('chat-editor-overlay-progress');
        append(progressNode, renderIcon(ThemeIcon.modify(Codicon.loading, 'spin')));
        const textProgress = append(progressNode, $('span.progress-message'));
        this._domNode.appendChild(progressNode);
        this._store.add(autorun(r => {
            const value = requestMessage.read(r);
            const busy = this._isBusy.read(r) && !value?.paused;
            this._domNode.classList.toggle('busy', busy);
            if (!busy || !value || this._session.read(r)?.isGlobalEditingSession) {
                textProgress.innerText = '';
            }
            else if (value) {
                textProgress.innerText = renderAsPlaintext(value.message);
            }
        }));
        this._toolbarNode = document.createElement('div');
        this._toolbarNode.classList.add('chat-editor-overlay-toolbar');
    }
    dispose() {
        this.hide();
        super.dispose();
    }
    getDomNode() {
        return this._domNode;
    }
    show(session, entry, indicies) {
        this._showStore.clear();
        transaction(tx => {
            this._session.set(session, tx);
            this._entry.set(entry, tx);
        });
        this._showStore.add(autorun(r => {
            const entryIndex = indicies.entryIndex.read(r);
            const changeIndex = indicies.changeIndex.read(r);
            const entries = session.entries.read(r);
            let activeIdx = entryIndex !== undefined && changeIndex !== undefined
                ? changeIndex
                : -1;
            let totalChangesCount = 0;
            for (let i = 0; i < entries.length; i++) {
                const changesCount = entries[i].changesCount.read(r);
                totalChangesCount += changesCount;
                if (entryIndex !== undefined && i < entryIndex) {
                    activeIdx += changesCount;
                }
            }
            this._navigationBearings.set({ changeCount: totalChangesCount, activeIdx, entriesCount: entries.length }, undefined);
        }));
        this._domNode.appendChild(this._toolbarNode);
        this._showStore.add(toDisposable(() => this._toolbarNode.remove()));
        this._showStore.add(this._instaService.createInstance(MenuWorkbenchToolBar, this._toolbarNode, MenuId.ChatEditingEditorContent, {
            telemetrySource: 'chatEditor.overlayToolbar',
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: () => true,
                useSeparatorsInPrimaryActions: true
            },
            menuOptions: { renderShortTitle: true },
            actionViewItemProvider: (action, options) => {
                const that = this;
                if (action.id === navigationBearingFakeActionId) {
                    return new class extends ActionViewItem {
                        constructor() {
                            super(undefined, action, { ...options, icon: false, label: true, keybindingNotRenderedWithLabel: true });
                        }
                        render(container) {
                            super.render(container);
                            container.classList.add('label-item');
                            this._store.add(autorun(r => {
                                assertType(this.label);
                                const { changeCount, activeIdx } = that._navigationBearings.read(r);
                                if (changeCount > 0) {
                                    const n = activeIdx === -1 ? '1' : `${activeIdx + 1}`;
                                    this.label.innerText = localize('nOfM', "{0} of {1}", n, changeCount);
                                }
                                else {
                                    // allow-any-unicode-next-line
                                    this.label.innerText = localize('0Of0', "—");
                                }
                                this.updateTooltip();
                            }));
                        }
                        getTooltip() {
                            const { changeCount, entriesCount } = that._navigationBearings.get();
                            if (changeCount === -1 || entriesCount === -1) {
                                return undefined;
                            }
                            let result;
                            if (changeCount === 1 && entriesCount === 1) {
                                result = localize('tooltip_11', "1 change in 1 file");
                            }
                            else if (changeCount === 1) {
                                result = localize('tooltip_1n', "1 change in {0} files", entriesCount);
                            }
                            else if (entriesCount === 1) {
                                result = localize('tooltip_n1', "{0} changes in 1 file", changeCount);
                            }
                            else {
                                result = localize('tooltip_nm', "{0} changes in {1} files", changeCount, entriesCount);
                            }
                            if (!that._isBusy.get()) {
                                return result;
                            }
                            return localize('tooltip_busy', "{0} - Working...", result);
                        }
                    };
                }
                if (action.id === AcceptAction.ID || action.id === RejectAction.ID) {
                    return new class extends ActionViewItem {
                        constructor() {
                            super(undefined, action, { ...options, icon: false, label: true, keybindingNotRenderedWithLabel: true });
                            this._reveal = this._store.add(new MutableDisposable());
                        }
                        render(container) {
                            super.render(container);
                            if (action.id === AcceptAction.ID) {
                                const listener = this._store.add(new MutableDisposable());
                                this._store.add(autorun(r => {
                                    assertType(this.label);
                                    assertType(this.element);
                                    const ctrl = that._entry.read(r)?.autoAcceptController.read(r);
                                    if (ctrl) {
                                        const r = -100 * (ctrl.remaining / ctrl.total);
                                        this.element.style.setProperty('--vscode-action-item-auto-timeout', `${r}%`);
                                        this.element.classList.toggle('auto', true);
                                        listener.value = addDisposableGenericMouseMoveListener(this.element, () => ctrl.cancel());
                                    }
                                    else {
                                        this.element.classList.toggle('auto', false);
                                        listener.clear();
                                    }
                                }));
                            }
                        }
                        set actionRunner(actionRunner) {
                            super.actionRunner = actionRunner;
                            this._reveal.value = actionRunner.onWillRun(_e => {
                                that._editor.focus();
                            });
                        }
                        get actionRunner() {
                            return super.actionRunner;
                        }
                        getTooltip() {
                            const value = super.getTooltip();
                            if (!value) {
                                return value;
                            }
                            const kb = that._keybindingService.lookupKeybinding(this.action.id);
                            if (!kb) {
                                return value;
                            }
                            return localize('tooltip', "{0} ({1})", value, kb.getLabel());
                        }
                    };
                }
                return undefined;
            }
        }));
    }
    hide() {
        transaction(tx => {
            this._session.set(undefined, tx);
            this._entry.set(undefined, tx);
            this._navigationBearings.set({ changeCount: -1, activeIdx: -1, entriesCount: -1 }, tx);
        });
        this._showStore.clear();
    }
};
ChatEditorOverlayWidget = __decorate([
    __param(1, IChatService),
    __param(2, IKeybindingService),
    __param(3, IInstantiationService)
], ChatEditorOverlayWidget);
let ChatEditingOverlayController = class ChatEditingOverlayController {
    constructor(container, group, instaService, chatService, chatEditingService, inlineChatService) {
        this._store = new DisposableStore();
        this._domNode = document.createElement('div');
        this._domNode.classList.add('chat-editing-editor-overlay');
        this._domNode.style.position = 'absolute';
        this._domNode.style.bottom = `24px`;
        this._domNode.style.right = `24px`;
        this._domNode.style.zIndex = `100`;
        const widget = instaService.createInstance(ChatEditorOverlayWidget, group);
        this._domNode.appendChild(widget.getDomNode());
        this._store.add(toDisposable(() => this._domNode.remove()));
        this._store.add(widget);
        const show = () => {
            if (!container.contains(this._domNode)) {
                container.appendChild(this._domNode);
            }
        };
        const hide = () => {
            if (container.contains(this._domNode)) {
                widget.hide();
                this._domNode.remove();
            }
        };
        const activeEditorSignal = observableSignalFromEvent(this, Event.any(group.onDidActiveEditorChange, group.onDidModelChange));
        const activeUriObs = derivedOpts({ equalsFn: isEqual }, r => {
            activeEditorSignal.read(r); // signal
            const editor = group.activeEditorPane;
            const uri = EditorResourceAccessor.getOriginalUri(editor?.input, { supportSideBySide: SideBySideEditor.PRIMARY });
            return uri;
        });
        const sessionAndEntry = derived(r => {
            activeEditorSignal.read(r); // signal to ensure activeEditor and activeEditorPane don't go out of sync
            const uri = activeUriObs.read(r);
            if (!uri) {
                return undefined;
            }
            return new ObservableEditorSession(uri, chatEditingService, inlineChatService).value.read(r);
        });
        const isInProgress = derived(r => {
            const session = sessionAndEntry.read(r)?.session;
            if (!session) {
                return false;
            }
            const chatModel = chatService.getSession(session.chatSessionId);
            return chatModel.requestInProgressObs.read(r);
        });
        this._store.add(autorun(r => {
            const data = sessionAndEntry.read(r);
            if (!data) {
                hide();
                return;
            }
            const { session, entry } = data;
            if (!session.isGlobalEditingSession && !inlineChatService.hideOnRequest.read(r)) {
                // inline chat - no chat overlay unless hideOnRequest is on
                hide();
                return;
            }
            if (entry?.state.read(r) === 0 /* ModifiedFileEntryState.Modified */ // any entry changing
                || (!session.isGlobalEditingSession && isInProgress.read(r)) // inline chat request
            ) {
                // any session with changes
                const editorPane = group.activeEditorPane;
                assertType(editorPane);
                const changeIndex = derived(r => entry
                    ? entry.getEditorIntegration(editorPane).currentIndex.read(r)
                    : 0);
                const entryIndex = derived(r => entry
                    ? session.entries.read(r).indexOf(entry)
                    : 0);
                widget.show(session, entry, { entryIndex, changeIndex });
                show();
            }
            else {
                // nothing
                hide();
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
ChatEditingOverlayController = __decorate([
    __param(2, IInstantiationService),
    __param(3, IChatService),
    __param(4, IChatEditingService),
    __param(5, IInlineChatSessionService)
], ChatEditingOverlayController);
let ChatEditingEditorOverlay = class ChatEditingEditorOverlay {
    static { this.ID = 'chat.edits.editorOverlay'; }
    constructor(editorGroupsService, instantiationService) {
        this._store = new DisposableStore();
        const editorGroups = observableFromEvent(this, Event.any(editorGroupsService.onDidAddGroup, editorGroupsService.onDidRemoveGroup), () => editorGroupsService.groups);
        const overlayWidgets = new DisposableMap();
        this._store.add(autorun(r => {
            const toDelete = new Set(overlayWidgets.keys());
            const groups = editorGroups.read(r);
            for (const group of groups) {
                if (!(group instanceof EditorGroupView)) {
                    // TODO@jrieken better with https://github.com/microsoft/vscode/tree/ben/layout-group-container
                    continue;
                }
                toDelete.delete(group); // we keep the widget for this group!
                if (!overlayWidgets.has(group)) {
                    const scopedInstaService = instantiationService.createChild(new ServiceCollection([IContextKeyService, group.scopedContextKeyService]));
                    const container = group.element;
                    const ctrl = scopedInstaService.createInstance(ChatEditingOverlayController, container, group);
                    overlayWidgets.set(group, combinedDisposable(ctrl, scopedInstaService));
                }
            }
            for (const group of toDelete) {
                overlayWidgets.deleteAndDispose(group);
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
ChatEditingEditorOverlay = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IInstantiationService)
], ChatEditingEditorOverlay);
export { ChatEditingEditorOverlay };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JPdmVybGF5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdFZGl0b3JPdmVybGF5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sdUNBQXVDLENBQUM7QUFDL0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFKLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBZSxtQkFBbUIsRUFBRSx1QkFBdUIsRUFBRSx5QkFBeUIsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDN00sT0FBTyxFQUFzQixvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxtQkFBbUIsRUFBbUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxSSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSxDQUFDLEVBQUUscUNBQXFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFF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