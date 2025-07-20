/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
import { EmbeddedDiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { InlineChatController, InlineChatController1, InlineChatController2, InlineChatRunOptions } from './inlineChatController.js';
import { ACTION_ACCEPT_CHANGES, CTX_INLINE_CHAT_HAS_AGENT, CTX_INLINE_CHAT_HAS_STASHED_SESSION, CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, CTX_INLINE_CHAT_INNER_CURSOR_LAST, CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_OUTER_CURSOR_POSITION, MENU_INLINE_CHAT_WIDGET_STATUS, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS, CTX_INLINE_CHAT_RESPONSE_TYPE, ACTION_REGENERATE_RESPONSE, ACTION_VIEW_IN_CHAT, ACTION_TOGGLE_DIFF, CTX_INLINE_CHAT_CHANGE_HAS_DIFF, CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF, MENU_INLINE_CHAT_ZONE, ACTION_DISCARD_CHANGES, CTX_INLINE_CHAT_POSSIBLE, ACTION_START, CTX_INLINE_CHAT_HAS_AGENT2, MENU_INLINE_CHAT_SIDE } from '../common/inlineChat.js';
import { ctxHasEditorModification, ctxHasRequestInProgress, ctxIsGlobalEditingSession, ctxRequestCount } from '../../chat/browser/chatEditing/chatEditingEditorContextKeys.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IChatService } from '../../chat/common/chatService.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
CommandsRegistry.registerCommandAlias('interactiveEditor.start', 'inlineChat.start');
CommandsRegistry.registerCommandAlias('interactive.acceptChanges', ACTION_ACCEPT_CHANGES);
export const START_INLINE_CHAT = registerIcon('start-inline-chat', Codicon.sparkle, localize('startInlineChat', 'Icon which spawns the inline chat from the editor toolbar.'));
let _holdForSpeech = undefined;
export function setHoldForSpeech(holdForSpeech) {
    _holdForSpeech = holdForSpeech;
}
export class StartSessionAction extends Action2 {
    constructor() {
        super({
            id: ACTION_START,
            title: localize2('run', 'Editor Inline Chat'),
            category: AbstractInline1ChatAction.category,
            f1: true,
            precondition: ContextKeyExpr.and(ContextKeyExpr.or(CTX_INLINE_CHAT_HAS_AGENT, CTX_INLINE_CHAT_HAS_AGENT2), CTX_INLINE_CHAT_POSSIBLE, EditorContextKeys.writable, EditorContextKeys.editorSimpleInput.negate()),
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            },
            icon: START_INLINE_CHAT,
            menu: [{
                    id: MenuId.ChatTitleBarMenu,
                    group: 'a_open',
                    order: 3,
                }, {
                    id: MenuId.ChatTextEditorMenu,
                    group: 'a_open',
                    order: 1
                }]
        });
    }
    run(accessor, ...args) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getActiveCodeEditor();
        if (!editor || editor.isSimpleWidget) {
            // well, at least we tried...
            return;
        }
        // precondition does hold
        return editor.invokeWithinContext((editorAccessor) => {
            const kbService = editorAccessor.get(IContextKeyService);
            const logService = editorAccessor.get(ILogService);
            const enabled = kbService.contextMatchesRules(this.desc.precondition ?? undefined);
            if (!enabled) {
                logService.debug(`[EditorAction2] NOT running command because its precondition is FALSE`, this.desc.id, this.desc.precondition?.serialize());
                return;
            }
            return this._runEditorCommand(editorAccessor, editor, ...args);
        });
    }
    _runEditorCommand(accessor, editor, ..._args) {
        const ctrl = InlineChatController.get(editor);
        if (!ctrl) {
            return;
        }
        if (_holdForSpeech) {
            accessor.get(IInstantiationService).invokeFunction(_holdForSpeech, ctrl, this);
        }
        let options;
        const arg = _args[0];
        if (arg && InlineChatRunOptions.isInlineChatRunOptions(arg)) {
            options = arg;
        }
        InlineChatController.get(editor)?.run({ ...options });
    }
}
export class FocusInlineChat extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.focus',
            title: localize2('focus', "Focus Input"),
            f1: true,
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_FOCUSED.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: [{
                    weight: 0 /* KeybindingWeight.EditorCore */ + 10, // win against core_command
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_OUTER_CURSOR_POSITION.isEqualTo('above'), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                }, {
                    weight: 0 /* KeybindingWeight.EditorCore */ + 10, // win against core_command
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_OUTER_CURSOR_POSITION.isEqualTo('below'), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                }]
        });
    }
    runEditorCommand(_accessor, editor, ..._args) {
        InlineChatController.get(editor)?.focus();
    }
}
//#region --- VERSION 1
export class UnstashSessionAction extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.unstash',
            title: localize2('unstash', "Resume Last Dismissed Inline Chat"),
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_STASHED_SESSION, EditorContextKeys.writable),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */,
            }
        });
    }
    async runEditorCommand(_accessor, editor, ..._args) {
        const ctrl = InlineChatController1.get(editor);
        if (ctrl) {
            const session = ctrl.unstashLastSession();
            if (session) {
                ctrl.run({
                    existingSession: session,
                });
            }
        }
    }
}
export class AbstractInline1ChatAction extends EditorAction2 {
    static { this.category = localize2('cat', "Inline Chat"); }
    constructor(desc) {
        const massageMenu = (menu) => {
            if (Array.isArray(menu)) {
                for (const entry of menu) {
                    entry.when = ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT, entry.when);
                }
            }
            else if (menu) {
                menu.when = ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT, menu.when);
            }
        };
        if (Array.isArray(desc.menu)) {
            massageMenu(desc.menu);
        }
        else {
            massageMenu(desc.menu);
        }
        super({
            ...desc,
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT, desc.precondition)
        });
    }
    runEditorCommand(accessor, editor, ..._args) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        let ctrl = InlineChatController1.get(editor);
        if (!ctrl) {
            const { activeTextEditorControl } = editorService;
            if (isCodeEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl;
            }
            else if (isDiffEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl.getModifiedEditor();
            }
            ctrl = InlineChatController1.get(editor);
        }
        if (!ctrl) {
            logService.warn('[IE] NO controller found for action', this.desc.id, editor.getModel()?.uri);
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        if (!ctrl) {
            for (const diffEditor of accessor.get(ICodeEditorService).listDiffEditors()) {
                if (diffEditor.getOriginalEditor() === editor || diffEditor.getModifiedEditor() === editor) {
                    if (diffEditor instanceof EmbeddedDiffEditorWidget) {
                        this.runEditorCommand(accessor, diffEditor.getParentEditor(), ..._args);
                    }
                }
            }
            return;
        }
        this.runInlineChatCommand(accessor, ctrl, editor, ..._args);
    }
}
export class ArrowOutUpAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.arrowOutUp',
            title: localize('arrowUp', 'Cursor Up'),
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, EditorContextKeys.isEmbeddedDiffEditor.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: {
                weight: 0 /* KeybindingWeight.EditorCore */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */
            }
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.arrowOut(true);
    }
}
export class ArrowOutDownAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.arrowOutDown',
            title: localize('arrowDown', 'Cursor Down'),
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_LAST, EditorContextKeys.isEmbeddedDiffEditor.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: {
                weight: 0 /* KeybindingWeight.EditorCore */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */
            }
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.arrowOut(false);
    }
}
export class AcceptChanges extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_ACCEPT_CHANGES,
            title: localize2('apply1', "Accept Changes"),
            shortTitle: localize('apply2', 'Accept'),
            icon: Codicon.check,
            f1: true,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE),
            keybinding: [{
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                }],
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */)),
                }, {
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    order: 1,
                }]
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, hunk) {
        ctrl.acceptHunk(hunk);
    }
}
export class DiscardHunkAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_DISCARD_CHANGES,
            title: localize('discard', 'Discard'),
            icon: Codicon.chromeClose,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: [{
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    order: 2
                }],
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
                when: CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */)
            }
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, hunk) {
        return ctrl.discardHunk(hunk);
    }
}
export class RerunAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_REGENERATE_RESPONSE,
            title: localize2('chat.rerun.label', "Rerun Request"),
            shortTitle: localize('rerun', 'Rerun'),
            f1: false,
            icon: Codicon.refresh,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: {
                id: MENU_INLINE_CHAT_WIDGET_STATUS,
                group: '0_main',
                order: 5,
                when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate(), CTX_INLINE_CHAT_RESPONSE_TYPE.notEqualsTo("none" /* InlineChatResponseType.None */))
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */
            }
        });
    }
    async runInlineChatCommand(accessor, ctrl, _editor, ..._args) {
        const chatService = accessor.get(IChatService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const model = ctrl.chatWidget.viewModel?.model;
        if (!model) {
            return;
        }
        const lastRequest = model.getRequests().at(-1);
        if (lastRequest) {
            const widget = chatWidgetService.getWidgetBySessionId(model.sessionId);
            await chatService.resendRequest(lastRequest, {
                noCommandDetection: false,
                attempt: lastRequest.attempt + 1,
                location: ctrl.chatWidget.location,
                userSelectedModelId: widget?.input.currentLanguageModel
            });
        }
    }
}
export class CloseAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.close',
            title: localize('close', 'Close'),
            icon: Codicon.close,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                primary: 9 /* KeyCode.Escape */,
            },
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate()
                }, {
                    id: MENU_INLINE_CHAT_SIDE,
                    group: 'navigation',
                    when: CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("none" /* InlineChatResponseType.None */)
                }]
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.cancelSession();
    }
}
export class ConfigureInlineChatAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.configure',
            title: localize2('configure', 'Configure Inline Chat'),
            icon: Codicon.settingsGear,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            f1: true,
            menu: {
                id: MENU_INLINE_CHAT_WIDGET_STATUS,
                group: 'zzz',
                order: 5
            }
        });
    }
    async runInlineChatCommand(accessor, ctrl, _editor, ..._args) {
        accessor.get(IPreferencesService).openSettings({ query: 'inlineChat' });
    }
}
export class MoveToNextHunk extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.moveToNextHunk',
            title: localize2('moveToNextHunk', 'Move to Next Change'),
            precondition: CTX_INLINE_CHAT_VISIBLE,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 65 /* KeyCode.F7 */
            }
        });
    }
    runInlineChatCommand(accessor, ctrl, editor, ...args) {
        ctrl.moveHunk(true);
    }
}
export class MoveToPreviousHunk extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.moveToPreviousHunk',
            title: localize2('moveToPreviousHunk', 'Move to Previous Change'),
            f1: true,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ | 65 /* KeyCode.F7 */
            }
        });
    }
    runInlineChatCommand(accessor, ctrl, editor, ...args) {
        ctrl.moveHunk(false);
    }
}
export class ViewInChatAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_VIEW_IN_CHAT,
            title: localize('viewInChat', 'View in Chat'),
            icon: Codicon.commentDiscussion,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: 'more',
                    order: 1,
                    when: CTX_INLINE_CHAT_RESPONSE_TYPE.notEqualsTo("messages" /* InlineChatResponseType.Messages */)
                }, {
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messages" /* InlineChatResponseType.Messages */), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate())
                }],
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                when: ChatContextKeys.inChatInput
            }
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        return ctrl.viewInChat();
    }
}
export class ToggleDiffForChange extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_TOGGLE_DIFF,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_CHANGE_HAS_DIFF),
            title: localize2('showChanges', 'Toggle Changes'),
            icon: Codicon.diffSingle,
            toggled: {
                condition: CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF,
            },
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: 'zzz',
                    order: 1,
                }, {
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    when: CTX_INLINE_CHAT_CHANGE_HAS_DIFF,
                    order: 2
                }]
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, hunkInfo) {
        ctrl.toggleDiff(hunkInfo);
    }
}
//#endregion
//#region --- VERSION 2
class AbstractInline2ChatAction extends EditorAction2 {
    static { this.category = localize2('cat', "Inline Chat"); }
    constructor(desc) {
        const massageMenu = (menu) => {
            if (Array.isArray(menu)) {
                for (const entry of menu) {
                    entry.when = ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT2, entry.when);
                }
            }
            else if (menu) {
                menu.when = ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT2, menu.when);
            }
        };
        if (Array.isArray(desc.menu)) {
            massageMenu(desc.menu);
        }
        else {
            massageMenu(desc.menu);
        }
        super({
            ...desc,
            category: AbstractInline2ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT2, desc.precondition)
        });
    }
    runEditorCommand(accessor, editor, ..._args) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        let ctrl = InlineChatController2.get(editor);
        if (!ctrl) {
            const { activeTextEditorControl } = editorService;
            if (isCodeEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl;
            }
            else if (isDiffEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl.getModifiedEditor();
            }
            ctrl = InlineChatController2.get(editor);
        }
        if (!ctrl) {
            logService.warn('[IE] NO controller found for action', this.desc.id, editor.getModel()?.uri);
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        if (!ctrl) {
            for (const diffEditor of accessor.get(ICodeEditorService).listDiffEditors()) {
                if (diffEditor.getOriginalEditor() === editor || diffEditor.getModifiedEditor() === editor) {
                    if (diffEditor instanceof EmbeddedDiffEditorWidget) {
                        this.runEditorCommand(accessor, diffEditor.getParentEditor(), ..._args);
                    }
                }
            }
            return;
        }
        this.runInlineChatCommand(accessor, ctrl, editor, ..._args);
    }
}
class KeepOrUndoSessionAction extends AbstractInline2ChatAction {
    constructor(id, _keep) {
        super({
            id,
            title: _keep
                ? localize2('Keep', "Keep")
                : localize2('Undo', "Undo"),
            f1: true,
            icon: _keep ? Codicon.check : Codicon.discard,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE, ctxHasRequestInProgress.negate()),
            keybinding: [{
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10, // win over new-window-action
                    primary: _keep
                        ? 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 55 /* KeyCode.KeyY */
                        : 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 44 /* KeyCode.KeyN */
                }],
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT2, ContextKeyExpr.greater(ctxRequestCount.key, 0), ctxHasEditorModification),
                }]
        });
        this._keep = _keep;
    }
    async runInlineChatCommand(accessor, _ctrl, editor, ..._args) {
        const inlineChatSessions = accessor.get(IInlineChatSessionService);
        if (!editor.hasModel()) {
            return;
        }
        const textModel = editor.getModel();
        const session = inlineChatSessions.getSession2(textModel.uri);
        if (session) {
            if (this._keep) {
                await session.editingSession.accept();
            }
            else {
                await session.editingSession.reject();
            }
            session.dispose();
        }
    }
}
export class KeepSessionAction2 extends KeepOrUndoSessionAction {
    constructor() {
        super('inlineChat2.keep', true);
    }
}
export class UndoSessionAction2 extends KeepOrUndoSessionAction {
    constructor() {
        super('inlineChat2.undo', false);
    }
}
export class CloseSessionAction2 extends AbstractInline2ChatAction {
    constructor() {
        super({
            id: 'inlineChat2.close',
            title: localize2('close2', "Close"),
            f1: true,
            icon: Codicon.close,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE, ctxHasRequestInProgress.negate(), ContextKeyExpr.or(ctxRequestCount.isEqualTo(0), ctxHasEditorModification.negate())),
            keybinding: [{
                    when: ctxRequestCount.isEqualTo(0),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
                }, {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 9 /* KeyCode.Escape */,
                }],
            menu: [{
                    id: MENU_INLINE_CHAT_SIDE,
                    group: 'navigation',
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT2, ctxRequestCount.isEqualTo(0)),
                }, {
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_AGENT2, ctxHasEditorModification.negate()),
                }]
        });
    }
    runInlineChatCommand(accessor, _ctrl, editor, ...args) {
        const inlineChatSessions = accessor.get(IInlineChatSessionService);
        if (editor.hasModel()) {
            const textModel = editor.getModel();
            inlineChatSessions.getSession2(textModel.uri)?.dispose();
        }
    }
}
export class RevealWidget extends AbstractInline2ChatAction {
    constructor() {
        super({
            id: 'inlineChat2.reveal',
            title: localize2('reveal', "Toggle Inline Chat"),
            f1: true,
            icon: Codicon.copilot,
            precondition: ContextKeyExpr.and(ctxIsGlobalEditingSession.negate(), ContextKeyExpr.greaterEquals(ctxRequestCount.key, 1)),
            toggled: {
                condition: CTX_INLINE_CHAT_VISIBLE,
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            },
            menu: {
                id: MenuId.ChatEditingEditorContent,
                when: ContextKeyExpr.and(ContextKeyExpr.greaterEquals(ctxRequestCount.key, 1), ctxIsGlobalEditingSession.negate()),
                group: 'navigate',
                order: 4,
            }
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor) {
        ctrl.toggleWidgetUntilNextRequest();
        ctrl.markActiveController();
    }
}
export class CancelRequestAction extends AbstractInline2ChatAction {
    constructor() {
        super({
            id: 'inlineChat2.cancelRequest',
            title: localize2('cancel', "Cancel Request"),
            f1: true,
            icon: Codicon.stopCircle,
            precondition: ContextKeyExpr.and(ctxIsGlobalEditingSession.negate(), ctxHasRequestInProgress),
            toggled: CTX_INLINE_CHAT_VISIBLE,
            menu: {
                id: MenuId.ChatEditingEditorContent,
                when: ContextKeyExpr.and(ctxIsGlobalEditingSession.negate(), ctxHasRequestInProgress),
                group: 'a_request',
                order: 1,
            }
        });
    }
    runInlineChatCommand(accessor, ctrl, _editor) {
        const chatService = accessor.get(IChatService);
        const { viewModel } = ctrl.widget.chatWidget;
        if (viewModel) {
            ctrl.toggleWidgetUntilNextRequest();
            ctrl.markActiveController();
            chatService.cancelCurrentRequestForSession(viewModel.sessionId);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvYnJvd3Nlci9pbmxpbmVDaGF0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsT0FBTyxFQUFlLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDcEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDcEgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLHFCQUFxQixFQUFFLHFCQUFxQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckksT0FBTyxFQUFFLHFCQUFxQixFQUFFLHlCQUF5QixFQUFFLG1DQUFtQyxFQUFFLHVCQUF1QixFQUFFLGtDQUFrQyxFQUFFLGlDQUFpQyxFQUFFLHVCQUF1QixFQUFFLHFDQUFxQyxFQUFFLDhCQUE4QixFQUFFLG1DQUFtQyxFQUFFLDZCQUE2QixFQUEwQiwwQkFBMEIsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSwrQkFBK0IsRUFBRSxpQ0FBaUMsRUFBRSxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSx3QkFBd0IsRUFBRSxZQUFZLEVBQUUsMEJBQTBCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMvcUIsT0FBTyxFQUFFLHdCQUF3QixFQUFFLHVCQUF1QixFQUFFLHlCQUF5QixFQUFFLGVBQWUsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQy9LLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBbUIsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUVySCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRzFFLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLHlCQUF5QixFQUFFLGtCQUFrQixDQUFDLENBQUM7QUFDckYsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsMkJBQTJCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztBQUcxRixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxZQUFZLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsNERBQTRELENBQUMsQ0FBQyxDQUFDO0FBTy9LLElBQUksY0FBYyxHQUErQixTQUFTLENBQUM7QUFDM0QsTUFBTSxVQUFVLGdCQUFnQixDQUFDLGFBQTZCO0lBQzdELGNBQWMsR0FBRyxhQUFhLENBQUM7QUFDaEMsQ0FBQztBQUVELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxPQUFPO0lBRTlDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLFlBQVk7WUFDaEIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLENBQUM7WUFDN0MsUUFBUSxFQUFFLHlCQUF5QixDQUFDLFFBQVE7WUFDNUMsRUFBRSxFQUFFLElBQUk7WUFDUixZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDL0IsY0FBYyxDQUFDLEVBQUUsQ0FBQyx5QkFBeUIsRUFBRSwwQkFBMEIsQ0FBQyxFQUN4RSx3QkFBd0IsRUFDeEIsaUJBQWlCLENBQUMsUUFBUSxFQUMxQixpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FDNUM7WUFDRCxVQUFVLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLGlCQUFpQixDQUFDLEtBQUs7Z0JBQzdCLE1BQU0sNkNBQW1DO2dCQUN6QyxPQUFPLEVBQUUsaURBQTZCO2FBQ3RDO1lBQ0QsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtvQkFDM0IsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7aUJBQ1IsRUFBRTtvQkFDRixFQUFFLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtvQkFDN0IsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUNKLENBQUM7SUFDUSxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFHLElBQVc7UUFFdEQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUN2RCxJQUFJLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN0Qyw2QkFBNkI7WUFDN0IsT0FBTztRQUNSLENBQUM7UUFHRCx5QkFBeUI7UUFDekIsT0FBTyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtZQUNwRCxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDekQsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuRCxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksU0FBUyxDQUFDLENBQUM7WUFDbkYsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLFVBQVUsQ0FBQyxLQUFLLENBQUMsdUVBQXVFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztnQkFDN0ksT0FBTztZQUNSLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDaEUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8saUJBQWlCLENBQUMsUUFBMEIsRUFBRSxNQUFtQixFQUFFLEdBQUcsS0FBWTtRQUV6RixNQUFNLElBQUksR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNoRixDQUFDO1FBRUQsSUFBSSxPQUF5QyxDQUFDO1FBQzlDLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQixJQUFJLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzdELE9BQU8sR0FBRyxHQUFHLENBQUM7UUFDZixDQUFDO1FBQ0Qsb0JBQW9CLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUN2RCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxhQUFhO0lBRWpEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtCQUFrQjtZQUN0QixLQUFLLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUM7WUFDeEMsRUFBRSxFQUFFLElBQUk7WUFDUixRQUFRLEVBQUUseUJBQXlCLENBQUMsUUFBUTtZQUM1QyxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsdUJBQXVCLEVBQUUsdUJBQXVCLENBQUMsTUFBTSxFQUFFLEVBQUUsa0NBQWtDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0ssVUFBVSxFQUFFLENBQUM7b0JBQ1osTUFBTSxFQUFFLHNDQUE4QixFQUFFLEVBQUUsMkJBQTJCO29CQUNyRSxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ25JLE9BQU8sRUFBRSxzREFBa0M7aUJBQzNDLEVBQUU7b0JBQ0YsTUFBTSxFQUFFLHNDQUE4QixFQUFFLEVBQUUsMkJBQTJCO29CQUNyRSxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ25JLE9BQU8sRUFBRSxvREFBZ0M7aUJBQ3pDLENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsZ0JBQWdCLENBQUMsU0FBMkIsRUFBRSxNQUFtQixFQUFFLEdBQUcsS0FBWTtRQUMxRixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDM0MsQ0FBQztDQUNEO0FBRUQsdUJBQXVCO0FBRXZCLE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxhQUFhO0lBQ3REO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG9CQUFvQjtZQUN4QixLQUFLLEVBQUUsU0FBUyxDQUFDLFNBQVMsRUFBRSxtQ0FBbUMsQ0FBQztZQUNoRSxRQUFRLEVBQUUseUJBQXlCLENBQUMsUUFBUTtZQUM1QyxZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7WUFDakcsVUFBVSxFQUFFO2dCQUNYLE1BQU0sNkNBQW1DO2dCQUN6QyxPQUFPLEVBQUUsaURBQTZCO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxTQUEyQixFQUFFLE1BQW1CLEVBQUUsR0FBRyxLQUFZO1FBQ2hHLE1BQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDMUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsR0FBRyxDQUFDO29CQUNSLGVBQWUsRUFBRSxPQUFPO2lCQUN4QixDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBZ0IseUJBQTBCLFNBQVEsYUFBYTthQUVwRCxhQUFRLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztJQUUzRCxZQUFZLElBQXFCO1FBRWhDLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBeUMsRUFBRSxFQUFFO1lBQ2pFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN6QixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDO29CQUMxQixLQUFLLENBQUMsSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN4RSxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNqQixJQUFJLENBQUMsSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RFLENBQUM7UUFDRixDQUFDLENBQUM7UUFDRixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDOUIsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QixDQUFDO2FBQU0sQ0FBQztZQUNQLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEIsQ0FBQztRQUVELEtBQUssQ0FBQztZQUNMLEdBQUcsSUFBSTtZQUNQLFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxRQUFRO1lBQzVDLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUM7U0FDOUUsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLGdCQUFnQixDQUFDLFFBQTBCLEVBQUUsTUFBbUIsRUFBRSxHQUFHLEtBQVk7UUFDekYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTdDLElBQUksSUFBSSxHQUFHLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxNQUFNLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxhQUFhLENBQUM7WUFDbEQsSUFBSSxZQUFZLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLEdBQUcsdUJBQXVCLENBQUM7WUFDbEMsQ0FBQztpQkFBTSxJQUFJLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xELE1BQU0sR0FBRyx1QkFBdUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3RELENBQUM7WUFDRCxJQUFJLEdBQUcscUJBQXFCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxVQUFVLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM3RixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksTUFBTSxZQUFZLHdCQUF3QixFQUFFLENBQUM7WUFDaEQsTUFBTSxHQUFHLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsS0FBSyxNQUFNLFVBQVUsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztnQkFDN0UsSUFBSSxVQUFVLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxNQUFNLElBQUksVUFBVSxDQUFDLGlCQUFpQixFQUFFLEtBQUssTUFBTSxFQUFFLENBQUM7b0JBQzVGLElBQUksVUFBVSxZQUFZLHdCQUF3QixFQUFFLENBQUM7d0JBQ3BELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLGVBQWUsRUFBRSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUM7b0JBQ3pFLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBQzdELENBQUM7O0FBS0YsTUFBTSxPQUFPLGdCQUFpQixTQUFRLHlCQUF5QjtJQUM5RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1QkFBdUI7WUFDM0IsS0FBSyxFQUFFLFFBQVEsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDO1lBQ3ZDLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLGtDQUFrQyxFQUFFLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxFQUFFLGtDQUFrQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNMLFVBQVUsRUFBRTtnQkFDWCxNQUFNLHFDQUE2QjtnQkFDbkMsT0FBTyxFQUFFLG9EQUFnQzthQUN6QztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxTQUEyQixFQUFFLElBQTJCLEVBQUUsT0FBb0IsRUFBRSxHQUFHLEtBQVk7UUFDbkgsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNyQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEseUJBQXlCO0lBQ2hFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHlCQUF5QjtZQUM3QixLQUFLLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUM7WUFDM0MsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsaUNBQWlDLEVBQUUsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLEVBQUUsa0NBQWtDLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUwsVUFBVSxFQUFFO2dCQUNYLE1BQU0scUNBQTZCO2dCQUNuQyxPQUFPLEVBQUUsc0RBQWtDO2FBQzNDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELG9CQUFvQixDQUFDLFNBQTJCLEVBQUUsSUFBMkIsRUFBRSxPQUFvQixFQUFFLEdBQUcsS0FBWTtRQUNuSCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxhQUFjLFNBQVEseUJBQXlCO0lBRTNEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHFCQUFxQjtZQUN6QixLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQztZQUM1QyxVQUFVLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7WUFDeEMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLO1lBQ25CLEVBQUUsRUFBRSxJQUFJO1lBQ1IsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUM7WUFDekQsVUFBVSxFQUFFLENBQUM7b0JBQ1osTUFBTSxFQUFFLDhDQUFvQyxFQUFFO29CQUM5QyxPQUFPLEVBQUUsaURBQThCO2lCQUN2QyxDQUFDO1lBQ0YsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLDhCQUE4QjtvQkFDbEMsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGVBQWUsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLEVBQ3hDLG1DQUFtQyxDQUFDLFNBQVMsRUFBRSxFQUMvQyw2QkFBNkIsQ0FBQyxTQUFTLGtFQUF5QyxDQUNoRjtpQkFDRCxFQUFFO29CQUNGLEVBQUUsRUFBRSxxQkFBcUI7b0JBQ3pCLEtBQUssRUFBRSxZQUFZO29CQUNuQixLQUFLLEVBQUUsQ0FBQztpQkFDUixDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxTQUEyQixFQUFFLElBQTJCLEVBQUUsT0FBb0IsRUFBRSxJQUE0QjtRQUMvSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxpQkFBa0IsU0FBUSx5QkFBeUI7SUFFL0Q7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsc0JBQXNCO1lBQzFCLEtBQUssRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztZQUNyQyxJQUFJLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDekIsWUFBWSxFQUFFLHVCQUF1QjtZQUNyQyxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUscUJBQXFCO29CQUN6QixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztZQUNGLFVBQVUsRUFBRTtnQkFDWCxNQUFNLDBDQUFnQztnQkFDdEMsT0FBTyx3QkFBZ0I7Z0JBQ3ZCLElBQUksRUFBRSw2QkFBNkIsQ0FBQyxTQUFTLGtFQUF5QzthQUN0RjtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsb0JBQW9CLENBQUMsU0FBMkIsRUFBRSxJQUEyQixFQUFFLE9BQW9CLEVBQUUsSUFBNEI7UUFDdEksT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxXQUFZLFNBQVEseUJBQXlCO0lBQ3pEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDBCQUEwQjtZQUM5QixLQUFLLEVBQUUsU0FBUyxDQUFDLGtCQUFrQixFQUFFLGVBQWUsQ0FBQztZQUNyRCxVQUFVLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7WUFDdEMsRUFBRSxFQUFFLEtBQUs7WUFDVCxJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDckIsWUFBWSxFQUFFLHVCQUF1QjtZQUNyQyxJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLDhCQUE4QjtnQkFDbEMsS0FBSyxFQUFFLFFBQVE7Z0JBQ2YsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGVBQWUsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLEVBQ3hDLG1DQUFtQyxDQUFDLE1BQU0sRUFBRSxFQUM1Qyw2QkFBNkIsQ0FBQyxXQUFXLDBDQUE2QixDQUN0RTthQUNEO1lBQ0QsVUFBVSxFQUFFO2dCQUNYLE1BQU0sNkNBQW1DO2dCQUN6QyxPQUFPLEVBQUUsaURBQTZCO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxRQUEwQixFQUFFLElBQTJCLEVBQUUsT0FBb0IsRUFBRSxHQUFHLEtBQVk7UUFDakksTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMvQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUM7UUFDL0MsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0MsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdkUsTUFBTSxXQUFXLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRTtnQkFDNUMsa0JBQWtCLEVBQUUsS0FBSztnQkFDekIsT0FBTyxFQUFFLFdBQVcsQ0FBQyxPQUFPLEdBQUcsQ0FBQztnQkFDaEMsUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUTtnQkFDbEMsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxvQkFBb0I7YUFDdkQsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxXQUFZLFNBQVEseUJBQXlCO0lBRXpEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtCQUFrQjtZQUN0QixLQUFLLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7WUFDakMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLO1lBQ25CLFlBQVksRUFBRSx1QkFBdUI7WUFDckMsVUFBVSxFQUFFO2dCQUNYLE1BQU0sRUFBRSwyQ0FBaUMsQ0FBQztnQkFDMUMsT0FBTyx3QkFBZ0I7YUFDdkI7WUFDRCxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsOEJBQThCO29CQUNsQyxLQUFLLEVBQUUsUUFBUTtvQkFDZixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUsbUNBQW1DLENBQUMsTUFBTSxFQUFFO2lCQUNsRCxFQUFFO29CQUNGLEVBQUUsRUFBRSxxQkFBcUI7b0JBQ3pCLEtBQUssRUFBRSxZQUFZO29CQUNuQixJQUFJLEVBQUUsNkJBQTZCLENBQUMsU0FBUywwQ0FBNkI7aUJBQzFFLENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFNBQTJCLEVBQUUsSUFBMkIsRUFBRSxPQUFvQixFQUFFLEdBQUcsS0FBWTtRQUN6SCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHlCQUEwQixTQUFRLHlCQUF5QjtJQUN2RTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxzQkFBc0I7WUFDMUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsdUJBQXVCLENBQUM7WUFDdEQsSUFBSSxFQUFFLE9BQU8sQ0FBQyxZQUFZO1lBQzFCLFlBQVksRUFBRSx1QkFBdUI7WUFDckMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLDhCQUE4QjtnQkFDbEMsS0FBSyxFQUFFLEtBQUs7Z0JBQ1osS0FBSyxFQUFFLENBQUM7YUFDUjtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsb0JBQW9CLENBQUMsUUFBMEIsRUFBRSxJQUEyQixFQUFFLE9BQW9CLEVBQUUsR0FBRyxLQUFZO1FBQ3hILFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxZQUFZLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztJQUN6RSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sY0FBZSxTQUFRLHlCQUF5QjtJQUU1RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwyQkFBMkI7WUFDL0IsS0FBSyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxxQkFBcUIsQ0FBQztZQUN6RCxZQUFZLEVBQUUsdUJBQXVCO1lBQ3JDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsVUFBVSxFQUFFO2dCQUNYLE1BQU0sNkNBQW1DO2dCQUN6QyxPQUFPLHFCQUFZO2FBQ25CO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLG9CQUFvQixDQUFDLFFBQTBCLEVBQUUsSUFBMkIsRUFBRSxNQUFtQixFQUFFLEdBQUcsSUFBVztRQUN6SCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3JCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSx5QkFBeUI7SUFFaEU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsK0JBQStCO1lBQ25DLEtBQUssRUFBRSxTQUFTLENBQUMsb0JBQW9CLEVBQUUseUJBQXlCLENBQUM7WUFDakUsRUFBRSxFQUFFLElBQUk7WUFDUixZQUFZLEVBQUUsdUJBQXVCO1lBQ3JDLFVBQVUsRUFBRTtnQkFDWCxNQUFNLDZDQUFtQztnQkFDekMsT0FBTyxFQUFFLDZDQUF5QjthQUNsQztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUSxvQkFBb0IsQ0FBQyxRQUEwQixFQUFFLElBQTJCLEVBQUUsTUFBbUIsRUFBRSxHQUFHLElBQVc7UUFDekgsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN0QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEseUJBQXlCO0lBQzlEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG1CQUFtQjtZQUN2QixLQUFLLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxjQUFjLENBQUM7WUFDN0MsSUFBSSxFQUFFLE9BQU8sQ0FBQyxpQkFBaUI7WUFDL0IsWUFBWSxFQUFFLHVCQUF1QjtZQUNyQyxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsOEJBQThCO29CQUNsQyxLQUFLLEVBQUUsTUFBTTtvQkFDYixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUsNkJBQTZCLENBQUMsV0FBVyxrREFBaUM7aUJBQ2hGLEVBQUU7b0JBQ0YsRUFBRSxFQUFFLDhCQUE4QjtvQkFDbEMsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGVBQWUsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLEVBQ3hDLDZCQUE2QixDQUFDLFNBQVMsa0RBQWlDLEVBQ3hFLG1DQUFtQyxDQUFDLE1BQU0sRUFBRSxDQUM1QztpQkFDRCxDQUFDO1lBQ0YsVUFBVSxFQUFFO2dCQUNYLE1BQU0sNkNBQW1DO2dCQUN6QyxPQUFPLEVBQUUsc0RBQWtDO2dCQUMzQyxJQUFJLEVBQUUsZUFBZSxDQUFDLFdBQVc7YUFDakM7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ1Esb0JBQW9CLENBQUMsU0FBMkIsRUFBRSxJQUEyQixFQUFFLE9BQW9CLEVBQUUsR0FBRyxLQUFZO1FBQzVILE9BQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQzFCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSx5QkFBeUI7SUFFakU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsa0JBQWtCO1lBQ3RCLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLCtCQUErQixDQUFDO1lBQzFGLEtBQUssRUFBRSxTQUFTLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDO1lBQ2pELElBQUksRUFBRSxPQUFPLENBQUMsVUFBVTtZQUN4QixPQUFPLEVBQUU7Z0JBQ1IsU0FBUyxFQUFFLGlDQUFpQzthQUM1QztZQUNELElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSw4QkFBOEI7b0JBQ2xDLEtBQUssRUFBRSxLQUFLO29CQUNaLEtBQUssRUFBRSxDQUFDO2lCQUNSLEVBQUU7b0JBQ0YsRUFBRSxFQUFFLHFCQUFxQjtvQkFDekIsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLElBQUksRUFBRSwrQkFBK0I7b0JBQ3JDLEtBQUssRUFBRSxDQUFDO2lCQUNSLENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBRVEsb0JBQW9CLENBQUMsU0FBMkIsRUFBRSxJQUEyQixFQUFFLE9BQW9CLEVBQUUsUUFBK0I7UUFDNUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzQixDQUFDO0NBQ0Q7QUFFRCxZQUFZO0FBR1osdUJBQXVCO0FBQ3ZCLE1BQWUseUJBQTBCLFNBQVEsYUFBYTthQUU3QyxhQUFRLEdBQUcsU0FBUyxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsQ0FBQztJQUUzRCxZQUFZLElBQXFCO1FBQ2hDLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBeUMsRUFBRSxFQUFFO1lBQ2pFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN6QixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDO29CQUMxQixLQUFLLENBQUMsSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN6RSxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNqQixJQUFJLENBQUMsSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZFLENBQUM7UUFDRixDQUFDLENBQUM7UUFDRixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDOUIsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4QixDQUFDO2FBQU0sQ0FBQztZQUNQLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEIsQ0FBQztRQUVELEtBQUssQ0FBQztZQUNMLEdBQUcsSUFBSTtZQUNQLFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxRQUFRO1lBQzVDLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUM7U0FDL0UsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVRLGdCQUFnQixDQUFDLFFBQTBCLEVBQUUsTUFBbUIsRUFBRSxHQUFHLEtBQVk7UUFDekYsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNuRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTdDLElBQUksSUFBSSxHQUFHLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxNQUFNLEVBQUUsdUJBQXVCLEVBQUUsR0FBRyxhQUFhLENBQUM7WUFDbEQsSUFBSSxZQUFZLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLEdBQUcsdUJBQXVCLENBQUM7WUFDbEMsQ0FBQztpQkFBTSxJQUFJLFlBQVksQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xELE1BQU0sR0FBRyx1QkFBdUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3RELENBQUM7WUFDRCxJQUFJLEdBQUcscUJBQXFCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxVQUFVLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM3RixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksTUFBTSxZQUFZLHdCQUF3QixFQUFFLENBQUM7WUFDaEQsTUFBTSxHQUFHLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUNuQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsS0FBSyxNQUFNLFVBQVUsSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQztnQkFDN0UsSUFBSSxVQUFVLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxNQUFNLElBQUksVUFBVSxDQUFDLGlCQUFpQixFQUFFLEtBQUssTUFBTSxFQUFFLENBQUM7b0JBQzVGLElBQUksVUFBVSxZQUFZLHdCQUF3QixFQUFFLENBQUM7d0JBQ3BELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLGVBQWUsRUFBRSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUM7b0JBQ3pFLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDO0lBQzdELENBQUM7O0FBS0YsTUFBTSx1QkFBd0IsU0FBUSx5QkFBeUI7SUFFOUQsWUFBWSxFQUFVLEVBQW1CLEtBQWM7UUFDdEQsS0FBSyxDQUFDO1lBQ0wsRUFBRTtZQUNGLEtBQUssRUFBRSxLQUFLO2dCQUNYLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztnQkFDM0IsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO1lBQzVCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU87WUFDN0MsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsdUJBQXVCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0YsVUFBVSxFQUFFLENBQUM7b0JBQ1osTUFBTSxFQUFFLDhDQUFvQyxFQUFFLEVBQUUsNkJBQTZCO29CQUM3RSxPQUFPLEVBQUUsS0FBSzt3QkFDYixDQUFDLENBQUMsbURBQTZCLHdCQUFlO3dCQUM5QyxDQUFDLENBQUMsbURBQTZCLHdCQUFlO2lCQUMvQyxDQUFDO1lBQ0YsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLDhCQUE4QjtvQkFDbEMsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7b0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLHdCQUF3QixDQUFDO2lCQUM5SCxDQUFDO1NBQ0YsQ0FBQyxDQUFDO1FBckJxQyxVQUFLLEdBQUwsS0FBSyxDQUFTO0lBc0J2RCxDQUFDO0lBRVEsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFFBQTBCLEVBQUUsS0FBNEIsRUFBRSxNQUFtQixFQUFFLEdBQUcsS0FBWTtRQUNqSSxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDeEIsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDcEMsTUFBTSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5RCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2QyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxPQUFPLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZDLENBQUM7WUFDRCxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkIsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSx1QkFBdUI7SUFDOUQ7UUFDQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDakMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLHVCQUF1QjtJQUM5RDtRQUNDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNsQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEseUJBQXlCO0lBRWpFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG1CQUFtQjtZQUN2QixLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUM7WUFDbkMsRUFBRSxFQUFFLElBQUk7WUFDUixJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDbkIsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLHVCQUF1QixFQUN2Qix1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsRUFDaEMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQ2xGO1lBQ0QsVUFBVSxFQUFFLENBQUM7b0JBQ1osSUFBSSxFQUFFLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUNsQyxNQUFNLDZDQUFtQztvQkFDekMsT0FBTyxFQUFFLGlEQUE2QjtpQkFDdEMsRUFBRTtvQkFDRixNQUFNLDZDQUFtQztvQkFDekMsT0FBTyx3QkFBZ0I7aUJBQ3ZCLENBQUM7WUFDRixJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUscUJBQXFCO29CQUN6QixLQUFLLEVBQUUsWUFBWTtvQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDbEYsRUFBRTtvQkFDRixFQUFFLEVBQUUsOEJBQThCO29CQUNsQyxLQUFLLEVBQUUsUUFBUTtvQkFDZixLQUFLLEVBQUUsQ0FBQztvQkFDUixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztpQkFDdkYsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxRQUEwQixFQUFFLEtBQTRCLEVBQUUsTUFBbUIsRUFBRSxHQUFHLElBQVc7UUFDakgsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDbkUsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN2QixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUMxRCxDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFlBQWEsU0FBUSx5QkFBeUI7SUFDMUQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0JBQW9CO1lBQ3hCLEtBQUssRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLG9CQUFvQixDQUFDO1lBQ2hELEVBQUUsRUFBRSxJQUFJO1lBQ1IsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPO1lBQ3JCLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sRUFBRSxFQUFFLGNBQWMsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxSCxPQUFPLEVBQUU7Z0JBQ1IsU0FBUyxFQUFFLHVCQUF1QjthQUNsQztZQUNELFVBQVUsRUFBRTtnQkFDWCxNQUFNLDZDQUFtQztnQkFDekMsT0FBTyxFQUFFLGlEQUE2QjthQUN0QztZQUNELElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLHdCQUF3QjtnQkFDbkMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFDcEQseUJBQXlCLENBQUMsTUFBTSxFQUFFLENBQ2xDO2dCQUNELEtBQUssRUFBRSxVQUFVO2dCQUNqQixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELG9CQUFvQixDQUFDLFNBQTJCLEVBQUUsSUFBMkIsRUFBRSxPQUFvQjtRQUNsRyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztRQUNwQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM3QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEseUJBQXlCO0lBQ2pFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDJCQUEyQjtZQUMvQixLQUFLLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQztZQUM1QyxFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxPQUFPLENBQUMsVUFBVTtZQUN4QixZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQztZQUM3RixPQUFPLEVBQUUsdUJBQXVCO1lBQ2hDLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLHdCQUF3QjtnQkFDbkMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsTUFBTSxFQUFFLEVBQUUsdUJBQXVCLENBQUM7Z0JBQ3JGLEtBQUssRUFBRSxXQUFXO2dCQUNsQixLQUFLLEVBQUUsQ0FBQzthQUNSO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELG9CQUFvQixDQUFDLFFBQTBCLEVBQUUsSUFBMkIsRUFBRSxPQUFvQjtRQUNqRyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRS9DLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztRQUM3QyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLDRCQUE0QixFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDNUIsV0FBVyxDQUFDLDhCQUE4QixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqRSxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=