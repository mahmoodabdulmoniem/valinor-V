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
var SuggestAddon_1;
import * as dom from '../../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { combinedDisposable, Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { sep } from '../../../../../base/common/path.js';
import { commonPrefixLength } from '../../../../../base/common/strings.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { terminalSuggestConfigSection } from '../common/terminalSuggestConfiguration.js';
import { LineContext } from '../../../../services/suggest/browser/simpleCompletionModel.js';
import { SimpleSuggestWidget } from '../../../../services/suggest/browser/simpleSuggestWidget.js';
import { ITerminalCompletionService } from './terminalCompletionService.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { ITerminalConfigurationService } from '../../../terminal/browser/terminal.js';
import { GOLDEN_LINE_HEIGHT_RATIO, MINIMUM_LINE_HEIGHT } from '../../../../../editor/common/config/fontInfo.js';
import { TerminalCompletionModel } from './terminalCompletionModel.js';
import { TerminalCompletionItem, TerminalCompletionItemKind } from './terminalCompletionItem.js';
import { IntervalTimer, TimeoutTimer } from '../../../../../base/common/async.js';
import { localize } from '../../../../../nls.js';
import { TerminalSuggestTelemetry } from './terminalSuggestTelemetry.js';
import { terminalSymbolAliasIcon, terminalSymbolArgumentIcon, terminalSymbolEnumMember, terminalSymbolFileIcon, terminalSymbolFlagIcon, terminalSymbolInlineSuggestionIcon, terminalSymbolMethodIcon, terminalSymbolOptionIcon, terminalSymbolFolderIcon, terminalSymbolSymbolicLinkFileIcon, terminalSymbolSymbolicLinkFolderIcon } from './terminalSymbolIcons.js';
import { TerminalSuggestShownTracker } from './terminalSuggestShownTracker.js';
export function isInlineCompletionSupported(shellType) {
    if (!shellType) {
        return false;
    }
    return shellType === "bash" /* PosixShellType.Bash */ ||
        shellType === "zsh" /* PosixShellType.Zsh */ ||
        shellType === "fish" /* PosixShellType.Fish */ ||
        shellType === "pwsh" /* GeneralShellType.PowerShell */ ||
        shellType === "gitbash" /* WindowsShellType.GitBash */;
}
let SuggestAddon = class SuggestAddon extends Disposable {
    static { SuggestAddon_1 = this; }
    static { this.lastAcceptedCompletionTimestamp = 0; }
    constructor(_sessionId, shellType, _capabilities, _terminalSuggestWidgetVisibleContextKey, _terminalCompletionService, _configurationService, _instantiationService, _extensionService, _terminalConfigurationService) {
        super();
        this._sessionId = _sessionId;
        this._capabilities = _capabilities;
        this._terminalSuggestWidgetVisibleContextKey = _terminalSuggestWidgetVisibleContextKey;
        this._terminalCompletionService = _terminalCompletionService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._extensionService = _extensionService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._promptInputModelSubscriptions = this._register(new MutableDisposable());
        this._enableWidget = true;
        this._pathSeparator = sep;
        this._isFilteringDirectories = false;
        this._cursorIndexDelta = 0;
        this._requestedCompletionsIndex = 0;
        this._lastUserDataTimestamp = 0;
        this.isPasting = false;
        this._onBell = this._register(new Emitter());
        this.onBell = this._onBell.event;
        this._onAcceptedCompletion = this._register(new Emitter());
        this.onAcceptedCompletion = this._onAcceptedCompletion.event;
        this._onDidReceiveCompletions = this._register(new Emitter());
        this.onDidReceiveCompletions = this._onDidReceiveCompletions.event;
        this._onDidFontConfigurationChange = this._register(new Emitter());
        this.onDidFontConfigurationChange = this._onDidFontConfigurationChange.event;
        this._kindToIconMap = new Map([
            [TerminalCompletionItemKind.File, terminalSymbolFileIcon],
            [TerminalCompletionItemKind.Folder, terminalSymbolFolderIcon],
            [TerminalCompletionItemKind.SymbolicLinkFile, terminalSymbolSymbolicLinkFileIcon],
            [TerminalCompletionItemKind.SymbolicLinkFolder, terminalSymbolSymbolicLinkFolderIcon],
            [TerminalCompletionItemKind.Method, terminalSymbolMethodIcon],
            [TerminalCompletionItemKind.Alias, terminalSymbolAliasIcon],
            [TerminalCompletionItemKind.Argument, terminalSymbolArgumentIcon],
            [TerminalCompletionItemKind.Option, terminalSymbolOptionIcon],
            [TerminalCompletionItemKind.OptionValue, terminalSymbolEnumMember],
            [TerminalCompletionItemKind.Flag, terminalSymbolFlagIcon],
            [TerminalCompletionItemKind.InlineSuggestion, terminalSymbolInlineSuggestionIcon],
            [TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop, terminalSymbolInlineSuggestionIcon],
        ]);
        this._kindToKindLabelMap = new Map([
            [TerminalCompletionItemKind.File, localize('file', 'File')],
            [TerminalCompletionItemKind.Folder, localize('folder', 'Folder')],
            [TerminalCompletionItemKind.SymbolicLinkFile, localize('symbolicLinkFile', 'Symbolic Link File')],
            [TerminalCompletionItemKind.SymbolicLinkFolder, localize('symbolicLinkFolder', 'Symbolic Link Folder')],
            [TerminalCompletionItemKind.Method, localize('method', 'Method')],
            [TerminalCompletionItemKind.Alias, localize('alias', 'Alias')],
            [TerminalCompletionItemKind.Argument, localize('argument', 'Argument')],
            [TerminalCompletionItemKind.Option, localize('option', 'Option')],
            [TerminalCompletionItemKind.OptionValue, localize('optionValue', 'Option Value')],
            [TerminalCompletionItemKind.Flag, localize('flag', 'Flag')],
            [TerminalCompletionItemKind.InlineSuggestion, localize('inlineSuggestion', 'Inline Suggestion')],
            [TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop, localize('inlineSuggestionAlwaysOnTop', 'Inline Suggestion')],
        ]);
        this._inlineCompletion = {
            label: '',
            // Right arrow is used to accept the completion. This is a common keybinding in pwsh, zsh
            // and fish.
            inputData: '\x1b[C',
            replacementIndex: 0,
            replacementLength: 0,
            provider: 'core:inlineSuggestion',
            detail: 'Inline suggestion',
            kind: TerminalCompletionItemKind.InlineSuggestion,
            kindLabel: 'Inline suggestion',
            icon: this._kindToIconMap.get(TerminalCompletionItemKind.InlineSuggestion),
        };
        this._inlineCompletionItem = new TerminalCompletionItem(this._inlineCompletion);
        this._shouldSyncWhenReady = false;
        // Initialize shell type, including a promise that completions can await for that resolves:
        // - immediately if shell type
        // - after a short delay if shell type gets set
        // - after a long delay if it doesn't get set
        this.shellType = shellType;
        if (this.shellType) {
            this._shellTypeInit = Promise.resolve();
        }
        else {
            const intervalTimer = this._register(new IntervalTimer());
            const timeoutTimer = this._register(new TimeoutTimer());
            this._shellTypeInit = new Promise(r => {
                intervalTimer.cancelAndSet(() => {
                    if (this.shellType) {
                        r();
                    }
                }, 50);
                timeoutTimer.cancelAndSet(r, 5000);
            }).then(() => {
                this._store.delete(intervalTimer);
                this._store.delete(timeoutTimer);
            });
        }
        this._register(Event.runAndSubscribe(Event.any(this._capabilities.onDidAddCapabilityType, this._capabilities.onDidRemoveCapabilityType), () => {
            const commandDetection = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (commandDetection) {
                if (this._promptInputModel !== commandDetection.promptInputModel) {
                    this._promptInputModel = commandDetection.promptInputModel;
                    this._suggestTelemetry = this._register(this._instantiationService.createInstance(TerminalSuggestTelemetry, commandDetection, this._promptInputModel));
                    this._promptInputModelSubscriptions.value = combinedDisposable(this._promptInputModel.onDidChangeInput(e => this._sync(e)), this._promptInputModel.onDidFinishInput(() => {
                        this.hideSuggestWidget(true);
                    }));
                    if (this._shouldSyncWhenReady) {
                        this._sync(this._promptInputModel);
                        this._shouldSyncWhenReady = false;
                    }
                }
            }
            else {
                this._promptInputModel = undefined;
            }
        }));
        this._register(this._terminalConfigurationService.onConfigChanged(() => this._cachedFontInfo = undefined));
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration("terminal.integrated.suggest.inlineSuggestion" /* TerminalSuggestSettingId.InlineSuggestion */)) {
                const value = this._configurationService.getValue(terminalSuggestConfigSection).inlineSuggestion;
                this._inlineCompletionItem.isInvalid = value === 'off';
                switch (value) {
                    case 'alwaysOnTopExceptExactMatch': {
                        this._inlineCompletion.kind = TerminalCompletionItemKind.InlineSuggestion;
                        break;
                    }
                    case 'alwaysOnTop':
                    default: {
                        this._inlineCompletion.kind = TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop;
                        break;
                    }
                }
                this._model?.forceRefilterAll();
            }
        }));
    }
    activate(xterm) {
        this._terminal = xterm;
        this._register(xterm.onKey(async (e) => {
            this._lastUserData = e.key;
            this._lastUserDataTimestamp = Date.now();
        }));
        this._register(xterm.onScroll(() => this.hideSuggestWidget(true)));
    }
    async _handleCompletionProviders(terminal, token, explicitlyInvoked) {
        // Nothing to handle if the terminal is not attached
        if (!terminal?.element || !this._enableWidget || !this._promptInputModel) {
            return;
        }
        // Only show the suggest widget if the terminal is focused
        if (!dom.isAncestorOfActiveElement(terminal.element)) {
            return;
        }
        // Wait for the shell type to initialize. This will wait a short period after launching to
        // allow the shell type to be set if possible. This prevents user requests sometimes getting
        // lost if requested shortly after the terminal is created. Completion providers can still
        // work with undefined shell types such as Pseudoterminal-based extension terminals.
        await this._shellTypeInit;
        let doNotRequestExtensionCompletions = false;
        // Ensure that a key has been pressed since the last accepted completion in order to prevent
        // completions being requested again right after accepting a completion
        if (this._promptInputModel.value !== '' && this._lastUserDataTimestamp < SuggestAddon_1.lastAcceptedCompletionTimestamp) {
            doNotRequestExtensionCompletions = true;
        }
        if (!doNotRequestExtensionCompletions) {
            await this._extensionService.activateByEvent('onTerminalCompletionsRequested');
        }
        this._currentPromptInputState = {
            value: this._promptInputModel.value,
            prefix: this._promptInputModel.prefix,
            suffix: this._promptInputModel.suffix,
            cursorIndex: this._promptInputModel.cursorIndex,
            ghostTextIndex: this._promptInputModel.ghostTextIndex
        };
        this._requestedCompletionsIndex = this._currentPromptInputState.cursorIndex;
        // Show loading indicator before making async completion request (only for explicit invocations)
        if (explicitlyInvoked) {
            const suggestWidget = this._ensureSuggestWidget(terminal);
            const cursorPosition = this._getCursorPosition(terminal);
            if (cursorPosition) {
                suggestWidget.showTriggered(true, cursorPosition);
            }
        }
        const quickSuggestionsConfig = this._configurationService.getValue(terminalSuggestConfigSection).quickSuggestions;
        const allowFallbackCompletions = explicitlyInvoked || quickSuggestionsConfig.unknown === 'on';
        const providedCompletions = await this._terminalCompletionService.provideCompletions(this._currentPromptInputState.prefix, this._currentPromptInputState.cursorIndex, allowFallbackCompletions, this.shellType, this._capabilities, token, false, doNotRequestExtensionCompletions, explicitlyInvoked);
        if (token.isCancellationRequested) {
            return;
        }
        this._onDidReceiveCompletions.fire();
        this._cursorIndexDelta = this._promptInputModel.cursorIndex - this._requestedCompletionsIndex;
        this._leadingLineContent = this._promptInputModel.prefix.substring(0, this._requestedCompletionsIndex + this._cursorIndexDelta);
        const completions = providedCompletions?.flat() || [];
        if (!explicitlyInvoked && !completions.length) {
            this.hideSuggestWidget(true);
            return;
        }
        const firstChar = this._leadingLineContent.length === 0 ? '' : this._leadingLineContent[0];
        // This is a TabExpansion2 result
        if (this._leadingLineContent.includes(' ') || firstChar === '[') {
            this._leadingLineContent = this._promptInputModel.prefix;
        }
        let normalizedLeadingLineContent = this._leadingLineContent;
        // If there is a single directory in the completions:
        // - `\` and `/` are normalized such that either can be used
        // - Using `\` or `/` will request new completions. It's important that this only occurs
        //   when a directory is present, if not completions like git branches could be requested
        //   which leads to flickering
        this._isFilteringDirectories = completions.some(e => e.kind === TerminalCompletionItemKind.Folder);
        if (this._isFilteringDirectories) {
            const firstDir = completions.find(e => e.kind === TerminalCompletionItemKind.Folder);
            const textLabel = typeof firstDir?.label === 'string' ? firstDir.label : firstDir?.label.label;
            this._pathSeparator = textLabel?.match(/(?<sep>[\\\/])/)?.groups?.sep ?? sep;
            normalizedLeadingLineContent = normalizePathSeparator(normalizedLeadingLineContent, this._pathSeparator);
        }
        // Add any "ghost text" suggestion suggested by the shell. This aligns with behavior of the
        // editor and how it interacts with inline completions. This object is tracked and reused as
        // it may change on input.
        this._refreshInlineCompletion(completions);
        // Add any missing icons based on the completion item kind
        for (const completion of completions) {
            if (!completion.icon && completion.kind !== undefined) {
                completion.icon = this._kindToIconMap.get(completion.kind);
                completion.kindLabel = this._kindToKindLabelMap.get(completion.kind);
            }
        }
        const lineContext = new LineContext(normalizedLeadingLineContent, this._cursorIndexDelta);
        const items = completions.filter(c => !!c.label).map(c => new TerminalCompletionItem(c));
        if (isInlineCompletionSupported(this.shellType)) {
            items.push(this._inlineCompletionItem);
        }
        const model = new TerminalCompletionModel(items, lineContext);
        if (token.isCancellationRequested) {
            this._completionRequestTimestamp = undefined;
            return;
        }
        this._showCompletions(model, explicitlyInvoked);
    }
    setContainerWithOverflow(container) {
        this._container = container;
    }
    setScreen(screen) {
        this._screen = screen;
    }
    toggleExplainMode() {
        this._suggestWidget?.toggleExplainMode();
    }
    toggleSuggestionFocus() {
        this._suggestWidget?.toggleDetailsFocus();
    }
    toggleSuggestionDetails() {
        this._suggestWidget?.toggleDetails();
    }
    resetWidgetSize() {
        this._suggestWidget?.resetWidgetSize();
    }
    async requestCompletions(explicitlyInvoked) {
        if (!this._promptInputModel) {
            this._shouldSyncWhenReady = true;
            return;
        }
        if (this.isPasting) {
            return;
        }
        if (this._cancellationTokenSource) {
            this._cancellationTokenSource.cancel();
            this._cancellationTokenSource.dispose();
        }
        this._cancellationTokenSource = new CancellationTokenSource();
        const token = this._cancellationTokenSource.token;
        // Track the time when completions are requested
        this._completionRequestTimestamp = Date.now();
        await this._handleCompletionProviders(this._terminal, token, explicitlyInvoked);
        // If completions are not shown (widget not visible), reset the tracker
        if (!this._terminalSuggestWidgetVisibleContextKey.get()) {
            this._completionRequestTimestamp = undefined;
        }
    }
    _addPropertiesToInlineCompletionItem(completions) {
        const inlineCompletionLabel = (typeof this._inlineCompletionItem.completion.label === 'string' ? this._inlineCompletionItem.completion.label : this._inlineCompletionItem.completion.label.label).trim();
        const inlineCompletionMatchIndex = completions.findIndex(c => typeof c.label === 'string' ? c.label === inlineCompletionLabel : c.label.label === inlineCompletionLabel);
        if (inlineCompletionMatchIndex !== -1) {
            // Remove the existing inline completion item from the completions list
            const richCompletionMatchingInline = completions.splice(inlineCompletionMatchIndex, 1)[0];
            // Apply its properties to the inline completion item
            this._inlineCompletionItem.completion.label = richCompletionMatchingInline.label;
            this._inlineCompletionItem.completion.detail = richCompletionMatchingInline.detail;
            this._inlineCompletionItem.completion.documentation = richCompletionMatchingInline.documentation;
        }
        else if (this._inlineCompletionItem.completion) {
            this._inlineCompletionItem.completion.detail = undefined;
            this._inlineCompletionItem.completion.documentation = undefined;
        }
    }
    _requestTriggerCharQuickSuggestCompletions() {
        if (!this._wasLastInputVerticalArrowKey() && !this._wasLastInputTabKey()) {
            // Only request on trigger character when it's a regular input, or on an arrow if the widget
            // is already visible
            if (!this._wasLastInputIncludedEscape() || this._terminalSuggestWidgetVisibleContextKey.get()) {
                this.requestCompletions();
                return true;
            }
        }
        return false;
    }
    _wasLastInputRightArrowKey() {
        return !!this._lastUserData?.match(/^\x1b[\[O]?C$/);
    }
    _wasLastInputVerticalArrowKey() {
        return !!this._lastUserData?.match(/^\x1b[\[O]?[A-B]$/);
    }
    /**
     * Whether the last input included the escape character. Typically this will mean it was more
     * than just a simple character, such as arrow keys, home, end, etc.
     */
    _wasLastInputIncludedEscape() {
        return !!this._lastUserData?.includes('\x1b');
    }
    _wasLastInputArrowKey() {
        // Never request completions if the last key sequence was up or down as the user was likely
        // navigating history
        return !!this._lastUserData?.match(/^\x1b[\[O]?[A-D]$/);
    }
    _wasLastInputTabKey() {
        return this._lastUserData === '\t';
    }
    _sync(promptInputState) {
        const config = this._configurationService.getValue(terminalSuggestConfigSection);
        {
            let sent = false;
            // If the cursor moved to the right
            if (!this._mostRecentPromptInputState || promptInputState.cursorIndex > this._mostRecentPromptInputState.cursorIndex) {
                // Quick suggestions - Trigger whenever a new non-whitespace character is used
                if (!this._terminalSuggestWidgetVisibleContextKey.get()) {
                    const commandLineHasSpace = promptInputState.prefix.trim().match(/\s/);
                    if ((!commandLineHasSpace && config.quickSuggestions.commands !== 'off') ||
                        (commandLineHasSpace && config.quickSuggestions.arguments !== 'off')) {
                        if (promptInputState.prefix.match(/[^\s]$/)) {
                            sent = this._requestTriggerCharQuickSuggestCompletions();
                        }
                    }
                }
                // Trigger characters - this happens even if the widget is showing
                if (config.suggestOnTriggerCharacters && !sent) {
                    const prefix = promptInputState.prefix;
                    if (
                    // Only trigger on `-` if it's after a space. This is required to not clear
                    // completions when typing the `-` in `git cherry-pick`
                    prefix?.match(/\s[\-]$/) ||
                        // Only trigger on `\` and `/` if it's a directory. Not doing so causes problems
                        // with git branches in particular
                        this._isFilteringDirectories && prefix?.match(/[\\\/]$/)) {
                        sent = this._requestTriggerCharQuickSuggestCompletions();
                    }
                    if (!sent) {
                        for (const provider of this._terminalCompletionService.providers) {
                            if (!provider.triggerCharacters) {
                                continue;
                            }
                            for (const char of provider.triggerCharacters) {
                                if (prefix?.endsWith(char)) {
                                    sent = this._requestTriggerCharQuickSuggestCompletions();
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            // If the cursor moved to the left
            if (this._mostRecentPromptInputState && promptInputState.cursorIndex < this._mostRecentPromptInputState.cursorIndex && promptInputState.cursorIndex > 0) {
                // We only want to refresh via trigger characters in this case if the widget is
                // already visible
                if (this._terminalSuggestWidgetVisibleContextKey.get()) {
                    // Backspace or left past a trigger character
                    if (config.suggestOnTriggerCharacters && !sent && this._mostRecentPromptInputState.cursorIndex > 0) {
                        const char = this._mostRecentPromptInputState.value[this._mostRecentPromptInputState.cursorIndex - 1];
                        if (
                        // Only trigger on `\` and `/` if it's a directory. Not doing so causes problems
                        // with git branches in particular
                        this._isFilteringDirectories && char.match(/[\\\/]$/)) {
                            sent = this._requestTriggerCharQuickSuggestCompletions();
                        }
                    }
                }
            }
        }
        // Hide the widget if ghost text was just completed via right arrow
        if (this._wasLastInputRightArrowKey() &&
            this._mostRecentPromptInputState?.ghostTextIndex !== -1 &&
            promptInputState.ghostTextIndex === -1 &&
            this._mostRecentPromptInputState?.value === promptInputState.value) {
            this.hideSuggestWidget(false);
        }
        this._mostRecentPromptInputState = promptInputState;
        if (!this._promptInputModel || !this._terminal || !this._suggestWidget || this._leadingLineContent === undefined) {
            return;
        }
        const previousPromptInputState = this._currentPromptInputState;
        this._currentPromptInputState = promptInputState;
        // Hide the widget if the latest character was a space
        if (this._currentPromptInputState.cursorIndex > 1 && this._currentPromptInputState.value.at(this._currentPromptInputState.cursorIndex - 1) === ' ') {
            if (!this._wasLastInputArrowKey()) {
                this.hideSuggestWidget(false);
                return;
            }
        }
        // Hide the widget if the cursor moves to the left and invalidates the completions.
        // Originally this was to the left of the initial position that the completions were
        // requested, but since extensions are expected to allow the client-side to filter, they are
        // only invalidated when whitespace is encountered.
        if (this._currentPromptInputState && this._currentPromptInputState.cursorIndex < this._leadingLineContent.length) {
            if (this._currentPromptInputState.cursorIndex <= 0 || previousPromptInputState?.value[this._currentPromptInputState.cursorIndex]?.match(/[\\\/\s]/)) {
                this.hideSuggestWidget(false);
                return;
            }
        }
        if (this._terminalSuggestWidgetVisibleContextKey.get()) {
            this._cursorIndexDelta = this._currentPromptInputState.cursorIndex - (this._requestedCompletionsIndex);
            let normalizedLeadingLineContent = this._currentPromptInputState.value.substring(0, this._requestedCompletionsIndex + this._cursorIndexDelta);
            if (this._isFilteringDirectories) {
                normalizedLeadingLineContent = normalizePathSeparator(normalizedLeadingLineContent, this._pathSeparator);
            }
            const lineContext = new LineContext(normalizedLeadingLineContent, this._cursorIndexDelta);
            this._suggestWidget.setLineContext(lineContext);
        }
        this._refreshInlineCompletion(this._model?.items.map(i => i.completion) || []);
        // Hide and clear model if there are no more items
        if (!this._suggestWidget.hasCompletions()) {
            this.hideSuggestWidget(false);
            return;
        }
        const cursorPosition = this._getCursorPosition(this._terminal);
        if (!cursorPosition) {
            return;
        }
        this._suggestWidget.showSuggestions(0, false, true, cursorPosition);
    }
    _refreshInlineCompletion(completions) {
        if (!isInlineCompletionSupported(this.shellType)) {
            // If the shell type is not supported, the inline completion item is invalid
            return;
        }
        const oldIsInvalid = this._inlineCompletionItem.isInvalid;
        if (!this._currentPromptInputState || this._currentPromptInputState.ghostTextIndex === -1) {
            this._inlineCompletionItem.isInvalid = true;
        }
        else {
            this._inlineCompletionItem.isInvalid = false;
            // Update properties
            const spaceIndex = this._currentPromptInputState.value.lastIndexOf(' ', this._currentPromptInputState.ghostTextIndex - 1);
            const replacementIndex = spaceIndex === -1 ? 0 : spaceIndex + 1;
            const suggestion = this._currentPromptInputState.value.substring(replacementIndex);
            this._inlineCompletion.label = suggestion;
            this._inlineCompletion.replacementIndex = replacementIndex;
            // Note that the cursor index delta must be taken into account here, otherwise filtering
            // wont work correctly.
            this._inlineCompletion.replacementLength = this._currentPromptInputState.cursorIndex - replacementIndex - this._cursorIndexDelta;
            // Reset the completion item as the object reference must remain the same but its
            // contents will differ across syncs. This is done so we don't need to reassign the
            // model and the slowdown/flickering that could potentially cause.
            this._addPropertiesToInlineCompletionItem(completions);
            const x = new TerminalCompletionItem(this._inlineCompletion);
            this._inlineCompletionItem.idx = x.idx;
            this._inlineCompletionItem.score = x.score;
            this._inlineCompletionItem.labelLow = x.labelLow;
            this._inlineCompletionItem.textLabel = x.textLabel;
            this._inlineCompletionItem.fileExtLow = x.fileExtLow;
            this._inlineCompletionItem.labelLowExcludeFileExt = x.labelLowExcludeFileExt;
            this._inlineCompletionItem.labelLowNormalizedPath = x.labelLowNormalizedPath;
            this._inlineCompletionItem.punctuationPenalty = x.punctuationPenalty;
            this._inlineCompletionItem.word = x.word;
            this._model?.forceRefilterAll();
        }
        // Force a filter all in order to re-evaluate the inline completion
        if (this._inlineCompletionItem.isInvalid !== oldIsInvalid) {
            this._model?.forceRefilterAll();
        }
    }
    _getTerminalDimensions() {
        const cssCellDims = this._terminal._core._renderService.dimensions.css.cell;
        return {
            width: cssCellDims.width,
            height: cssCellDims.height,
        };
    }
    _getCursorPosition(terminal) {
        const dimensions = this._getTerminalDimensions();
        if (!dimensions.width || !dimensions.height) {
            return undefined;
        }
        const xtermBox = this._screen.getBoundingClientRect();
        return {
            left: xtermBox.left + terminal.buffer.active.cursorX * dimensions.width,
            top: xtermBox.top + terminal.buffer.active.cursorY * dimensions.height,
            height: dimensions.height
        };
    }
    _getFontInfo() {
        if (this._cachedFontInfo) {
            return this._cachedFontInfo;
        }
        const core = this._terminal._core;
        const font = this._terminalConfigurationService.getFont(dom.getActiveWindow(), core);
        let lineHeight = font.lineHeight;
        const fontSize = font.fontSize;
        const fontFamily = font.fontFamily;
        const letterSpacing = font.letterSpacing;
        const fontWeight = this._configurationService.getValue('editor.fontWeight');
        if (lineHeight <= 1) {
            lineHeight = GOLDEN_LINE_HEIGHT_RATIO * fontSize;
        }
        else if (lineHeight < MINIMUM_LINE_HEIGHT) {
            // Values too small to be line heights in pixels are in ems.
            lineHeight = lineHeight * fontSize;
        }
        // Enforce integer, minimum constraints
        lineHeight = Math.round(lineHeight);
        if (lineHeight < MINIMUM_LINE_HEIGHT) {
            lineHeight = MINIMUM_LINE_HEIGHT;
        }
        const fontInfo = {
            fontSize,
            lineHeight,
            fontWeight: fontWeight.toString(),
            letterSpacing,
            fontFamily
        };
        this._cachedFontInfo = fontInfo;
        return fontInfo;
    }
    _getAdvancedExplainModeDetails() {
        return `promptInputModel: ${this._promptInputModel?.getCombinedString()}`;
    }
    _showCompletions(model, explicitlyInvoked) {
        if (!this._terminal?.element) {
            return;
        }
        const suggestWidget = this._ensureSuggestWidget(this._terminal);
        suggestWidget.setCompletionModel(model);
        this._register(suggestWidget.onDidFocus(() => this._terminal?.focus()));
        if (!this._promptInputModel || !explicitlyInvoked && model.items.length === 0) {
            return;
        }
        this._model = model;
        const cursorPosition = this._getCursorPosition(this._terminal);
        if (!cursorPosition) {
            return;
        }
        // Track the time when completions are shown for the first time
        if (this._completionRequestTimestamp !== undefined) {
            const completionLatency = Date.now() - this._completionRequestTimestamp;
            if (this._suggestTelemetry && this._discoverability) {
                const firstShown = this._discoverability.getFirstShown(this.shellType);
                this._discoverability.updateShown();
                this._suggestTelemetry.logCompletionLatency(this._sessionId, completionLatency, firstShown);
            }
            this._completionRequestTimestamp = undefined;
        }
        suggestWidget.showSuggestions(0, false, !explicitlyInvoked, cursorPosition);
    }
    _ensureSuggestWidget(terminal) {
        if (!this._suggestWidget) {
            this._suggestWidget = this._register(this._instantiationService.createInstance(SimpleSuggestWidget, this._container, this._instantiationService.createInstance(PersistedWidgetSize), {
                statusBarMenuId: MenuId.MenubarTerminalSuggestStatusMenu,
                showStatusBarSettingId: "terminal.integrated.suggest.showStatusBar" /* TerminalSuggestSettingId.ShowStatusBar */,
                selectionModeSettingId: "terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */,
            }, this._getFontInfo.bind(this), this._onDidFontConfigurationChange.event.bind(this), this._getAdvancedExplainModeDetails.bind(this)));
            this._register(this._suggestWidget.onDidSelect(async (e) => this.acceptSelectedSuggestion(e)));
            this._register(this._suggestWidget.onDidHide(() => this._terminalSuggestWidgetVisibleContextKey.reset()));
            this._register(this._suggestWidget.onDidShow(() => this._terminalSuggestWidgetVisibleContextKey.set(true)));
            this._register(this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration("terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */) || e.affectsConfiguration("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */) || e.affectsConfiguration("terminal.integrated.lineHeight" /* TerminalSettingId.LineHeight */) || e.affectsConfiguration("terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */) || e.affectsConfiguration('editor.fontSize') || e.affectsConfiguration('editor.fontFamily')) {
                    this._onDidFontConfigurationChange.fire();
                }
            }));
            const element = this._terminal?.element?.querySelector('.xterm-helper-textarea');
            if (element) {
                this._register(dom.addDisposableListener(dom.getActiveDocument(), 'click', (event) => {
                    const target = event.target;
                    if (this._terminal?.element?.contains(target)) {
                        this._suggestWidget?.hide();
                    }
                }));
            }
            this._register(this._suggestWidget.onDidShow(() => this._updateDiscoverabilityState()));
            this._register(this._suggestWidget.onDidBlurDetails((e) => {
                const elt = e.relatedTarget;
                if (this._terminal?.element?.contains(elt)) {
                    // Do nothing, just the terminal getting focused
                    // If there was a mouse click, the suggest widget will be
                    // hidden above
                    return;
                }
                this._suggestWidget?.hide();
            }));
            this._terminalSuggestWidgetVisibleContextKey.set(false);
        }
        return this._suggestWidget;
    }
    _updateDiscoverabilityState() {
        if (!this._discoverability) {
            this._discoverability = this._register(this._instantiationService.createInstance(TerminalSuggestShownTracker, this.shellType));
        }
        if (!this._suggestWidget || this._discoverability?.done) {
            return;
        }
        this._discoverability?.update(this._suggestWidget.element.domNode);
    }
    resetDiscoverability() {
        this._discoverability?.resetState();
    }
    selectPreviousSuggestion() {
        this._suggestWidget?.selectPrevious();
    }
    selectPreviousPageSuggestion() {
        this._suggestWidget?.selectPreviousPage();
    }
    selectNextSuggestion() {
        this._suggestWidget?.selectNext();
    }
    selectNextPageSuggestion() {
        this._suggestWidget?.selectNextPage();
    }
    acceptSelectedSuggestion(suggestion, respectRunOnEnter) {
        if (!suggestion) {
            suggestion = this._suggestWidget?.getFocusedItem();
        }
        const initialPromptInputState = this._mostRecentPromptInputState;
        if (!suggestion?.item || !initialPromptInputState || this._leadingLineContent === undefined || !this._model) {
            this._suggestTelemetry?.acceptCompletion(this._sessionId, undefined, this._mostRecentPromptInputState?.value);
            return;
        }
        SuggestAddon_1.lastAcceptedCompletionTimestamp = Date.now();
        this._suggestWidget?.hide();
        const currentPromptInputState = this._currentPromptInputState ?? initialPromptInputState;
        // The replacement text is any text after the replacement index for the completions, this
        // includes any text that was there before the completions were requested and any text added
        // since to refine the completion.
        const replacementText = currentPromptInputState.value.substring(suggestion.item.completion.replacementIndex, currentPromptInputState.cursorIndex);
        // Right side of replacement text in the same word
        let rightSideReplacementText = '';
        if (
        // The line didn't end with ghost text
        (currentPromptInputState.ghostTextIndex === -1 || currentPromptInputState.ghostTextIndex > currentPromptInputState.cursorIndex) &&
            // There is more than one charatcer
            currentPromptInputState.value.length > currentPromptInputState.cursorIndex + 1 &&
            // THe next character is not a space
            currentPromptInputState.value.at(currentPromptInputState.cursorIndex) !== ' ') {
            const spaceIndex = currentPromptInputState.value.substring(currentPromptInputState.cursorIndex, currentPromptInputState.ghostTextIndex === -1 ? undefined : currentPromptInputState.ghostTextIndex).indexOf(' ');
            rightSideReplacementText = currentPromptInputState.value.substring(currentPromptInputState.cursorIndex, spaceIndex === -1 ? undefined : currentPromptInputState.cursorIndex + spaceIndex);
        }
        const completion = suggestion.item.completion;
        let resultSequence = completion.inputData;
        // Use for amend the label if inputData is not defined
        if (resultSequence === undefined) {
            let completionText = typeof completion.label === 'string' ? completion.label : completion.label.label;
            if ((completion.kind === TerminalCompletionItemKind.Folder || completion.isFileOverride) && completionText.includes(' ')) {
                // Escape spaces in files or folders so they're valid paths
                completionText = completionText.replaceAll(' ', '\\ ');
            }
            let runOnEnter = false;
            if (respectRunOnEnter) {
                const runOnEnterConfig = this._configurationService.getValue(terminalSuggestConfigSection).runOnEnter;
                switch (runOnEnterConfig) {
                    case 'always': {
                        runOnEnter = true;
                        break;
                    }
                    case 'exactMatch': {
                        runOnEnter = replacementText.toLowerCase() === completionText.toLowerCase();
                        break;
                    }
                    case 'exactMatchIgnoreExtension': {
                        runOnEnter = replacementText.toLowerCase() === completionText.toLowerCase();
                        if (completion.isFileOverride) {
                            runOnEnter ||= replacementText.toLowerCase() === completionText.toLowerCase().replace(/\.[^\.]+$/, '');
                        }
                        break;
                    }
                }
            }
            const commonPrefixLen = commonPrefixLength(replacementText, completionText);
            const commonPrefix = replacementText.substring(replacementText.length - 1 - commonPrefixLen, replacementText.length - 1);
            const completionSuffix = completionText.substring(commonPrefixLen);
            if (currentPromptInputState.suffix.length > 0 && currentPromptInputState.prefix.endsWith(commonPrefix) && currentPromptInputState.suffix.startsWith(completionSuffix)) {
                // Move right to the end of the completion
                resultSequence = '\x1bOC'.repeat(completionText.length - commonPrefixLen);
            }
            else {
                resultSequence = [
                    // Backspace (left) to remove all additional input
                    '\x7F'.repeat(replacementText.length - commonPrefixLen),
                    // Delete (right) to remove any additional text in the same word
                    '\x1b[3~'.repeat(rightSideReplacementText.length),
                    // Write the completion
                    completionSuffix,
                    // Run on enter if needed
                    runOnEnter ? '\r' : ''
                ].join('');
            }
        }
        // For folders, allow the next completion request to get completions for that folder
        if (completion.kind === TerminalCompletionItemKind.Folder) {
            SuggestAddon_1.lastAcceptedCompletionTimestamp = 0;
        }
        // Send the completion
        this._onAcceptedCompletion.fire(resultSequence);
        this._suggestTelemetry?.acceptCompletion(this._sessionId, completion, this._mostRecentPromptInputState?.value);
        this.hideSuggestWidget(true);
    }
    hideSuggestWidget(cancelAnyRequest) {
        this._discoverability?.resetTimer();
        if (cancelAnyRequest) {
            this._cancellationTokenSource?.cancel();
            this._cancellationTokenSource = undefined;
        }
        this._currentPromptInputState = undefined;
        this._leadingLineContent = undefined;
        this._suggestWidget?.hide();
    }
};
SuggestAddon = SuggestAddon_1 = __decorate([
    __param(4, ITerminalCompletionService),
    __param(5, IConfigurationService),
    __param(6, IInstantiationService),
    __param(7, IExtensionService),
    __param(8, ITerminalConfigurationService)
], SuggestAddon);
export { SuggestAddon };
let PersistedWidgetSize = class PersistedWidgetSize {
    constructor(_storageService) {
        this._storageService = _storageService;
        this._key = "terminal.integrated.suggestSize" /* TerminalStorageKeys.TerminalSuggestSize */;
    }
    restore() {
        const raw = this._storageService.get(this._key, 0 /* StorageScope.PROFILE */) ?? '';
        try {
            const obj = JSON.parse(raw);
            if (dom.Dimension.is(obj)) {
                return dom.Dimension.lift(obj);
            }
        }
        catch {
            // ignore
        }
        return undefined;
    }
    store(size) {
        this._storageService.store(this._key, JSON.stringify(size), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    reset() {
        this._storageService.remove(this._key, 0 /* StorageScope.PROFILE */);
    }
};
PersistedWidgetSize = __decorate([
    __param(0, IStorageService)
], PersistedWidgetSize);
export function normalizePathSeparator(path, sep) {
    if (sep === '/') {
        return path.replaceAll('\\', '/');
    }
    return path.replaceAll('/', '\\');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0QWRkb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvdGVybWluYWxTdWdnZXN0QWRkb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sbURBQW1ELENBQUM7QUFLakgsT0FBTyxFQUFFLDRCQUE0QixFQUFnRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3ZKLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUM1RixPQUFPLEVBQTZCLG1CQUFtQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDN0gsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFNUUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFN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