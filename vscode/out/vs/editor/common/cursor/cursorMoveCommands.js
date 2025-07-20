/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as types from '../../../base/common/types.js';
import { CursorState, SingleCursorState } from '../cursorCommon.js';
import { MoveOperations } from './cursorMoveOperations.js';
import { WordOperations } from './cursorWordOperations.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { TextDirection } from '../model.js';
export class CursorMoveCommands {
    static addCursorDown(viewModel, cursors, useLogicalLine) {
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[resultLen++] = new CursorState(cursor.modelState, cursor.viewState);
            if (useLogicalLine) {
                result[resultLen++] = CursorState.fromModelState(MoveOperations.translateDown(viewModel.cursorConfig, viewModel.model, cursor.modelState));
            }
            else {
                result[resultLen++] = CursorState.fromViewState(MoveOperations.translateDown(viewModel.cursorConfig, viewModel, cursor.viewState));
            }
        }
        return result;
    }
    static addCursorUp(viewModel, cursors, useLogicalLine) {
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[resultLen++] = new CursorState(cursor.modelState, cursor.viewState);
            if (useLogicalLine) {
                result[resultLen++] = CursorState.fromModelState(MoveOperations.translateUp(viewModel.cursorConfig, viewModel.model, cursor.modelState));
            }
            else {
                result[resultLen++] = CursorState.fromViewState(MoveOperations.translateUp(viewModel.cursorConfig, viewModel, cursor.viewState));
            }
        }
        return result;
    }
    static moveToBeginningOfLine(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = this._moveToLineStart(viewModel, cursor, inSelectionMode);
        }
        return result;
    }
    static _moveToLineStart(viewModel, cursor, inSelectionMode) {
        const currentViewStateColumn = cursor.viewState.position.column;
        const currentModelStateColumn = cursor.modelState.position.column;
        const isFirstLineOfWrappedLine = currentViewStateColumn === currentModelStateColumn;
        const currentViewStatelineNumber = cursor.viewState.position.lineNumber;
        const firstNonBlankColumn = viewModel.getLineFirstNonWhitespaceColumn(currentViewStatelineNumber);
        const isBeginningOfViewLine = currentViewStateColumn === firstNonBlankColumn;
        if (!isFirstLineOfWrappedLine && !isBeginningOfViewLine) {
            return this._moveToLineStartByView(viewModel, cursor, inSelectionMode);
        }
        else {
            return this._moveToLineStartByModel(viewModel, cursor, inSelectionMode);
        }
    }
    static _moveToLineStartByView(viewModel, cursor, inSelectionMode) {
        return CursorState.fromViewState(MoveOperations.moveToBeginningOfLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode));
    }
    static _moveToLineStartByModel(viewModel, cursor, inSelectionMode) {
        return CursorState.fromModelState(MoveOperations.moveToBeginningOfLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode));
    }
    static moveToEndOfLine(viewModel, cursors, inSelectionMode, sticky) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = this._moveToLineEnd(viewModel, cursor, inSelectionMode, sticky);
        }
        return result;
    }
    static _moveToLineEnd(viewModel, cursor, inSelectionMode, sticky) {
        const viewStatePosition = cursor.viewState.position;
        const viewModelMaxColumn = viewModel.getLineMaxColumn(viewStatePosition.lineNumber);
        const isEndOfViewLine = viewStatePosition.column === viewModelMaxColumn;
        const modelStatePosition = cursor.modelState.position;
        const modelMaxColumn = viewModel.model.getLineMaxColumn(modelStatePosition.lineNumber);
        const isEndLineOfWrappedLine = viewModelMaxColumn - viewStatePosition.column === modelMaxColumn - modelStatePosition.column;
        if (isEndOfViewLine || isEndLineOfWrappedLine) {
            return this._moveToLineEndByModel(viewModel, cursor, inSelectionMode, sticky);
        }
        else {
            return this._moveToLineEndByView(viewModel, cursor, inSelectionMode, sticky);
        }
    }
    static _moveToLineEndByView(viewModel, cursor, inSelectionMode, sticky) {
        return CursorState.fromViewState(MoveOperations.moveToEndOfLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, sticky));
    }
    static _moveToLineEndByModel(viewModel, cursor, inSelectionMode, sticky) {
        return CursorState.fromModelState(MoveOperations.moveToEndOfLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, sticky));
    }
    static expandLineSelection(viewModel, cursors) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const startLineNumber = cursor.modelState.selection.startLineNumber;
            const lineCount = viewModel.model.getLineCount();
            let endLineNumber = cursor.modelState.selection.endLineNumber;
            let endColumn;
            if (endLineNumber === lineCount) {
                endColumn = viewModel.model.getLineMaxColumn(lineCount);
            }
            else {
                endLineNumber++;
                endColumn = 1;
            }
            result[i] = CursorState.fromModelState(new SingleCursorState(new Range(startLineNumber, 1, startLineNumber, 1), 0 /* SelectionStartKind.Simple */, 0, new Position(endLineNumber, endColumn), 0));
        }
        return result;
    }
    static moveToBeginningOfBuffer(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveToBeginningOfBuffer(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode));
        }
        return result;
    }
    static moveToEndOfBuffer(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveToEndOfBuffer(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode));
        }
        return result;
    }
    static selectAll(viewModel, cursor) {
        const lineCount = viewModel.model.getLineCount();
        const maxColumn = viewModel.model.getLineMaxColumn(lineCount);
        return CursorState.fromModelState(new SingleCursorState(new Range(1, 1, 1, 1), 0 /* SelectionStartKind.Simple */, 0, new Position(lineCount, maxColumn), 0));
    }
    static line(viewModel, cursor, inSelectionMode, _position, _viewPosition) {
        const position = viewModel.model.validatePosition(_position);
        const viewPosition = (_viewPosition
            ? viewModel.coordinatesConverter.validateViewPosition(new Position(_viewPosition.lineNumber, _viewPosition.column), position)
            : viewModel.coordinatesConverter.convertModelPositionToViewPosition(position));
        if (!inSelectionMode) {
            // Entering line selection for the first time
            const lineCount = viewModel.model.getLineCount();
            let selectToLineNumber = position.lineNumber + 1;
            let selectToColumn = 1;
            if (selectToLineNumber > lineCount) {
                selectToLineNumber = lineCount;
                selectToColumn = viewModel.model.getLineMaxColumn(selectToLineNumber);
            }
            return CursorState.fromModelState(new SingleCursorState(new Range(position.lineNumber, 1, selectToLineNumber, selectToColumn), 2 /* SelectionStartKind.Line */, 0, new Position(selectToLineNumber, selectToColumn), 0));
        }
        // Continuing line selection
        const enteringLineNumber = cursor.modelState.selectionStart.getStartPosition().lineNumber;
        if (position.lineNumber < enteringLineNumber) {
            return CursorState.fromViewState(cursor.viewState.move(true, viewPosition.lineNumber, 1, 0));
        }
        else if (position.lineNumber > enteringLineNumber) {
            const lineCount = viewModel.getLineCount();
            let selectToViewLineNumber = viewPosition.lineNumber + 1;
            let selectToViewColumn = 1;
            if (selectToViewLineNumber > lineCount) {
                selectToViewLineNumber = lineCount;
                selectToViewColumn = viewModel.getLineMaxColumn(selectToViewLineNumber);
            }
            return CursorState.fromViewState(cursor.viewState.move(true, selectToViewLineNumber, selectToViewColumn, 0));
        }
        else {
            const endPositionOfSelectionStart = cursor.modelState.selectionStart.getEndPosition();
            return CursorState.fromModelState(cursor.modelState.move(true, endPositionOfSelectionStart.lineNumber, endPositionOfSelectionStart.column, 0));
        }
    }
    static word(viewModel, cursor, inSelectionMode, _position) {
        const position = viewModel.model.validatePosition(_position);
        return CursorState.fromModelState(WordOperations.word(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, position));
    }
    static cancelSelection(viewModel, cursor) {
        if (!cursor.modelState.hasSelection()) {
            return new CursorState(cursor.modelState, cursor.viewState);
        }
        const lineNumber = cursor.viewState.position.lineNumber;
        const column = cursor.viewState.position.column;
        return CursorState.fromViewState(new SingleCursorState(new Range(lineNumber, column, lineNumber, column), 0 /* SelectionStartKind.Simple */, 0, new Position(lineNumber, column), 0));
    }
    static moveTo(viewModel, cursor, inSelectionMode, _position, _viewPosition) {
        if (inSelectionMode) {
            if (cursor.modelState.selectionStartKind === 1 /* SelectionStartKind.Word */) {
                return this.word(viewModel, cursor, inSelectionMode, _position);
            }
            if (cursor.modelState.selectionStartKind === 2 /* SelectionStartKind.Line */) {
                return this.line(viewModel, cursor, inSelectionMode, _position, _viewPosition);
            }
        }
        const position = viewModel.model.validatePosition(_position);
        const viewPosition = (_viewPosition
            ? viewModel.coordinatesConverter.validateViewPosition(new Position(_viewPosition.lineNumber, _viewPosition.column), position)
            : viewModel.coordinatesConverter.convertModelPositionToViewPosition(position));
        return CursorState.fromViewState(cursor.viewState.move(inSelectionMode, viewPosition.lineNumber, viewPosition.column, 0));
    }
    static simpleMove(viewModel, cursors, direction, inSelectionMode, value, unit) {
        switch (direction) {
            case 0 /* CursorMove.Direction.Left */: {
                if (unit === 4 /* CursorMove.Unit.HalfLine */) {
                    // Move left by half the current line length
                    return this._moveHalfLineLeft(viewModel, cursors, inSelectionMode);
                }
                else {
                    // Move left by `moveParams.value` columns
                    return this._moveLeft(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 1 /* CursorMove.Direction.Right */: {
                if (unit === 4 /* CursorMove.Unit.HalfLine */) {
                    // Move right by half the current line length
                    return this._moveHalfLineRight(viewModel, cursors, inSelectionMode);
                }
                else {
                    // Move right by `moveParams.value` columns
                    return this._moveRight(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 2 /* CursorMove.Direction.Up */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    // Move up by view lines
                    return this._moveUpByViewLines(viewModel, cursors, inSelectionMode, value);
                }
                else {
                    // Move up by model lines
                    return this._moveUpByModelLines(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 3 /* CursorMove.Direction.Down */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    // Move down by view lines
                    return this._moveDownByViewLines(viewModel, cursors, inSelectionMode, value);
                }
                else {
                    // Move down by model lines
                    return this._moveDownByModelLines(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 4 /* CursorMove.Direction.PrevBlankLine */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    return cursors.map(cursor => CursorState.fromViewState(MoveOperations.moveToPrevBlankLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode)));
                }
                else {
                    return cursors.map(cursor => CursorState.fromModelState(MoveOperations.moveToPrevBlankLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode)));
                }
            }
            case 5 /* CursorMove.Direction.NextBlankLine */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    return cursors.map(cursor => CursorState.fromViewState(MoveOperations.moveToNextBlankLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode)));
                }
                else {
                    return cursors.map(cursor => CursorState.fromModelState(MoveOperations.moveToNextBlankLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode)));
                }
            }
            case 6 /* CursorMove.Direction.WrappedLineStart */: {
                // Move to the beginning of the current view line
                return this._moveToViewMinColumn(viewModel, cursors, inSelectionMode);
            }
            case 7 /* CursorMove.Direction.WrappedLineFirstNonWhitespaceCharacter */: {
                // Move to the first non-whitespace column of the current view line
                return this._moveToViewFirstNonWhitespaceColumn(viewModel, cursors, inSelectionMode);
            }
            case 8 /* CursorMove.Direction.WrappedLineColumnCenter */: {
                // Move to the "center" of the current view line
                return this._moveToViewCenterColumn(viewModel, cursors, inSelectionMode);
            }
            case 9 /* CursorMove.Direction.WrappedLineEnd */: {
                // Move to the end of the current view line
                return this._moveToViewMaxColumn(viewModel, cursors, inSelectionMode);
            }
            case 10 /* CursorMove.Direction.WrappedLineLastNonWhitespaceCharacter */: {
                // Move to the last non-whitespace column of the current view line
                return this._moveToViewLastNonWhitespaceColumn(viewModel, cursors, inSelectionMode);
            }
            default:
                return null;
        }
    }
    static viewportMove(viewModel, cursors, direction, inSelectionMode, value) {
        const visibleViewRange = viewModel.getCompletelyVisibleViewRange();
        const visibleModelRange = viewModel.coordinatesConverter.convertViewRangeToModelRange(visibleViewRange);
        switch (direction) {
            case 11 /* CursorMove.Direction.ViewPortTop */: {
                // Move to the nth line start in the viewport (from the top)
                const modelLineNumber = this._firstLineNumberInRange(viewModel.model, visibleModelRange, value);
                const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumber);
                return [this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumber, modelColumn)];
            }
            case 13 /* CursorMove.Direction.ViewPortBottom */: {
                // Move to the nth line start in the viewport (from the bottom)
                const modelLineNumber = this._lastLineNumberInRange(viewModel.model, visibleModelRange, value);
                const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumber);
                return [this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumber, modelColumn)];
            }
            case 12 /* CursorMove.Direction.ViewPortCenter */: {
                // Move to the line start in the viewport center
                const modelLineNumber = Math.round((visibleModelRange.startLineNumber + visibleModelRange.endLineNumber) / 2);
                const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumber);
                return [this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumber, modelColumn)];
            }
            case 14 /* CursorMove.Direction.ViewPortIfOutside */: {
                // Move to a position inside the viewport
                const result = [];
                for (let i = 0, len = cursors.length; i < len; i++) {
                    const cursor = cursors[i];
                    result[i] = this.findPositionInViewportIfOutside(viewModel, cursor, visibleViewRange, inSelectionMode);
                }
                return result;
            }
            default:
                return null;
        }
    }
    static findPositionInViewportIfOutside(viewModel, cursor, visibleViewRange, inSelectionMode) {
        const viewLineNumber = cursor.viewState.position.lineNumber;
        if (visibleViewRange.startLineNumber <= viewLineNumber && viewLineNumber <= visibleViewRange.endLineNumber - 1) {
            // Nothing to do, cursor is in viewport
            return new CursorState(cursor.modelState, cursor.viewState);
        }
        else {
            let newViewLineNumber;
            if (viewLineNumber > visibleViewRange.endLineNumber - 1) {
                newViewLineNumber = visibleViewRange.endLineNumber - 1;
            }
            else if (viewLineNumber < visibleViewRange.startLineNumber) {
                newViewLineNumber = visibleViewRange.startLineNumber;
            }
            else {
                newViewLineNumber = viewLineNumber;
            }
            const position = MoveOperations.vertical(viewModel.cursorConfig, viewModel, viewLineNumber, cursor.viewState.position.column, cursor.viewState.leftoverVisibleColumns, newViewLineNumber, false);
            return CursorState.fromViewState(cursor.viewState.move(inSelectionMode, position.lineNumber, position.column, position.leftoverVisibleColumns));
        }
    }
    /**
     * Find the nth line start included in the range (from the start).
     */
    static _firstLineNumberInRange(model, range, count) {
        let startLineNumber = range.startLineNumber;
        if (range.startColumn !== model.getLineMinColumn(startLineNumber)) {
            // Move on to the second line if the first line start is not included in the range
            startLineNumber++;
        }
        return Math.min(range.endLineNumber, startLineNumber + count - 1);
    }
    /**
     * Find the nth line start included in the range (from the end).
     */
    static _lastLineNumberInRange(model, range, count) {
        let startLineNumber = range.startLineNumber;
        if (range.startColumn !== model.getLineMinColumn(startLineNumber)) {
            // Move on to the second line if the first line start is not included in the range
            startLineNumber++;
        }
        return Math.max(startLineNumber, range.endLineNumber - count + 1);
    }
    static _moveLeft(viewModel, cursors, inSelectionMode, noOfColumns) {
        return cursors.map(cursor => {
            const direction = viewModel.getTextDirection(cursor.viewState.position.lineNumber);
            const isRtl = direction === TextDirection.RTL;
            return CursorState.fromViewState(isRtl
                ? MoveOperations.moveRight(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, noOfColumns)
                : MoveOperations.moveLeft(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, noOfColumns));
        });
    }
    static _moveHalfLineLeft(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const halfLine = Math.round(viewModel.getLineLength(viewLineNumber) / 2);
            result[i] = CursorState.fromViewState(MoveOperations.moveLeft(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, halfLine));
        }
        return result;
    }
    static _moveRight(viewModel, cursors, inSelectionMode, noOfColumns) {
        return cursors.map(cursor => {
            const direction = viewModel.getTextDirection(cursor.viewState.position.lineNumber);
            const isRtl = direction === TextDirection.RTL;
            return CursorState.fromViewState(isRtl
                ? MoveOperations.moveLeft(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, noOfColumns)
                : MoveOperations.moveRight(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, noOfColumns));
        });
    }
    static _moveHalfLineRight(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const halfLine = Math.round(viewModel.getLineLength(viewLineNumber) / 2);
            result[i] = CursorState.fromViewState(MoveOperations.moveRight(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, halfLine));
        }
        return result;
    }
    static _moveDownByViewLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromViewState(MoveOperations.moveDown(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveDownByModelLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveDown(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveUpByViewLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromViewState(MoveOperations.moveUp(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveUpByModelLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveUp(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveToViewPosition(viewModel, cursor, inSelectionMode, toViewLineNumber, toViewColumn) {
        return CursorState.fromViewState(cursor.viewState.move(inSelectionMode, toViewLineNumber, toViewColumn, 0));
    }
    static _moveToModelPosition(viewModel, cursor, inSelectionMode, toModelLineNumber, toModelColumn) {
        return CursorState.fromModelState(cursor.modelState.move(inSelectionMode, toModelLineNumber, toModelColumn, 0));
    }
    static _moveToViewMinColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineMinColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewFirstNonWhitespaceColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineFirstNonWhitespaceColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewCenterColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = Math.round((viewModel.getLineMaxColumn(viewLineNumber) + viewModel.getLineMinColumn(viewLineNumber)) / 2);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewMaxColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineMaxColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewLastNonWhitespaceColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineLastNonWhitespaceColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
}
export var CursorMove;
(function (CursorMove) {
    const isCursorMoveArgs = function (arg) {
        if (!types.isObject(arg)) {
            return false;
        }
        const cursorMoveArg = arg;
        if (!types.isString(cursorMoveArg.to)) {
            return false;
        }
        if (!types.isUndefined(cursorMoveArg.select) && !types.isBoolean(cursorMoveArg.select)) {
            return false;
        }
        if (!types.isUndefined(cursorMoveArg.by) && !types.isString(cursorMoveArg.by)) {
            return false;
        }
        if (!types.isUndefined(cursorMoveArg.value) && !types.isNumber(cursorMoveArg.value)) {
            return false;
        }
        return true;
    };
    CursorMove.metadata = {
        description: 'Move cursor to a logical position in the view',
        args: [
            {
                name: 'Cursor move argument object',
                description: `Property-value pairs that can be passed through this argument:
					* 'to': A mandatory logical position value providing where to move the cursor.
						\`\`\`
						'left', 'right', 'up', 'down', 'prevBlankLine', 'nextBlankLine',
						'wrappedLineStart', 'wrappedLineEnd', 'wrappedLineColumnCenter'
						'wrappedLineFirstNonWhitespaceCharacter', 'wrappedLineLastNonWhitespaceCharacter'
						'viewPortTop', 'viewPortCenter', 'viewPortBottom', 'viewPortIfOutside'
						\`\`\`
					* 'by': Unit to move. Default is computed based on 'to' value.
						\`\`\`
						'line', 'wrappedLine', 'character', 'halfLine'
						\`\`\`
					* 'value': Number of units to move. Default is '1'.
					* 'select': If 'true' makes the selection. Default is 'false'.
				`,
                constraint: isCursorMoveArgs,
                schema: {
                    'type': 'object',
                    'required': ['to'],
                    'properties': {
                        'to': {
                            'type': 'string',
                            'enum': ['left', 'right', 'up', 'down', 'prevBlankLine', 'nextBlankLine', 'wrappedLineStart', 'wrappedLineEnd', 'wrappedLineColumnCenter', 'wrappedLineFirstNonWhitespaceCharacter', 'wrappedLineLastNonWhitespaceCharacter', 'viewPortTop', 'viewPortCenter', 'viewPortBottom', 'viewPortIfOutside']
                        },
                        'by': {
                            'type': 'string',
                            'enum': ['line', 'wrappedLine', 'character', 'halfLine']
                        },
                        'value': {
                            'type': 'number',
                            'default': 1
                        },
                        'select': {
                            'type': 'boolean',
                            'default': false
                        }
                    }
                }
            }
        ]
    };
    /**
     * Positions in the view for cursor move command.
     */
    CursorMove.RawDirection = {
        Left: 'left',
        Right: 'right',
        Up: 'up',
        Down: 'down',
        PrevBlankLine: 'prevBlankLine',
        NextBlankLine: 'nextBlankLine',
        WrappedLineStart: 'wrappedLineStart',
        WrappedLineFirstNonWhitespaceCharacter: 'wrappedLineFirstNonWhitespaceCharacter',
        WrappedLineColumnCenter: 'wrappedLineColumnCenter',
        WrappedLineEnd: 'wrappedLineEnd',
        WrappedLineLastNonWhitespaceCharacter: 'wrappedLineLastNonWhitespaceCharacter',
        ViewPortTop: 'viewPortTop',
        ViewPortCenter: 'viewPortCenter',
        ViewPortBottom: 'viewPortBottom',
        ViewPortIfOutside: 'viewPortIfOutside'
    };
    /**
     * Units for Cursor move 'by' argument
     */
    CursorMove.RawUnit = {
        Line: 'line',
        WrappedLine: 'wrappedLine',
        Character: 'character',
        HalfLine: 'halfLine'
    };
    function parse(args) {
        if (!args.to) {
            // illegal arguments
            return null;
        }
        let direction;
        switch (args.to) {
            case CursorMove.RawDirection.Left:
                direction = 0 /* Direction.Left */;
                break;
            case CursorMove.RawDirection.Right:
                direction = 1 /* Direction.Right */;
                break;
            case CursorMove.RawDirection.Up:
                direction = 2 /* Direction.Up */;
                break;
            case CursorMove.RawDirection.Down:
                direction = 3 /* Direction.Down */;
                break;
            case CursorMove.RawDirection.PrevBlankLine:
                direction = 4 /* Direction.PrevBlankLine */;
                break;
            case CursorMove.RawDirection.NextBlankLine:
                direction = 5 /* Direction.NextBlankLine */;
                break;
            case CursorMove.RawDirection.WrappedLineStart:
                direction = 6 /* Direction.WrappedLineStart */;
                break;
            case CursorMove.RawDirection.WrappedLineFirstNonWhitespaceCharacter:
                direction = 7 /* Direction.WrappedLineFirstNonWhitespaceCharacter */;
                break;
            case CursorMove.RawDirection.WrappedLineColumnCenter:
                direction = 8 /* Direction.WrappedLineColumnCenter */;
                break;
            case CursorMove.RawDirection.WrappedLineEnd:
                direction = 9 /* Direction.WrappedLineEnd */;
                break;
            case CursorMove.RawDirection.WrappedLineLastNonWhitespaceCharacter:
                direction = 10 /* Direction.WrappedLineLastNonWhitespaceCharacter */;
                break;
            case CursorMove.RawDirection.ViewPortTop:
                direction = 11 /* Direction.ViewPortTop */;
                break;
            case CursorMove.RawDirection.ViewPortBottom:
                direction = 13 /* Direction.ViewPortBottom */;
                break;
            case CursorMove.RawDirection.ViewPortCenter:
                direction = 12 /* Direction.ViewPortCenter */;
                break;
            case CursorMove.RawDirection.ViewPortIfOutside:
                direction = 14 /* Direction.ViewPortIfOutside */;
                break;
            default:
                // illegal arguments
                return null;
        }
        let unit = 0 /* Unit.None */;
        switch (args.by) {
            case CursorMove.RawUnit.Line:
                unit = 1 /* Unit.Line */;
                break;
            case CursorMove.RawUnit.WrappedLine:
                unit = 2 /* Unit.WrappedLine */;
                break;
            case CursorMove.RawUnit.Character:
                unit = 3 /* Unit.Character */;
                break;
            case CursorMove.RawUnit.HalfLine:
                unit = 4 /* Unit.HalfLine */;
                break;
        }
        return {
            direction: direction,
            unit: unit,
            select: (!!args.select),
            value: (args.value || 1)
        };
    }
    CursorMove.parse = parse;
    let Direction;
    (function (Direction) {
        Direction[Direction["Left"] = 0] = "Left";
        Direction[Direction["Right"] = 1] = "Right";
        Direction[Direction["Up"] = 2] = "Up";
        Direction[Direction["Down"] = 3] = "Down";
        Direction[Direction["PrevBlankLine"] = 4] = "PrevBlankLine";
        Direction[Direction["NextBlankLine"] = 5] = "NextBlankLine";
        Direction[Direction["WrappedLineStart"] = 6] = "WrappedLineStart";
        Direction[Direction["WrappedLineFirstNonWhitespaceCharacter"] = 7] = "WrappedLineFirstNonWhitespaceCharacter";
        Direction[Direction["WrappedLineColumnCenter"] = 8] = "WrappedLineColumnCenter";
        Direction[Direction["WrappedLineEnd"] = 9] = "WrappedLineEnd";
        Direction[Direction["WrappedLineLastNonWhitespaceCharacter"] = 10] = "WrappedLineLastNonWhitespaceCharacter";
        Direction[Direction["ViewPortTop"] = 11] = "ViewPortTop";
        Direction[Direction["ViewPortCenter"] = 12] = "ViewPortCenter";
        Direction[Direction["ViewPortBottom"] = 13] = "ViewPortBottom";
        Direction[Direction["ViewPortIfOutside"] = 14] = "ViewPortIfOutside";
    })(Direction = CursorMove.Direction || (CursorMove.Direction = {}));
    let Unit;
    (function (Unit) {
        Unit[Unit["None"] = 0] = "None";
        Unit[Unit["Line"] = 1] = "Line";
        Unit[Unit["WrappedLine"] = 2] = "WrappedLine";
        Unit[Unit["Character"] = 3] = "Character";
        Unit[Unit["HalfLine"] = 4] = "HalfLine";
    })(Unit = CursorMove.Unit || (CursorMove.Unit = {}));
})(CursorMove || (CursorMove = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yTW92ZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3JNb3ZlQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEtBQUssTUFBTSwrQkFBK0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUE4RCxpQkFBaUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ2hJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDM0QsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUd6QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRTVDLE1BQU0sT0FBTyxrQkFBa0I7SUFFdkIsTUFBTSxDQUFDLGFBQWEsQ0FBQyxTQUFxQixFQUFFLE9BQXNCLEVBQUUsY0FBdUI7UUFDakcsTUFBTSxNQUFNLEdBQXlCLEVBQUUsQ0FBQztRQUN4QyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3BELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQixNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxT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