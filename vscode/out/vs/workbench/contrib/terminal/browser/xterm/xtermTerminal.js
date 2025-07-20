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
var XtermTerminal_1;
import * as dom from '../../../../../base/browser/dom.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
import { ITerminalConfigurationService } from '../terminal.js';
import { LogLevel } from '../../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { MarkNavigationAddon } from './markNavigationAddon.js';
import { localize } from '../../../../../nls.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { PANEL_BACKGROUND } from '../../../../common/theme.js';
import { TERMINAL_FOREGROUND_COLOR, TERMINAL_BACKGROUND_COLOR, TERMINAL_CURSOR_FOREGROUND_COLOR, TERMINAL_CURSOR_BACKGROUND_COLOR, ansiColorIdentifiers, TERMINAL_SELECTION_BACKGROUND_COLOR, TERMINAL_FIND_MATCH_BACKGROUND_COLOR, TERMINAL_FIND_MATCH_HIGHLIGHT_BACKGROUND_COLOR, TERMINAL_FIND_MATCH_BORDER_COLOR, TERMINAL_OVERVIEW_RULER_FIND_MATCH_FOREGROUND_COLOR, TERMINAL_FIND_MATCH_HIGHLIGHT_BORDER_COLOR, TERMINAL_OVERVIEW_RULER_CURSOR_FOREGROUND_COLOR, TERMINAL_SELECTION_FOREGROUND_COLOR, TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR, TERMINAL_OVERVIEW_RULER_BORDER_COLOR } from '../../common/terminalColorRegistry.js';
import { ShellIntegrationAddon } from '../../../../../platform/terminal/common/xterm/shellIntegrationAddon.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { DecorationAddon } from './decorationAddon.js';
import { Emitter } from '../../../../../base/common/event.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TerminalContextKeys } from '../../common/terminalContextKey.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { debounce } from '../../../../../base/common/decorators.js';
import { MouseWheelClassifier } from '../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { StandardWheelEvent } from '../../../../../base/browser/mouseEvent.js';
import { ILayoutService } from '../../../../../platform/layout/browser/layoutService.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { scrollbarSliderActiveBackground, scrollbarSliderBackground, scrollbarSliderHoverBackground } from '../../../../../platform/theme/common/colorRegistry.js';
import { XtermAddonImporter } from './xtermAddonImporter.js';
import { equals } from '../../../../../base/common/objects.js';
var RenderConstants;
(function (RenderConstants) {
    RenderConstants[RenderConstants["SmoothScrollDuration"] = 125] = "SmoothScrollDuration";
})(RenderConstants || (RenderConstants = {}));
function getFullBufferLineAsString(lineIndex, buffer) {
    let line = buffer.getLine(lineIndex);
    if (!line) {
        return { lineData: undefined, lineIndex };
    }
    let lineData = line.translateToString(true);
    while (lineIndex > 0 && line.isWrapped) {
        line = buffer.getLine(--lineIndex);
        if (!line) {
            break;
        }
        lineData = line.translateToString(false) + lineData;
    }
    return { lineData, lineIndex };
}
/**
 * Wraps the xterm object with additional functionality. Interaction with the backing process is out
 * of the scope of this class.
 */
let XtermTerminal = class XtermTerminal extends Disposable {
    static { XtermTerminal_1 = this; }
    static { this._suggestedRendererType = undefined; }
    get lastInputEvent() { return this._lastInputEvent; }
    get progressState() { return this._progressState; }
    get findResult() { return this._lastFindResult; }
    get isStdinDisabled() { return !!this.raw.options.disableStdin; }
    get isGpuAccelerated() { return !!this._webglAddon; }
    get markTracker() { return this._markNavigationAddon; }
    get shellIntegration() { return this._shellIntegrationAddon; }
    get decorationAddon() { return this._decorationAddon; }
    get textureAtlas() {
        const canvas = this._webglAddon?.textureAtlas;
        if (!canvas) {
            return undefined;
        }
        return createImageBitmap(canvas);
    }
    get isFocused() {
        if (!this.raw.element) {
            return false;
        }
        return dom.isAncestorOfActiveElement(this.raw.element);
    }
    /**
     * @param xtermCtor The xterm.js constructor, this is passed in so it can be fetched lazily
     * outside of this class such that {@link raw} is not nullable.
     */
    constructor(xtermCtor, options, _onDidExecuteText, _configurationService, _instantiationService, _logService, _notificationService, _themeService, _telemetryService, _terminalConfigurationService, _clipboardService, contextKeyService, _accessibilitySignalService, layoutService) {
        super();
        this._onDidExecuteText = _onDidExecuteText;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._notificationService = _notificationService;
        this._themeService = _themeService;
        this._telemetryService = _telemetryService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._clipboardService = _clipboardService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._isPhysicalMouseWheel = MouseWheelClassifier.INSTANCE.isPhysicalMouseWheel();
        this._progressState = { state: 0, value: 0 };
        this._ligaturesAddon = this._register(new MutableDisposable());
        this._attachedDisposables = this._register(new DisposableStore());
        this._onDidRequestRunCommand = this._register(new Emitter());
        this.onDidRequestRunCommand = this._onDidRequestRunCommand.event;
        this._onDidRequestCopyAsHtml = this._register(new Emitter());
        this.onDidRequestCopyAsHtml = this._onDidRequestCopyAsHtml.event;
        this._onDidRequestRefreshDimensions = this._register(new Emitter());
        this.onDidRequestRefreshDimensions = this._onDidRequestRefreshDimensions.event;
        this._onDidChangeFindResults = this._register(new Emitter());
        this.onDidChangeFindResults = this._onDidChangeFindResults.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeFocus = this._register(new Emitter());
        this.onDidChangeFocus = this._onDidChangeFocus.event;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChangeProgress = this._register(new Emitter());
        this.onDidChangeProgress = this._onDidChangeProgress.event;
        this._xtermAddonLoader = options.xtermAddonImporter ?? new XtermAddonImporter();
        this._xtermColorProvider = options.xtermColorProvider;
        this._capabilities = options.capabilities;
        const font = this._terminalConfigurationService.getFont(dom.getActiveWindow(), undefined, true);
        const config = this._terminalConfigurationService.config;
        const editorOptions = this._configurationService.getValue('editor');
        this.raw = this._register(new xtermCtor({
            allowProposedApi: true,
            cols: options.cols,
            rows: options.rows,
            documentOverride: layoutService.mainContainer.ownerDocument,
            altClickMovesCursor: config.altClickMovesCursor && editorOptions.multiCursorModifier === 'alt',
            scrollback: config.scrollback,
            theme: this.getXtermTheme(),
            drawBoldTextInBrightColors: config.drawBoldTextInBrightColors,
            fontFamily: font.fontFamily,
            fontWeight: config.fontWeight,
            fontWeightBold: config.fontWeightBold,
            fontSize: font.fontSize,
            letterSpacing: font.letterSpacing,
            lineHeight: font.lineHeight,
            logLevel: vscodeToXtermLogLevel(this._logService.getLevel()),
            logger: this._logService,
            minimumContrastRatio: config.minimumContrastRatio,
            tabStopWidth: config.tabStopWidth,
            cursorBlink: config.cursorBlinking,
            cursorStyle: vscodeToXtermCursorStyle(config.cursorStyle),
            cursorInactiveStyle: vscodeToXtermCursorStyle(config.cursorStyleInactive),
            cursorWidth: config.cursorWidth,
            macOptionIsMeta: config.macOptionIsMeta,
            macOptionClickForcesSelection: config.macOptionClickForcesSelection,
            rightClickSelectsWord: config.rightClickBehavior === 'selectWord',
            fastScrollModifier: 'alt',
            fastScrollSensitivity: config.fastScrollSensitivity,
            scrollSensitivity: config.mouseWheelScrollSensitivity,
            scrollOnEraseInDisplay: true,
            wordSeparator: config.wordSeparators,
            overviewRuler: {
                width: 14,
                showTopBorder: true,
            },
            ignoreBracketedPasteMode: config.ignoreBracketedPasteMode,
            rescaleOverlappingGlyphs: config.rescaleOverlappingGlyphs,
            windowOptions: {
                getWinSizePixels: true,
                getCellSizePixels: true,
                getWinSizeChars: true,
            },
        }));
        this._updateSmoothScrolling();
        this._core = this.raw._core;
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("terminal.integrated.gpuAcceleration" /* TerminalSettingId.GpuAcceleration */)) {
                XtermTerminal_1._suggestedRendererType = undefined;
            }
            if (e.affectsConfiguration('terminal.integrated') || e.affectsConfiguration('editor.fastScrollSensitivity') || e.affectsConfiguration('editor.mouseWheelScrollSensitivity') || e.affectsConfiguration('editor.multiCursorModifier')) {
                this.updateConfig();
            }
            if (e.affectsConfiguration("terminal.integrated.unicodeVersion" /* TerminalSettingId.UnicodeVersion */)) {
                this._updateUnicodeVersion();
            }
            if (e.affectsConfiguration("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */)) {
                this._updateTheme();
            }
        }));
        this._register(this._themeService.onDidColorThemeChange(theme => this._updateTheme(theme)));
        this._register(this._logService.onDidChangeLogLevel(e => this.raw.options.logLevel = vscodeToXtermLogLevel(e)));
        // Refire events
        this._register(this.raw.onSelectionChange(() => {
            this._onDidChangeSelection.fire();
            if (this.isFocused) {
                this._anyFocusedTerminalHasSelection.set(this.raw.hasSelection());
            }
        }));
        this._register(this.raw.onData(e => this._lastInputEvent = e));
        // Load addons
        this._updateUnicodeVersion();
        this._markNavigationAddon = this._instantiationService.createInstance(MarkNavigationAddon, options.capabilities);
        this.raw.loadAddon(this._markNavigationAddon);
        this._decorationAddon = this._instantiationService.createInstance(DecorationAddon, this._capabilities);
        this._register(this._decorationAddon.onDidRequestRunCommand(e => this._onDidRequestRunCommand.fire(e)));
        this._register(this._decorationAddon.onDidRequestCopyAsHtml(e => this._onDidRequestCopyAsHtml.fire(e)));
        this.raw.loadAddon(this._decorationAddon);
        this._shellIntegrationAddon = new ShellIntegrationAddon(options.shellIntegrationNonce ?? '', options.disableShellIntegrationReporting, this._onDidExecuteText, this._telemetryService, this._logService);
        this.raw.loadAddon(this._shellIntegrationAddon);
        this._xtermAddonLoader.importAddon('clipboard').then(ClipboardAddon => {
            if (this._store.isDisposed) {
                return;
            }
            this._clipboardAddon = this._instantiationService.createInstance(ClipboardAddon, undefined, {
                async readText(type) {
                    return _clipboardService.readText(type === 'p' ? 'selection' : 'clipboard');
                },
                async writeText(type, text) {
                    return _clipboardService.writeText(text, type === 'p' ? 'selection' : 'clipboard');
                }
            });
            this.raw.loadAddon(this._clipboardAddon);
        });
        this._xtermAddonLoader.importAddon('progress').then(ProgressAddon => {
            if (this._store.isDisposed) {
                return;
            }
            const progressAddon = this._instantiationService.createInstance(ProgressAddon);
            this.raw.loadAddon(progressAddon);
            const updateProgress = () => {
                if (!equals(this._progressState, progressAddon.progress)) {
                    this._progressState = progressAddon.progress;
                    this._onDidChangeProgress.fire(this._progressState);
                }
            };
            this._register(progressAddon.onChange(() => updateProgress()));
            updateProgress();
            const commandDetection = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (commandDetection) {
                this._register(commandDetection.onCommandFinished(() => progressAddon.progress = { state: 0, value: 0 }));
            }
            else {
                const disposable = this._capabilities.onDidAddCapability(e => {
                    if (e.id === 2 /* TerminalCapability.CommandDetection */) {
                        this._register(e.capability.onCommandFinished(() => progressAddon.progress = { state: 0, value: 0 }));
                        this._store.delete(disposable);
                    }
                });
                this._store.add(disposable);
            }
        });
        this._anyTerminalFocusContextKey = TerminalContextKeys.focusInAny.bindTo(contextKeyService);
        this._anyFocusedTerminalHasSelection = TerminalContextKeys.textSelectedInFocused.bindTo(contextKeyService);
    }
    *getBufferReverseIterator() {
        for (let i = this.raw.buffer.active.length; i >= 0; i--) {
            const { lineData, lineIndex } = getFullBufferLineAsString(i, this.raw.buffer.active);
            if (lineData) {
                i = lineIndex;
                yield lineData;
            }
        }
    }
    getContentsAsText(startMarker, endMarker) {
        const lines = [];
        const buffer = this.raw.buffer.active;
        if (startMarker?.line === -1) {
            throw new Error('Cannot get contents of a disposed startMarker');
        }
        if (endMarker?.line === -1) {
            throw new Error('Cannot get contents of a disposed endMarker');
        }
        const startLine = startMarker?.line ?? 0;
        const endLine = endMarker?.line ?? buffer.length - 1;
        for (let y = startLine; y <= endLine; y++) {
            lines.push(buffer.getLine(y)?.translateToString(true) ?? '');
        }
        return lines.join('\n');
    }
    async getContentsAsHtml() {
        if (!this._serializeAddon) {
            const Addon = await this._xtermAddonLoader.importAddon('serialize');
            this._serializeAddon = new Addon();
            this.raw.loadAddon(this._serializeAddon);
        }
        return this._serializeAddon.serializeAsHTML();
    }
    async getSelectionAsHtml(command) {
        if (!this._serializeAddon) {
            const Addon = await this._xtermAddonLoader.importAddon('serialize');
            this._serializeAddon = new Addon();
            this.raw.loadAddon(this._serializeAddon);
        }
        if (command) {
            const length = command.getOutput()?.length;
            const row = command.marker?.line;
            if (!length || !row) {
                throw new Error(`No row ${row} or output length ${length} for command ${command}`);
            }
            this.raw.select(0, row + 1, length - Math.floor(length / this.raw.cols));
        }
        const result = this._serializeAddon.serializeAsHTML({ onlySelection: true });
        if (command) {
            this.raw.clearSelection();
        }
        return result;
    }
    attachToElement(container, partialOptions) {
        const options = { enableGpu: true, ...partialOptions };
        if (!this._attached) {
            this.raw.open(container);
        }
        // TODO: Move before open so the DOM renderer doesn't initialize
        if (options.enableGpu) {
            if (this._shouldLoadWebgl()) {
                this._enableWebglRenderer();
            }
        }
        if (!this.raw.element || !this.raw.textarea) {
            throw new Error('xterm elements not set after open');
        }
        const ad = this._attachedDisposables;
        ad.clear();
        ad.add(dom.addDisposableListener(this.raw.textarea, 'focus', () => this._setFocused(true)));
        ad.add(dom.addDisposableListener(this.raw.textarea, 'blur', () => this._setFocused(false)));
        ad.add(dom.addDisposableListener(this.raw.textarea, 'focusout', () => this._setFocused(false)));
        // Track wheel events in mouse wheel classifier and update smoothScrolling when it changes
        // as it must be disabled when a trackpad is used
        ad.add(dom.addDisposableListener(this.raw.element, dom.EventType.MOUSE_WHEEL, (e) => {
            const classifier = MouseWheelClassifier.INSTANCE;
            classifier.acceptStandardWheelEvent(new StandardWheelEvent(e));
            const value = classifier.isPhysicalMouseWheel();
            if (value !== this._isPhysicalMouseWheel) {
                this._isPhysicalMouseWheel = value;
                this._updateSmoothScrolling();
            }
        }, { passive: true }));
        this._refreshLigaturesAddon();
        this._attached = { container, options };
        // Screen must be created at this point as xterm.open is called
        return this._attached?.container.querySelector('.xterm-screen');
    }
    _setFocused(isFocused) {
        this._onDidChangeFocus.fire(isFocused);
        this._anyTerminalFocusContextKey.set(isFocused);
        this._anyFocusedTerminalHasSelection.set(isFocused && this.raw.hasSelection());
    }
    write(data, callback) {
        this.raw.write(data, callback);
    }
    resize(columns, rows) {
        this.raw.resize(columns, rows);
    }
    updateConfig() {
        const config = this._terminalConfigurationService.config;
        this.raw.options.altClickMovesCursor = config.altClickMovesCursor;
        this._setCursorBlink(config.cursorBlinking);
        this._setCursorStyle(config.cursorStyle);
        this._setCursorStyleInactive(config.cursorStyleInactive);
        this._setCursorWidth(config.cursorWidth);
        this.raw.options.scrollback = config.scrollback;
        this.raw.options.drawBoldTextInBrightColors = config.drawBoldTextInBrightColors;
        this.raw.options.minimumContrastRatio = config.minimumContrastRatio;
        this.raw.options.tabStopWidth = config.tabStopWidth;
        this.raw.options.fastScrollSensitivity = config.fastScrollSensitivity;
        this.raw.options.scrollSensitivity = config.mouseWheelScrollSensitivity;
        this.raw.options.macOptionIsMeta = config.macOptionIsMeta;
        const editorOptions = this._configurationService.getValue('editor');
        this.raw.options.altClickMovesCursor = config.altClickMovesCursor && editorOptions.multiCursorModifier === 'alt';
        this.raw.options.macOptionClickForcesSelection = config.macOptionClickForcesSelection;
        this.raw.options.rightClickSelectsWord = config.rightClickBehavior === 'selectWord';
        this.raw.options.wordSeparator = config.wordSeparators;
        this.raw.options.customGlyphs = config.customGlyphs;
        this.raw.options.ignoreBracketedPasteMode = config.ignoreBracketedPasteMode;
        this.raw.options.rescaleOverlappingGlyphs = config.rescaleOverlappingGlyphs;
        this.raw.options.overviewRuler = {
            width: 14,
            showTopBorder: true,
        };
        this._updateSmoothScrolling();
        if (this._attached) {
            if (this._attached.options.enableGpu) {
                if (this._shouldLoadWebgl()) {
                    this._enableWebglRenderer();
                }
                else {
                    this._disposeOfWebglRenderer();
                }
            }
            this._refreshLigaturesAddon();
        }
    }
    _updateSmoothScrolling() {
        this.raw.options.smoothScrollDuration = this._terminalConfigurationService.config.smoothScrolling && this._isPhysicalMouseWheel ? 125 /* RenderConstants.SmoothScrollDuration */ : 0;
    }
    _shouldLoadWebgl() {
        return (this._terminalConfigurationService.config.gpuAcceleration === 'auto' && XtermTerminal_1._suggestedRendererType === undefined) || this._terminalConfigurationService.config.gpuAcceleration === 'on';
    }
    forceRedraw() {
        this.raw.clearTextureAtlas();
    }
    clearDecorations() {
        this._decorationAddon?.clearDecorations();
    }
    forceRefresh() {
        this._core.viewport?._innerRefresh();
    }
    async findNext(term, searchOptions) {
        this._updateFindColors(searchOptions);
        return (await this._getSearchAddon()).findNext(term, searchOptions);
    }
    async findPrevious(term, searchOptions) {
        this._updateFindColors(searchOptions);
        return (await this._getSearchAddon()).findPrevious(term, searchOptions);
    }
    _updateFindColors(searchOptions) {
        const theme = this._themeService.getColorTheme();
        // Theme color names align with monaco/vscode whereas xterm.js has some different naming.
        // The mapping is as follows:
        // - findMatch -> activeMatch
        // - findMatchHighlight -> match
        const terminalBackground = theme.getColor(TERMINAL_BACKGROUND_COLOR) || theme.getColor(PANEL_BACKGROUND);
        const findMatchBackground = theme.getColor(TERMINAL_FIND_MATCH_BACKGROUND_COLOR);
        const findMatchBorder = theme.getColor(TERMINAL_FIND_MATCH_BORDER_COLOR);
        const findMatchOverviewRuler = theme.getColor(TERMINAL_OVERVIEW_RULER_CURSOR_FOREGROUND_COLOR);
        const findMatchHighlightBackground = theme.getColor(TERMINAL_FIND_MATCH_HIGHLIGHT_BACKGROUND_COLOR);
        const findMatchHighlightBorder = theme.getColor(TERMINAL_FIND_MATCH_HIGHLIGHT_BORDER_COLOR);
        const findMatchHighlightOverviewRuler = theme.getColor(TERMINAL_OVERVIEW_RULER_FIND_MATCH_FOREGROUND_COLOR);
        searchOptions.decorations = {
            activeMatchBackground: findMatchBackground?.toString(),
            activeMatchBorder: findMatchBorder?.toString() || 'transparent',
            activeMatchColorOverviewRuler: findMatchOverviewRuler?.toString() || 'transparent',
            // decoration bgs don't support the alpha channel so blend it with the regular bg
            matchBackground: terminalBackground ? findMatchHighlightBackground?.blend(terminalBackground).toString() : undefined,
            matchBorder: findMatchHighlightBorder?.toString() || 'transparent',
            matchOverviewRuler: findMatchHighlightOverviewRuler?.toString() || 'transparent'
        };
    }
    _getSearchAddon() {
        if (!this._searchAddonPromise) {
            this._searchAddonPromise = this._xtermAddonLoader.importAddon('search').then((AddonCtor) => {
                if (this._store.isDisposed) {
                    return Promise.reject('Could not create search addon, terminal is disposed');
                }
                this._searchAddon = new AddonCtor({ highlightLimit: 20000 /* XtermTerminalConstants.SearchHighlightLimit */ });
                this.raw.loadAddon(this._searchAddon);
                this._searchAddon.onDidChangeResults((results) => {
                    this._lastFindResult = results;
                    this._onDidChangeFindResults.fire(results);
                });
                return this._searchAddon;
            });
        }
        return this._searchAddonPromise;
    }
    clearSearchDecorations() {
        this._searchAddon?.clearDecorations();
    }
    clearActiveSearchDecoration() {
        this._searchAddon?.clearActiveDecoration();
    }
    getFont() {
        return this._terminalConfigurationService.getFont(dom.getWindow(this.raw.element), this._core);
    }
    getLongestViewportWrappedLineLength() {
        let maxLineLength = 0;
        for (let i = this.raw.buffer.active.length - 1; i >= this.raw.buffer.active.viewportY; i--) {
            const lineInfo = this._getWrappedLineCount(i, this.raw.buffer.active);
            maxLineLength = Math.max(maxLineLength, ((lineInfo.lineCount * this.raw.cols) - lineInfo.endSpaces) || 0);
            i = lineInfo.currentIndex;
        }
        return maxLineLength;
    }
    _getWrappedLineCount(index, buffer) {
        let line = buffer.getLine(index);
        if (!line) {
            throw new Error('Could not get line');
        }
        let currentIndex = index;
        let endSpaces = 0;
        // line.length may exceed cols as it doesn't necessarily trim the backing array on resize
        for (let i = Math.min(line.length, this.raw.cols) - 1; i >= 0; i--) {
            if (!line?.getCell(i)?.getChars()) {
                endSpaces++;
            }
            else {
                break;
            }
        }
        while (line?.isWrapped && currentIndex > 0) {
            currentIndex--;
            line = buffer.getLine(currentIndex);
        }
        return { lineCount: index - currentIndex + 1, currentIndex, endSpaces };
    }
    scrollDownLine() {
        this.raw.scrollLines(1);
    }
    scrollDownPage() {
        this.raw.scrollPages(1);
    }
    scrollToBottom() {
        this.raw.scrollToBottom();
    }
    scrollUpLine() {
        this.raw.scrollLines(-1);
    }
    scrollUpPage() {
        this.raw.scrollPages(-1);
    }
    scrollToTop() {
        this.raw.scrollToTop();
    }
    scrollToLine(line, position = 0 /* ScrollPosition.Top */) {
        this.markTracker.scrollToLine(line, position);
    }
    clearBuffer() {
        this.raw.clear();
        // xterm.js does not clear the first prompt, so trigger these to simulate
        // the prompt being written
        this._capabilities.get(2 /* TerminalCapability.CommandDetection */)?.handlePromptStart();
        this._capabilities.get(2 /* TerminalCapability.CommandDetection */)?.handleCommandStart();
        this._accessibilitySignalService.playSignal(AccessibilitySignal.clear);
    }
    hasSelection() {
        return this.raw.hasSelection();
    }
    clearSelection() {
        this.raw.clearSelection();
    }
    selectMarkedRange(fromMarkerId, toMarkerId, scrollIntoView = false) {
        const detectionCapability = this.shellIntegration.capabilities.get(4 /* TerminalCapability.BufferMarkDetection */);
        if (!detectionCapability) {
            return;
        }
        const start = detectionCapability.getMark(fromMarkerId);
        const end = detectionCapability.getMark(toMarkerId);
        if (start === undefined || end === undefined) {
            return;
        }
        this.raw.selectLines(start.line, end.line);
        if (scrollIntoView) {
            this.raw.scrollToLine(start.line);
        }
    }
    selectAll() {
        this.raw.focus();
        this.raw.selectAll();
    }
    focus() {
        this.raw.focus();
    }
    async copySelection(asHtml, command) {
        if (this.hasSelection() || (asHtml && command)) {
            if (asHtml) {
                const textAsHtml = await this.getSelectionAsHtml(command);
                function listener(e) {
                    if (!e.clipboardData.types.includes('text/plain')) {
                        e.clipboardData.setData('text/plain', command?.getOutput() ?? '');
                    }
                    e.clipboardData.setData('text/html', textAsHtml);
                    e.preventDefault();
                }
                const doc = dom.getDocument(this.raw.element);
                doc.addEventListener('copy', listener);
                doc.execCommand('copy');
                doc.removeEventListener('copy', listener);
            }
            else {
                await this._clipboardService.writeText(this.raw.getSelection());
            }
        }
        else {
            this._notificationService.warn(localize('terminal.integrated.copySelection.noSelection', 'The terminal has no selection to copy'));
        }
    }
    _setCursorBlink(blink) {
        if (this.raw.options.cursorBlink !== blink) {
            this.raw.options.cursorBlink = blink;
            this.raw.refresh(0, this.raw.rows - 1);
        }
    }
    _setCursorStyle(style) {
        const mapped = vscodeToXtermCursorStyle(style);
        if (this.raw.options.cursorStyle !== mapped) {
            this.raw.options.cursorStyle = mapped;
        }
    }
    _setCursorStyleInactive(style) {
        const mapped = vscodeToXtermCursorStyle(style);
        if (this.raw.options.cursorInactiveStyle !== mapped) {
            this.raw.options.cursorInactiveStyle = mapped;
        }
    }
    _setCursorWidth(width) {
        if (this.raw.options.cursorWidth !== width) {
            this.raw.options.cursorWidth = width;
        }
    }
    async _enableWebglRenderer() {
        if (!this.raw.element || this._webglAddon) {
            return;
        }
        const Addon = await this._xtermAddonLoader.importAddon('webgl');
        this._webglAddon = new Addon();
        try {
            this.raw.loadAddon(this._webglAddon);
            this._logService.trace('Webgl was loaded');
            this._webglAddon.onContextLoss(() => {
                this._logService.info(`Webgl lost context, disposing of webgl renderer`);
                this._disposeOfWebglRenderer();
            });
            this._refreshImageAddon();
            // WebGL renderer cell dimensions differ from the DOM renderer, make sure the terminal
            // gets resized after the webgl addon is loaded
            this._onDidRequestRefreshDimensions.fire();
            // Uncomment to add the texture atlas to the DOM
            // setTimeout(() => {
            // 	if (this._webglAddon?.textureAtlas) {
            // 		document.body.appendChild(this._webglAddon?.textureAtlas);
            // 	}
            // }, 5000);
        }
        catch (e) {
            this._logService.warn(`Webgl could not be loaded. Falling back to the DOM renderer`, e);
            XtermTerminal_1._suggestedRendererType = 'dom';
            this._disposeOfWebglRenderer();
        }
    }
    async _refreshLigaturesAddon() {
        if (!this.raw.element) {
            return;
        }
        const ligaturesConfig = this._terminalConfigurationService.config.fontLigatures;
        let shouldRecreateWebglRenderer = false;
        if (ligaturesConfig?.enabled) {
            if (this._ligaturesAddon.value && !equals(ligaturesConfig, this._ligaturesAddonConfig)) {
                this._ligaturesAddon.clear();
            }
            if (!this._ligaturesAddon.value) {
                const LigaturesAddon = await this._xtermAddonLoader.importAddon('ligatures');
                if (this._store.isDisposed) {
                    return;
                }
                this._ligaturesAddon.value = this._instantiationService.createInstance(LigaturesAddon, {
                    fontFeatureSettings: ligaturesConfig.featureSettings,
                    fallbackLigatures: ligaturesConfig.fallbackLigatures,
                });
                this.raw.loadAddon(this._ligaturesAddon.value);
                shouldRecreateWebglRenderer = true;
            }
        }
        else {
            if (!this._ligaturesAddon.value) {
                return;
            }
            this._ligaturesAddon.clear();
            shouldRecreateWebglRenderer = true;
        }
        if (shouldRecreateWebglRenderer && this._webglAddon) {
            // Re-create the webgl addon when ligatures state changes to so the texture atlas picks up
            // styles from the DOM.
            this._disposeOfWebglRenderer();
            await this._enableWebglRenderer();
        }
    }
    async _refreshImageAddon() {
        // Only allow the image addon when webgl is being used to avoid possible GPU issues
        if (this._terminalConfigurationService.config.enableImages && this._webglAddon) {
            if (!this._imageAddon) {
                const AddonCtor = await this._xtermAddonLoader.importAddon('image');
                this._imageAddon = new AddonCtor();
                this.raw.loadAddon(this._imageAddon);
            }
        }
        else {
            try {
                this._imageAddon?.dispose();
            }
            catch {
                // ignore
            }
            this._imageAddon = undefined;
        }
    }
    _disposeOfWebglRenderer() {
        try {
            this._webglAddon?.dispose();
        }
        catch {
            // ignore
        }
        this._webglAddon = undefined;
        this._refreshImageAddon();
        // WebGL renderer cell dimensions differ from the DOM renderer, make sure the terminal
        // gets resized after the webgl addon is disposed
        this._onDidRequestRefreshDimensions.fire();
    }
    getXtermTheme(theme) {
        if (!theme) {
            theme = this._themeService.getColorTheme();
        }
        const config = this._terminalConfigurationService.config;
        const hideOverviewRuler = ['never', 'gutter'].includes(config.shellIntegration?.decorationsEnabled ?? '');
        const foregroundColor = theme.getColor(TERMINAL_FOREGROUND_COLOR);
        const backgroundColor = this._xtermColorProvider.getBackgroundColor(theme);
        const cursorColor = theme.getColor(TERMINAL_CURSOR_FOREGROUND_COLOR) || foregroundColor;
        const cursorAccentColor = theme.getColor(TERMINAL_CURSOR_BACKGROUND_COLOR) || backgroundColor;
        const selectionBackgroundColor = theme.getColor(TERMINAL_SELECTION_BACKGROUND_COLOR);
        const selectionInactiveBackgroundColor = theme.getColor(TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR);
        const selectionForegroundColor = theme.getColor(TERMINAL_SELECTION_FOREGROUND_COLOR) || undefined;
        return {
            background: backgroundColor?.toString(),
            foreground: foregroundColor?.toString(),
            cursor: cursorColor?.toString(),
            cursorAccent: cursorAccentColor?.toString(),
            selectionBackground: selectionBackgroundColor?.toString(),
            selectionInactiveBackground: selectionInactiveBackgroundColor?.toString(),
            selectionForeground: selectionForegroundColor?.toString(),
            overviewRulerBorder: hideOverviewRuler ? '#0000' : theme.getColor(TERMINAL_OVERVIEW_RULER_BORDER_COLOR)?.toString(),
            scrollbarSliderActiveBackground: theme.getColor(scrollbarSliderActiveBackground)?.toString(),
            scrollbarSliderBackground: theme.getColor(scrollbarSliderBackground)?.toString(),
            scrollbarSliderHoverBackground: theme.getColor(scrollbarSliderHoverBackground)?.toString(),
            black: theme.getColor(ansiColorIdentifiers[0])?.toString(),
            red: theme.getColor(ansiColorIdentifiers[1])?.toString(),
            green: theme.getColor(ansiColorIdentifiers[2])?.toString(),
            yellow: theme.getColor(ansiColorIdentifiers[3])?.toString(),
            blue: theme.getColor(ansiColorIdentifiers[4])?.toString(),
            magenta: theme.getColor(ansiColorIdentifiers[5])?.toString(),
            cyan: theme.getColor(ansiColorIdentifiers[6])?.toString(),
            white: theme.getColor(ansiColorIdentifiers[7])?.toString(),
            brightBlack: theme.getColor(ansiColorIdentifiers[8])?.toString(),
            brightRed: theme.getColor(ansiColorIdentifiers[9])?.toString(),
            brightGreen: theme.getColor(ansiColorIdentifiers[10])?.toString(),
            brightYellow: theme.getColor(ansiColorIdentifiers[11])?.toString(),
            brightBlue: theme.getColor(ansiColorIdentifiers[12])?.toString(),
            brightMagenta: theme.getColor(ansiColorIdentifiers[13])?.toString(),
            brightCyan: theme.getColor(ansiColorIdentifiers[14])?.toString(),
            brightWhite: theme.getColor(ansiColorIdentifiers[15])?.toString()
        };
    }
    _updateTheme(theme) {
        this.raw.options.theme = this.getXtermTheme(theme);
    }
    refresh() {
        this._updateTheme();
        this._decorationAddon.refreshLayouts();
    }
    async _updateUnicodeVersion() {
        if (!this._unicode11Addon && this._terminalConfigurationService.config.unicodeVersion === '11') {
            const Addon = await this._xtermAddonLoader.importAddon('unicode11');
            this._unicode11Addon = new Addon();
            this.raw.loadAddon(this._unicode11Addon);
        }
        if (this.raw.unicode.activeVersion !== this._terminalConfigurationService.config.unicodeVersion) {
            this.raw.unicode.activeVersion = this._terminalConfigurationService.config.unicodeVersion;
        }
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _writeText(data) {
        this.raw.write(data);
    }
    dispose() {
        this._anyTerminalFocusContextKey.reset();
        this._anyFocusedTerminalHasSelection.reset();
        this._onDidDispose.fire();
        super.dispose();
    }
};
__decorate([
    debounce(100)
], XtermTerminal.prototype, "_refreshLigaturesAddon", null);
__decorate([
    debounce(100)
], XtermTerminal.prototype, "_refreshImageAddon", null);
XtermTerminal = XtermTerminal_1 = __decorate([
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, ITerminalLogService),
    __param(6, INotificationService),
    __param(7, IThemeService),
    __param(8, ITelemetryService),
    __param(9, ITerminalConfigurationService),
    __param(10, IClipboardService),
    __param(11, IContextKeyService),
    __param(12, IAccessibilitySignalService),
    __param(13, ILayoutService)
], XtermTerminal);
export { XtermTerminal };
export function getXtermScaledDimensions(w, font, width, height) {
    if (!font.charWidth || !font.charHeight) {
        return null;
    }
    // Because xterm.js converts from CSS pixels to actual pixels through
    // the use of canvas, window.devicePixelRatio needs to be used here in
    // order to be precise. font.charWidth/charHeight alone as insufficient
    // when window.devicePixelRatio changes.
    const scaledWidthAvailable = width * w.devicePixelRatio;
    const scaledCharWidth = font.charWidth * w.devicePixelRatio + font.letterSpacing;
    const cols = Math.max(Math.floor(scaledWidthAvailable / scaledCharWidth), 1);
    const scaledHeightAvailable = height * w.devicePixelRatio;
    const scaledCharHeight = Math.ceil(font.charHeight * w.devicePixelRatio);
    const scaledLineHeight = Math.floor(scaledCharHeight * font.lineHeight);
    const rows = Math.max(Math.floor(scaledHeightAvailable / scaledLineHeight), 1);
    return { rows, cols };
}
function vscodeToXtermLogLevel(logLevel) {
    switch (logLevel) {
        case LogLevel.Trace: return 'trace';
        case LogLevel.Debug: return 'debug';
        case LogLevel.Info: return 'info';
        case LogLevel.Warning: return 'warn';
        case LogLevel.Error: return 'error';
        default: return 'off';
    }
}
function vscodeToXtermCursorStyle(style) {
    // 'line' is used instead of bar in VS Code to be consistent with editor.cursorStyle
    if (style === 'line') {
        return 'bar';
    }
    return style;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHRlcm1UZXJtaW5hbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci94dGVybS94dGVybVRlcm1pbmFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQVVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBRTFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFekcsT0FBTyxFQUFxQixtQkFBbUIsRUFBNEMsTUFBTSxxREFBcUQsQ0FBQztBQUV2SixPQUFPLEVBQTJKLDZCQUE2QixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDeE4sT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBa0IsTUFBTSwwQkFBMEIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQy9ELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSx5QkFBeUIsRUFBRSxnQ0FBZ0MsRUFBRSxnQ0FBZ0MsRUFBRSxvQkFBb0IsRUFBRSxtQ0FBbUMsRUFBRSxvQ0FBb0MsRUFBRSw4Q0FBOEMsRUFBRSxnQ0FBZ0MsRUFBRSxtREFBbUQsRUFBRSwwQ0FBMEMsRUFBRSwrQ0FBK0Ms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