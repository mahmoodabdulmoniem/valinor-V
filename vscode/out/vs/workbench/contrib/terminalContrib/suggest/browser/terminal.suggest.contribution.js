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
var TerminalSuggestContribution_1, TerminalSuggestProvidersConfigurationManager_1;
import * as dom from '../../../../../base/browser/dom.js';
import { AutoOpenBarrier } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, toDisposable, Disposable } from '../../../../../base/common/lifecycle.js';
import { isLinux, isWindows } from '../../../../../base/common/platform.js';
import { localize2 } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { TerminalLocation } from '../../../../../platform/terminal/common/terminal.js';
import { registerActiveInstanceAction, registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { terminalSuggestConfigSection, registerTerminalSuggestProvidersConfiguration } from '../common/terminalSuggestConfiguration.js';
import { ITerminalCompletionService, TerminalCompletionService } from './terminalCompletionService.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { SuggestAddon } from './terminalSuggestAddon.js';
import { TerminalClipboardContribution } from '../../clipboard/browser/terminal.clipboard.contribution.js';
import { PwshCompletionProviderAddon } from './pwshCompletionProviderAddon.js';
import { SimpleSuggestContext } from '../../../../services/suggest/browser/simpleSuggestWidget.js';
import { SuggestDetailsClassName } from '../../../../services/suggest/browser/simpleSuggestWidgetDetails.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import './terminalSymbolIcons.js';
import { LspCompletionProviderAddon } from './lspCompletionProviderAddon.js';
import { createTerminalLanguageVirtualUri, LspTerminalModelContentProvider } from './lspTerminalModelContentProvider.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { env } from '../../../../../base/common/process.js';
import { PYLANCE_DEBUG_DISPLAY_NAME } from './lspTerminalUtil.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
registerSingleton(ITerminalCompletionService, TerminalCompletionService, 1 /* InstantiationType.Delayed */);
// #region Terminal Contributions
let TerminalSuggestContribution = class TerminalSuggestContribution extends DisposableStore {
    static { TerminalSuggestContribution_1 = this; }
    static { this.ID = 'terminal.suggest'; }
    static get(instance) {
        return instance.getContribution(TerminalSuggestContribution_1.ID);
    }
    get addon() { return this._addon.value; }
    get pwshAddon() { return this._pwshAddon.value; }
    get lspAddon() { return this._lspAddon.value; }
    constructor(_ctx, _contextKeyService, _configurationService, _instantiationService, _terminalCompletionService, _textModelService, _languageFeaturesService) {
        super();
        this._ctx = _ctx;
        this._contextKeyService = _contextKeyService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._terminalCompletionService = _terminalCompletionService;
        this._textModelService = _textModelService;
        this._languageFeaturesService = _languageFeaturesService;
        this._addon = new MutableDisposable();
        this._pwshAddon = new MutableDisposable();
        this._lspAddon = new MutableDisposable(); // TODO: Support multiple lspAddons in the future.
        this._lspModelProvider = new MutableDisposable();
        this.add(toDisposable(() => {
            this._addon?.dispose();
            this._pwshAddon?.dispose();
            this._lspAddon?.dispose();
            this._lspModelProvider?.value?.dispose();
            this._lspModelProvider?.dispose();
        }));
        this._terminalSuggestWidgetVisibleContextKey = TerminalContextKeys.suggestWidgetVisible.bindTo(this._contextKeyService);
        this.add(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */)) {
                const completionsEnabled = this._configurationService.getValue(terminalSuggestConfigSection).enabled;
                if (!completionsEnabled) {
                    this._addon.clear();
                    this._pwshAddon.clear();
                    this._lspAddon.clear();
                }
                const xtermRaw = this._ctx.instance.xterm?.raw;
                if (!!xtermRaw && completionsEnabled) {
                    this._loadAddons(xtermRaw);
                }
            }
        }));
        // Initialize the dynamic providers configuration manager
        TerminalSuggestProvidersConfigurationManager.initialize(this._instantiationService);
    }
    xtermOpen(xterm) {
        const config = this._configurationService.getValue(terminalSuggestConfigSection);
        const enabled = config.enabled;
        if (!enabled) {
            return;
        }
        this._loadAddons(xterm.raw);
        this.add(Event.runAndSubscribe(this._ctx.instance.onDidChangeShellType, async () => {
            this._refreshAddons();
            this._lspModelProvider.value?.shellTypeChanged(this._ctx.instance.shellType);
        }));
    }
    async _loadPwshCompletionAddon(xterm) {
        // Disable when shell type is not powershell. A naive check is done for Windows PowerShell
        // as we don't differentiate it in shellType
        if (this._ctx.instance.shellType !== "pwsh" /* GeneralShellType.PowerShell */ ||
            this._ctx.instance.shellLaunchConfig.executable?.endsWith('WindowsPowerShell\\v1.0\\powershell.exe')) {
            this._pwshAddon.clear();
            return;
        }
        // Disable the addon on old backends (not conpty or Windows 11)
        await this._ctx.instance.processReady;
        const processTraits = this._ctx.processManager.processTraits;
        if (processTraits?.windowsPty && (processTraits.windowsPty.backend !== 'conpty' || processTraits?.windowsPty.buildNumber <= 19045)) {
            return;
        }
        const pwshCompletionProviderAddon = this._pwshAddon.value = this._instantiationService.createInstance(PwshCompletionProviderAddon, this._ctx.instance.capabilities);
        xterm.loadAddon(pwshCompletionProviderAddon);
        this.add(pwshCompletionProviderAddon);
        this.add(pwshCompletionProviderAddon.onDidRequestSendText(text => {
            this._ctx.instance.sendText(text, false);
        }));
        this.add(this._terminalCompletionService.registerTerminalCompletionProvider('builtinPwsh', pwshCompletionProviderAddon.id, pwshCompletionProviderAddon));
        // If completions are requested, pause and queue input events until completions are
        // received. This fixing some problems in PowerShell, particularly enter not executing
        // when typing quickly and some characters being printed twice. On Windows this isn't
        // needed because inputs are _not_ echoed when not handled immediately.
        // TODO: This should be based on the OS of the pty host, not the client
        if (!isWindows) {
            let barrier;
            if (pwshCompletionProviderAddon) {
                this.add(pwshCompletionProviderAddon.onDidRequestSendText(() => {
                    barrier = new AutoOpenBarrier(2000);
                    this._ctx.instance.pauseInputEvents(barrier);
                }));
            }
            if (this._pwshAddon.value) {
                this.add(this._pwshAddon.value.onDidReceiveCompletions(() => {
                    barrier?.open();
                    barrier = undefined;
                }));
            }
            else {
                throw Error('no addon');
            }
        }
    }
    // TODO: Eventually support multiple LSP providers for [non-Python REPLs](https://github.com/microsoft/vscode/issues/249479)
    async _loadLspCompletionAddon(xterm) {
        const isWsl = isLinux &&
            (!!env['WSL_DISTRO_NAME'] ||
                !!env['WSL_INTEROP']);
        // Windows, WSL currently does not support shell integration for Python REPL.
        if (isWindows || isWsl) {
            return;
        }
        if (this._ctx.instance.shellType !== "python" /* GeneralShellType.Python */) {
            this._lspAddon.clear();
            return;
        }
        const virtualTerminalDocumentUri = createTerminalLanguageVirtualUri(this._ctx.instance.instanceId, 'py');
        // Load and register the LSP completion providers (one per language server)
        this._lspModelProvider.value = this._instantiationService.createInstance(LspTerminalModelContentProvider, this._ctx.instance.capabilities, this._ctx.instance.instanceId, virtualTerminalDocumentUri, this._ctx.instance.shellType);
        this.add(this._lspModelProvider.value);
        const textVirtualModel = await this._textModelService.createModelReference(virtualTerminalDocumentUri);
        this.add(textVirtualModel);
        const virtualProviders = this._languageFeaturesService.completionProvider.all(textVirtualModel.object.textEditorModel);
        const provider = virtualProviders.find(p => p._debugDisplayName === PYLANCE_DEBUG_DISPLAY_NAME);
        if (provider) {
            const lspCompletionProviderAddon = this._lspAddon.value = this._instantiationService.createInstance(LspCompletionProviderAddon, provider, textVirtualModel, this._lspModelProvider.value);
            xterm.loadAddon(lspCompletionProviderAddon);
            this.add(lspCompletionProviderAddon);
            this.add(this._terminalCompletionService.registerTerminalCompletionProvider('lsp', lspCompletionProviderAddon.id, lspCompletionProviderAddon, ...(lspCompletionProviderAddon.triggerCharacters ?? [])));
        }
    }
    _loadAddons(xterm) {
        // Don't re-create the addon
        if (this._addon.value) {
            return;
        }
        const addon = this._addon.value = this._instantiationService.createInstance(SuggestAddon, this._ctx.instance.sessionId, this._ctx.instance.shellType, this._ctx.instance.capabilities, this._terminalSuggestWidgetVisibleContextKey);
        xterm.loadAddon(addon);
        this._loadPwshCompletionAddon(xterm);
        this._loadLspCompletionAddon(xterm);
        if (this._ctx.instance.target === TerminalLocation.Editor) {
            addon.setContainerWithOverflow(xterm.element);
        }
        else {
            addon.setContainerWithOverflow(dom.findParentWithClass(xterm.element, 'panel'));
        }
        addon.setScreen(xterm.element.querySelector('.xterm-screen'));
        this.add(dom.addDisposableListener(this._ctx.instance.domElement, dom.EventType.FOCUS_OUT, (e) => {
            const focusedElement = e.relatedTarget;
            if (focusedElement?.classList.contains(SuggestDetailsClassName)) {
                // Don't hide the suggest widget if the focus is moving to the details
                return;
            }
            addon.hideSuggestWidget(true);
        }));
        this.add(addon.onAcceptedCompletion(async (text) => {
            this._ctx.instance.focus();
            this._ctx.instance.sendText(text, false);
        }));
        const clipboardContrib = TerminalClipboardContribution.get(this._ctx.instance);
        this.add(clipboardContrib.onWillPaste(() => addon.isPasting = true));
        this.add(clipboardContrib.onDidPaste(() => {
            // Delay this slightly as synchronizing the prompt input is debounced
            setTimeout(() => addon.isPasting = false, 100);
        }));
        if (!isWindows) {
            let barrier;
            this.add(addon.onDidReceiveCompletions(() => {
                barrier?.open();
                barrier = undefined;
            }));
        }
    }
    _refreshAddons() {
        const addon = this._addon.value;
        if (!addon) {
            return;
        }
        addon.shellType = this._ctx.instance.shellType;
        if (!this._ctx.instance.xterm?.raw) {
            return;
        }
        // Relies on shell type being set
        this._loadLspCompletionAddon(this._ctx.instance.xterm.raw);
        this._loadPwshCompletionAddon(this._ctx.instance.xterm.raw);
    }
};
TerminalSuggestContribution = TerminalSuggestContribution_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, ITerminalCompletionService),
    __param(5, ITextModelService),
    __param(6, ILanguageFeaturesService)
], TerminalSuggestContribution);
registerTerminalContribution(TerminalSuggestContribution.ID, TerminalSuggestContribution);
// #endregion
// #region Actions
registerTerminalAction({
    id: "workbench.action.terminal.configureSuggestSettings" /* TerminalSuggestCommandId.ConfigureSettings */,
    title: localize2('workbench.action.terminal.configureSuggestSettings', 'Configure'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 87 /* KeyCode.Comma */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */
    },
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        group: 'right',
        order: 1
    },
    run: (c, accessor) => accessor.get(IPreferencesService).openSettings({ query: terminalSuggestConfigSection })
});
registerTerminalAction({
    id: "workbench.action.terminal.suggestLearnMore" /* TerminalSuggestCommandId.LearnMore */,
    title: localize2('workbench.action.terminal.learnMore', 'Learn More'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        group: 'center',
        order: 1
    },
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        when: TerminalContextKeys.suggestWidgetVisible
    },
    run: (c, accessor) => {
        (accessor.get(IOpenerService)).open('https://aka.ms/vscode-terminal-intellisense');
    }
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.requestCompletions" /* TerminalSuggestCommandId.RequestCompletions */,
    title: localize2('workbench.action.terminal.requestCompletions', 'Request Completions'),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */ },
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        when: ContextKeyExpr.and(TerminalContextKeys.focus, TerminalContextKeys.suggestWidgetVisible.negate(), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */}`, true))
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.requestCompletions(true)
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.resetSuggestWidgetSize" /* TerminalSuggestCommandId.ResetWidgetSize */,
    title: localize2('workbench.action.terminal.resetSuggestWidgetSize', 'Reset Suggest Widget Size'),
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.resetWidgetSize()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectPrevSuggestion" /* TerminalSuggestCommandId.SelectPrevSuggestion */,
    title: localize2('workbench.action.terminal.selectPrevSuggestion', 'Select the Previous Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Up is bound to other workbench keybindings that this needs to beat
        primary: 16 /* KeyCode.UpArrow */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        when: ContextKeyExpr.or(SimpleSuggestContext.HasNavigated, ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */}`, false))
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectPreviousSuggestion()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectPrevPageSuggestion" /* TerminalSuggestCommandId.SelectPrevPageSuggestion */,
    title: localize2('workbench.action.terminal.selectPrevPageSuggestion', 'Select the Previous Page Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Up is bound to other workbench keybindings that this needs to beat
        primary: 11 /* KeyCode.PageUp */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectPreviousPageSuggestion()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectNextSuggestion" /* TerminalSuggestCommandId.SelectNextSuggestion */,
    title: localize2('workbench.action.terminal.selectNextSuggestion', 'Select the Next Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Down is bound to other workbench keybindings that this needs to beat
        primary: 18 /* KeyCode.DownArrow */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectNextSuggestion()
});
registerActiveInstanceAction({
    id: 'terminalSuggestToggleExplainMode',
    title: localize2('workbench.action.terminal.suggestToggleExplainMode', 'Suggest Toggle Explain Modes'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Down is bound to other workbench keybindings that this needs to beat
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.toggleExplainMode()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.suggestToggleDetailsFocus" /* TerminalSuggestCommandId.ToggleDetailsFocus */,
    title: localize2('workbench.action.terminal.suggestToggleDetailsFocus', 'Suggest Toggle Suggestion Focus'),
    f1: false,
    // HACK: This does not work with a precondition of `TerminalContextKeys.suggestWidgetVisible`, so make sure to not override the editor's keybinding
    precondition: EditorContextKeys.textInputFocus.negate(),
    keybinding: {
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */,
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 10 /* KeyCode.Space */ }
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.toggleSuggestionFocus()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.suggestToggleDetails" /* TerminalSuggestCommandId.ToggleDetails */,
    title: localize2('workbench.action.terminal.suggestToggleDetails', 'Suggest Toggle Details'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.isOpen, TerminalContextKeys.focus, TerminalContextKeys.suggestWidgetVisible, SimpleSuggestContext.HasFocusedSuggestion),
    keybinding: {
        // HACK: Force weight to be higher than that to start terminal chat
        weight: 400 /* KeybindingWeight.ExternalExtension */ + 2,
        primary: 2048 /* KeyMod.CtrlCmd */ | 10 /* KeyCode.Space */,
        secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */],
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 10 /* KeyCode.Space */, secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */] }
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.toggleSuggestionDetails()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.selectNextPageSuggestion" /* TerminalSuggestCommandId.SelectNextPageSuggestion */,
    title: localize2('workbench.action.terminal.selectNextPageSuggestion', 'Select the Next Page Suggestion'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        // Down is bound to other workbench keybindings that this needs to beat
        primary: 12 /* KeyCode.PageDown */,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.selectNextPageSuggestion()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.acceptSelectedSuggestion" /* TerminalSuggestCommandId.AcceptSelectedSuggestion */,
    title: localize2('workbench.action.terminal.acceptSelectedSuggestion', 'Insert'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: [{
            primary: 2 /* KeyCode.Tab */,
            // Tab is bound to other workbench keybindings that this needs to beat
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 2,
            when: ContextKeyExpr.and(SimpleSuggestContext.HasFocusedSuggestion)
        },
        {
            primary: 3 /* KeyCode.Enter */,
            when: ContextKeyExpr.and(SimpleSuggestContext.HasFocusedSuggestion, ContextKeyExpr.or(ContextKeyExpr.notEquals(`config.${"terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */}`, 'partial'), ContextKeyExpr.or(SimpleSuggestContext.FirstSuggestionFocused.toNegated(), SimpleSuggestContext.HasNavigated))),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
        }],
    menu: {
        id: MenuId.MenubarTerminalSuggestStatusMenu,
        order: 1,
        group: 'left'
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.acceptSelectedSuggestion()
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.acceptSelectedSuggestionEnter" /* TerminalSuggestCommandId.AcceptSelectedSuggestionEnter */,
    title: localize2('workbench.action.terminal.acceptSelectedSuggestionEnter', 'Accept Selected Suggestion (Enter)'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 3 /* KeyCode.Enter */,
        // Enter is bound to other workbench keybindings that this needs to beat
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
        when: ContextKeyExpr.notEquals(`config.${"terminal.integrated.suggest.runOnEnter" /* TerminalSuggestSettingId.RunOnEnter */}`, 'never'),
    },
    run: async (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.acceptSelectedSuggestion(undefined, true)
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.hideSuggestWidget" /* TerminalSuggestCommandId.HideSuggestWidget */,
    title: localize2('workbench.action.terminal.hideSuggestWidget', 'Hide Suggest Widget'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 9 /* KeyCode.Escape */,
        // Escape is bound to other workbench keybindings that this needs to beat
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1
    },
    run: (activeInstance) => TerminalSuggestContribution.get(activeInstance)?.addon?.hideSuggestWidget(true)
});
registerActiveInstanceAction({
    id: "workbench.action.terminal.hideSuggestWidgetAndNavigateHistory" /* TerminalSuggestCommandId.HideSuggestWidgetAndNavigateHistory */,
    title: localize2('workbench.action.terminal.hideSuggestWidgetAndNavigateHistory', 'Hide Suggest Widget and Navigate History'),
    f1: false,
    precondition: ContextKeyExpr.and(ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated), TerminalContextKeys.focus, TerminalContextKeys.isOpen, TerminalContextKeys.suggestWidgetVisible),
    keybinding: {
        primary: 16 /* KeyCode.UpArrow */,
        when: ContextKeyExpr.and(SimpleSuggestContext.HasNavigated.negate(), ContextKeyExpr.equals(`config.${"terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */}`, true)),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 2
    },
    run: (activeInstance) => {
        TerminalSuggestContribution.get(activeInstance)?.addon?.hideSuggestWidget(true);
        activeInstance.sendText('\u001b[A', false); // Up arrow
    }
});
// #endregion
// #region Dynamic Providers Configuration
let TerminalSuggestProvidersConfigurationManager = class TerminalSuggestProvidersConfigurationManager extends Disposable {
    static { TerminalSuggestProvidersConfigurationManager_1 = this; }
    static initialize(instantiationService) {
        if (!this._instance) {
            this._instance = instantiationService.createInstance(TerminalSuggestProvidersConfigurationManager_1);
        }
    }
    constructor(_terminalCompletionService) {
        super();
        this._terminalCompletionService = _terminalCompletionService;
        this._register(this._terminalCompletionService.onDidChangeProviders(() => {
            this._updateConfiguration();
        }));
        // Initial configuration
        this._updateConfiguration();
    }
    _updateConfiguration() {
        const providers = Array.from(this._terminalCompletionService.providers);
        const providerIds = providers.map(p => p.id).filter((id) => typeof id === 'string');
        registerTerminalSuggestProvidersConfiguration(providerIds);
    }
};
TerminalSuggestProvidersConfigurationManager = TerminalSuggestProvidersConfigurationManager_1 = __decorate([
    __param(0, ITerminalCompletionService)
], TerminalSuggestProvidersConfigurationManager);
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuc3VnZ2VzdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvdGVybWluYWwuc3VnZ2VzdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2SCxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFlLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFvQixnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXpHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3BILE9BQU8sRUFBRSw0QkFBNEIsRUFBcUMsTUFBTSxpREFBaUQsQ0FBQztBQUNsSSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFB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