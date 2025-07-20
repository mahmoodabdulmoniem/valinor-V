/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { ReplaceCommand } from '../commands/replaceCommand.js';
import { EditOperationResult, isQuote } from '../cursorCommon.js';
import { CursorColumns } from '../core/cursorColumns.js';
import { MoveOperations } from './cursorMoveOperations.js';
import { Range } from '../core/range.js';
import { Position } from '../core/position.js';
export class DeleteOperations {
    static deleteRight(prevEditOperationType, config, model, selections) {
        const commands = [];
        let shouldPushStackElementBefore = (prevEditOperationType !== 3 /* EditOperationType.DeletingRight */);
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            const deleteSelection = this.getDeleteRightRange(selection, model, config);
            if (deleteSelection.isEmpty()) {
                // Probably at end of file => ignore
                commands[i] = null;
                continue;
            }
            if (deleteSelection.startLineNumber !== deleteSelection.endLineNumber) {
                shouldPushStackElementBefore = true;
            }
            commands[i] = new ReplaceCommand(deleteSelection, '');
        }
        return [shouldPushStackElementBefore, commands];
    }
    static getDeleteRightRange(selection, model, config) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const position = selection.getPosition();
        const rightOfPosition = MoveOperations.right(config, model, position);
        if (config.trimWhitespaceOnDelete && rightOfPosition.lineNumber !== position.lineNumber) {
            // Smart line join (deleting leading whitespace) is on
            // (and) Delete is happening at the end of a line
            const currentLineHasContent = (model.getLineFirstNonWhitespaceColumn(position.lineNumber) > 0);
            const firstNonWhitespaceColumn = model.getLineFirstNonWhitespaceColumn(rightOfPosition.lineNumber);
            if (currentLineHasContent && firstNonWhitespaceColumn > 0) {
                // The next line has content
                return new Range(rightOfPosition.lineNumber, firstNonWhitespaceColumn, position.lineNumber, position.column);
            }
        }
        return new Range(rightOfPosition.lineNumber, rightOfPosition.column, position.lineNumber, position.column);
    }
    static isAutoClosingPairDelete(autoClosingDelete, autoClosingBrackets, autoClosingQuotes, autoClosingPairsOpen, model, selections, autoClosedCharacters) {
        if (autoClosingBrackets === 'never' && autoClosingQuotes === 'never') {
            return false;
        }
        if (autoClosingDelete === 'never') {
            return false;
        }
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            const position = selection.getPosition();
            if (!selection.isEmpty()) {
                return false;
            }
            const lineText = model.getLineContent(position.lineNumber);
            if (position.column < 2 || position.column >= lineText.length + 1) {
                return false;
            }
            const character = lineText.charAt(position.column - 2);
            const autoClosingPairCandidates = autoClosingPairsOpen.get(character);
            if (!autoClosingPairCandidates) {
                return false;
            }
            if (isQuote(character)) {
                if (autoClosingQuotes === 'never') {
                    return false;
                }
            }
            else {
                if (autoClosingBrackets === 'never') {
                    return false;
                }
            }
            const afterCharacter = lineText.charAt(position.column - 1);
            let foundAutoClosingPair = false;
            for (const autoClosingPairCandidate of autoClosingPairCandidates) {
                if (autoClosingPairCandidate.open === character && autoClosingPairCandidate.close === afterCharacter) {
                    foundAutoClosingPair = true;
                }
            }
            if (!foundAutoClosingPair) {
                return false;
            }
            // Must delete the pair only if it was automatically inserted by the editor
            if (autoClosingDelete === 'auto') {
                let found = false;
                for (let j = 0, lenJ = autoClosedCharacters.length; j < lenJ; j++) {
                    const autoClosedCharacter = autoClosedCharacters[j];
                    if (position.lineNumber === autoClosedCharacter.startLineNumber && position.column === autoClosedCharacter.startColumn) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return false;
                }
            }
        }
        return true;
    }
    static _runAutoClosingPairDelete(config, model, selections) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const position = selections[i].getPosition();
            const deleteSelection = new Range(position.lineNumber, position.column - 1, position.lineNumber, position.column + 1);
            commands[i] = new ReplaceCommand(deleteSelection, '');
        }
        return [true, commands];
    }
    static deleteLeft(prevEditOperationType, config, model, selections, autoClosedCharacters) {
        if (this.isAutoClosingPairDelete(config.autoClosingDelete, config.autoClosingBrackets, config.autoClosingQuotes, config.autoClosingPairs.autoClosingPairsOpenByEnd, model, selections, autoClosedCharacters)) {
            return this._runAutoClosingPairDelete(config, model, selections);
        }
        const commands = [];
        let shouldPushStackElementBefore = (prevEditOperationType !== 2 /* EditOperationType.DeletingLeft */);
        for (let i = 0, len = selections.length; i < len; i++) {
            const deleteRange = DeleteOperations.getDeleteLeftRange(selections[i], model, config);
            // Ignore empty delete ranges, as they have no effect
            // They happen if the cursor is at the beginning of the file.
            if (deleteRange.isEmpty()) {
                commands[i] = null;
                continue;
            }
            if (deleteRange.startLineNumber !== deleteRange.endLineNumber) {
                shouldPushStackElementBefore = true;
            }
            commands[i] = new ReplaceCommand(deleteRange, '');
        }
        return [shouldPushStackElementBefore, commands];
    }
    static getDeleteLeftRange(selection, model, config) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const position = selection.getPosition();
        // Unintend when using tab stops and cursor is within indentation
        if (config.useTabStops && position.column > 1) {
            const lineContent = model.getLineContent(position.lineNumber);
            const firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
            const lastIndentationColumn = (firstNonWhitespaceIndex === -1
                ? /* entire string is whitespace */ lineContent.length + 1
                : firstNonWhitespaceIndex + 1);
            if (position.column <= lastIndentationColumn) {
                const fromVisibleColumn = config.visibleColumnFromColumn(model, position);
                const toVisibleColumn = CursorColumns.prevIndentTabStop(fromVisibleColumn, config.indentSize);
                const toColumn = config.columnFromVisibleColumn(model, position.lineNumber, toVisibleColumn);
                return new Range(position.lineNumber, toColumn, position.lineNumber, position.column);
            }
        }
        return Range.fromPositions(DeleteOperations.getPositionAfterDeleteLeft(position, model), position);
    }
    static getPositionAfterDeleteLeft(position, model) {
        if (position.column > 1) {
            // Convert 1-based columns to 0-based offsets and back.
            const idx = strings.getLeftDeleteOffset(position.column - 1, model.getLineContent(position.lineNumber));
            return position.with(undefined, idx + 1);
        }
        else if (position.lineNumber > 1) {
            const newLine = position.lineNumber - 1;
            return new Position(newLine, model.getLineMaxColumn(newLine));
        }
        else {
            return position;
        }
    }
    static cut(config, model, selections) {
        const commands = [];
        let lastCutRange = null;
        selections.sort((a, b) => Position.compare(a.getStartPosition(), b.getEndPosition()));
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            if (selection.isEmpty()) {
                if (config.emptySelectionClipboard) {
                    // This is a full line cut
                    const position = selection.getPosition();
                    let startLineNumber, startColumn, endLineNumber, endColumn;
                    if (position.lineNumber < model.getLineCount()) {
                        // Cutting a line in the middle of the model
                        startLineNumber = position.lineNumber;
                        startColumn = 1;
                        endLineNumber = position.lineNumber + 1;
                        endColumn = 1;
                    }
                    else if (position.lineNumber > 1 && lastCutRange?.endLineNumber !== position.lineNumber) {
                        // Cutting the last line & there are more than 1 lines in the model & a previous cut operation does not touch the current cut operation
                        startLineNumber = position.lineNumber - 1;
                        startColumn = model.getLineMaxColumn(position.lineNumber - 1);
                        endLineNumber = position.lineNumber;
                        endColumn = model.getLineMaxColumn(position.lineNumber);
                    }
                    else {
                        // Cutting the single line that the model contains
                        startLineNumber = position.lineNumber;
                        startColumn = 1;
                        endLineNumber = position.lineNumber;
                        endColumn = model.getLineMaxColumn(position.lineNumber);
                    }
                    const deleteSelection = new Range(startLineNumber, startColumn, endLineNumber, endColumn);
                    lastCutRange = deleteSelection;
                    if (!deleteSelection.isEmpty()) {
                        commands[i] = new ReplaceCommand(deleteSelection, '');
                    }
                    else {
                        commands[i] = null;
                    }
                }
                else {
                    // Cannot cut empty selection
                    commands[i] = null;
                }
            }
            else {
                commands[i] = new ReplaceCommand(selection, '');
            }
        }
        return new EditOperationResult(0 /* EditOperationType.Other */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: true
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yRGVsZXRlT3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3IvY3Vyc29yRGVsZXRlT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRCxPQUFPLEVBQXVCLG1CQUFtQixFQUF5QyxPQUFPLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDekQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUl6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFL0MsTUFBTSxPQUFPLGdCQUFnQjtJQUVyQixNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUF3QyxFQUFFLE1BQTJCLEVBQUUsS0FBeUIsRUFBRSxVQUF1QjtRQUNsSixNQUFNLFFBQVEsR0FBMkIsRUFBRSxDQUFDO1FBQzVDLElBQUksNEJBQTRCLEdBQUcsQ0FBQyxxQkFBcUIsNENBQW9DLENBQUMsQ0FBQztRQUMvRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkQsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRWhDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxtQkFBbUIs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