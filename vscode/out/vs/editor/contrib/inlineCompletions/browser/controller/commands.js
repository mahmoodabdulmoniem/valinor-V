/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asyncTransaction, transaction } from '../../../../../base/common/observable.js';
import { splitLines } from '../../../../../base/common/strings.js';
import * as nls from '../../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../platform/accessibility/common/accessibility.js';
import { Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { EditorAction, EditorCommand } from '../../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../common/editorContextKeys.js';
import { Context as SuggestContext } from '../../../suggest/browser/suggest.js';
import { hideInlineCompletionId, inlineSuggestCommitId, jumpToNextInlineEditId, showNextInlineSuggestionActionId, showPreviousInlineSuggestionActionId, toggleShowCollapsedId } from './commandIds.js';
import { InlineCompletionContextKeys } from './inlineCompletionContextKeys.js';
import { InlineCompletionsController } from './inlineCompletionsController.js';
export class ShowNextInlineSuggestionAction extends EditorAction {
    static { this.ID = showNextInlineSuggestionActionId; }
    constructor() {
        super({
            id: ShowNextInlineSuggestionAction.ID,
            label: nls.localize2('action.inlineSuggest.showNext', "Show Next Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100,
                primary: 512 /* KeyMod.Alt */ | 94 /* KeyCode.BracketRight */,
            },
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        controller?.model.get()?.next();
    }
}
export class ShowPreviousInlineSuggestionAction extends EditorAction {
    static { this.ID = showPreviousInlineSuggestionActionId; }
    constructor() {
        super({
            id: ShowPreviousInlineSuggestionAction.ID,
            label: nls.localize2('action.inlineSuggest.showPrevious', "Show Previous Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100,
                primary: 512 /* KeyMod.Alt */ | 92 /* KeyCode.BracketLeft */,
            },
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        controller?.model.get()?.previous();
    }
}
export class TriggerInlineSuggestionAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.trigger',
            label: nls.localize2('action.inlineSuggest.trigger', "Trigger Inline Suggestion"),
            precondition: EditorContextKeys.writable
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await asyncTransaction(async (tx) => {
            /** @description triggerExplicitly from command */
            await controller?.model.get()?.triggerExplicitly(tx);
            controller?.playAccessibilitySignal(tx);
        });
    }
}
export class ExplicitTriggerInlineEditAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.triggerInlineEditExplicit',
            label: nls.localize2('action.inlineSuggest.trigger.explicitInlineEdit', "Trigger Next Edit Suggestion"),
            precondition: EditorContextKeys.writable,
        });
    }
    async run(accessor, editor) {
        const notificationService = accessor.get(INotificationService);
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.triggerExplicitly(undefined, true);
        if (!controller?.model.get()?.inlineEditAvailable.get()) {
            notificationService.notify({
                severity: Severity.Info,
                message: nls.localize('noInlineEditAvailable', "No inline edit is available.")
            });
        }
    }
}
export class TriggerInlineEditAction extends EditorCommand {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.triggerInlineEdit',
            precondition: EditorContextKeys.writable,
        });
    }
    async runEditorCommand(accessor, editor, args) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.trigger(undefined, { onlyFetchInlineEdits: true });
    }
}
export class AcceptNextWordOfInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextWord',
            label: nls.localize2('action.inlineSuggest.acceptNextWord', "Accept Next Word Of Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
                kbExpr: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.cursorBeforeGhostText, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            },
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('acceptWord', 'Accept Word'),
                    group: 'primary',
                    order: 2,
                }],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.acceptNextWord();
    }
}
export class AcceptNextLineOfInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextLine',
            label: nls.localize2('action.inlineSuggest.acceptNextLine', "Accept Next Line Of Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
            },
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('acceptLine', 'Accept Line'),
                    group: 'secondary',
                    order: 2,
                }],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.acceptNextLine();
    }
}
export class AcceptInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: inlineSuggestCommitId,
            label: nls.localize2('action.inlineSuggest.accept', "Accept Inline Suggestion"),
            precondition: ContextKeyExpr.or(InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.inlineEditVisible),
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('accept', "Accept"),
                    group: 'primary',
                    order: 2,
                }, {
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('accept', "Accept"),
                    group: 'primary',
                    order: 2,
                }],
            kbOpts: [
                {
                    primary: 2 /* KeyCode.Tab */,
                    weight: 200,
                    kbExpr: ContextKeyExpr.or(ContextKeyExpr.and(InlineCompletionContextKeys.inlineSuggestionVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.hasSelection.toNegated(), InlineCompletionContextKeys.inlineSuggestionHasIndentationLessThanTabSize), ContextKeyExpr.and(InlineCompletionContextKeys.inlineEditVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.tabShouldAcceptInlineEdit)),
                }
            ],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.getInFocusedEditorOrParent(accessor);
        if (controller) {
            controller.model.get()?.accept(controller.editor);
            controller.editor.focus();
        }
    }
}
KeybindingsRegistry.registerKeybindingRule({
    id: inlineSuggestCommitId,
    weight: 202, // greater than jump
    primary: 2 /* KeyCode.Tab */,
    when: ContextKeyExpr.and(InlineCompletionContextKeys.inInlineEditsPreviewEditor)
});
export class JumpToNextInlineEdit extends EditorAction {
    constructor() {
        super({
            id: jumpToNextInlineEditId,
            label: nls.localize2('action.inlineSuggest.jump', "Jump to next inline edit"),
            precondition: InlineCompletionContextKeys.inlineEditVisible,
            menuOpts: [{
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('jump', "Jump"),
                    group: 'primary',
                    order: 1,
                    when: InlineCompletionContextKeys.cursorAtInlineEdit.toNegated(),
                }],
            kbOpts: {
                primary: 2 /* KeyCode.Tab */,
                weight: 201,
                kbExpr: ContextKeyExpr.and(InlineCompletionContextKeys.inlineEditVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.tabShouldJumpToInlineEdit),
            }
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        if (controller) {
            controller.jump();
        }
    }
}
export class HideInlineCompletion extends EditorAction {
    static { this.ID = hideInlineCompletionId; }
    constructor() {
        super({
            id: HideInlineCompletion.ID,
            label: nls.localize2('action.inlineSuggest.hide', "Hide Inline Suggestion"),
            precondition: ContextKeyExpr.or(InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.inlineEditVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 90, // same as hiding the suggest widget
                primary: 9 /* KeyCode.Escape */,
            },
            menuOpts: [{
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('reject', "Reject"),
                    group: 'primary',
                    order: 3,
                }]
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.getInFocusedEditorOrParent(accessor);
        transaction(tx => {
            controller?.model.get()?.stop('explicitCancel', tx);
        });
        controller?.editor.focus();
    }
}
export class ToggleInlineCompletionShowCollapsed extends EditorAction {
    static { this.ID = toggleShowCollapsedId; }
    constructor() {
        super({
            id: ToggleInlineCompletionShowCollapsed.ID,
            label: nls.localize2('action.inlineSuggest.toggleShowCollapsed', "Toggle Inline Suggestions Show Collapsed"),
            precondition: ContextKeyExpr.true(),
        });
    }
    async run(accessor, editor) {
        const configurationService = accessor.get(IConfigurationService);
        const showCollapsed = configurationService.getValue('editor.inlineSuggest.edits.showCollapsed');
        configurationService.updateValue('editor.inlineSuggest.edits.showCollapsed', !showCollapsed);
    }
}
KeybindingsRegistry.registerKeybindingRule({
    id: HideInlineCompletion.ID,
    weight: -1, // very weak
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.and(InlineCompletionContextKeys.inInlineEditsPreviewEditor)
});
export class ToggleAlwaysShowInlineSuggestionToolbar extends Action2 {
    static { this.ID = 'editor.action.inlineSuggest.toggleAlwaysShowToolbar'; }
    constructor() {
        super({
            id: ToggleAlwaysShowInlineSuggestionToolbar.ID,
            title: nls.localize('action.inlineSuggest.alwaysShowToolbar', "Always Show Toolbar"),
            f1: false,
            precondition: undefined,
            menu: [{
                    id: MenuId.InlineSuggestionToolbar,
                    group: 'secondary',
                    order: 10,
                }],
            toggled: ContextKeyExpr.equals('config.editor.inlineSuggest.showToolbar', 'always')
        });
    }
    async run(accessor) {
        const configService = accessor.get(IConfigurationService);
        const currentValue = configService.getValue('editor.inlineSuggest.showToolbar');
        const newValue = currentValue === 'always' ? 'onHover' : 'always';
        configService.updateValue('editor.inlineSuggest.showToolbar', newValue);
    }
}
export class DevExtractReproSample extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.dev.extractRepro',
            label: nls.localize('action.inlineSuggest.dev.extractRepro', "Developer: Extract Inline Suggest State"),
            alias: 'Developer: Inline Suggest Extract Repro',
            precondition: ContextKeyExpr.or(InlineCompletionContextKeys.inlineEditVisible, InlineCompletionContextKeys.inlineSuggestionVisible),
        });
    }
    async run(accessor, editor) {
        const clipboardService = accessor.get(IClipboardService);
        const controller = InlineCompletionsController.get(editor);
        const m = controller?.model.get();
        if (!m) {
            return;
        }
        const repro = m.extractReproSample();
        const inlineCompletionLines = splitLines(JSON.stringify({ inlineCompletion: repro.inlineCompletion }, null, 4));
        const json = inlineCompletionLines.map(l => '// ' + l).join('\n');
        const reproStr = `${repro.documentValue}\n\n// <json>\n${json}\n// </json>\n`;
        await clipboardService.writeText(reproStr);
        return { reproCase: reproStr };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvY29udHJvbGxlci9jb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUM7QUFDN0MsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDbkgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFvQixNQUFNLGtFQUFrRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUU3RyxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBb0IsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxJQUFJLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxxQkFBcUIsRUFBRSxzQkFBc0IsRUFB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