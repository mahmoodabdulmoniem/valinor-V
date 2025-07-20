/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from '../../../../base/browser/browser.js';
import { getActiveDocument, getActiveWindow } from '../../../../base/browser/dom.js';
import * as platform from '../../../../base/common/platform.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CopyOptions, InMemoryClipboardMetadataManager } from '../../../browser/controller/editContext/clipboardUtils.js';
import { NativeEditContextRegistry } from '../../../browser/controller/editContext/native/nativeEditContextRegistry.js';
import { EditorAction, MultiCommand, registerEditorAction } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { CopyPasteController } from '../../dropOrPasteInto/browser/copyPasteController.js';
const CLIPBOARD_CONTEXT_MENU_GROUP = '9_cutcopypaste';
const supportsCut = (platform.isNative || document.queryCommandSupported('cut'));
const supportsCopy = (platform.isNative || document.queryCommandSupported('copy'));
// Firefox only supports navigator.clipboard.readText() in browser extensions.
// See https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/readText#Browser_compatibility
// When loading over http, navigator.clipboard can be undefined. See https://github.com/microsoft/monaco-editor/issues/2313
const supportsPaste = (typeof navigator.clipboard === 'undefined' || browser.isFirefox) ? document.queryCommandSupported('paste') : true;
function registerCommand(command) {
    command.register();
    return command;
}
export const CutAction = supportsCut ? registerCommand(new MultiCommand({
    id: 'editor.action.clipboardCutAction',
    precondition: undefined,
    kbOpts: (
    // Do not bind cut keybindings in the browser,
    // since browsers do that for us and it avoids security prompts
    platform.isNative ? {
        primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */, secondary: [1024 /* KeyMod.Shift */ | 20 /* KeyCode.Delete */] },
        weight: 100 /* KeybindingWeight.EditorContrib */
    } : undefined),
    menuOpts: [{
            menuId: MenuId.MenubarEditMenu,
            group: '2_ccp',
            title: nls.localize({ key: 'miCut', comment: ['&& denotes a mnemonic'] }, "Cu&&t"),
            order: 1
        }, {
            menuId: MenuId.EditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.cutLabel', "Cut"),
            when: EditorContextKeys.writable,
            order: 1,
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('actions.clipboard.cutLabel', "Cut"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.cutLabel', "Cut"),
            when: EditorContextKeys.writable,
            order: 1,
        }]
})) : undefined;
export const CopyAction = supportsCopy ? registerCommand(new MultiCommand({
    id: 'editor.action.clipboardCopyAction',
    precondition: undefined,
    kbOpts: (
    // Do not bind copy keybindings in the browser,
    // since browsers do that for us and it avoids security prompts
    platform.isNative ? {
        primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */, secondary: [2048 /* KeyMod.CtrlCmd */ | 19 /* KeyCode.Insert */] },
        weight: 100 /* KeybindingWeight.EditorContrib */
    } : undefined),
    menuOpts: [{
            menuId: MenuId.MenubarEditMenu,
            group: '2_ccp',
            title: nls.localize({ key: 'miCopy', comment: ['&& denotes a mnemonic'] }, "&&Copy"),
            order: 2
        }, {
            menuId: MenuId.EditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.copyLabel', "Copy"),
            order: 2,
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('actions.clipboard.copyLabel', "Copy"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.copyLabel', "Copy"),
            order: 2,
        }]
})) : undefined;
MenuRegistry.appendMenuItem(MenuId.MenubarEditMenu, { submenu: MenuId.MenubarCopy, title: nls.localize2('copy as', "Copy As"), group: '2_ccp', order: 3 });
MenuRegistry.appendMenuItem(MenuId.EditorContext, { submenu: MenuId.EditorContextCopy, title: nls.localize2('copy as', "Copy As"), group: CLIPBOARD_CONTEXT_MENU_GROUP, order: 3 });
MenuRegistry.appendMenuItem(MenuId.EditorContext, { submenu: MenuId.EditorContextShare, title: nls.localize2('share', "Share"), group: '11_share', order: -1, when: ContextKeyExpr.and(ContextKeyExpr.notEquals('resourceScheme', 'output'), EditorContextKeys.editorTextFocus) });
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, { submenu: MenuId.ExplorerContextShare, title: nls.localize2('share', "Share"), group: '11_share', order: -1 });
export const PasteAction = supportsPaste ? registerCommand(new MultiCommand({
    id: 'editor.action.clipboardPasteAction',
    precondition: undefined,
    kbOpts: (
    // Do not bind paste keybindings in the browser,
    // since browsers do that for us and it avoids security prompts
    platform.isNative ? {
        primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */, secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */] },
        linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */, secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */] },
        weight: 100 /* KeybindingWeight.EditorContrib */
    } : undefined),
    menuOpts: [{
            menuId: MenuId.MenubarEditMenu,
            group: '2_ccp',
            title: nls.localize({ key: 'miPaste', comment: ['&& denotes a mnemonic'] }, "&&Paste"),
            order: 4
        }, {
            menuId: MenuId.EditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.pasteLabel', "Paste"),
            when: EditorContextKeys.writable,
            order: 4,
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('actions.clipboard.pasteLabel', "Paste"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.pasteLabel', "Paste"),
            when: EditorContextKeys.writable,
            order: 4,
        }]
})) : undefined;
class ExecCommandCopyWithSyntaxHighlightingAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.clipboardCopyWithSyntaxHighlightingAction',
            label: nls.localize2('actions.clipboard.copyWithSyntaxHighlightingLabel', "Copy with Syntax Highlighting"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const emptySelectionClipboard = editor.getOption(45 /* EditorOption.emptySelectionClipboard */);
        if (!emptySelectionClipboard && editor.getSelection().isEmpty()) {
            return;
        }
        CopyOptions.forceCopyWithSyntaxHighlighting = true;
        editor.focus();
        editor.getContainerDomNode().ownerDocument.execCommand('copy');
        CopyOptions.forceCopyWithSyntaxHighlighting = false;
    }
}
function registerExecCommandImpl(target, browserCommand) {
    if (!target) {
        return;
    }
    // 1. handle case when focus is in editor.
    target.addImplementation(10000, 'code-editor', (accessor, args) => {
        // Only if editor text focus (i.e. not if editor has widget focus).
        const focusedEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (focusedEditor && focusedEditor.hasTextFocus()) {
            // Do not execute if there is no selection and empty selection clipboard is off
            const emptySelectionClipboard = focusedEditor.getOption(45 /* EditorOption.emptySelectionClipboard */);
            const selection = focusedEditor.getSelection();
            if (selection && selection.isEmpty() && !emptySelectionClipboard) {
                return true;
            }
            // TODO this is very ugly. The entire copy/paste/cut system needs a complete refactoring.
            if (focusedEditor.getOption(169 /* EditorOption.effectiveEditContext */) && browserCommand === 'cut') {
                // execCommand(copy) works for edit context, but not execCommand(cut).
                focusedEditor.getContainerDomNode().ownerDocument.execCommand('copy');
                focusedEditor.trigger(undefined, "cut" /* Handler.Cut */, undefined);
            }
            else {
                focusedEditor.getContainerDomNode().ownerDocument.execCommand(browserCommand);
            }
            return true;
        }
        return false;
    });
    // 2. (default) handle case when focus is somewhere else.
    target.addImplementation(0, 'generic-dom', (accessor, args) => {
        getActiveDocument().execCommand(browserCommand);
        return true;
    });
}
registerExecCommandImpl(CutAction, 'cut');
registerExecCommandImpl(CopyAction, 'copy');
if (PasteAction) {
    // 1. Paste: handle case when focus is in editor.
    PasteAction.addImplementation(10000, 'code-editor', (accessor, args) => {
        const codeEditorService = accessor.get(ICodeEditorService);
        const clipboardService = accessor.get(IClipboardService);
        const telemetryService = accessor.get(ITelemetryService);
        const productService = accessor.get(IProductService);
        // Only if editor text focus (i.e. not if editor has widget focus).
        const focusedEditor = codeEditorService.getFocusedCodeEditor();
        if (focusedEditor && focusedEditor.hasModel() && focusedEditor.hasTextFocus()) {
            // execCommand(paste) does not work with edit context
            const editContextEnabled = focusedEditor.getOption(169 /* EditorOption.effectiveEditContext */);
            if (editContextEnabled) {
                const nativeEditContext = NativeEditContextRegistry.get(focusedEditor.getId());
                if (nativeEditContext) {
                    nativeEditContext.onWillPaste();
                }
            }
            const sw = StopWatch.create(true);
            const triggerPaste = clipboardService.triggerPaste(getActiveWindow().vscodeWindowId);
            if (triggerPaste) {
                return triggerPaste.then(async () => {
                    if (productService.quality !== 'stable') {
                        const duration = sw.elapsed();
                        telemetryService.publicLog2('editorAsyncPaste', { duration });
                    }
                    return CopyPasteController.get(focusedEditor)?.finishedPaste() ?? Promise.resolve();
                });
            }
            if (platform.isWeb) {
                // Use the clipboard service if document.execCommand('paste') was not successful
                return (async () => {
                    const clipboardText = await clipboardService.readText();
                    if (clipboardText !== '') {
                        const metadata = InMemoryClipboardMetadataManager.INSTANCE.get(clipboardText);
                        let pasteOnNewLine = false;
                        let multicursorText = null;
                        let mode = null;
                        if (metadata) {
                            pasteOnNewLine = (focusedEditor.getOption(45 /* EditorOption.emptySelectionClipboard */) && !!metadata.isFromEmptySelection);
                            multicursorText = (typeof metadata.multicursorText !== 'undefined' ? metadata.multicursorText : null);
                            mode = metadata.mode;
                        }
                        focusedEditor.trigger('keyboard', "paste" /* Handler.Paste */, {
                            text: clipboardText,
                            pasteOnNewLine,
                            multicursorText,
                            mode
                        });
                    }
                })();
            }
            return true;
        }
        return false;
    });
    // 2. Paste: (default) handle case when focus is somewhere else.
    PasteAction.addImplementation(0, 'generic-dom', (accessor, args) => {
        const triggerPaste = accessor.get(IClipboardService).triggerPaste(getActiveWindow().vscodeWindowId);
        return triggerPaste ?? false;
    });
}
if (supportsCopy) {
    registerEditorAction(ExecCommandCopyWithSyntaxHighlightingAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jbGlwYm9hcmQvYnJvd3Nlci9jbGlwYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFckYsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUd0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzFILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBRXhILE9BQU8sRUFBVyxZQUFZLEVBQUUsWUFBWSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NB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