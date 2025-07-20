/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from './core/position.js';
import { Range } from './core/range.js';
import { Selection } from './core/selection.js';
import { createScopedLineTokens } from './languages/supports.js';
import { CursorColumns } from './core/cursorColumns.js';
import { normalizeIndentation } from './core/misc/indentation.js';
import { InputMode } from './inputMode.js';
/**
 * This is an operation type that will be recorded for undo/redo purposes.
 * The goal is to introduce an undo stop when the controller switches between different operation types.
 */
export var EditOperationType;
(function (EditOperationType) {
    EditOperationType[EditOperationType["Other"] = 0] = "Other";
    EditOperationType[EditOperationType["DeletingLeft"] = 2] = "DeletingLeft";
    EditOperationType[EditOperationType["DeletingRight"] = 3] = "DeletingRight";
    EditOperationType[EditOperationType["TypingOther"] = 4] = "TypingOther";
    EditOperationType[EditOperationType["TypingFirstSpace"] = 5] = "TypingFirstSpace";
    EditOperationType[EditOperationType["TypingConsecutiveSpace"] = 6] = "TypingConsecutiveSpace";
})(EditOperationType || (EditOperationType = {}));
const autoCloseAlways = () => true;
const autoCloseNever = () => false;
const autoCloseBeforeWhitespace = (chr) => (chr === ' ' || chr === '\t');
export class CursorConfiguration {
    static shouldRecreate(e) {
        return (e.hasChanged(164 /* EditorOption.layoutInfo */)
            || e.hasChanged(147 /* EditorOption.wordSeparators */)
            || e.hasChanged(45 /* EditorOption.emptySelectionClipboard */)
            || e.hasChanged(85 /* EditorOption.multiCursorMergeOverlapping */)
            || e.hasChanged(87 /* EditorOption.multiCursorPaste */)
            || e.hasChanged(88 /* EditorOption.multiCursorLimit */)
            || e.hasChanged(10 /* EditorOption.autoClosingBrackets */)
            || e.hasChanged(11 /* EditorOption.autoClosingComments */)
            || e.hasChanged(15 /* EditorOption.autoClosingQuotes */)
            || e.hasChanged(13 /* EditorOption.autoClosingDelete */)
            || e.hasChanged(14 /* EditorOption.autoClosingOvertype */)
            || e.hasChanged(20 /* EditorOption.autoSurround */)
            || e.hasChanged(144 /* EditorOption.useTabStops */)
            || e.hasChanged(140 /* EditorOption.trimWhitespaceOnDelete */)
            || e.hasChanged(59 /* EditorOption.fontInfo */)
            || e.hasChanged(103 /* EditorOption.readOnly */)
            || e.hasChanged(146 /* EditorOption.wordSegmenterLocales */)
            || e.hasChanged(92 /* EditorOption.overtypeOnPaste */));
    }
    constructor(languageId, modelOptions, configuration, languageConfigurationService) {
        this.languageConfigurationService = languageConfigurationService;
        this._cursorMoveConfigurationBrand = undefined;
        this._languageId = languageId;
        const options = configuration.options;
        const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
        const fontInfo = options.get(59 /* EditorOption.fontInfo */);
        this.readOnly = options.get(103 /* EditorOption.readOnly */);
        this.tabSize = modelOptions.tabSize;
        this.indentSize = modelOptions.indentSize;
        this.insertSpaces = modelOptions.insertSpaces;
        this.stickyTabStops = options.get(131 /* EditorOption.stickyTabStops */);
        this.lineHeight = fontInfo.lineHeight;
        this.typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
        this.pageSize = Math.max(1, Math.floor(layoutInfo.height / this.lineHeight) - 2);
        this.useTabStops = options.get(144 /* EditorOption.useTabStops */);
        this.trimWhitespaceOnDelete = options.get(140 /* EditorOption.trimWhitespaceOnDelete */);
        this.wordSeparators = options.get(147 /* EditorOption.wordSeparators */);
        this.emptySelectionClipboard = options.get(45 /* EditorOption.emptySelectionClipboard */);
        this.copyWithSyntaxHighlighting = options.get(31 /* EditorOption.copyWithSyntaxHighlighting */);
        this.multiCursorMergeOverlapping = options.get(85 /* EditorOption.multiCursorMergeOverlapping */);
        this.multiCursorPaste = options.get(87 /* EditorOption.multiCursorPaste */);
        this.multiCursorLimit = options.get(88 /* EditorOption.multiCursorLimit */);
        this.autoClosingBrackets = options.get(10 /* EditorOption.autoClosingBrackets */);
        this.autoClosingComments = options.get(11 /* EditorOption.autoClosingComments */);
        this.autoClosingQuotes = options.get(15 /* EditorOption.autoClosingQuotes */);
        this.autoClosingDelete = options.get(13 /* EditorOption.autoClosingDelete */);
        this.autoClosingOvertype = options.get(14 /* EditorOption.autoClosingOvertype */);
        this.autoSurround = options.get(20 /* EditorOption.autoSurround */);
        this.autoIndent = options.get(16 /* EditorOption.autoIndent */);
        this.wordSegmenterLocales = options.get(146 /* EditorOption.wordSegmenterLocales */);
        this.overtypeOnPaste = options.get(92 /* EditorOption.overtypeOnPaste */);
        this.surroundingPairs = {};
        this._electricChars = null;
        this.shouldAutoCloseBefore = {
            quote: this._getShouldAutoClose(languageId, this.autoClosingQuotes, true),
            comment: this._getShouldAutoClose(languageId, this.autoClosingComments, false),
            bracket: this._getShouldAutoClose(languageId, this.autoClosingBrackets, false),
        };
        this.autoClosingPairs = this.languageConfigurationService.getLanguageConfiguration(languageId).getAutoClosingPairs();
        const surroundingPairs = this.languageConfigurationService.getLanguageConfiguration(languageId).getSurroundingPairs();
        if (surroundingPairs) {
            for (const pair of surroundingPairs) {
                this.surroundingPairs[pair.open] = pair.close;
            }
        }
        const commentsConfiguration = this.languageConfigurationService.getLanguageConfiguration(languageId).comments;
        this.blockCommentStartToken = commentsConfiguration?.blockCommentStartToken ?? null;
    }
    get electricChars() {
        if (!this._electricChars) {
            this._electricChars = {};
            const electricChars = this.languageConfigurationService.getLanguageConfiguration(this._languageId).electricCharacter?.getElectricCharacters();
            if (electricChars) {
                for (const char of electricChars) {
                    this._electricChars[char] = true;
                }
            }
        }
        return this._electricChars;
    }
    get inputMode() {
        return InputMode.getInputMode();
    }
    /**
     * Should return opening bracket type to match indentation with
     */
    onElectricCharacter(character, context, column) {
        const scopedLineTokens = createScopedLineTokens(context, column - 1);
        const electricCharacterSupport = this.languageConfigurationService.getLanguageConfiguration(scopedLineTokens.languageId).electricCharacter;
        if (!electricCharacterSupport) {
            return null;
        }
        return electricCharacterSupport.onElectricCharacter(character, scopedLineTokens, column - scopedLineTokens.firstCharOffset);
    }
    normalizeIndentation(str) {
        return normalizeIndentation(str, this.indentSize, this.insertSpaces);
    }
    _getShouldAutoClose(languageId, autoCloseConfig, forQuotes) {
        switch (autoCloseConfig) {
            case 'beforeWhitespace':
                return autoCloseBeforeWhitespace;
            case 'languageDefined':
                return this._getLanguageDefinedShouldAutoClose(languageId, forQuotes);
            case 'always':
                return autoCloseAlways;
            case 'never':
                return autoCloseNever;
        }
    }
    _getLanguageDefinedShouldAutoClose(languageId, forQuotes) {
        const autoCloseBeforeSet = this.languageConfigurationService.getLanguageConfiguration(languageId).getAutoCloseBeforeSet(forQuotes);
        return c => autoCloseBeforeSet.indexOf(c) !== -1;
    }
    /**
     * Returns a visible column from a column.
     * @see {@link CursorColumns}
     */
    visibleColumnFromColumn(model, position) {
        return CursorColumns.visibleColumnFromColumn(model.getLineContent(position.lineNumber), position.column, this.tabSize);
    }
    /**
     * Returns a visible column from a column.
     * @see {@link CursorColumns}
     */
    columnFromVisibleColumn(model, lineNumber, visibleColumn) {
        const result = CursorColumns.columnFromVisibleColumn(model.getLineContent(lineNumber), visibleColumn, this.tabSize);
        const minColumn = model.getLineMinColumn(lineNumber);
        if (result < minColumn) {
            return minColumn;
        }
        const maxColumn = model.getLineMaxColumn(lineNumber);
        if (result > maxColumn) {
            return maxColumn;
        }
        return result;
    }
}
export class CursorState {
    static fromModelState(modelState) {
        return new PartialModelCursorState(modelState);
    }
    static fromViewState(viewState) {
        return new PartialViewCursorState(viewState);
    }
    static fromModelSelection(modelSelection) {
        const selection = Selection.liftSelection(modelSelection);
        const modelState = new SingleCursorState(Range.fromPositions(selection.getSelectionStart()), 0 /* SelectionStartKind.Simple */, 0, selection.getPosition(), 0);
        return CursorState.fromModelState(modelState);
    }
    static fromModelSelections(modelSelections) {
        const states = [];
        for (let i = 0, len = modelSelections.length; i < len; i++) {
            states[i] = this.fromModelSelection(modelSelections[i]);
        }
        return states;
    }
    constructor(modelState, viewState) {
        this._cursorStateBrand = undefined;
        this.modelState = modelState;
        this.viewState = viewState;
    }
    equals(other) {
        return (this.viewState.equals(other.viewState) && this.modelState.equals(other.modelState));
    }
}
export class PartialModelCursorState {
    constructor(modelState) {
        this.modelState = modelState;
        this.viewState = null;
    }
}
export class PartialViewCursorState {
    constructor(viewState) {
        this.modelState = null;
        this.viewState = viewState;
    }
}
export var SelectionStartKind;
(function (SelectionStartKind) {
    SelectionStartKind[SelectionStartKind["Simple"] = 0] = "Simple";
    SelectionStartKind[SelectionStartKind["Word"] = 1] = "Word";
    SelectionStartKind[SelectionStartKind["Line"] = 2] = "Line";
})(SelectionStartKind || (SelectionStartKind = {}));
/**
 * Represents the cursor state on either the model or on the view model.
 */
export class SingleCursorState {
    constructor(selectionStart, selectionStartKind, selectionStartLeftoverVisibleColumns, position, leftoverVisibleColumns) {
        this.selectionStart = selectionStart;
        this.selectionStartKind = selectionStartKind;
        this.selectionStartLeftoverVisibleColumns = selectionStartLeftoverVisibleColumns;
        this.position = position;
        this.leftoverVisibleColumns = leftoverVisibleColumns;
        this._singleCursorStateBrand = undefined;
        this.selection = SingleCursorState._computeSelection(this.selectionStart, this.position);
    }
    equals(other) {
        return (this.selectionStartLeftoverVisibleColumns === other.selectionStartLeftoverVisibleColumns
            && this.leftoverVisibleColumns === other.leftoverVisibleColumns
            && this.selectionStartKind === other.selectionStartKind
            && this.position.equals(other.position)
            && this.selectionStart.equalsRange(other.selectionStart));
    }
    hasSelection() {
        return (!this.selection.isEmpty() || !this.selectionStart.isEmpty());
    }
    move(inSelectionMode, lineNumber, column, leftoverVisibleColumns) {
        if (inSelectionMode) {
            // move just position
            return new SingleCursorState(this.selectionStart, this.selectionStartKind, this.selectionStartLeftoverVisibleColumns, new Position(lineNumber, column), leftoverVisibleColumns);
        }
        else {
            // move everything
            return new SingleCursorState(new Range(lineNumber, column, lineNumber, column), 0 /* SelectionStartKind.Simple */, leftoverVisibleColumns, new Position(lineNumber, column), leftoverVisibleColumns);
        }
    }
    static _computeSelection(selectionStart, position) {
        if (selectionStart.isEmpty() || !position.isBeforeOrEqual(selectionStart.getStartPosition())) {
            return Selection.fromPositions(selectionStart.getStartPosition(), position);
        }
        else {
            return Selection.fromPositions(selectionStart.getEndPosition(), position);
        }
    }
}
export class EditOperationResult {
    constructor(type, commands, opts) {
        this._editOperationResultBrand = undefined;
        this.type = type;
        this.commands = commands;
        this.shouldPushStackElementBefore = opts.shouldPushStackElementBefore;
        this.shouldPushStackElementAfter = opts.shouldPushStackElementAfter;
    }
}
export function isQuote(ch) {
    return (ch === '\'' || ch === '"' || ch === '`');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQ29tbW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvckNvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3hDLE9BQU8sRUFBYyxTQUFTLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQU01RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUVqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDeEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBVTNDOzs7R0FHRztBQUNILE1BQU0sQ0FBTixJQUFrQixpQkFPakI7QUFQRCxXQUFrQixpQkFBaUI7SUFDbEMsMkRBQVMsQ0FBQTtJQUNULHlFQUFnQixDQUFBO0lBQ2hCLDJFQUFpQixDQUFBO0lBQ2pCLHVFQUFlLENBQUE7SUFDZixpRkFBb0IsQ0FBQTtJQUNwQiw2RkFBMEIsQ0FBQTtBQUMzQixDQUFDLEVBUGlCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFPbEM7QUFNRCxNQUFNLGVBQWUsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7QUFDbkMsTUFBTSxjQUFjLEdBQUcsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO0FBQ25DLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxHQUFHLEtBQUssSUFBSSxDQUFDLENBQUM7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