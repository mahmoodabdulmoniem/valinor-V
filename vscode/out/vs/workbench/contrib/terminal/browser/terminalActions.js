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
import { isKeyboardEvent, isMouseEvent, isPointerEvent } from '../../../../base/browser/dom.js';
import { Action } from '../../../../base/common/actions.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Schemas } from '../../../../base/common/network.js';
import { isAbsolute } from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import { dirname } from '../../../../base/common/resources.js';
import { isObject, isString } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { localize, localize2 } from '../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { TerminalExitReason, TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { createProfileSchemaEnums } from '../../../../platform/terminal/common/terminalProfiles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { PICK_WORKSPACE_FOLDER_COMMAND_ID } from '../../../browser/actions/workspaceCommands.js';
import { CLOSE_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
import { editorGroupToColumn } from '../../../services/editor/common/editorGroupColumn.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { accessibleViewCurrentProviderId, accessibleViewIsShown, accessibleViewOnLastLine } from '../../accessibility/browser/accessibilityConfiguration.js';
import { ITerminalProfileResolverService, ITerminalProfileService, TERMINAL_VIEW_ID } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { terminalStrings } from '../common/terminalStrings.js';
import { ITerminalConfigurationService, ITerminalEditorService, ITerminalGroupService, ITerminalInstanceService, ITerminalService } from './terminal.js';
import { InstanceContext } from './terminalContextMenu.js';
import { getColorClass, getIconId, getUriClasses } from './terminalIcon.js';
import { killTerminalIcon, newTerminalIcon } from './terminalIcons.js';
import { TerminalTabList } from './terminalTabsList.js';
export const switchTerminalActionViewItemSeparator = '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500';
export const switchTerminalShowTabsTitle = localize('showTerminalTabs', "Show Tabs");
const category = terminalStrings.actionCategory;
// Some terminal context keys get complicated. Since normalizing and/or context keys can be
// expensive this is done once per context key and shared.
const sharedWhenClause = (() => {
    const terminalAvailable = ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated);
    return {
        terminalAvailable,
        terminalAvailable_and_opened: ContextKeyExpr.and(terminalAvailable, TerminalContextKeys.isOpen),
        terminalAvailable_and_editorActive: ContextKeyExpr.and(terminalAvailable, TerminalContextKeys.terminalEditorActive),
        terminalAvailable_and_singularSelection: ContextKeyExpr.and(terminalAvailable, TerminalContextKeys.tabsSingularSelection),
        focusInAny_and_normalBuffer: ContextKeyExpr.and(TerminalContextKeys.focusInAny, TerminalContextKeys.altBufferActive.negate())
    };
})();
export async function getCwdForSplit(instance, folders, commandService, configService) {
    switch (configService.config.splitCwd) {
        case 'workspaceRoot':
            if (folders !== undefined && commandService !== undefined) {
                if (folders.length === 1) {
                    return folders[0].uri;
                }
                else if (folders.length > 1) {
                    // Only choose a path when there's more than 1 folder
                    const options = {
                        placeHolder: localize('workbench.action.terminal.newWorkspacePlaceholder', "Select current working directory for new terminal")
                    };
                    const workspace = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID, [options]);
                    if (!workspace) {
                        // Don't split the instance if the workspace picker was canceled
                        return undefined;
                    }
                    return Promise.resolve(workspace.uri);
                }
            }
            return '';
        case 'initial':
            return instance.getInitialCwd();
        case 'inherited':
            return instance.getSpeculativeCwd();
    }
}
let TerminalLaunchHelpAction = class TerminalLaunchHelpAction extends Action {
    constructor(_openerService) {
        super('workbench.action.terminal.launchHelp', localize('terminalLaunchHelp', "Open Help"));
        this._openerService = _openerService;
    }
    async run() {
        this._openerService.open('https://aka.ms/vscode-troubleshoot-terminal-launch');
    }
};
TerminalLaunchHelpAction = __decorate([
    __param(0, IOpenerService)
], TerminalLaunchHelpAction);
export { TerminalLaunchHelpAction };
/**
 * A wrapper function around registerAction2 to help make registering terminal actions more concise.
 * The following default options are used if undefined:
 *
 * - `f1`: true
 * - `category`: Terminal
 * - `precondition`: TerminalContextKeys.processSupported
 */
export function registerTerminalAction(options) {
    // Set defaults
    options.f1 = options.f1 ?? true;
    options.category = options.category ?? category;
    options.precondition = options.precondition ?? TerminalContextKeys.processSupported;
    // Remove run function from options so it's not passed through to registerAction2
    const runFunc = options.run;
    const strictOptions = options;
    delete strictOptions['run'];
    // Register
    return registerAction2(class extends Action2 {
        constructor() {
            super(strictOptions);
        }
        run(accessor, args, args2) {
            return runFunc(getTerminalServices(accessor), accessor, args, args2);
        }
    });
}
function parseActionArgs(args) {
    if (Array.isArray(args)) {
        if (args.every(e => e instanceof InstanceContext)) {
            return args;
        }
    }
    else if (args instanceof InstanceContext) {
        return [args];
    }
    return undefined;
}
/**
 * A wrapper around {@link registerTerminalAction} that runs a callback for all currently selected
 * instances provided in the action context. This falls back to the active instance if there are no
 * contextual instances provided.
 */
export function registerContextualInstanceAction(options) {
    const originalRun = options.run;
    return registerTerminalAction({
        ...options,
        run: async (c, accessor, focusedInstanceArgs, allInstanceArgs) => {
            let instances = getSelectedInstances2(accessor, allInstanceArgs);
            if (!instances) {
                const activeInstance = (options.activeInstanceType === 'view'
                    ? c.groupService
                    : options.activeInstanceType === 'editor' ?
                        c.editorService
                        : c.service).activeInstance;
                if (!activeInstance) {
                    return;
                }
                instances = [activeInstance];
            }
            const results = [];
            for (const instance of instances) {
                results.push(originalRun(instance, c, accessor, focusedInstanceArgs));
            }
            await Promise.all(results);
            if (options.runAfter) {
                options.runAfter(instances, c, accessor, focusedInstanceArgs);
            }
        }
    });
}
/**
 * A wrapper around {@link registerTerminalAction} that ensures an active instance exists and
 * provides it to the run function.
 */
export function registerActiveInstanceAction(options) {
    const originalRun = options.run;
    return registerTerminalAction({
        ...options,
        run: (c, accessor, args) => {
            const activeInstance = c.service.activeInstance;
            if (activeInstance) {
                return originalRun(activeInstance, c, accessor, args);
            }
        }
    });
}
/**
 * A wrapper around {@link registerTerminalAction} that ensures an active terminal
 * exists and provides it to the run function.
 *
 * This includes detached xterm terminals that are not managed by an {@link ITerminalInstance}.
 */
export function registerActiveXtermAction(options) {
    const originalRun = options.run;
    return registerTerminalAction({
        ...options,
        run: (c, accessor, args) => {
            const activeDetached = Iterable.find(c.service.detachedInstances, d => d.xterm.isFocused);
            if (activeDetached) {
                return originalRun(activeDetached.xterm, accessor, activeDetached, args);
            }
            const activeInstance = c.service.activeInstance;
            if (activeInstance?.xterm) {
                return originalRun(activeInstance.xterm, accessor, activeInstance, args);
            }
        }
    });
}
function getTerminalServices(accessor) {
    return {
        service: accessor.get(ITerminalService),
        configService: accessor.get(ITerminalConfigurationService),
        groupService: accessor.get(ITerminalGroupService),
        instanceService: accessor.get(ITerminalInstanceService),
        editorService: accessor.get(ITerminalEditorService),
        profileService: accessor.get(ITerminalProfileService),
        profileResolverService: accessor.get(ITerminalProfileResolverService)
    };
}
export function registerTerminalActions() {
    registerTerminalAction({
        id: "workbench.action.terminal.newInActiveWorkspace" /* TerminalCommandId.NewInActiveWorkspace */,
        title: localize2('workbench.action.terminal.newInActiveWorkspace', 'Create New Terminal (In Active Workspace)'),
        run: async (c) => {
            if (c.service.isProcessSupportRegistered) {
                const instance = await c.service.createTerminal({ location: c.service.defaultLocation });
                if (!instance) {
                    return;
                }
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
        }
    });
    // Register new with profile command
    refreshTerminalActions([]);
    registerTerminalAction({
        id: "workbench.action.createTerminalEditor" /* TerminalCommandId.CreateTerminalEditor */,
        title: localize2('workbench.action.terminal.createTerminalEditor', 'Create New Terminal in Editor Area'),
        run: async (c, _, args) => {
            const options = (isObject(args) && 'location' in args) ? args : { location: TerminalLocation.Editor };
            const instance = await c.service.createTerminal(options);
            await instance.focusWhenReady();
        }
    });
    registerTerminalAction({
        id: "workbench.action.createTerminalEditorSameGroup" /* TerminalCommandId.CreateTerminalEditorSameGroup */,
        title: localize2('workbench.action.terminal.createTerminalEditor', 'Create New Terminal in Editor Area'),
        f1: false,
        run: async (c, accessor, args) => {
            // Force the editor into the same editor group if it's locked. This command is only ever
            // called when a terminal is the active editor
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const instance = await c.service.createTerminal({
                location: { viewColumn: editorGroupToColumn(editorGroupsService, editorGroupsService.activeGroup) }
            });
            await instance.focusWhenReady();
        }
    });
    registerTerminalAction({
        id: "workbench.action.createTerminalEditorSide" /* TerminalCommandId.CreateTerminalEditorSide */,
        title: localize2('workbench.action.terminal.createTerminalEditorSide', 'Create New Terminal in Editor Area to the Side'),
        run: async (c) => {
            const instance = await c.service.createTerminal({
                location: { viewColumn: SIDE_GROUP }
            });
            await instance.focusWhenReady();
        }
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.moveToEditor" /* TerminalCommandId.MoveToEditor */,
        title: terminalStrings.moveToEditor,
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        activeInstanceType: 'view',
        run: (instance, c) => c.service.moveToEditor(instance),
        runAfter: (instances) => instances.at(-1)?.focus()
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.moveIntoNewWindow" /* TerminalCommandId.MoveIntoNewWindow */,
        title: terminalStrings.moveIntoNewWindow,
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        run: (instance, c) => c.service.moveIntoNewEditor(instance),
        runAfter: (instances) => instances.at(-1)?.focus()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.moveToTerminalPanel" /* TerminalCommandId.MoveToTerminalPanel */,
        title: terminalStrings.moveToTerminalPanel,
        precondition: sharedWhenClause.terminalAvailable_and_editorActive,
        run: (c, _, args) => {
            const source = toOptionalUri(args) ?? c.editorService.activeInstance;
            if (source) {
                c.service.moveToTerminalView(source);
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusPreviousPane" /* TerminalCommandId.FocusPreviousPane */,
        title: localize2('workbench.action.terminal.focusPreviousPane', 'Focus Previous Terminal in Terminal Group'),
        keybinding: {
            primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
            secondary: [512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */],
            mac: {
                primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
                secondary: [512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */]
            },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c) => {
            c.groupService.activeGroup?.focusPreviousPane();
            await c.groupService.showPanel(true);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusNextPane" /* TerminalCommandId.FocusNextPane */,
        title: localize2('workbench.action.terminal.focusNextPane', 'Focus Next Terminal in Terminal Group'),
        keybinding: {
            primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
            secondary: [512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */],
            mac: {
                primary: 512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
                secondary: [512 /* KeyMod.Alt */ | 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */]
            },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c) => {
            c.groupService.activeGroup?.focusNextPane();
            await c.groupService.showPanel(true);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneLeft" /* TerminalCommandId.ResizePaneLeft */,
        title: localize2('workbench.action.terminal.resizePaneLeft', 'Resize Terminal Left'),
        keybinding: {
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */ },
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 15 /* KeyCode.LeftArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(0 /* Direction.Left */)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneRight" /* TerminalCommandId.ResizePaneRight */,
        title: localize2('workbench.action.terminal.resizePaneRight', 'Resize Terminal Right'),
        keybinding: {
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */ },
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 17 /* KeyCode.RightArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(1 /* Direction.Right */)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneUp" /* TerminalCommandId.ResizePaneUp */,
        title: localize2('workbench.action.terminal.resizePaneUp', 'Resize Terminal Up'),
        keybinding: {
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 16 /* KeyCode.UpArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(2 /* Direction.Up */)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.resizePaneDown" /* TerminalCommandId.ResizePaneDown */,
        title: localize2('workbench.action.terminal.resizePaneDown', 'Resize Terminal Down'),
        keybinding: {
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 18 /* KeyCode.DownArrow */ },
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.activeGroup?.resizePane(3 /* Direction.Down */)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focus" /* TerminalCommandId.Focus */,
        title: terminalStrings.focus,
        keybinding: {
            when: ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, accessibleViewOnLastLine, accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */)),
            primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c) => {
            const instance = c.service.activeInstance || await c.service.createTerminal({ location: TerminalLocation.Panel });
            if (!instance) {
                return;
            }
            c.service.setActiveInstance(instance);
            focusActiveTerminal(instance, c);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusTabs" /* TerminalCommandId.FocusTabs */,
        title: localize2('workbench.action.terminal.focus.tabsView', 'Focus Terminal Tabs View'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 93 /* KeyCode.Backslash */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.or(TerminalContextKeys.tabsFocus, TerminalContextKeys.focus),
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (c) => c.groupService.focusTabs()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusNext" /* TerminalCommandId.FocusNext */,
        title: localize2('workbench.action.terminal.focusNext', 'Focus Next Terminal Group'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 94 /* KeyCode.BracketRight */
            },
            when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.editorFocus.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        run: async (c) => {
            c.groupService.setActiveGroupToNext();
            await c.groupService.showPanel(true);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusPrevious" /* TerminalCommandId.FocusPrevious */,
        title: localize2('workbench.action.terminal.focusPrevious', 'Focus Previous Terminal Group'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 92 /* KeyCode.BracketLeft */
            },
            when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.editorFocus.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        run: async (c) => {
            c.groupService.setActiveGroupToPrevious();
            await c.groupService.showPanel(true);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.runSelectedText" /* TerminalCommandId.RunSelectedText */,
        title: localize2('workbench.action.terminal.runSelectedText', 'Run Selected Text In Active Terminal'),
        run: async (c, accessor) => {
            const codeEditorService = accessor.get(ICodeEditorService);
            const editor = codeEditorService.getActiveCodeEditor();
            if (!editor || !editor.hasModel()) {
                return;
            }
            const instance = await c.service.getActiveOrCreateInstance({ acceptsInput: true });
            const selection = editor.getSelection();
            let text;
            if (selection.isEmpty()) {
                text = editor.getModel().getLineContent(selection.selectionStartLineNumber).trim();
            }
            else {
                const endOfLinePreference = isWindows ? 1 /* EndOfLinePreference.LF */ : 2 /* EndOfLinePreference.CRLF */;
                text = editor.getModel().getValueInRange(selection, endOfLinePreference);
            }
            instance.sendText(text, true, true);
            await c.service.revealActiveTerminal(true);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.runActiveFile" /* TerminalCommandId.RunActiveFile */,
        title: localize2('workbench.action.terminal.runActiveFile', 'Run Active File In Active Terminal'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c, accessor) => {
            const codeEditorService = accessor.get(ICodeEditorService);
            const notificationService = accessor.get(INotificationService);
            const workbenchEnvironmentService = accessor.get(IWorkbenchEnvironmentService);
            const editor = codeEditorService.getActiveCodeEditor();
            if (!editor || !editor.hasModel()) {
                return;
            }
            const instance = await c.service.getActiveOrCreateInstance({ acceptsInput: true });
            const isRemote = instance ? instance.isRemote : (workbenchEnvironmentService.remoteAuthority ? true : false);
            const uri = editor.getModel().uri;
            if ((!isRemote && uri.scheme !== Schemas.file && uri.scheme !== Schemas.vscodeUserData) || (isRemote && uri.scheme !== Schemas.vscodeRemote)) {
                notificationService.warn(localize('workbench.action.terminal.runActiveFile.noFile', 'Only files on disk can be run in the terminal'));
                return;
            }
            // TODO: Convert this to ctrl+c, ctrl+v for pwsh?
            await instance.sendPath(uri, true);
            return c.groupService.showPanel();
        }
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollDown" /* TerminalCommandId.ScrollDownLine */,
        title: localize2('workbench.action.terminal.scrollDown', 'Scroll Down (Line)'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */,
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollDownLine()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollDownPage" /* TerminalCommandId.ScrollDownPage */,
        title: localize2('workbench.action.terminal.scrollDownPage', 'Scroll Down (Page)'),
        keybinding: {
            primary: 1024 /* KeyMod.Shift */ | 12 /* KeyCode.PageDown */,
            mac: { primary: 12 /* KeyCode.PageDown */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollDownPage()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollToBottom" /* TerminalCommandId.ScrollToBottom */,
        title: localize2('workbench.action.terminal.scrollToBottom', 'Scroll to Bottom'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 13 /* KeyCode.End */,
            linux: { primary: 1024 /* KeyMod.Shift */ | 13 /* KeyCode.End */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollToBottom()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollUp" /* TerminalCommandId.ScrollUpLine */,
        title: localize2('workbench.action.terminal.scrollUp', 'Scroll Up (Line)'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */,
            linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollUpLine()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollUpPage" /* TerminalCommandId.ScrollUpPage */,
        title: localize2('workbench.action.terminal.scrollUpPage', 'Scroll Up (Page)'),
        f1: true,
        keybinding: {
            primary: 1024 /* KeyMod.Shift */ | 11 /* KeyCode.PageUp */,
            mac: { primary: 11 /* KeyCode.PageUp */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollUpPage()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.scrollToTop" /* TerminalCommandId.ScrollToTop */,
        title: localize2('workbench.action.terminal.scrollToTop', 'Scroll to Top'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */,
            linux: { primary: 1024 /* KeyMod.Shift */ | 14 /* KeyCode.Home */ },
            when: sharedWhenClause.focusInAny_and_normalBuffer,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => xterm.scrollToTop()
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.clearSelection" /* TerminalCommandId.ClearSelection */,
        title: localize2('workbench.action.terminal.clearSelection', 'Clear Selection'),
        keybinding: {
            primary: 9 /* KeyCode.Escape */,
            when: ContextKeyExpr.and(TerminalContextKeys.focusInAny, TerminalContextKeys.textSelected, TerminalContextKeys.notFindVisible),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (xterm) => {
            if (xterm.hasSelection()) {
                xterm.clearSelection();
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeIcon" /* TerminalCommandId.ChangeIcon */,
        title: terminalStrings.changeIcon,
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, _, args) => getResourceOrActiveInstance(c, args)?.changeIcon()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeIconActiveTab" /* TerminalCommandId.ChangeIconActiveTab */,
        title: terminalStrings.changeIcon,
        f1: false,
        precondition: sharedWhenClause.terminalAvailable_and_singularSelection,
        run: async (c, accessor, args) => {
            let icon;
            if (c.groupService.lastAccessedMenu === 'inline-tab') {
                getResourceOrActiveInstance(c, args)?.changeIcon();
                return;
            }
            for (const terminal of getSelectedInstances(accessor) ?? []) {
                icon = await terminal.changeIcon(icon);
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeColor" /* TerminalCommandId.ChangeColor */,
        title: terminalStrings.changeColor,
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, _, args) => getResourceOrActiveInstance(c, args)?.changeColor()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.changeColorActiveTab" /* TerminalCommandId.ChangeColorActiveTab */,
        title: terminalStrings.changeColor,
        f1: false,
        precondition: sharedWhenClause.terminalAvailable_and_singularSelection,
        run: async (c, accessor, args) => {
            let color;
            let i = 0;
            if (c.groupService.lastAccessedMenu === 'inline-tab') {
                getResourceOrActiveInstance(c, args)?.changeColor();
                return;
            }
            for (const terminal of getSelectedInstances(accessor) ?? []) {
                const skipQuickPick = i !== 0;
                // Always show the quickpick on the first iteration
                color = await terminal.changeColor(color, skipQuickPick);
                i++;
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.rename" /* TerminalCommandId.Rename */,
        title: terminalStrings.rename,
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, accessor, args) => renameWithQuickPick(c, accessor, args)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.renameActiveTab" /* TerminalCommandId.RenameActiveTab */,
        title: terminalStrings.rename,
        f1: false,
        keybinding: {
            primary: 60 /* KeyCode.F2 */,
            mac: {
                primary: 3 /* KeyCode.Enter */
            },
            when: ContextKeyExpr.and(TerminalContextKeys.tabsFocus),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable_and_singularSelection,
        run: async (c, accessor) => {
            const terminalGroupService = accessor.get(ITerminalGroupService);
            const notificationService = accessor.get(INotificationService);
            const instances = getSelectedInstances(accessor);
            const firstInstance = instances?.[0];
            if (!firstInstance) {
                return;
            }
            if (terminalGroupService.lastAccessedMenu === 'inline-tab') {
                return renameWithQuickPick(c, accessor, firstInstance);
            }
            c.service.setEditingTerminal(firstInstance);
            c.service.setEditable(firstInstance, {
                validationMessage: value => validateTerminalName(value),
                onFinish: async (value, success) => {
                    // Cancel editing first as instance.rename will trigger a rerender automatically
                    c.service.setEditable(firstInstance, null);
                    c.service.setEditingTerminal(undefined);
                    if (success) {
                        const promises = [];
                        for (const instance of instances) {
                            promises.push((async () => {
                                await instance.rename(value);
                            })());
                        }
                        try {
                            await Promise.all(promises);
                        }
                        catch (e) {
                            notificationService.error(e);
                        }
                    }
                }
            });
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.detachSession" /* TerminalCommandId.DetachSession */,
        title: localize2('workbench.action.terminal.detachSession', 'Detach Session'),
        run: (activeInstance) => activeInstance.detachProcessAndDispose(TerminalExitReason.User)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.attachToSession" /* TerminalCommandId.AttachToSession */,
        title: localize2('workbench.action.terminal.attachToSession', 'Attach to Session'),
        run: async (c, accessor) => {
            const quickInputService = accessor.get(IQuickInputService);
            const labelService = accessor.get(ILabelService);
            const remoteAgentService = accessor.get(IRemoteAgentService);
            const notificationService = accessor.get(INotificationService);
            const remoteAuthority = remoteAgentService.getConnection()?.remoteAuthority ?? undefined;
            const backend = await accessor.get(ITerminalInstanceService).getBackend(remoteAuthority);
            if (!backend) {
                throw new Error(`No backend registered for remote authority '${remoteAuthority}'`);
            }
            const terms = await backend.listProcesses();
            backend.reduceConnectionGraceTime();
            const unattachedTerms = terms.filter(term => !c.service.isAttachedToTerminal(term));
            const items = unattachedTerms.map(term => {
                const cwdLabel = labelService.getUriLabel(URI.file(term.cwd));
                return {
                    label: term.title,
                    detail: term.workspaceName ? `${term.workspaceName} \u2E31 ${cwdLabel}` : cwdLabel,
                    description: term.pid ? String(term.pid) : '',
                    term
                };
            });
            if (items.length === 0) {
                notificationService.info(localize('noUnattachedTerminals', 'There are no unattached terminals to attach to'));
                return;
            }
            const selected = await quickInputService.pick(items, { canPickMany: false });
            if (selected) {
                const instance = await c.service.createTerminal({
                    config: { attachPersistentProcess: selected.term }
                });
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.scrollToPreviousCommand" /* TerminalCommandId.ScrollToPreviousCommand */,
        title: terminalStrings.scrollToPreviousCommand,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
            when: ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        icon: Codicon.arrowUp,
        menu: [
            {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 4,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            }
        ],
        run: (activeInstance) => activeInstance.xterm?.markTracker.scrollToPreviousMark(undefined, undefined, activeInstance.capabilities.has(2 /* TerminalCapability.CommandDetection */))
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.scrollToNextCommand" /* TerminalCommandId.ScrollToNextCommand */,
        title: terminalStrings.scrollToNextCommand,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
            when: ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        icon: Codicon.arrowDown,
        menu: [
            {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 5,
                when: ContextKeyExpr.equals('view', TERMINAL_VIEW_ID),
                isHiddenByDefault: true
            }
        ],
        run: (activeInstance) => {
            activeInstance.xterm?.markTracker.scrollToNextMark();
            activeInstance.focus();
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.selectToPreviousCommand" /* TerminalCommandId.SelectToPreviousCommand */,
        title: localize2('workbench.action.terminal.selectToPreviousCommand', 'Select to Previous Command'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (activeInstance) => {
            activeInstance.xterm?.markTracker.selectToPreviousMark();
            activeInstance.focus();
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.selectToNextCommand" /* TerminalCommandId.SelectToNextCommand */,
        title: localize2('workbench.action.terminal.selectToNextCommand', 'Select to Next Command'),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
            when: TerminalContextKeys.focus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: (activeInstance) => {
            activeInstance.xterm?.markTracker.selectToNextMark();
            activeInstance.focus();
        }
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.selectToPreviousLine" /* TerminalCommandId.SelectToPreviousLine */,
        title: localize2('workbench.action.terminal.selectToPreviousLine', 'Select to Previous Line'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (xterm, _, instance) => {
            xterm.markTracker.selectToPreviousLine();
            // prefer to call focus on the TerminalInstance for additional accessibility triggers
            (instance || xterm).focus();
        }
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.selectToNextLine" /* TerminalCommandId.SelectToNextLine */,
        title: localize2('workbench.action.terminal.selectToNextLine', 'Select to Next Line'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (xterm, _, instance) => {
            xterm.markTracker.selectToNextLine();
            // prefer to call focus on the TerminalInstance for additional accessibility triggers
            (instance || xterm).focus();
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.newWithCwd" /* TerminalCommandId.NewWithCwd */,
        title: terminalStrings.newWithCwd,
        metadata: {
            description: terminalStrings.newWithCwd.value,
            args: [{
                    name: 'args',
                    schema: {
                        type: 'object',
                        required: ['cwd'],
                        properties: {
                            cwd: {
                                description: localize('workbench.action.terminal.newWithCwd.cwd', "The directory to start the terminal at"),
                                type: 'string'
                            }
                        },
                    }
                }]
        },
        run: async (c, _, args) => {
            const cwd = isObject(args) && 'cwd' in args ? toOptionalString(args.cwd) : undefined;
            const instance = await c.service.createTerminal({ cwd });
            if (!instance) {
                return;
            }
            c.service.setActiveInstance(instance);
            await focusActiveTerminal(instance, c);
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.renameWithArg" /* TerminalCommandId.RenameWithArgs */,
        title: terminalStrings.renameWithArgs,
        metadata: {
            description: terminalStrings.renameWithArgs.value,
            args: [{
                    name: 'args',
                    schema: {
                        type: 'object',
                        required: ['name'],
                        properties: {
                            name: {
                                description: localize('workbench.action.terminal.renameWithArg.name', "The new name for the terminal"),
                                type: 'string',
                                minLength: 1
                            }
                        }
                    }
                }]
        },
        precondition: sharedWhenClause.terminalAvailable,
        run: async (activeInstance, c, accessor, args) => {
            const notificationService = accessor.get(INotificationService);
            const name = isObject(args) && 'name' in args ? toOptionalString(args.name) : undefined;
            if (!name) {
                notificationService.warn(localize('workbench.action.terminal.renameWithArg.noName', "No name argument provided"));
                return;
            }
            activeInstance.rename(name);
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.relaunch" /* TerminalCommandId.Relaunch */,
        title: localize2('workbench.action.terminal.relaunch', 'Relaunch Active Terminal'),
        run: (activeInstance) => activeInstance.relaunch()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.split" /* TerminalCommandId.Split */,
        title: terminalStrings.split,
        precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.webExtensionContributedProfile),
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */,
                secondary: [256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */]
            },
            when: TerminalContextKeys.focus
        },
        icon: Codicon.splitHorizontal,
        run: async (c, accessor, args) => {
            const optionsOrProfile = isObject(args) ? args : undefined;
            const commandService = accessor.get(ICommandService);
            const workspaceContextService = accessor.get(IWorkspaceContextService);
            const options = convertOptionsOrProfileToOptions(optionsOrProfile);
            const activeInstance = (await c.service.getInstanceHost(options?.location)).activeInstance;
            if (!activeInstance) {
                return;
            }
            const cwd = await getCwdForSplit(activeInstance, workspaceContextService.getWorkspace().folders, commandService, c.configService);
            if (cwd === undefined) {
                return;
            }
            const instance = await c.service.createTerminal({ location: { parentTerminal: activeInstance }, config: options?.config, cwd });
            await focusActiveTerminal(instance, c);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.splitActiveTab" /* TerminalCommandId.SplitActiveTab */,
        title: terminalStrings.split,
        f1: false,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 93 /* KeyCode.Backslash */,
                secondary: [256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 26 /* KeyCode.Digit5 */]
            },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: TerminalContextKeys.tabsFocus
        },
        run: async (c, accessor) => {
            const instances = getSelectedInstances(accessor);
            if (instances) {
                const promises = [];
                for (const t of instances) {
                    promises.push((async () => {
                        await c.service.createTerminal({ location: { parentTerminal: t } });
                        await c.groupService.showPanel(true);
                    })());
                }
                await Promise.all(promises);
            }
        }
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.unsplit" /* TerminalCommandId.Unsplit */,
        title: terminalStrings.unsplit,
        precondition: sharedWhenClause.terminalAvailable,
        run: async (instance, c) => {
            const group = c.groupService.getGroupForInstance(instance);
            if (group && group?.terminalInstances.length > 1) {
                c.groupService.unsplitInstance(instance);
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.joinActiveTab" /* TerminalCommandId.JoinActiveTab */,
        title: localize2('workbench.action.terminal.joinInstance', 'Join Terminals'),
        precondition: ContextKeyExpr.and(sharedWhenClause.terminalAvailable, TerminalContextKeys.tabsSingularSelection.toNegated()),
        run: async (c, accessor) => {
            const instances = getSelectedInstances(accessor);
            if (instances && instances.length > 1) {
                c.groupService.joinInstances(instances);
            }
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.join" /* TerminalCommandId.Join */,
        title: localize2('workbench.action.terminal.join', 'Join Terminals...'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c, accessor) => {
            const themeService = accessor.get(IThemeService);
            const notificationService = accessor.get(INotificationService);
            const quickInputService = accessor.get(IQuickInputService);
            const picks = [];
            if (c.groupService.instances.length <= 1) {
                notificationService.warn(localize('workbench.action.terminal.join.insufficientTerminals', 'Insufficient terminals for the join action'));
                return;
            }
            const otherInstances = c.groupService.instances.filter(i => i.instanceId !== c.groupService.activeInstance?.instanceId);
            for (const terminal of otherInstances) {
                const group = c.groupService.getGroupForInstance(terminal);
                if (group?.terminalInstances.length === 1) {
                    const iconId = getIconId(accessor, terminal);
                    const label = `$(${iconId}): ${terminal.title}`;
                    const iconClasses = [];
                    const colorClass = getColorClass(terminal);
                    if (colorClass) {
                        iconClasses.push(colorClass);
                    }
                    const uriClasses = getUriClasses(terminal, themeService.getColorTheme().type);
                    if (uriClasses) {
                        iconClasses.push(...uriClasses);
                    }
                    picks.push({
                        terminal,
                        label,
                        iconClasses
                    });
                }
            }
            if (picks.length === 0) {
                notificationService.warn(localize('workbench.action.terminal.join.onlySplits', 'All terminals are joined already'));
                return;
            }
            const result = await quickInputService.pick(picks, {});
            if (result) {
                c.groupService.joinInstances([result.terminal, c.groupService.activeInstance]);
            }
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.splitInActiveWorkspace" /* TerminalCommandId.SplitInActiveWorkspace */,
        title: localize2('workbench.action.terminal.splitInActiveWorkspace', 'Split Terminal (In Active Workspace)'),
        run: async (instance, c) => {
            const newInstance = await c.service.createTerminal({ location: { parentTerminal: instance } });
            if (newInstance?.target !== TerminalLocation.Editor) {
                await c.groupService.showPanel(true);
            }
        }
    });
    registerActiveXtermAction({
        id: "workbench.action.terminal.selectAll" /* TerminalCommandId.SelectAll */,
        title: localize2('workbench.action.terminal.selectAll', 'Select All'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: [{
                // Don't use ctrl+a by default as that would override the common go to start
                // of prompt shell binding
                primary: 0,
                // Technically this doesn't need to be here as it will fall back to this
                // behavior anyway when handed to xterm.js, having this handled by VS Code
                // makes it easier for users to see how it works though.
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 31 /* KeyCode.KeyA */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: TerminalContextKeys.focusInAny
            }],
        run: (xterm) => xterm.selectAll()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
        title: localize2('workbench.action.terminal.new', 'Create New Terminal'),
        precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.webExtensionContributedProfile),
        icon: newTerminalIcon,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 91 /* KeyCode.Backquote */,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 91 /* KeyCode.Backquote */ },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */
        },
        run: async (c, accessor, args) => {
            let eventOrOptions = isObject(args) ? args : undefined;
            const workspaceContextService = accessor.get(IWorkspaceContextService);
            const commandService = accessor.get(ICommandService);
            const folders = workspaceContextService.getWorkspace().folders;
            if (eventOrOptions && isMouseEvent(eventOrOptions) && (eventOrOptions.altKey || eventOrOptions.ctrlKey)) {
                await c.service.createTerminal({ location: { splitActiveTerminal: true } });
                return;
            }
            if (c.service.isProcessSupportRegistered) {
                eventOrOptions = !eventOrOptions || isMouseEvent(eventOrOptions) ? {} : eventOrOptions;
                let instance;
                if (folders.length <= 1) {
                    // Allow terminal service to handle the path when there is only a
                    // single root
                    instance = await c.service.createTerminal(eventOrOptions);
                }
                else {
                    const cwd = (await pickTerminalCwd(accessor))?.cwd;
                    if (!cwd) {
                        // Don't create the instance if the workspace picker was canceled
                        return;
                    }
                    eventOrOptions.cwd = cwd;
                    instance = await c.service.createTerminal(eventOrOptions);
                }
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
            else {
                if (c.profileService.contributedProfiles.length > 0) {
                    commandService.executeCommand("workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */);
                }
                else {
                    commandService.executeCommand("workbench.action.terminal.toggleTerminal" /* TerminalCommandId.Toggle */);
                }
            }
        }
    });
    async function killInstance(c, instance) {
        if (!instance) {
            return;
        }
        await c.service.safeDisposeTerminal(instance);
        if (c.groupService.instances.length > 0) {
            await c.groupService.showPanel(true);
        }
    }
    registerTerminalAction({
        id: "workbench.action.terminal.kill" /* TerminalCommandId.Kill */,
        title: localize2('workbench.action.terminal.kill', 'Kill the Active Terminal Instance'),
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        icon: killTerminalIcon,
        run: async (c) => killInstance(c, c.groupService.activeInstance)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killViewOrEditor" /* TerminalCommandId.KillViewOrEditor */,
        title: terminalStrings.kill,
        f1: false, // This is an internal command used for context menus
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        run: async (c) => killInstance(c, c.service.activeInstance)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killAll" /* TerminalCommandId.KillAll */,
        title: localize2('workbench.action.terminal.killAll', 'Kill All Terminals'),
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        icon: Codicon.trash,
        run: async (c) => {
            const disposePromises = [];
            for (const instance of c.service.instances) {
                disposePromises.push(c.service.safeDisposeTerminal(instance));
            }
            await Promise.all(disposePromises);
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killEditor" /* TerminalCommandId.KillEditor */,
        title: localize2('workbench.action.terminal.killEditor', 'Kill the Active Terminal in Editor Area'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */,
            win: { primary: 2048 /* KeyMod.CtrlCmd */ | 62 /* KeyCode.F4 */, secondary: [2048 /* KeyMod.CtrlCmd */ | 53 /* KeyCode.KeyW */] },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.editorFocus)
        },
        run: (c, accessor) => accessor.get(ICommandService).executeCommand(CLOSE_EDITOR_COMMAND_ID)
    });
    registerTerminalAction({
        id: "workbench.action.terminal.killActiveTab" /* TerminalCommandId.KillActiveTab */,
        title: terminalStrings.kill,
        f1: false,
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        keybinding: {
            primary: 20 /* KeyCode.Delete */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                secondary: [20 /* KeyCode.Delete */]
            },
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: TerminalContextKeys.tabsFocus
        },
        run: async (c, accessor) => {
            const disposePromises = [];
            for (const terminal of getSelectedInstances(accessor, true) ?? []) {
                disposePromises.push(c.service.safeDisposeTerminal(terminal));
            }
            await Promise.all(disposePromises);
            c.groupService.focusTabs();
        }
    });
    registerTerminalAction({
        id: "workbench.action.terminal.focusHover" /* TerminalCommandId.FocusHover */,
        title: terminalStrings.focusHover,
        precondition: ContextKeyExpr.or(sharedWhenClause.terminalAvailable, TerminalContextKeys.isOpen),
        keybinding: {
            primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: ContextKeyExpr.or(TerminalContextKeys.tabsFocus, TerminalContextKeys.focus)
        },
        run: (c) => c.groupService.focusHover()
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.clear" /* TerminalCommandId.Clear */,
        title: localize2('workbench.action.terminal.clear', 'Clear'),
        precondition: sharedWhenClause.terminalAvailable,
        keybinding: [{
                primary: 0,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */ },
                // Weight is higher than work workbench contributions so the keybinding remains
                // highest priority when chords are registered afterwards
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                // Disable the keybinding when accessibility mode is enabled as chords include
                // important screen reader keybindings such as cmd+k, cmd+i to show the hover
                when: ContextKeyExpr.or(ContextKeyExpr.and(TerminalContextKeys.focus, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()), ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, accessibleViewIsShown, accessibleViewCurrentProviderId.isEqualTo("terminal" /* AccessibleViewProviderId.Terminal */))),
            }],
        run: (activeInstance) => activeInstance.clearBuffer()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.selectDefaultShell" /* TerminalCommandId.SelectDefaultProfile */,
        title: localize2('workbench.action.terminal.selectDefaultShell', 'Select Default Profile'),
        run: (c) => c.service.showProfileQuickPick('setDefault')
    });
    registerTerminalAction({
        id: "workbench.action.terminal.openSettings" /* TerminalCommandId.ConfigureTerminalSettings */,
        title: localize2('workbench.action.terminal.openSettings', 'Configure Terminal Settings'),
        precondition: sharedWhenClause.terminalAvailable,
        run: (c, accessor) => accessor.get(IPreferencesService).openSettings({ jsonEditor: false, query: '@feature:terminal' })
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.setDimensions" /* TerminalCommandId.SetDimensions */,
        title: localize2('workbench.action.terminal.setFixedDimensions', 'Set Fixed Dimensions'),
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        run: (activeInstance) => activeInstance.setFixedDimensions()
    });
    registerContextualInstanceAction({
        id: "workbench.action.terminal.sizeToContentWidth" /* TerminalCommandId.SizeToContentWidth */,
        title: terminalStrings.toggleSizeToContentWidth,
        precondition: sharedWhenClause.terminalAvailable_and_opened,
        keybinding: {
            primary: 512 /* KeyMod.Alt */ | 56 /* KeyCode.KeyZ */,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            when: TerminalContextKeys.focus
        },
        run: (instance) => instance.toggleSizeToContentWidth()
    });
    registerTerminalAction({
        id: "workbench.action.terminal.switchTerminal" /* TerminalCommandId.SwitchTerminal */,
        title: localize2('workbench.action.terminal.switchTerminal', 'Switch Terminal'),
        precondition: sharedWhenClause.terminalAvailable,
        run: async (c, accessor, args) => {
            const item = toOptionalString(args);
            if (!item) {
                return;
            }
            if (item === switchTerminalActionViewItemSeparator) {
                c.service.refreshActiveGroup();
                return;
            }
            if (item === switchTerminalShowTabsTitle) {
                accessor.get(IConfigurationService).updateValue("terminal.integrated.tabs.enabled" /* TerminalSettingId.TabsEnabled */, true);
                return;
            }
            const terminalIndexRe = /^([0-9]+): /;
            const indexMatches = terminalIndexRe.exec(item);
            if (indexMatches) {
                c.groupService.setActiveGroupByIndex(Number(indexMatches[1]) - 1);
                return c.groupService.showPanel(true);
            }
            const quickSelectProfiles = c.profileService.availableProfiles;
            // Remove 'New ' from the selected item to get the profile name
            const profileSelection = item.substring(4);
            if (quickSelectProfiles) {
                const profile = quickSelectProfiles.find(profile => profile.profileName === profileSelection);
                if (profile) {
                    const instance = await c.service.createTerminal({
                        config: profile
                    });
                    c.service.setActiveInstance(instance);
                }
                else {
                    console.warn(`No profile with name "${profileSelection}"`);
                }
            }
            else {
                console.warn(`Unmatched terminal item: "${item}"`);
            }
        }
    });
}
function getSelectedInstances2(accessor, args) {
    const terminalService = accessor.get(ITerminalService);
    const result = [];
    const context = parseActionArgs(args);
    if (context && context.length > 0) {
        for (const instanceContext of context) {
            const instance = terminalService.getInstanceFromId(instanceContext.instanceId);
            if (instance) {
                result.push(instance);
            }
        }
        if (result.length > 0) {
            return result;
        }
    }
    return undefined;
}
function getSelectedInstances(accessor, args, args2) {
    const listService = accessor.get(IListService);
    const terminalService = accessor.get(ITerminalService);
    const terminalGroupService = accessor.get(ITerminalGroupService);
    const result = [];
    // Assign list only if it's an instance of TerminalTabList (#234791)
    const list = listService.lastFocusedList instanceof TerminalTabList ? listService.lastFocusedList : undefined;
    // Get selected tab list instance(s)
    const selections = list?.getSelection();
    // Get inline tab instance if there are not tab list selections #196578
    if (terminalGroupService.lastAccessedMenu === 'inline-tab' && !selections?.length) {
        const instance = terminalGroupService.activeInstance;
        return instance ? [terminalGroupService.activeInstance] : undefined;
    }
    if (!list || !selections) {
        return undefined;
    }
    const focused = list.getFocus();
    if (focused.length === 1 && !selections.includes(focused[0])) {
        // focused length is always a max of 1
        // if the focused one is not in the selected list, return that item
        result.push(terminalService.getInstanceFromIndex(focused[0]));
        return result;
    }
    // multi-select
    for (const selection of selections) {
        result.push(terminalService.getInstanceFromIndex(selection));
    }
    return result.filter(r => !!r);
}
export function validateTerminalName(name) {
    if (!name || name.trim().length === 0) {
        return {
            content: localize('emptyTerminalNameInfo', "Providing no name will reset it to the default value"),
            severity: Severity.Info
        };
    }
    return null;
}
function convertOptionsOrProfileToOptions(optionsOrProfile) {
    if (isObject(optionsOrProfile) && 'profileName' in optionsOrProfile) {
        return { config: optionsOrProfile, location: optionsOrProfile.location };
    }
    return optionsOrProfile;
}
let newWithProfileAction;
export function refreshTerminalActions(detectedProfiles) {
    const profileEnum = createProfileSchemaEnums(detectedProfiles);
    newWithProfileAction?.dispose();
    // TODO: Use new register function
    newWithProfileAction = registerAction2(class extends Action2 {
        constructor() {
            super({
                id: "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */,
                title: localize2('workbench.action.terminal.newWithProfile', 'Create New Terminal (With Profile)'),
                f1: true,
                precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.webExtensionContributedProfile),
                metadata: {
                    description: "workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */,
                    args: [{
                            name: 'args',
                            schema: {
                                type: 'object',
                                required: ['profileName'],
                                properties: {
                                    profileName: {
                                        description: localize('workbench.action.terminal.newWithProfile.profileName', "The name of the profile to create"),
                                        type: 'string',
                                        enum: profileEnum.values,
                                        markdownEnumDescriptions: profileEnum.markdownDescriptions
                                    },
                                    location: {
                                        description: localize('newWithProfile.location', "Where to create the terminal"),
                                        type: 'string',
                                        enum: ['view', 'editor'],
                                        enumDescriptions: [
                                            localize('newWithProfile.location.view', 'Create the terminal in the terminal view'),
                                            localize('newWithProfile.location.editor', 'Create the terminal in the editor'),
                                        ]
                                    }
                                }
                            }
                        }]
                },
            });
        }
        async run(accessor, eventOrOptionsOrProfile, profile) {
            const c = getTerminalServices(accessor);
            const workspaceContextService = accessor.get(IWorkspaceContextService);
            const commandService = accessor.get(ICommandService);
            let event;
            let options;
            let instance;
            let cwd;
            if (isObject(eventOrOptionsOrProfile) && eventOrOptionsOrProfile && 'profileName' in eventOrOptionsOrProfile) {
                const config = c.profileService.availableProfiles.find(profile => profile.profileName === eventOrOptionsOrProfile.profileName);
                if (!config) {
                    throw new Error(`Could not find terminal profile "${eventOrOptionsOrProfile.profileName}"`);
                }
                options = { config };
                if ('location' in eventOrOptionsOrProfile) {
                    switch (eventOrOptionsOrProfile.location) {
                        case 'editor':
                            options.location = TerminalLocation.Editor;
                            break;
                        case 'view':
                            options.location = TerminalLocation.Panel;
                            break;
                    }
                }
            }
            else if (isMouseEvent(eventOrOptionsOrProfile) || isPointerEvent(eventOrOptionsOrProfile) || isKeyboardEvent(eventOrOptionsOrProfile)) {
                event = eventOrOptionsOrProfile;
                options = profile ? { config: profile } : undefined;
            }
            else {
                options = convertOptionsOrProfileToOptions(eventOrOptionsOrProfile);
            }
            // split terminal
            if (event && (event.altKey || event.ctrlKey)) {
                const parentTerminal = c.service.activeInstance;
                if (parentTerminal) {
                    await c.service.createTerminal({ location: { parentTerminal }, config: options?.config });
                    return;
                }
            }
            const folders = workspaceContextService.getWorkspace().folders;
            if (folders.length > 1) {
                // multi-root workspace, create root picker
                const options = {
                    placeHolder: localize('workbench.action.terminal.newWorkspacePlaceholder', "Select current working directory for new terminal")
                };
                const workspace = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID, [options]);
                if (!workspace) {
                    // Don't create the instance if the workspace picker was canceled
                    return;
                }
                cwd = workspace.uri;
            }
            if (options) {
                options.cwd = cwd;
                instance = await c.service.createTerminal(options);
            }
            else {
                instance = await c.service.showProfileQuickPick('createInstance', cwd);
            }
            if (instance) {
                c.service.setActiveInstance(instance);
                await focusActiveTerminal(instance, c);
            }
        }
    });
    return newWithProfileAction;
}
function getResourceOrActiveInstance(c, resource) {
    return c.service.getInstanceFromResource(toOptionalUri(resource)) || c.service.activeInstance;
}
async function pickTerminalCwd(accessor, cancel) {
    const quickInputService = accessor.get(IQuickInputService);
    const labelService = accessor.get(ILabelService);
    const contextService = accessor.get(IWorkspaceContextService);
    const modelService = accessor.get(IModelService);
    const languageService = accessor.get(ILanguageService);
    const configurationService = accessor.get(IConfigurationService);
    const configurationResolverService = accessor.get(IConfigurationResolverService);
    const folders = contextService.getWorkspace().folders;
    if (!folders.length) {
        return;
    }
    const folderCwdPairs = await Promise.all(folders.map(e => resolveWorkspaceFolderCwd(e, configurationService, configurationResolverService)));
    const shrinkedPairs = shrinkWorkspaceFolderCwdPairs(folderCwdPairs);
    if (shrinkedPairs.length === 1) {
        return shrinkedPairs[0];
    }
    const folderPicks = shrinkedPairs.map(pair => {
        const label = pair.folder.name;
        const description = pair.isOverridden
            ? localize('workbench.action.terminal.overriddenCwdDescription', "(Overriden) {0}", labelService.getUriLabel(pair.cwd, { relative: !pair.isAbsolute }))
            : labelService.getUriLabel(dirname(pair.cwd), { relative: true });
        return {
            label,
            description: description !== label ? description : undefined,
            pair: pair,
            iconClasses: getIconClasses(modelService, languageService, pair.cwd, FileKind.ROOT_FOLDER)
        };
    });
    const options = {
        placeHolder: localize('workbench.action.terminal.newWorkspacePlaceholder', "Select current working directory for new terminal"),
        matchOnDescription: true,
        canPickMany: false,
    };
    const token = cancel || CancellationToken.None;
    const pick = await quickInputService.pick(folderPicks, options, token);
    return pick?.pair;
}
async function resolveWorkspaceFolderCwd(folder, configurationService, configurationResolverService) {
    const cwdConfig = configurationService.getValue("terminal.integrated.cwd" /* TerminalSettingId.Cwd */, { resource: folder.uri });
    if (!isString(cwdConfig) || cwdConfig.length === 0) {
        return { folder, cwd: folder.uri, isAbsolute: false, isOverridden: false };
    }
    const resolvedCwdConfig = await configurationResolverService.resolveAsync(folder, cwdConfig);
    return isAbsolute(resolvedCwdConfig) || resolvedCwdConfig.startsWith(ConfigurationResolverExpression.VARIABLE_LHS)
        ? { folder, isAbsolute: true, isOverridden: true, cwd: URI.from({ ...folder.uri, path: resolvedCwdConfig }) }
        : { folder, isAbsolute: false, isOverridden: true, cwd: URI.joinPath(folder.uri, resolvedCwdConfig) };
}
/**
 * Drops repeated CWDs, if any, by keeping the one which best matches the workspace folder. It also preserves the original order.
 */
export function shrinkWorkspaceFolderCwdPairs(pairs) {
    const map = new Map();
    for (const pair of pairs) {
        const key = pair.cwd.toString();
        const value = map.get(key);
        if (!value || key === pair.folder.uri.toString()) {
            map.set(key, pair);
        }
    }
    const selectedPairs = new Set(map.values());
    const selectedPairsInOrder = pairs.filter(x => selectedPairs.has(x));
    return selectedPairsInOrder;
}
async function focusActiveTerminal(instance, c) {
    if (instance.target === TerminalLocation.Editor) {
        await c.editorService.revealActiveEditor();
        await instance.focusWhenReady(true);
    }
    else {
        await c.groupService.showPanel(true);
    }
}
async function renameWithQuickPick(c, accessor, resource) {
    let instance = resource;
    // Check if the 'instance' does not exist or if 'instance.rename' is not defined
    if (!instance || !instance?.rename) {
        // If not, obtain the resource instance using 'getResourceOrActiveInstance'
        instance = getResourceOrActiveInstance(c, resource);
    }
    if (instance) {
        const title = await accessor.get(IQuickInputService).input({
            value: instance.title,
            prompt: localize('workbench.action.terminal.rename.prompt', "Enter terminal name"),
        });
        if (title) {
            instance.rename(title);
        }
    }
}
function toOptionalUri(obj) {
    return URI.isUri(obj) ? obj : undefined;
}
function toOptionalString(obj) {
    return isString(obj) ? obj : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBRWhGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVuRixPQUFPLEVBQUUsY0FBYyxFQUFF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