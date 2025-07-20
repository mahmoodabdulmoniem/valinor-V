/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../../base/common/network.js';
import { isIOS, isMacintosh, isWindows } from '../../../../../base/common/platform.js';
import { isObject, isString } from '../../../../../base/common/types.js';
import { localize, localize2 } from '../../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../../platform/accessibility/common/accessibility.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IConfigurationResolverService } from '../../../../services/configurationResolver/common/configurationResolver.js';
import { IHistoryService } from '../../../../services/history/common/history.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
export var TerminalSendSequenceCommandId;
(function (TerminalSendSequenceCommandId) {
    TerminalSendSequenceCommandId["SendSequence"] = "workbench.action.terminal.sendSequence";
})(TerminalSendSequenceCommandId || (TerminalSendSequenceCommandId = {}));
function toOptionalString(obj) {
    return isString(obj) ? obj : undefined;
}
export const terminalSendSequenceCommand = async (accessor, args) => {
    const quickInputService = accessor.get(IQuickInputService);
    const configurationResolverService = accessor.get(IConfigurationResolverService);
    const workspaceContextService = accessor.get(IWorkspaceContextService);
    const historyService = accessor.get(IHistoryService);
    const terminalService = accessor.get(ITerminalService);
    const instance = terminalService.activeInstance;
    if (instance) {
        let text = isObject(args) && 'text' in args ? toOptionalString(args.text) : undefined;
        // If no text provided, prompt user for input and process special characters
        if (!text) {
            text = await quickInputService.input({
                value: '',
                placeHolder: 'Enter sequence to send (supports \\n, \\r, \\xAB)',
                prompt: localize('workbench.action.terminal.sendSequence.prompt', "Enter sequence to send to the terminal"),
            });
            if (!text) {
                return;
            }
            // Process escape sequences
            let processedText = text
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '\r');
            // Process hex escape sequences (\xNN)
            while (true) {
                const match = processedText.match(/\\x([0-9a-fA-F]{2})/);
                if (match === null || match.index === undefined || match.length < 2) {
                    break;
                }
                processedText = processedText.slice(0, match.index) + String.fromCharCode(parseInt(match[1], 16)) + processedText.slice(match.index + 4);
            }
            text = processedText;
        }
        const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot(instance.isRemote ? Schemas.vscodeRemote : Schemas.file);
        const lastActiveWorkspaceRoot = activeWorkspaceRootUri ? workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
        const resolvedText = await configurationResolverService.resolveAsync(lastActiveWorkspaceRoot, text);
        instance.sendText(resolvedText, false);
    }
};
const sendSequenceString = localize2('sendSequence', "Send Sequence");
registerTerminalAction({
    id: "workbench.action.terminal.sendSequence" /* TerminalSendSequenceCommandId.SendSequence */,
    title: sendSequenceString,
    f1: true,
    metadata: {
        description: sendSequenceString.value,
        args: [{
                name: 'args',
                schema: {
                    type: 'object',
                    required: ['text'],
                    properties: {
                        text: {
                            description: localize('sendSequence.text.desc', "The sequence of text to send to the terminal"),
                            type: 'string'
                        }
                    },
                }
            }]
    },
    run: (c, accessor, args) => terminalSendSequenceCommand(accessor, args)
});
export function registerSendSequenceKeybinding(text, rule) {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        id: "workbench.action.terminal.sendSequence" /* TerminalSendSequenceCommandId.SendSequence */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        when: rule.when || TerminalContextKeys.focus,
        primary: rule.primary,
        mac: rule.mac,
        linux: rule.linux,
        win: rule.win,
        handler: terminalSendSequenceCommand,
        args: { text }
    });
}
var Constants;
(function (Constants) {
    /** The text representation of `^<letter>` is `'A'.charCodeAt(0) + 1`. */
    Constants[Constants["CtrlLetterOffset"] = 64] = "CtrlLetterOffset";
})(Constants || (Constants = {}));
// An extra Windows-only ctrl+v keybinding is used for pwsh that sends ctrl+v directly to the
// shell, this gets handled by PSReadLine which properly handles multi-line pastes. This is
// disabled in accessibility mode as PowerShell does not run PSReadLine when it detects a screen
// reader. This works even when clipboard.readText is not supported.
if (isWindows) {
    registerSendSequenceKeybinding(String.fromCharCode('V'.charCodeAt(0) - 64 /* Constants.CtrlLetterOffset */), {
        when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
        primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */
    });
}
// Map certain keybindings in pwsh to unused keys which get handled by PSReadLine handlers in the
// shell integration script. This allows keystrokes that cannot be sent via VT sequences to work.
// See https://github.com/microsoft/terminal/issues/879#issuecomment-497775007
registerSendSequenceKeybinding('\x1b[24~a', {
    when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */), TerminalContextKeys.terminalShellIntegrationEnabled, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
    primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */ }
});
registerSendSequenceKeybinding('\x1b[24~b', {
    when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */), TerminalContextKeys.terminalShellIntegrationEnabled, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
    primary: 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */
});
registerSendSequenceKeybinding('\x1b[24~c', {
    when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */), TerminalContextKeys.terminalShellIntegrationEnabled, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
    primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */
});
registerSendSequenceKeybinding('\x1b[24~d', {
    when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */), TerminalContextKeys.terminalShellIntegrationEnabled, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
    mac: { primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */ }
});
// Always on pwsh keybindings
registerSendSequenceKeybinding('\x1b[1;2H', {
    when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "pwsh" /* GeneralShellType.PowerShell */)),
    mac: { primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */ }
});
// Map alt+arrow to ctrl+arrow to allow word navigation in most shells to just work with alt. This
// is non-standard behavior, but a lot of terminals act like this (see #190629). Note that
// macOS uses different sequences here to get the desired behavior.
registerSendSequenceKeybinding('\x1b[1;5A', {
    when: ContextKeyExpr.and(TerminalContextKeys.focus),
    primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */
});
registerSendSequenceKeybinding('\x1b[1;5B', {
    when: ContextKeyExpr.and(TerminalContextKeys.focus),
    primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */
});
registerSendSequenceKeybinding('\x1b' + (isMacintosh ? 'f' : '[1;5C'), {
    when: ContextKeyExpr.and(TerminalContextKeys.focus),
    primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */
});
registerSendSequenceKeybinding('\x1b' + (isMacintosh ? 'b' : '[1;5D'), {
    when: ContextKeyExpr.and(TerminalContextKeys.focus),
    primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */
});
// Map ctrl+alt+r -> ctrl+r when in accessibility mode due to default run recent command keybinding
registerSendSequenceKeybinding('\x12', {
    when: ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */ }
});
// Map ctrl+alt+g -> ctrl+g due to default go to recent directory keybinding
registerSendSequenceKeybinding('\x07', {
    when: TerminalContextKeys.focus,
    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 37 /* KeyCode.KeyG */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 37 /* KeyCode.KeyG */ }
});
// send ctrl+c to the iPad when the terminal is focused and ctrl+c is pressed to kill the process (work around for #114009)
if (isIOS) {
    registerSendSequenceKeybinding(String.fromCharCode('C'.charCodeAt(0) - 64 /* Constants.CtrlLetterOffset */), {
        when: ContextKeyExpr.and(TerminalContextKeys.focus),
        primary: 256 /* KeyMod.WinCtrl */ | 33 /* KeyCode.KeyC */
    });
}
// Delete word left: ctrl+w
registerSendSequenceKeybinding(String.fromCharCode('W'.charCodeAt(0) - 64 /* Constants.CtrlLetterOffset */), {
    primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
    mac: { primary: 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */ }
});
if (isWindows) {
    // Delete word left: ctrl+h
    // Windows cmd.exe requires ^H to delete full word left
    registerSendSequenceKeybinding(String.fromCharCode('H'.charCodeAt(0) - 64 /* Constants.CtrlLetterOffset */), {
        when: ContextKeyExpr.and(TerminalContextKeys.focus, ContextKeyExpr.equals("terminalShellType" /* TerminalContextKeyStrings.ShellType */, "cmd" /* WindowsShellType.CommandPrompt */)),
        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
    });
}
// Delete word right: alt+d [27, 100]
registerSendSequenceKeybinding('\u001bd', {
    primary: 2048 /* KeyMod.CtrlCmd */ | 20 /* KeyCode.Delete */,
    mac: { primary: 512 /* KeyMod.Alt */ | 20 /* KeyCode.Delete */ }
});
// Delete to line start: ctrl+u
registerSendSequenceKeybinding('\u0015', {
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */ }
});
// Move to line start: ctrl+A
registerSendSequenceKeybinding(String.fromCharCode('A'.charCodeAt(0) - 64), {
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */ }
});
// Move to line end: ctrl+E
registerSendSequenceKeybinding(String.fromCharCode('E'.charCodeAt(0) - 64), {
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */ }
});
// NUL: ctrl+shift+2
registerSendSequenceKeybinding('\u0000', {
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 23 /* KeyCode.Digit2 */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 23 /* KeyCode.Digit2 */ }
});
// RS: ctrl+shift+6
registerSendSequenceKeybinding('\u001e', {
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 27 /* KeyCode.Digit6 */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 27 /* KeyCode.Digit6 */ }
});
// US (Undo): ctrl+/
registerSendSequenceKeybinding('\u001f', {
    primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 90 /* KeyCode.Slash */ }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuc2VuZFNlcXVlbmNlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3NlbmRTZXF1ZW5jZS9icm93c2VyL3Rlcm1pbmFsLnNlbmRTZXF1ZW5jZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUsY0FBYyxFQUE2QixNQUFNLHlEQUF5RCxDQUFDO0FBRXBILE9BQU8sRUFBRSxtQkFBbUIsRUFBdUMsTUFBTSxrRUFBa0UsQ0FBQztBQUM1SSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUU3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUMzSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUM7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