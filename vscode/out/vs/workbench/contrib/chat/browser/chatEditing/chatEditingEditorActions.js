/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../nls.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
import { ctxHasEditorModification, ctxHasRequestInProgress, ctxIsGlobalEditingSession, ctxReviewModeEnabled } from './chatEditingEditorContextKeys.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ACTIVE_GROUP, IEditorService } from '../../../../services/editor/common/editorService.js';
import { CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME, IChatEditingService } from '../../common/chatEditingService.js';
import { resolveCommandsContext } from '../../../../browser/parts/editor/editorCommandsContext.js';
import { IListService } from '../../../../../platform/list/browser/listService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { EditorResourceAccessor, SideBySideEditor, TEXT_DIFF_EDITOR_ID } from '../../../../common/editor.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_EDITOR_FOCUSED } from '../../../notebook/common/notebookContextKeys.js';
class ChatEditingEditorAction extends Action2 {
    constructor(desc) {
        super({
            category: CHAT_CATEGORY,
            ...desc
        });
    }
    async run(accessor, ...args) {
        const instaService = accessor.get(IInstantiationService);
        const chatEditingService = accessor.get(IChatEditingService);
        const editorService = accessor.get(IEditorService);
        const uri = EditorResourceAccessor.getOriginalUri(editorService.activeEditorPane?.input, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (!uri || !editorService.activeEditorPane) {
            return;
        }
        const session = chatEditingService.editingSessionsObs.get()
            .find(candidate => candidate.getEntry(uri));
        if (!session) {
            return;
        }
        const entry = session.getEntry(uri);
        const ctrl = entry.getEditorIntegration(editorService.activeEditorPane);
        return instaService.invokeFunction(this.runChatEditingCommand.bind(this), session, entry, ctrl, ...args);
    }
}
class NavigateAction extends ChatEditingEditorAction {
    constructor(next) {
        super({
            id: next
                ? 'chatEditor.action.navigateNext'
                : 'chatEditor.action.navigatePrevious',
            title: next
                ? localize2('next', 'Go to Next Chat Edit')
                : localize2('prev', 'Go to Previous Chat Edit'),
            icon: next ? Codicon.arrowDown : Codicon.arrowUp,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ctxHasEditorModification),
            keybinding: {
                primary: next
                    ? 512 /* KeyMod.Alt */ | 63 /* KeyCode.F5 */
                    : 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 63 /* KeyCode.F5 */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(ctxHasEditorModification, ContextKeyExpr.or(EditorContextKeys.focus, NOTEBOOK_CELL_LIST_FOCUSED)),
            },
            f1: true,
            menu: {
                id: MenuId.ChatEditingEditorContent,
                group: 'navigate',
                order: !next ? 2 : 3,
                when: ContextKeyExpr.and(ctxReviewModeEnabled, ctxHasEditorModification)
            }
        });
        this.next = next;
    }
    async runChatEditingCommand(accessor, session, entry, ctrl) {
        const instaService = accessor.get(IInstantiationService);
        const done = this.next
            ? ctrl.next(false)
            : ctrl.previous(false);
        if (done) {
            return;
        }
        const didOpenNext = await instaService.invokeFunction(openNextOrPreviousChange, session, entry, this.next);
        if (didOpenNext) {
            return;
        }
        //ELSE: wrap inside the same file
        this.next
            ? ctrl.next(true)
            : ctrl.previous(true);
    }
}
async function openNextOrPreviousChange(accessor, session, entry, next) {
    const editorService = accessor.get(IEditorService);
    const entries = session.entries.get();
    let idx = entries.indexOf(entry);
    let newEntry;
    while (true) {
        idx = (idx + (next ? 1 : -1) + entries.length) % entries.length;
        newEntry = entries[idx];
        if (newEntry.state.get() === 0 /* ModifiedFileEntryState.Modified */) {
            break;
        }
        else if (newEntry === entry) {
            return false;
        }
    }
    const pane = await editorService.openEditor({
        resource: newEntry.modifiedURI,
        options: {
            revealIfOpened: false,
            revealIfVisible: false,
        }
    }, ACTIVE_GROUP);
    if (!pane) {
        return false;
    }
    if (session.entries.get().includes(newEntry)) {
        // make sure newEntry is still valid!
        newEntry.getEditorIntegration(pane).reveal(next);
    }
    return true;
}
class KeepOrUndoAction extends ChatEditingEditorAction {
    constructor(id, _keep) {
        super({
            id,
            title: _keep
                ? localize2('accept', 'Keep Chat Edits')
                : localize2('discard', 'Undo Chat Edits'),
            shortTitle: _keep
                ? localize2('accept2', 'Keep')
                : localize2('discard2', 'Undo'),
            tooltip: _keep
                ? localize2('accept3', 'Keep Chat Edits in this File')
                : localize2('discard3', 'Undo Chat Edits in this File'),
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            icon: _keep
                ? Codicon.check
                : Codicon.discard,
            f1: true,
            keybinding: {
                when: ContextKeyExpr.or(EditorContextKeys.focus, NOTEBOOK_EDITOR_FOCUSED),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10, // win over new-window-action
                primary: _keep
                    ? 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 55 /* KeyCode.KeyY */
                    : 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */,
            },
            menu: {
                id: MenuId.ChatEditingEditorContent,
                group: 'a_resolve',
                order: _keep ? 0 : 1,
                when: ContextKeyExpr.or(ContextKeyExpr.and(ctxIsGlobalEditingSession.negate(), ctxHasRequestInProgress.negate()), // Inline chat
                ContextKeyExpr.and(ctxIsGlobalEditingSession, !_keep ? ctxReviewModeEnabled : undefined))
            }
        });
        this._keep = _keep;
    }
    async runChatEditingCommand(accessor, session, entry, _integration) {
        const instaService = accessor.get(IInstantiationService);
        if (this._keep) {
            session.accept(entry.modifiedURI);
        }
        else {
            session.reject(entry.modifiedURI);
        }
        await instaService.invokeFunction(openNextOrPreviousChange, session, entry, true);
    }
}
export class AcceptAction extends KeepOrUndoAction {
    static { this.ID = 'chatEditor.action.accept'; }
    constructor() {
        super(AcceptAction.ID, true);
    }
}
export class RejectAction extends KeepOrUndoAction {
    static { this.ID = 'chatEditor.action.reject'; }
    constructor() {
        super(RejectAction.ID, false);
    }
}
class AcceptRejectHunkAction extends ChatEditingEditorAction {
    constructor(_accept) {
        super({
            id: _accept ? 'chatEditor.action.acceptHunk' : 'chatEditor.action.undoHunk',
            title: _accept ? localize2('acceptHunk', 'Keep this Change') : localize2('undo', 'Undo this Change'),
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            icon: _accept ? Codicon.check : Codicon.discard,
            f1: true,
            keybinding: {
                when: ContextKeyExpr.or(EditorContextKeys.focus, NOTEBOOK_CELL_LIST_FOCUSED),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                primary: _accept
                    ? 2048 /* KeyMod.CtrlCmd */ | 55 /* KeyCode.KeyY */
                    : 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */
            },
            menu: {
                id: MenuId.ChatEditingEditorHunk,
                order: 1
            }
        });
        this._accept = _accept;
    }
    async runChatEditingCommand(accessor, session, entry, ctrl, ...args) {
        const instaService = accessor.get(IInstantiationService);
        if (this._accept) {
            await ctrl.acceptNearestChange(args[0]);
        }
        else {
            await ctrl.rejectNearestChange(args[0]);
        }
        if (entry.changesCount.get() === 0) {
            // no more changes, move to next file
            await instaService.invokeFunction(openNextOrPreviousChange, session, entry, true);
        }
    }
}
class ToggleDiffAction extends ChatEditingEditorAction {
    constructor() {
        super({
            id: 'chatEditor.action.toggleDiff',
            title: localize2('diff', 'Toggle Diff Editor for Chat Edits'),
            category: CHAT_CATEGORY,
            toggled: {
                condition: ContextKeyExpr.or(EditorContextKeys.inDiffEditor, ActiveEditorContext.isEqualTo(TEXT_DIFF_EDITOR_ID)),
                icon: Codicon.goToFile,
            },
            precondition: ContextKeyExpr.and(ctxHasEditorModification),
            icon: Codicon.diffSingle,
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 65 /* KeyCode.F7 */,
            },
            menu: [{
                    id: MenuId.ChatEditingEditorHunk,
                    order: 10
                }, {
                    id: MenuId.ChatEditingEditorContent,
                    group: 'a_resolve',
                    order: 2,
                    when: ContextKeyExpr.and(ctxReviewModeEnabled)
                }]
        });
    }
    runChatEditingCommand(_accessor, _session, _entry, integration, ...args) {
        integration.toggleDiff(args[0]);
    }
}
class ToggleAccessibleDiffViewAction extends ChatEditingEditorAction {
    constructor() {
        super({
            id: 'chatEditor.action.showAccessibleDiffView',
            title: localize2('accessibleDiff', 'Show Accessible Diff View for Chat Edits'),
            f1: true,
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 65 /* KeyCode.F7 */,
            }
        });
    }
    runChatEditingCommand(_accessor, _session, _entry, integration) {
        integration.enableAccessibleDiffView();
    }
}
export class ReviewChangesAction extends ChatEditingEditorAction {
    constructor() {
        super({
            id: 'chatEditor.action.reviewChanges',
            title: localize2('review', "Review"),
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            menu: [{
                    id: MenuId.ChatEditingEditorContent,
                    group: 'a_resolve',
                    order: 3,
                    when: ContextKeyExpr.and(ctxReviewModeEnabled.negate(), ctxHasRequestInProgress.negate()),
                }]
        });
    }
    runChatEditingCommand(_accessor, _session, entry, _integration, ..._args) {
        entry.enableReviewModeUntilSettled();
    }
}
export class AcceptAllEditsAction extends ChatEditingEditorAction {
    static { this.ID = 'chatEditor.action.acceptAllEdits'; }
    constructor() {
        super({
            id: AcceptAllEditsAction.ID,
            title: localize2('acceptAllEdits', 'Keep All Chat Edits'),
            tooltip: localize2('acceptAllEditsTooltip', 'Keep All Chat Edits in this Session'),
            precondition: ContextKeyExpr.and(ctxHasEditorModification, ctxHasRequestInProgress.negate()),
            icon: Codicon.checkAll,
            f1: true,
            keybinding: {
                when: ContextKeyExpr.or(EditorContextKeys.focus, NOTEBOOK_EDITOR_FOCUSED),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 55 /* KeyCode.KeyY */,
            },
        });
    }
    async runChatEditingCommand(_accessor, session, _entry, _integration, ..._args) {
        await session.accept();
    }
}
// --- multi file diff
class MultiDiffAcceptDiscardAction extends Action2 {
    constructor(accept) {
        super({
            id: accept ? 'chatEditing.multidiff.acceptAllFiles' : 'chatEditing.multidiff.discardAllFiles',
            title: accept ? localize('accept4', 'Keep All Edits') : localize('discard4', 'Undo All Edits'),
            icon: accept ? Codicon.check : Codicon.discard,
            menu: {
                when: ContextKeyExpr.equals('resourceScheme', CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME),
                id: MenuId.EditorTitle,
                order: accept ? 0 : 1,
                group: 'navigation',
            },
        });
        this.accept = accept;
    }
    async run(accessor, ...args) {
        const chatEditingService = accessor.get(IChatEditingService);
        const editorService = accessor.get(IEditorService);
        const editorGroupsService = accessor.get(IEditorGroupsService);
        const listService = accessor.get(IListService);
        const resolvedContext = resolveCommandsContext(args, editorService, editorGroupsService, listService);
        const groupContext = resolvedContext.groupedEditors[0];
        if (!groupContext) {
            return;
        }
        const editor = groupContext.editors[0];
        if (!(editor instanceof MultiDiffEditorInput) || !editor.resource) {
            return;
        }
        const session = chatEditingService.getEditingSession(editor.resource.authority);
        if (this.accept) {
            await session?.accept();
        }
        else {
            await session?.reject();
        }
    }
}
export function registerChatEditorActions() {
    registerAction2(class NextAction extends NavigateAction {
        constructor() { super(true); }
    });
    registerAction2(class PrevAction extends NavigateAction {
        constructor() { super(false); }
    });
    registerAction2(ReviewChangesAction);
    registerAction2(AcceptAction);
    registerAction2(RejectAction);
    registerAction2(AcceptAllEditsAction);
    registerAction2(class AcceptHunkAction extends AcceptRejectHunkAction {
        constructor() { super(true); }
    });
    registerAction2(class RejectHunkAction extends AcceptRejectHunkAction {
        constructor() { super(false); }
    });
    registerAction2(ToggleDiffAction);
    registerAction2(ToggleAccessibleDiffViewAction);
    registerAction2(class extends MultiDiffAcceptDiscardAction {
        constructor() { super(true); }
    });
    registerAction2(class extends MultiDiffAcceptDiscardAction {
        constructor() { super(false); }
    });
    MenuRegistry.appendMenuItem(MenuId.ChatEditingEditorContent, {
        command: {
            id: navigationBearingFakeActionId,
            title: localize('label', "Navigation Status"),
            precondition: ContextKeyExpr.false(),
        },
        group: 'navigate',
        order: -1,
        when: ContextKeyExpr.and(ctxReviewModeEnabled, ctxHasEditorModification),
    });
}
export const navigationBearingFakeActionId = 'chatEditor.navigation.bearings';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdFZGl0b3JBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQW1CLE1BQU0sRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFHcEksT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzFELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSx1QkFBdUIsRUFBRSx5QkFBeUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZKLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSw4Q0FBOEMsRUFBRSxtQkFBbUIsRUFBd0csTUFBTSxvQ0FBb0MsQ0FBQztBQUMvTixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDakcsT0FBTyxFQUFFLG9CQUFv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