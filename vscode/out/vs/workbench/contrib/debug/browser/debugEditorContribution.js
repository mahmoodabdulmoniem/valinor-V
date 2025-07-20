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
import { addDisposableListener, isKeyboardEvent } from '../../../../base/browser/dom.js';
import { DomEmitter } from '../../../../base/browser/event.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { memoize } from '../../../../base/common/decorators.js';
import { illegalArgument, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { Event } from '../../../../base/common/event.js';
import { visit } from '../../../../base/common/json.js';
import { setProperty } from '../../../../base/common/jsonEdit.js';
import { DisposableStore, MutableDisposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import { basename } from '../../../../base/common/path.js';
import * as env from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import { assertType, isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { CoreEditingCommands } from '../../../../editor/browser/coreCommands.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { DEFAULT_WORD_REGEXP } from '../../../../editor/common/core/wordHelper.js';
import { InjectedTextCursorStops } from '../../../../editor/common/model.js';
import { ILanguageFeatureDebounceService } from '../../../../editor/common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import * as nls from '../../../../nls.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { DebugHoverWidget } from './debugHover.js';
import { ExceptionWidget } from './exceptionWidget.js';
import { CONTEXT_EXCEPTION_WIDGET_VISIBLE, IDebugService } from '../common/debug.js';
import { Expression } from '../common/debugModel.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
const MAX_NUM_INLINE_VALUES = 100; // JS Global scope can have 700+ entries. We want to limit ourselves for perf reasons
const MAX_INLINE_DECORATOR_LENGTH = 150; // Max string length of each inline decorator when debugging. If exceeded ... is added
const MAX_TOKENIZATION_LINE_LEN = 500; // If line is too long, then inline values for the line are skipped
const DEAFULT_INLINE_DEBOUNCE_DELAY = 200;
export const debugInlineForeground = registerColor('editor.inlineValuesForeground', {
    dark: '#ffffff80',
    light: '#00000080',
    hcDark: '#ffffff80',
    hcLight: '#00000080'
}, nls.localize('editor.inlineValuesForeground', "Color for the debug inline value text."));
export const debugInlineBackground = registerColor('editor.inlineValuesBackground', '#ffc80033', nls.localize('editor.inlineValuesBackground', "Color for the debug inline value background."));
class InlineSegment {
    constructor(column, text) {
        this.column = column;
        this.text = text;
    }
}
export function formatHoverContent(contentText) {
    if (contentText.includes(',') && contentText.includes('=')) {
        // Custom split: for each equals sign after the first, backtrack to the nearest comma
        const customSplit = (text) => {
            const splits = [];
            let equalsFound = 0;
            let start = 0;
            for (let i = 0; i < text.length; i++) {
                if (text[i] === '=') {
                    if (equalsFound === 0) {
                        equalsFound++;
                        continue;
                    }
                    const commaIndex = text.lastIndexOf(',', i);
                    if (commaIndex !== -1 && commaIndex >= start) {
                        splits.push(commaIndex);
                        start = commaIndex + 1;
                    }
                    equalsFound++;
                }
            }
            const result = [];
            let s = 0;
            for (const index of splits) {
                result.push(text.substring(s, index).trim());
                s = index + 1;
            }
            if (s < text.length) {
                result.push(text.substring(s).trim());
            }
            return result;
        };
        const pairs = customSplit(contentText);
        const formattedPairs = pairs.map(pair => {
            const equalsIndex = pair.indexOf('=');
            if (equalsIndex !== -1) {
                const indent = ' '.repeat(equalsIndex + 2);
                const [firstLine, ...restLines] = pair.split(/\r?\n/);
                return [firstLine, ...restLines.map(line => indent + line)].join('\n');
            }
            return pair;
        });
        return new MarkdownString().appendCodeblock('', formattedPairs.join(',\n'));
    }
    return new MarkdownString().appendCodeblock('', contentText);
}
export function createInlineValueDecoration(lineNumber, contentText, classNamePrefix, column = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, viewportMaxCol = MAX_INLINE_DECORATOR_LENGTH) {
    const rawText = contentText; // store raw text for hover message
    // Truncate contentText if it exceeds the viewport max column
    if (contentText.length > viewportMaxCol) {
        contentText = contentText.substring(0, viewportMaxCol) + '...';
    }
    return [
        {
            range: {
                startLineNumber: lineNumber,
                endLineNumber: lineNumber,
                startColumn: column,
                endColumn: column
            },
            options: {
                description: `${classNamePrefix}-inline-value-decoration-spacer`,
                after: {
                    content: strings.noBreakWhitespace,
                    cursorStops: InjectedTextCursorStops.None
                },
                showIfCollapsed: true,
            }
        },
        {
            range: {
                startLineNumber: lineNumber,
                endLineNumber: lineNumber,
                startColumn: column,
                endColumn: column
            },
            options: {
                description: `${classNamePrefix}-inline-value-decoration`,
                after: {
                    content: replaceWsWithNoBreakWs(contentText),
                    inlineClassName: `${classNamePrefix}-inline-value`,
                    inlineClassNameAffectsLetterSpacing: true,
                    cursorStops: InjectedTextCursorStops.None
                },
                showIfCollapsed: true,
                hoverMessage: formatHoverContent(rawText)
            }
        },
    ];
}
function replaceWsWithNoBreakWs(str) {
    return str.replace(/[ \t\n]/g, strings.noBreakWhitespace);
}
function createInlineValueDecorationsInsideRange(expressions, ranges, model, wordToLineNumbersMap) {
    const nameValueMap = new Map();
    for (const expr of expressions) {
        nameValueMap.set(expr.name, expr.value);
        // Limit the size of map. Too large can have a perf impact
        if (nameValueMap.size >= MAX_NUM_INLINE_VALUES) {
            break;
        }
    }
    const lineToNamesMap = new Map();
    // Compute unique set of names on each line
    nameValueMap.forEach((_value, name) => {
        const lineNumbers = wordToLineNumbersMap.get(name);
        if (lineNumbers) {
            for (const lineNumber of lineNumbers) {
                if (ranges.some(r => lineNumber >= r.startLineNumber && lineNumber <= r.endLineNumber)) {
                    if (!lineToNamesMap.has(lineNumber)) {
                        lineToNamesMap.set(lineNumber, []);
                    }
                    if (lineToNamesMap.get(lineNumber).indexOf(name) === -1) {
                        lineToNamesMap.get(lineNumber).push(name);
                    }
                }
            }
        }
    });
    // Compute decorators for each line
    return [...lineToNamesMap].map(([line, names]) => ({
        line,
        variables: names.sort((first, second) => {
            const content = model.getLineContent(line);
            return content.indexOf(first) - content.indexOf(second);
        }).map(name => ({ name, value: nameValueMap.get(name) }))
    }));
}
function getWordToLineNumbersMap(model, lineNumber, result) {
    const lineLength = model.getLineLength(lineNumber);
    // If line is too long then skip the line
    if (lineLength > MAX_TOKENIZATION_LINE_LEN) {
        return;
    }
    const lineContent = model.getLineContent(lineNumber);
    model.tokenization.forceTokenization(lineNumber);
    const lineTokens = model.tokenization.getLineTokens(lineNumber);
    for (let tokenIndex = 0, tokenCount = lineTokens.getCount(); tokenIndex < tokenCount; tokenIndex++) {
        const tokenType = lineTokens.getStandardTokenType(tokenIndex);
        // Token is a word and not a comment
        if (tokenType === 0 /* StandardTokenType.Other */) {
            DEFAULT_WORD_REGEXP.lastIndex = 0; // We assume tokens will usually map 1:1 to words if they match
            const tokenStartOffset = lineTokens.getStartOffset(tokenIndex);
            const tokenEndOffset = lineTokens.getEndOffset(tokenIndex);
            const tokenStr = lineContent.substring(tokenStartOffset, tokenEndOffset);
            const wordMatch = DEFAULT_WORD_REGEXP.exec(tokenStr);
            if (wordMatch) {
                const word = wordMatch[0];
                if (!result.has(word)) {
                    result.set(word, []);
                }
                result.get(word).push(lineNumber);
            }
        }
    }
}
let DebugEditorContribution = class DebugEditorContribution {
    constructor(editor, debugService, instantiationService, commandService, configurationService, hostService, uriIdentityService, contextKeyService, languageFeaturesService, featureDebounceService) {
        this.editor = editor;
        this.debugService = debugService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.configurationService = configurationService;
        this.hostService = hostService;
        this.uriIdentityService = uriIdentityService;
        this.languageFeaturesService = languageFeaturesService;
        this.mouseDown = false;
        this.gutterIsHovered = false;
        this.altListener = new MutableDisposable();
        this.altPressed = false;
        this.displayedStore = new DisposableStore();
        // Holds a Disposable that prevents the default editor hover behavior while it exists.
        this.defaultHoverLockout = new MutableDisposable();
        this.oldDecorations = this.editor.createDecorationsCollection();
        this.debounceInfo = featureDebounceService.for(languageFeaturesService.inlineValuesProvider, 'InlineValues', { min: DEAFULT_INLINE_DEBOUNCE_DELAY });
        this.hoverWidget = this.instantiationService.createInstance(DebugHoverWidget, this.editor);
        this.toDispose = [this.defaultHoverLockout, this.altListener, this.displayedStore];
        this.registerListeners();
        this.exceptionWidgetVisible = CONTEXT_EXCEPTION_WIDGET_VISIBLE.bindTo(contextKeyService);
        this.toggleExceptionWidget();
    }
    registerListeners() {
        this.toDispose.push(this.debugService.getViewModel().onDidFocusStackFrame(e => this.onFocusStackFrame(e.stackFrame)));
        // hover listeners & hover widget
        this.toDispose.push(this.editor.onMouseDown((e) => this.onEditorMouseDown(e)));
        this.toDispose.push(this.editor.onMouseUp(() => this.mouseDown = false));
        this.toDispose.push(this.editor.onMouseMove((e) => this.onEditorMouseMove(e)));
        this.toDispose.push(this.editor.onMouseLeave((e) => {
            const hoverDomNode = this.hoverWidget.getDomNode();
            if (!hoverDomNode) {
                return;
            }
            const rect = hoverDomNode.getBoundingClientRect();
            // Only hide the hover widget if the editor mouse leave event is outside the hover widget #3528
            if (e.event.posx < rect.left || e.event.posx > rect.right || e.event.posy < rect.top || e.event.posy > rect.bottom) {
                this.hideHoverWidget();
            }
        }));
        this.toDispose.push(this.editor.onKeyDown((e) => this.onKeyDown(e)));
        this.toDispose.push(this.editor.onDidChangeModelContent(() => {
            this._wordToLineNumbersMap = undefined;
            this.updateInlineValuesScheduler.schedule();
        }));
        this.toDispose.push(this.debugService.getViewModel().onWillUpdateViews(() => this.updateInlineValuesScheduler.schedule()));
        this.toDispose.push(this.debugService.getViewModel().onDidEvaluateLazyExpression(() => this.updateInlineValuesScheduler.schedule()));
        this.toDispose.push(this.editor.onDidChangeModel(async () => {
            this.addDocumentListeners();
            this.toggleExceptionWidget();
            this.hideHoverWidget();
            this._wordToLineNumbersMap = undefined;
            const stackFrame = this.debugService.getViewModel().focusedStackFrame;
            await this.updateInlineValueDecorations(stackFrame);
        }));
        this.toDispose.push(this.editor.onDidScrollChange(() => {
            this.hideHoverWidget();
            // Inline value provider should get called on view port change
            const model = this.editor.getModel();
            if (model && this.languageFeaturesService.inlineValuesProvider.has(model)) {
                this.updateInlineValuesScheduler.schedule();
            }
        }));
        this.toDispose.push(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.hover')) {
                this.updateHoverConfiguration();
            }
        }));
        this.toDispose.push(this.debugService.onDidChangeState((state) => {
            if (state !== 2 /* State.Stopped */) {
                this.toggleExceptionWidget();
            }
        }));
        this.updateHoverConfiguration();
    }
    updateHoverConfiguration() {
        const model = this.editor.getModel();
        if (model) {
            this.editorHoverOptions = this.configurationService.getValue('editor.hover', {
                resource: model.uri,
                overrideIdentifier: model.getLanguageId()
            });
        }
    }
    addDocumentListeners() {
        const stackFrame = this.debugService.getViewModel().focusedStackFrame;
        const model = this.editor.getModel();
        if (model) {
            this.applyDocumentListeners(model, stackFrame);
        }
    }
    applyDocumentListeners(model, stackFrame) {
        if (!stackFrame || !this.uriIdentityService.extUri.isEqual(model.uri, stackFrame.source.uri)) {
            this.altListener.clear();
            return;
        }
        const ownerDocument = this.editor.getContainerDomNode().ownerDocument;
        // When the alt key is pressed show regular editor hover and hide the debug hover #84561
        this.altListener.value = addDisposableListener(ownerDocument, 'keydown', keydownEvent => {
            const standardKeyboardEvent = new StandardKeyboardEvent(keydownEvent);
            if (standardKeyboardEvent.keyCode === 6 /* KeyCode.Alt */) {
                this.altPressed = true;
                const debugHoverWasVisible = this.hoverWidget.isVisible();
                this.hoverWidget.hide();
                this.defaultHoverLockout.clear();
                if (debugHoverWasVisible && this.hoverPosition) {
                    // If the debug hover was visible immediately show the editor hover for the alt transition to be smooth
                    this.showEditorHover(this.hoverPosition.position, false);
                }
                const onKeyUp = new DomEmitter(ownerDocument, 'keyup');
                const listener = Event.any(this.hostService.onDidChangeFocus, onKeyUp.event)(keyupEvent => {
                    let standardKeyboardEvent = undefined;
                    if (isKeyboardEvent(keyupEvent)) {
                        standardKeyboardEvent = new StandardKeyboardEvent(keyupEvent);
                    }
                    if (!standardKeyboardEvent || standardKeyboardEvent.keyCode === 6 /* KeyCode.Alt */) {
                        this.altPressed = false;
                        this.preventDefaultEditorHover();
                        listener.dispose();
                        onKeyUp.dispose();
                    }
                });
            }
        });
    }
    async showHover(position, focus, mouseEvent) {
        // normally will already be set in `showHoverScheduler`, but public callers may hit this directly:
        this.preventDefaultEditorHover();
        const sf = this.debugService.getViewModel().focusedStackFrame;
        const model = this.editor.getModel();
        if (sf && model && this.uriIdentityService.extUri.isEqual(sf.source.uri, model.uri)) {
            const result = await this.hoverWidget.showAt(position, focus, mouseEvent);
            if (result === 1 /* ShowDebugHoverResult.NOT_AVAILABLE */) {
                // When no expression available fallback to editor hover
                this.showEditorHover(position, focus);
            }
        }
        else {
            this.showEditorHover(position, focus);
        }
    }
    preventDefaultEditorHover() {
        if (this.defaultHoverLockout.value || this.editorHoverOptions?.enabled === false) {
            return;
        }
        const hoverController = this.editor.getContribution(ContentHoverController.ID);
        hoverController?.hideContentHover();
        this.editor.updateOptions({ hover: { enabled: false } });
        this.defaultHoverLockout.value = {
            dispose: () => {
                this.editor.updateOptions({
                    hover: { enabled: this.editorHoverOptions?.enabled ?? true }
                });
            }
        };
    }
    showEditorHover(position, focus) {
        const hoverController = this.editor.getContribution(ContentHoverController.ID);
        const range = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
        // enable the editor hover, otherwise the content controller will see it
        // as disabled and hide it on the first mouse move (#193149)
        this.defaultHoverLockout.clear();
        hoverController?.showContentHover(range, 1 /* HoverStartMode.Immediate */, 0 /* HoverStartSource.Mouse */, focus);
    }
    async onFocusStackFrame(sf) {
        const model = this.editor.getModel();
        if (model) {
            this.applyDocumentListeners(model, sf);
            if (sf && this.uriIdentityService.extUri.isEqual(sf.source.uri, model.uri)) {
                await this.toggleExceptionWidget();
            }
            else {
                this.hideHoverWidget();
            }
        }
        await this.updateInlineValueDecorations(sf);
    }
    get hoverDelay() {
        const baseDelay = this.editorHoverOptions?.delay || 0;
        // heuristic to get a 'good' but configurable delay for evaluation. The
        // debug hover can be very large, so we tend to be more conservative about
        // when to show it (#180621). With this equation:
        // - default 300ms hover => * 2   = 600ms
        // - short   100ms hover => * 2   = 200ms
        // - longer  600ms hover => * 1.5 = 900ms
        // - long   1000ms hover => * 1.0 = 1000ms
        const delayFactor = clamp(2 - (baseDelay - 300) / 600, 1, 2);
        return baseDelay * delayFactor;
    }
    get showHoverScheduler() {
        const scheduler = new RunOnceScheduler(() => {
            if (this.hoverPosition && !this.altPressed) {
                this.showHover(this.hoverPosition.position, false, this.hoverPosition.event);
            }
        }, this.hoverDelay);
        this.toDispose.push(scheduler);
        return scheduler;
    }
    hideHoverWidget() {
        if (this.hoverWidget.willBeVisible()) {
            this.hoverWidget.hide();
        }
        this.showHoverScheduler.cancel();
        this.defaultHoverLockout.clear();
    }
    // hover business
    onEditorMouseDown(mouseEvent) {
        this.mouseDown = true;
        if (mouseEvent.target.type === 9 /* MouseTargetType.CONTENT_WIDGET */ && mouseEvent.target.detail === DebugHoverWidget.ID) {
            return;
        }
        this.hideHoverWidget();
    }
    onEditorMouseMove(mouseEvent) {
        if (this.debugService.state !== 2 /* State.Stopped */) {
            return;
        }
        const target = mouseEvent.target;
        const stopKey = env.isMacintosh ? 'metaKey' : 'ctrlKey';
        if (!this.altPressed) {
            if (target.type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */) {
                this.defaultHoverLockout.clear();
                this.gutterIsHovered = true;
            }
            else if (this.gutterIsHovered) {
                this.gutterIsHovered = false;
                this.updateHoverConfiguration();
            }
        }
        if ((target.type === 9 /* MouseTargetType.CONTENT_WIDGET */ && target.detail === DebugHoverWidget.ID)
            || this.hoverWidget.isInSafeTriangle(mouseEvent.event.posx, mouseEvent.event.posy)) {
            // mouse moved on top of debug hover widget
            const sticky = this.editorHoverOptions?.sticky ?? true;
            if (sticky || this.hoverWidget.isShowingComplexValue || mouseEvent.event[stopKey]) {
                return;
            }
        }
        if (target.type === 6 /* MouseTargetType.CONTENT_TEXT */) {
            if (target.position && !Position.equals(target.position, this.hoverPosition?.position || null) && !this.hoverWidget.isInSafeTriangle(mouseEvent.event.posx, mouseEvent.event.posy)) {
                this.hoverPosition = { position: target.position, event: mouseEvent.event };
                // Disable the editor hover during the request to avoid flickering
                this.preventDefaultEditorHover();
                this.showHoverScheduler.schedule(this.hoverDelay);
            }
        }
        else if (!this.mouseDown) {
            // Do not hide debug hover when the mouse is pressed because it usually leads to accidental closing #64620
            this.hideHoverWidget();
        }
    }
    onKeyDown(e) {
        const stopKey = env.isMacintosh ? 57 /* KeyCode.Meta */ : 5 /* KeyCode.Ctrl */;
        if (e.keyCode !== stopKey && e.keyCode !== 6 /* KeyCode.Alt */) {
            // do not hide hover when Ctrl/Meta is pressed, and alt is handled separately
            this.hideHoverWidget();
        }
    }
    // end hover business
    // exception widget
    async toggleExceptionWidget() {
        // Toggles exception widget based on the state of the current editor model and debug stack frame
        const model = this.editor.getModel();
        const focusedSf = this.debugService.getViewModel().focusedStackFrame;
        const callStack = focusedSf ? focusedSf.thread.getCallStack() : null;
        if (!model || !focusedSf || !callStack || callStack.length === 0) {
            this.closeExceptionWidget();
            return;
        }
        // First call stack frame that is available is the frame where exception has been thrown
        const exceptionSf = callStack.find(sf => !!(sf && sf.source && sf.source.available && sf.source.presentationHint !== 'deemphasize'));
        if (!exceptionSf || exceptionSf !== focusedSf) {
            this.closeExceptionWidget();
            return;
        }
        const sameUri = this.uriIdentityService.extUri.isEqual(exceptionSf.source.uri, model.uri);
        if (this.exceptionWidget && !sameUri) {
            this.closeExceptionWidget();
        }
        else if (sameUri) {
            const exceptionInfo = await focusedSf.thread.exceptionInfo;
            if (exceptionInfo) {
                this.showExceptionWidget(exceptionInfo, this.debugService.getViewModel().focusedSession, exceptionSf.range.startLineNumber, exceptionSf.range.startColumn);
            }
        }
    }
    showExceptionWidget(exceptionInfo, debugSession, lineNumber, column) {
        if (this.exceptionWidget) {
            this.exceptionWidget.dispose();
        }
        this.exceptionWidget = this.instantiationService.createInstance(ExceptionWidget, this.editor, exceptionInfo, debugSession);
        this.exceptionWidget.show({ lineNumber, column }, 0);
        this.exceptionWidget.focus();
        this.editor.revealRangeInCenter({
            startLineNumber: lineNumber,
            startColumn: column,
            endLineNumber: lineNumber,
            endColumn: column,
        });
        this.exceptionWidgetVisible.set(true);
    }
    closeExceptionWidget() {
        if (this.exceptionWidget) {
            const shouldFocusEditor = this.exceptionWidget.hasFocus();
            this.exceptionWidget.dispose();
            this.exceptionWidget = undefined;
            this.exceptionWidgetVisible.set(false);
            if (shouldFocusEditor) {
                this.editor.focus();
            }
        }
    }
    async addLaunchConfiguration() {
        const model = this.editor.getModel();
        if (!model) {
            return;
        }
        let configurationsArrayPosition;
        let lastProperty;
        const getConfigurationPosition = () => {
            let depthInArray = 0;
            visit(model.getValue(), {
                onObjectProperty: (property) => {
                    lastProperty = property;
                },
                onArrayBegin: (offset) => {
                    if (lastProperty === 'configurations' && depthInArray === 0) {
                        configurationsArrayPosition = model.getPositionAt(offset + 1);
                    }
                    depthInArray++;
                },
                onArrayEnd: () => {
                    depthInArray--;
                }
            });
        };
        getConfigurationPosition();
        if (!configurationsArrayPosition) {
            // "configurations" array doesn't exist. Add it here.
            const { tabSize, insertSpaces } = model.getOptions();
            const eol = model.getEOL();
            const edit = (basename(model.uri.fsPath) === 'launch.json') ?
                setProperty(model.getValue(), ['configurations'], [], { tabSize, insertSpaces, eol })[0] :
                setProperty(model.getValue(), ['launch'], { 'configurations': [] }, { tabSize, insertSpaces, eol })[0];
            const startPosition = model.getPositionAt(edit.offset);
            const lineNumber = startPosition.lineNumber;
            const range = new Range(lineNumber, startPosition.column, lineNumber, model.getLineMaxColumn(lineNumber));
            model.pushEditOperations(null, [EditOperation.replace(range, edit.content)], () => null);
            // Go through the file again since we've edited it
            getConfigurationPosition();
        }
        if (!configurationsArrayPosition) {
            return;
        }
        this.editor.focus();
        const insertLine = (position) => {
            // Check if there are more characters on a line after a "configurations": [, if yes enter a newline
            if (model.getLineLastNonWhitespaceColumn(position.lineNumber) > position.column) {
                this.editor.setPosition(position);
                this.instantiationService.invokeFunction((accessor) => {
                    CoreEditingCommands.LineBreakInsert.runEditorCommand(accessor, this.editor, null);
                });
            }
            this.editor.setPosition(position);
            return this.commandService.executeCommand('editor.action.insertLineAfter');
        };
        await insertLine(configurationsArrayPosition);
        await this.commandService.executeCommand('editor.action.triggerSuggest');
    }
    // Inline Decorations
    get removeInlineValuesScheduler() {
        return new RunOnceScheduler(() => {
            this.displayedStore.clear();
            this.oldDecorations.clear();
        }, 100);
    }
    get updateInlineValuesScheduler() {
        const model = this.editor.getModel();
        return new RunOnceScheduler(async () => await this.updateInlineValueDecorations(this.debugService.getViewModel().focusedStackFrame), model ? this.debounceInfo.get(model) : DEAFULT_INLINE_DEBOUNCE_DELAY);
    }
    async updateInlineValueDecorations(stackFrame) {
        const var_value_format = '{0} = {1}';
        const separator = ', ';
        const model = this.editor.getModel();
        const inlineValuesSetting = this.configurationService.getValue('debug').inlineValues;
        const inlineValuesTurnedOn = inlineValuesSetting === true || inlineValuesSetting === 'on' || (inlineValuesSetting === 'auto' && model && this.languageFeaturesService.inlineValuesProvider.has(model));
        if (!inlineValuesTurnedOn || !model || !stackFrame || model.uri.toString() !== stackFrame.source.uri.toString()) {
            if (!this.removeInlineValuesScheduler.isScheduled()) {
                this.removeInlineValuesScheduler.schedule();
            }
            return;
        }
        this.removeInlineValuesScheduler.cancel();
        this.displayedStore.clear();
        const viewRanges = this.editor.getVisibleRangesPlusViewportAboveBelow();
        let allDecorations;
        const cts = new CancellationTokenSource();
        this.displayedStore.add(toDisposable(() => cts.dispose(true)));
        if (this.languageFeaturesService.inlineValuesProvider.has(model)) {
            const findVariable = async (_key, caseSensitiveLookup) => {
                const scopes = await stackFrame.getMostSpecificScopes(stackFrame.range);
                const key = caseSensitiveLookup ? _key : _key.toLowerCase();
                for (const scope of scopes) {
                    const variables = await scope.getChildren();
                    const found = variables.find(v => caseSensitiveLookup ? (v.name === key) : (v.name.toLowerCase() === key));
                    if (found) {
                        return found.value;
                    }
                }
                return undefined;
            };
            const ctx = {
                frameId: stackFrame.frameId,
                stoppedLocation: new Range(stackFrame.range.startLineNumber, stackFrame.range.startColumn + 1, stackFrame.range.endLineNumber, stackFrame.range.endColumn + 1)
            };
            const providers = this.languageFeaturesService.inlineValuesProvider.ordered(model).reverse();
            allDecorations = [];
            const lineDecorations = new Map();
            const promises = providers.flatMap(provider => viewRanges.map(range => Promise.resolve(provider.provideInlineValues(model, range, ctx, cts.token)).then(async (result) => {
                if (result) {
                    for (const iv of result) {
                        let text = undefined;
                        switch (iv.type) {
                            case 'text':
                                text = iv.text;
                                break;
                            case 'variable': {
                                let va = iv.variableName;
                                if (!va) {
                                    const lineContent = model.getLineContent(iv.range.startLineNumber);
                                    va = lineContent.substring(iv.range.startColumn - 1, iv.range.endColumn - 1);
                                }
                                const value = await findVariable(va, iv.caseSensitiveLookup);
                                if (value) {
                                    text = strings.format(var_value_format, va, value);
                                }
                                break;
                            }
                            case 'expression': {
                                let expr = iv.expression;
                                if (!expr) {
                                    const lineContent = model.getLineContent(iv.range.startLineNumber);
                                    expr = lineContent.substring(iv.range.startColumn - 1, iv.range.endColumn - 1);
                                }
                                if (expr) {
                                    const expression = new Expression(expr);
                                    await expression.evaluate(stackFrame.thread.session, stackFrame, 'watch', true);
                                    if (expression.available) {
                                        text = strings.format(var_value_format, expr, expression.value);
                                    }
                                }
                                break;
                            }
                        }
                        if (text) {
                            const line = iv.range.startLineNumber;
                            let lineSegments = lineDecorations.get(line);
                            if (!lineSegments) {
                                lineSegments = [];
                                lineDecorations.set(line, lineSegments);
                            }
                            if (!lineSegments.some(iv => iv.text === text)) { // de-dupe
                                lineSegments.push(new InlineSegment(iv.range.startColumn, text));
                            }
                        }
                    }
                }
            }, err => {
                onUnexpectedExternalError(err);
            })));
            const startTime = Date.now();
            await Promise.all(promises);
            // update debounce info
            this.updateInlineValuesScheduler.delay = this.debounceInfo.update(model, Date.now() - startTime);
            // sort line segments and concatenate them into a decoration
            lineDecorations.forEach((segments, line) => {
                if (segments.length > 0) {
                    segments = segments.sort((a, b) => a.column - b.column);
                    const text = segments.map(s => s.text).join(separator);
                    const editorWidth = this.editor.getLayoutInfo().width;
                    const fontInfo = this.editor.getOption(59 /* EditorOption.fontInfo */);
                    const viewportMaxCol = Math.floor((editorWidth - 50) / fontInfo.typicalHalfwidthCharacterWidth);
                    allDecorations.push(...createInlineValueDecoration(line, text, 'debug', undefined, viewportMaxCol));
                }
            });
        }
        else {
            // old "one-size-fits-all" strategy
            const scopes = await stackFrame.getMostSpecificScopes(stackFrame.range);
            const scopesWithVariables = await Promise.all(scopes.map(async (scope) => ({ scope, variables: await scope.getChildren() })));
            // Map of inline values per line that's populated in scope order, from
            // narrowest to widest. This is done to avoid duplicating values if
            // they appear in multiple scopes or are shadowed (#129770, #217326)
            const valuesPerLine = new Map();
            for (const { scope, variables } of scopesWithVariables) {
                let scopeRange = new Range(0, 0, stackFrame.range.startLineNumber, stackFrame.range.startColumn);
                if (scope.range) {
                    scopeRange = scopeRange.setStartPosition(scope.range.startLineNumber, scope.range.startColumn);
                }
                const ownRanges = viewRanges.map(r => r.intersectRanges(scopeRange)).filter(isDefined);
                this._wordToLineNumbersMap ??= new WordsToLineNumbersCache(model);
                for (const range of ownRanges) {
                    this._wordToLineNumbersMap.ensureRangePopulated(range);
                }
                const mapped = createInlineValueDecorationsInsideRange(variables, ownRanges, model, this._wordToLineNumbersMap.value);
                for (const { line, variables } of mapped) {
                    let values = valuesPerLine.get(line);
                    if (!values) {
                        values = new Map();
                        valuesPerLine.set(line, values);
                    }
                    for (const { name, value } of variables) {
                        if (!values.has(name)) {
                            values.set(name, value);
                        }
                    }
                }
            }
            allDecorations = [...valuesPerLine.entries()].flatMap(([line, values]) => {
                const text = [...values].map(([n, v]) => `${n} = ${v}`).join(', ');
                const editorWidth = this.editor.getLayoutInfo().width;
                const fontInfo = this.editor.getOption(59 /* EditorOption.fontInfo */);
                const viewportMaxCol = Math.floor((editorWidth - 50) / fontInfo.typicalHalfwidthCharacterWidth);
                return createInlineValueDecoration(line, text, 'debug', undefined, viewportMaxCol);
            });
        }
        if (cts.token.isCancellationRequested) {
            return;
        }
        // If word wrap is on, application of inline decorations may change the scroll position.
        // Ensure the cursor maintains its vertical position relative to the viewport when
        // we apply decorations.
        let preservePosition;
        if (this.editor.getOption(148 /* EditorOption.wordWrap */) !== 'off') {
            const position = this.editor.getPosition();
            if (position && this.editor.getVisibleRanges().some(r => r.containsPosition(position))) {
                preservePosition = { position, top: this.editor.getTopForPosition(position.lineNumber, position.column) };
            }
        }
        this.oldDecorations.set(allDecorations);
        if (preservePosition) {
            const top = this.editor.getTopForPosition(preservePosition.position.lineNumber, preservePosition.position.column);
            this.editor.setScrollTop(this.editor.getScrollTop() - (preservePosition.top - top), 1 /* ScrollType.Immediate */);
        }
    }
    dispose() {
        if (this.hoverWidget) {
            this.hoverWidget.dispose();
        }
        if (this.configurationWidget) {
            this.configurationWidget.dispose();
        }
        this.toDispose = dispose(this.toDispose);
    }
};
__decorate([
    memoize
], DebugEditorContribution.prototype, "showHoverScheduler", null);
__decorate([
    memoize
], DebugEditorContribution.prototype, "removeInlineValuesScheduler", null);
__decorate([
    memoize
], DebugEditorContribution.prototype, "updateInlineValuesScheduler", null);
DebugEditorContribution = __decorate([
    __param(1, IDebugService),
    __param(2, IInstantiationService),
    __param(3, ICommandService),
    __param(4, IConfigurationService),
    __param(5, IHostService),
    __param(6, IUriIdentityService),
    __param(7, IContextKeyService),
    __param(8, ILanguageFeaturesService),
    __param(9, ILanguageFeatureDebounceService)
], DebugEditorContribution);
export { DebugEditorContribution };
class WordsToLineNumbersCache {
    constructor(model) {
        this.model = model;
        this.value = new Map();
        this.intervals = new Uint8Array(Math.ceil(model.getLineCount() / 8));
    }
    /** Ensures that variables names in the given range have been identified. */
    ensureRangePopulated(range) {
        for (let lineNumber = range.startLineNumber; lineNumber <= range.endLineNumber; lineNumber++) {
            const bin = lineNumber >> 3; /* Math.floor(i / 8) */
            const bit = 1 << (lineNumber & 0b111); /* 1 << (i % 8) */
            if (!(this.intervals[bin] & bit)) {
                getWordToLineNumbersMap(this.model, lineNumber, this.value);
                this.intervals[bin] |= bit;
            }
        }
    }
}
CommandsRegistry.registerCommand('_executeInlineValueProvider', async (accessor, uri, iRange, context) => {
    assertType(URI.isUri(uri));
    assertType(Range.isIRange(iRange));
    if (!context || typeof context.frameId !== 'number' || !Range.isIRange(context.stoppedLocation)) {
        throw illegalArgument('context');
    }
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        throw illegalArgument('uri');
    }
    const range = Range.lift(iRange);
    const { inlineValuesProvider } = accessor.get(ILanguageFeaturesService);
    const providers = inlineValuesProvider.ordered(model);
    const providerResults = await Promise.all(providers.map(provider => provider.provideInlineValues(model, range, context, CancellationToken.None)));
    return providerResults.flat().filter(isDefined);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFZGl0b3JDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdFZGl0b3JDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQWtCLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFbEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5SCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxH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