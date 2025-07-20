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
import './nativeEditContext.css';
import { isFirefox } from '../../../../../base/browser/browser.js';
import { addDisposableListener, getWindow, getWindowId } from '../../../../../base/browser/dom.js';
import { FastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { StandardKeyboardEvent } from '../../../../../base/browser/keyboardEvent.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ClipboardEventUtils, getDataToCopy, InMemoryClipboardMetadataManager } from '../clipboardUtils.js';
import { AbstractEditContext } from '../editContext.js';
import { editContextAddDisposableListener, FocusTracker } from './nativeEditContextUtils.js';
import { ScreenReaderSupport } from './screenReaderSupport.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { Position } from '../../../../common/core/position.js';
import { PositionOffsetTransformer } from '../../../../common/core/text/positionToOffset.js';
import { EditContext } from './editContextFactory.js';
import { NativeEditContextRegistry } from './nativeEditContextRegistry.js';
import { isHighSurrogate, isLowSurrogate } from '../../../../../base/common/strings.js';
import { IME } from '../../../../../base/common/ime.js';
import { OffsetRange } from '../../../../common/core/ranges/offsetRange.js';
// Corresponds to classes in nativeEditContext.css
var CompositionClassName;
(function (CompositionClassName) {
    CompositionClassName["NONE"] = "edit-context-composition-none";
    CompositionClassName["SECONDARY"] = "edit-context-composition-secondary";
    CompositionClassName["PRIMARY"] = "edit-context-composition-primary";
})(CompositionClassName || (CompositionClassName = {}));
let NativeEditContext = class NativeEditContext extends AbstractEditContext {
    constructor(ownerID, context, overflowGuardContainer, _viewController, _visibleRangeProvider, instantiationService) {
        super(context);
        this._viewController = _viewController;
        this._visibleRangeProvider = _visibleRangeProvider;
        this._previousEditContextSelection = new OffsetRange(0, 0);
        this._editContextPrimarySelection = new Selection(1, 1, 1, 1);
        this._decorations = [];
        this._primarySelection = new Selection(1, 1, 1, 1);
        this._targetWindowId = -1;
        this._scrollTop = 0;
        this._scrollLeft = 0;
        this.domNode = new FastDomNode(document.createElement('div'));
        this.domNode.setClassName(`native-edit-context`);
        this._imeTextArea = new FastDomNode(document.createElement('textarea'));
        this._imeTextArea.setClassName(`ime-text-area`);
        this._imeTextArea.setAttribute('readonly', 'true');
        this._imeTextArea.setAttribute('tabindex', '-1');
        this._imeTextArea.setAttribute('aria-hidden', 'true');
        this.domNode.setAttribute('autocorrect', 'off');
        this.domNode.setAttribute('autocapitalize', 'off');
        this.domNode.setAttribute('autocomplete', 'off');
        this.domNode.setAttribute('spellcheck', 'false');
        this._updateDomAttributes();
        overflowGuardContainer.appendChild(this.domNode);
        overflowGuardContainer.appendChild(this._imeTextArea);
        this._parent = overflowGuardContainer.domNode;
        this._focusTracker = this._register(new FocusTracker(this.domNode.domNode, (newFocusValue) => {
            this._screenReaderSupport.handleFocusChange(newFocusValue);
            this._context.viewModel.setHasFocus(newFocusValue);
        }));
        const window = getWindow(this.domNode.domNode);
        this._editContext = EditContext.create(window);
        this.setEditContextOnDomNode();
        this._screenReaderSupport = instantiationService.createInstance(ScreenReaderSupport, this.domNode, context, this._viewController);
        this._register(addDisposableListener(this.domNode.domNode, 'copy', (e) => this._ensureClipboardGetsEditorSelection(e)));
        this._register(addDisposableListener(this.domNode.domNode, 'cut', (e) => {
            // Pretend here we touched the text area, as the `cut` event will most likely
            // result in a `selectionchange` event which we want to ignore
            this._screenReaderSupport.onWillCut();
            this._ensureClipboardGetsEditorSelection(e);
            this._viewController.cut();
        }));
        this._register(addDisposableListener(this.domNode.domNode, 'keyup', (e) => this._onKeyUp(e)));
        this._register(addDisposableListener(this.domNode.domNode, 'keydown', async (e) => this._onKeyDown(e)));
        this._register(addDisposableListener(this._imeTextArea.domNode, 'keyup', (e) => this._onKeyUp(e)));
        this._register(addDisposableListener(this._imeTextArea.domNode, 'keydown', async (e) => this._onKeyDown(e)));
        this._register(addDisposableListener(this.domNode.domNode, 'beforeinput', async (e) => {
            if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
                this._onType(this._viewController, { text: '\n', replacePrevCharCnt: 0, replaceNextCharCnt: 0, positionDelta: 0 });
            }
        }));
        this._register(addDisposableListener(this.domNode.domNode, 'paste', (e) => {
            e.preventDefault();
            if (!e.clipboardData) {
                return;
            }
            let [text, metadata] = ClipboardEventUtils.getTextData(e.clipboardData);
            if (!text) {
                return;
            }
            metadata = metadata || InMemoryClipboardMetadataManager.INSTANCE.get(text);
            let pasteOnNewLine = false;
            let multicursorText = null;
            let mode = null;
            if (metadata) {
                const options = this._context.configuration.options;
                const emptySelectionClipboard = options.get(45 /* EditorOption.emptySelectionClipboard */);
                pasteOnNewLine = emptySelectionClipboard && !!metadata.isFromEmptySelection;
                multicursorText = typeof metadata.multicursorText !== 'undefined' ? metadata.multicursorText : null;
                mode = metadata.mode;
            }
            this._viewController.paste(text, pasteOnNewLine, multicursorText, mode);
        }));
        // Edit context events
        this._register(editContextAddDisposableListener(this._editContext, 'textformatupdate', (e) => this._handleTextFormatUpdate(e)));
        this._register(editContextAddDisposableListener(this._editContext, 'characterboundsupdate', (e) => this._updateCharacterBounds(e)));
        let highSurrogateCharacter;
        this._register(editContextAddDisposableListener(this._editContext, 'textupdate', (e) => {
            const text = e.text;
            if (text.length === 1) {
                const charCode = text.charCodeAt(0);
                if (isHighSurrogate(charCode)) {
                    highSurrogateCharacter = text;
                    return;
                }
                if (isLowSurrogate(charCode) && highSurrogateCharacter) {
                    const textUpdateEvent = {
                        text: highSurrogateCharacter + text,
                        selectionEnd: e.selectionEnd,
                        selectionStart: e.selectionStart,
                        updateRangeStart: e.updateRangeStart - 1,
                        updateRangeEnd: e.updateRangeEnd - 1
                    };
                    highSurrogateCharacter = undefined;
                    this._emitTypeEvent(this._viewController, textUpdateEvent);
                    return;
                }
            }
            this._emitTypeEvent(this._viewController, e);
        }));
        this._register(editContextAddDisposableListener(this._editContext, 'compositionstart', (e) => {
            // Utlimately fires onDidCompositionStart() on the editor to notify for example suggest model of composition state
            // Updates the composition state of the cursor controller which determines behavior of typing with interceptors
            this._viewController.compositionStart();
            // Emits ViewCompositionStartEvent which can be depended on by ViewEventHandlers
            this._context.viewModel.onCompositionStart();
        }));
        this._register(editContextAddDisposableListener(this._editContext, 'compositionend', (e) => {
            // Utlimately fires compositionEnd() on the editor to notify for example suggest model of composition state
            // Updates the composition state of the cursor controller which determines behavior of typing with interceptors
            this._viewController.compositionEnd();
            // Emits ViewCompositionEndEvent which can be depended on by ViewEventHandlers
            this._context.viewModel.onCompositionEnd();
        }));
        let reenableTracking = false;
        this._register(IME.onDidChange(() => {
            if (IME.enabled && reenableTracking) {
                this._focusTracker.resume();
                this.domNode.focus();
                reenableTracking = false;
            }
            if (!IME.enabled && this.isFocused()) {
                this._focusTracker.pause();
                this._imeTextArea.focus();
                reenableTracking = true;
            }
        }));
        this._register(NativeEditContextRegistry.register(ownerID, this));
    }
    // --- Public methods ---
    dispose() {
        // Force blue the dom node so can write in pane with no native edit context after disposal
        this.domNode.domNode.blur();
        this.domNode.domNode.remove();
        this._imeTextArea.domNode.remove();
        super.dispose();
    }
    setAriaOptions(options) {
        this._screenReaderSupport.setAriaOptions(options);
    }
    /* Last rendered data needed for correct hit-testing and determining the mouse position.
     * Without this, the selection will blink as incorrect mouse position is calculated */
    getLastRenderData() {
        return this._primarySelection.getPosition();
    }
    prepareRender(ctx) {
        this._screenReaderSupport.prepareRender(ctx);
        this._updateSelectionAndControlBounds(ctx);
    }
    render(ctx) {
        this._screenReaderSupport.render(ctx);
    }
    onCursorStateChanged(e) {
        this._primarySelection = e.modelSelections[0] ?? new Selection(1, 1, 1, 1);
        this._screenReaderSupport.onCursorStateChanged(e);
        this._updateEditContext();
        return true;
    }
    onConfigurationChanged(e) {
        this._screenReaderSupport.onConfigurationChanged(e);
        this._updateDomAttributes();
        return true;
    }
    onDecorationsChanged(e) {
        // true for inline decorations that can end up relayouting text
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        this._updateEditContextOnLineChange(e.fromLineNumber, e.fromLineNumber + e.count - 1);
        return true;
    }
    onLinesDeleted(e) {
        this._updateEditContextOnLineChange(e.fromLineNumber, e.toLineNumber);
        return true;
    }
    onLinesInserted(e) {
        this._updateEditContextOnLineChange(e.fromLineNumber, e.toLineNumber);
        return true;
    }
    _updateEditContextOnLineChange(fromLineNumber, toLineNumber) {
        if (this._editContextPrimarySelection.endLineNumber < fromLineNumber || this._editContextPrimarySelection.startLineNumber > toLineNumber) {
            return;
        }
        this._updateEditContext();
    }
    onScrollChanged(e) {
        this._scrollLeft = e.scrollLeft;
        this._scrollTop = e.scrollTop;
        return true;
    }
    onZonesChanged(e) {
        return true;
    }
    onWillPaste() {
        this._onWillPaste();
    }
    _onWillPaste() {
        this._screenReaderSupport.onWillPaste();
    }
    writeScreenReaderContent() {
        this._screenReaderSupport.writeScreenReaderContent();
    }
    isFocused() {
        return this._focusTracker.isFocused;
    }
    focus() {
        this._focusTracker.focus();
        // If the editor is off DOM, focus cannot be really set, so let's double check that we have managed to set the focus
        this.refreshFocusState();
    }
    refreshFocusState() {
        this._focusTracker.refreshFocusState();
    }
    // TODO: added as a workaround fix for https://github.com/microsoft/vscode/issues/229825
    // When this issue will be fixed the following should be removed.
    setEditContextOnDomNode() {
        const targetWindow = getWindow(this.domNode.domNode);
        const targetWindowId = getWindowId(targetWindow);
        if (this._targetWindowId !== targetWindowId) {
            this.domNode.domNode.editContext = this._editContext;
            this._targetWindowId = targetWindowId;
        }
    }
    // --- Private methods ---
    _onKeyUp(e) {
        this._viewController.emitKeyUp(new StandardKeyboardEvent(e));
    }
    _onKeyDown(e) {
        const standardKeyboardEvent = new StandardKeyboardEvent(e);
        // When the IME is visible, the keys, like arrow-left and arrow-right, should be used to navigate in the IME, and should not be propagated further
        if (standardKeyboardEvent.keyCode === 114 /* KeyCode.KEY_IN_COMPOSITION */) {
            standardKeyboardEvent.stopPropagation();
        }
        this._viewController.emitKeyDown(standardKeyboardEvent);
    }
    _updateDomAttributes() {
        const options = this._context.configuration.options;
        this.domNode.domNode.setAttribute('tabindex', String(options.get(139 /* EditorOption.tabIndex */)));
    }
    _updateEditContext() {
        const editContextState = this._getNewEditContextState();
        if (!editContextState) {
            return;
        }
        this._editContext.updateText(0, Number.MAX_SAFE_INTEGER, editContextState.text ?? ' ');
        this._editContext.updateSelection(editContextState.selectionStartOffset, editContextState.selectionEndOffset);
        this._editContextPrimarySelection = editContextState.editContextPrimarySelection;
        this._previousEditContextSelection = new OffsetRange(editContextState.selectionStartOffset, editContextState.selectionEndOffset);
    }
    _emitTypeEvent(viewController, e) {
        if (!this._editContext) {
            return;
        }
        const selectionEndOffset = this._previousEditContextSelection.endExclusive;
        const selectionStartOffset = this._previousEditContextSelection.start;
        this._previousEditContextSelection = new OffsetRange(e.selectionStart, e.selectionEnd);
        let replaceNextCharCnt = 0;
        let replacePrevCharCnt = 0;
        if (e.updateRangeEnd > selectionEndOffset) {
            replaceNextCharCnt = e.updateRangeEnd - selectionEndOffset;
        }
        if (e.updateRangeStart < selectionStartOffset) {
            replacePrevCharCnt = selectionStartOffset - e.updateRangeStart;
        }
        let text = '';
        if (selectionStartOffset < e.updateRangeStart) {
            text += this._editContext.text.substring(selectionStartOffset, e.updateRangeStart);
        }
        text += e.text;
        if (selectionEndOffset > e.updateRangeEnd) {
            text += this._editContext.text.substring(e.updateRangeEnd, selectionEndOffset);
        }
        let positionDelta = 0;
        if (e.selectionStart === e.selectionEnd && selectionStartOffset === selectionEndOffset) {
            positionDelta = e.selectionStart - (e.updateRangeStart + e.text.length);
        }
        const typeInput = {
            text,
            replacePrevCharCnt,
            replaceNextCharCnt,
            positionDelta
        };
        this._onType(viewController, typeInput);
    }
    _onType(viewController, typeInput) {
        if (typeInput.replacePrevCharCnt || typeInput.replaceNextCharCnt || typeInput.positionDelta) {
            viewController.compositionType(typeInput.text, typeInput.replacePrevCharCnt, typeInput.replaceNextCharCnt, typeInput.positionDelta);
        }
        else {
            viewController.type(typeInput.text);
        }
    }
    _getNewEditContextState() {
        const editContextPrimarySelection = this._primarySelection;
        const model = this._context.viewModel.model;
        if (!model.isValidRange(editContextPrimarySelection)) {
            return;
        }
        const primarySelectionStartLine = editContextPrimarySelection.startLineNumber;
        const primarySelectionEndLine = editContextPrimarySelection.endLineNumber;
        const endColumnOfEndLineNumber = model.getLineMaxColumn(primarySelectionEndLine);
        const rangeOfText = new Range(primarySelectionStartLine, 1, primarySelectionEndLine, endColumnOfEndLineNumber);
        const text = model.getValueInRange(rangeOfText, 0 /* EndOfLinePreference.TextDefined */);
        const selectionStartOffset = editContextPrimarySelection.startColumn - 1;
        const selectionEndOffset = text.length + editContextPrimarySelection.endColumn - endColumnOfEndLineNumber;
        return {
            text,
            selectionStartOffset,
            selectionEndOffset,
            editContextPrimarySelection
        };
    }
    _editContextStartPosition() {
        return new Position(this._editContextPrimarySelection.startLineNumber, 1);
    }
    _handleTextFormatUpdate(e) {
        if (!this._editContext) {
            return;
        }
        const formats = e.getTextFormats();
        const editContextStartPosition = this._editContextStartPosition();
        const decorations = [];
        formats.forEach(f => {
            const textModel = this._context.viewModel.model;
            const offsetOfEditContextText = textModel.getOffsetAt(editContextStartPosition);
            const startPositionOfDecoration = textModel.getPositionAt(offsetOfEditContextText + f.rangeStart);
            const endPositionOfDecoration = textModel.getPositionAt(offsetOfEditContextText + f.rangeEnd);
            const decorationRange = Range.fromPositions(startPositionOfDecoration, endPositionOfDecoration);
            const thickness = f.underlineThickness.toLowerCase();
            let decorationClassName = CompositionClassName.NONE;
            switch (thickness) {
                case 'thin':
                    decorationClassName = CompositionClassName.SECONDARY;
                    break;
                case 'thick':
                    decorationClassName = CompositionClassName.PRIMARY;
                    break;
            }
            decorations.push({
                range: decorationRange,
                options: {
                    description: 'textFormatDecoration',
                    inlineClassName: decorationClassName,
                }
            });
        });
        this._decorations = this._context.viewModel.model.deltaDecorations(this._decorations, decorations);
    }
    _updateSelectionAndControlBounds(ctx) {
        if (!this._parent) {
            return;
        }
        const options = this._context.configuration.options;
        const contentLeft = options.get(164 /* EditorOption.layoutInfo */).contentLeft;
        const parentBounds = this._parent.getBoundingClientRect();
        const viewSelection = this._context.viewModel.coordinatesConverter.convertModelRangeToViewRange(this._primarySelection);
        const verticalOffsetStart = this._context.viewLayout.getVerticalOffsetForLineNumber(viewSelection.startLineNumber);
        const top = parentBounds.top + verticalOffsetStart - this._scrollTop;
        const verticalOffsetEnd = this._context.viewLayout.getVerticalOffsetAfterLineNumber(viewSelection.endLineNumber);
        const height = verticalOffsetEnd - verticalOffsetStart;
        let left = parentBounds.left + contentLeft - this._scrollLeft;
        let width;
        if (this._primarySelection.isEmpty()) {
            const linesVisibleRanges = ctx.visibleRangeForPosition(viewSelection.getStartPosition());
            if (linesVisibleRanges) {
                left += linesVisibleRanges.left;
            }
            width = 0;
        }
        else {
            width = parentBounds.width - contentLeft;
        }
        const selectionBounds = new DOMRect(left, top, width, height);
        this._editContext.updateSelectionBounds(selectionBounds);
        this._editContext.updateControlBounds(selectionBounds);
    }
    _updateCharacterBounds(e) {
        if (!this._parent) {
            return;
        }
        const options = this._context.configuration.options;
        const typicalHalfWidthCharacterWidth = options.get(59 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        const contentLeft = options.get(164 /* EditorOption.layoutInfo */).contentLeft;
        const parentBounds = this._parent.getBoundingClientRect();
        const characterBounds = [];
        const offsetTransformer = new PositionOffsetTransformer(this._editContext.text);
        for (let offset = e.rangeStart; offset < e.rangeEnd; offset++) {
            const editContextStartPosition = offsetTransformer.getPosition(offset);
            const textStartLineOffsetWithinEditor = this._editContextPrimarySelection.startLineNumber - 1;
            const characterStartPosition = new Position(textStartLineOffsetWithinEditor + editContextStartPosition.lineNumber, editContextStartPosition.column);
            const characterEndPosition = characterStartPosition.delta(0, 1);
            const characterModelRange = Range.fromPositions(characterStartPosition, characterEndPosition);
            const characterViewRange = this._context.viewModel.coordinatesConverter.convertModelRangeToViewRange(characterModelRange);
            const characterLinesVisibleRanges = this._visibleRangeProvider.linesVisibleRangesForRange(characterViewRange, true) ?? [];
            const lineNumber = characterViewRange.startLineNumber;
            const characterVerticalOffset = this._context.viewLayout.getVerticalOffsetForLineNumber(lineNumber);
            const top = parentBounds.top + characterVerticalOffset - this._scrollTop;
            let left = 0;
            let width = typicalHalfWidthCharacterWidth;
            if (characterLinesVisibleRanges.length > 0) {
                for (const visibleRange of characterLinesVisibleRanges[0].ranges) {
                    left = visibleRange.left;
                    width = visibleRange.width;
                    break;
                }
            }
            const lineHeight = this._context.viewLayout.getLineHeightForLineNumber(lineNumber);
            characterBounds.push(new DOMRect(parentBounds.left + contentLeft + left - this._scrollLeft, top, width, lineHeight));
        }
        this._editContext.updateCharacterBounds(e.rangeStart, characterBounds);
    }
    _ensureClipboardGetsEditorSelection(e) {
        const options = this._context.configuration.options;
        const emptySelectionClipboard = options.get(45 /* EditorOption.emptySelectionClipboard */);
        const copyWithSyntaxHighlighting = options.get(31 /* EditorOption.copyWithSyntaxHighlighting */);
        const selections = this._context.viewModel.getCursorStates().map(cursorState => cursorState.modelState.selection);
        const dataToCopy = getDataToCopy(this._context.viewModel, selections, emptySelectionClipboard, copyWithSyntaxHighlighting);
        const storedMetadata = {
            version: 1,
            isFromEmptySelection: dataToCopy.isFromEmptySelection,
            multicursorText: dataToCopy.multicursorText,
            mode: dataToCopy.mode
        };
        InMemoryClipboardMetadataManager.INSTANCE.set(
        // When writing "LINE\r\n" to the clipboard and then pasting,
        // Firefox pastes "LINE\n", so let's work around this quirk
        (isFirefox ? dataToCopy.text.replace(/\r\n/g, '\n') : dataToCopy.text), storedMetadata);
        e.preventDefault();
        if (e.clipboardData) {
            ClipboardEventUtils.setTextData(e.clipboardData, dataToCopy.text, dataToCopy.html, storedMetadata);
        }
    }
};
NativeEditContext = __decorate([
    __param(5, IInstantiationService)
], NativeEditContext);
export { NativeEditContext };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRWRpdENvbnRleHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvbmF0aXZlL25hdGl2ZUVkaXRDb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8seUJBQXlCLENBQUM7QUFDakMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRXJGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBT3RHLE9BQU8sRUFBRSxtQkFBbUIsRUFBMkIsYUFBYSxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDckksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDeEQsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLFlBQVksRUFBYSxNQUFNLDZCQUE2QixDQUFDO0FBQ3hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFD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