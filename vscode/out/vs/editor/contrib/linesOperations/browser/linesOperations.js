/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { CoreEditingCommands } from '../../../browser/coreCommands.js';
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import { ReplaceCommand, ReplaceCommandThatPreservesSelection, ReplaceCommandThatSelectsText } from '../../../common/commands/replaceCommand.js';
import { TrimTrailingWhitespaceCommand } from '../../../common/commands/trimTrailingWhitespaceCommand.js';
import { TypeOperations } from '../../../common/cursor/cursorTypeOperations.js';
import { EnterOperation } from '../../../common/cursor/cursorTypeEditOperations.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { CopyLinesCommand } from './copyLinesCommand.js';
import { MoveLinesCommand } from './moveLinesCommand.js';
import { SortLinesCommand } from './sortLinesCommand.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
// copy lines
class AbstractCopyLinesAction extends EditorAction {
    constructor(down, opts) {
        super(opts);
        this.down = down;
    }
    run(_accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const selections = editor.getSelections().map((selection, index) => ({ selection, index, ignore: false }));
        selections.sort((a, b) => Range.compareRangesUsingStarts(a.selection, b.selection));
        // Remove selections that would result in copying the same line
        let prev = selections[0];
        for (let i = 1; i < selections.length; i++) {
            const curr = selections[i];
            if (prev.selection.endLineNumber === curr.selection.startLineNumber) {
                // these two selections would copy the same line
                if (prev.index < curr.index) {
                    // prev wins
                    curr.ignore = true;
                }
                else {
                    // curr wins
                    prev.ignore = true;
                    prev = curr;
                }
            }
        }
        const commands = [];
        for (const selection of selections) {
            commands.push(new CopyLinesCommand(selection.selection, this.down, selection.ignore));
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
class CopyLinesUpAction extends AbstractCopyLinesAction {
    constructor() {
        super(false, {
            id: 'editor.action.copyLinesUpAction',
            label: nls.localize2('lines.copyUp', "Copy Line Up"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '2_line',
                title: nls.localize({ key: 'miCopyLinesUp', comment: ['&& denotes a mnemonic'] }, "&&Copy Line Up"),
                order: 1
            }
        });
    }
}
class CopyLinesDownAction extends AbstractCopyLinesAction {
    constructor() {
        super(true, {
            id: 'editor.action.copyLinesDownAction',
            label: nls.localize2('lines.copyDown', "Copy Line Down"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '2_line',
                title: nls.localize({ key: 'miCopyLinesDown', comment: ['&& denotes a mnemonic'] }, "Co&&py Line Down"),
                order: 2
            }
        });
    }
}
export class DuplicateSelectionAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.duplicateSelection',
            label: nls.localize2('duplicateSelection', "Duplicate Selection"),
            precondition: EditorContextKeys.writable,
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '2_line',
                title: nls.localize({ key: 'miDuplicateSelection', comment: ['&& denotes a mnemonic'] }, "&&Duplicate Selection"),
                order: 5
            }
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const commands = [];
        const selections = editor.getSelections();
        const model = editor.getModel();
        for (const selection of selections) {
            if (selection.isEmpty()) {
                commands.push(new CopyLinesCommand(selection, true));
            }
            else {
                const insertSelection = new Selection(selection.endLineNumber, selection.endColumn, selection.endLineNumber, selection.endColumn);
                commands.push(new ReplaceCommandThatSelectsText(insertSelection, model.getValueInRange(selection)));
            }
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
// move lines
class AbstractMoveLinesAction extends EditorAction {
    constructor(down, opts) {
        super(opts);
        this.down = down;
    }
    run(accessor, editor) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        const commands = [];
        const selections = editor.getSelections() || [];
        const autoIndent = editor.getOption(16 /* EditorOption.autoIndent */);
        for (const selection of selections) {
            commands.push(new MoveLinesCommand(selection, this.down, autoIndent, languageConfigurationService));
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
class MoveLinesUpAction extends AbstractMoveLinesAction {
    constructor() {
        super(false, {
            id: 'editor.action.moveLinesUpAction',
            label: nls.localize2('lines.moveUp', "Move Line Up"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
                linux: { primary: 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '2_line',
                title: nls.localize({ key: 'miMoveLinesUp', comment: ['&& denotes a mnemonic'] }, "Mo&&ve Line Up"),
                order: 3
            }
        });
    }
}
class MoveLinesDownAction extends AbstractMoveLinesAction {
    constructor() {
        super(true, {
            id: 'editor.action.moveLinesDownAction',
            label: nls.localize2('lines.moveDown', "Move Line Down"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
                linux: { primary: 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menuOpts: {
                menuId: MenuId.MenubarSelectionMenu,
                group: '2_line',
                title: nls.localize({ key: 'miMoveLinesDown', comment: ['&& denotes a mnemonic'] }, "Move &&Line Down"),
                order: 4
            }
        });
    }
}
export class AbstractSortLinesAction extends EditorAction {
    constructor(descending, opts) {
        super(opts);
        this.descending = descending;
    }
    run(_accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        let selections = editor.getSelections();
        if (selections.length === 1 && selections[0].isEmpty()) {
            // Apply to whole document.
            selections = [new Selection(1, 1, model.getLineCount(), model.getLineMaxColumn(model.getLineCount()))];
        }
        for (const selection of selections) {
            if (!SortLinesCommand.canRun(editor.getModel(), selection, this.descending)) {
                return;
            }
        }
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            commands[i] = new SortLinesCommand(selections[i], this.descending);
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
export class SortLinesAscendingAction extends AbstractSortLinesAction {
    constructor() {
        super(false, {
            id: 'editor.action.sortLinesAscending',
            label: nls.localize2('lines.sortAscending', "Sort Lines Ascending"),
            precondition: EditorContextKeys.writable
        });
    }
}
export class SortLinesDescendingAction extends AbstractSortLinesAction {
    constructor() {
        super(true, {
            id: 'editor.action.sortLinesDescending',
            label: nls.localize2('lines.sortDescending', "Sort Lines Descending"),
            precondition: EditorContextKeys.writable
        });
    }
}
export class DeleteDuplicateLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.removeDuplicateLines',
            label: nls.localize2('lines.deleteDuplicates', "Delete Duplicate Lines"),
            precondition: EditorContextKeys.writable
        });
    }
    run(_accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        if (model.getLineCount() === 1 && model.getLineMaxColumn(1) === 1) {
            return;
        }
        const edits = [];
        const endCursorState = [];
        let linesDeleted = 0;
        let updateSelection = true;
        let selections = editor.getSelections();
        if (selections.length === 1 && selections[0].isEmpty()) {
            // Apply to whole document.
            selections = [new Selection(1, 1, model.getLineCount(), model.getLineMaxColumn(model.getLineCount()))];
            updateSelection = false;
        }
        for (const selection of selections) {
            const uniqueLines = new Set();
            const lines = [];
            for (let i = selection.startLineNumber; i <= selection.endLineNumber; i++) {
                const line = model.getLineContent(i);
                if (uniqueLines.has(line)) {
                    continue;
                }
                lines.push(line);
                uniqueLines.add(line);
            }
            const selectionToReplace = new Selection(selection.startLineNumber, 1, selection.endLineNumber, model.getLineMaxColumn(selection.endLineNumber));
            const adjustedSelectionStart = selection.startLineNumber - linesDeleted;
            const finalSelection = new Selection(adjustedSelectionStart, 1, adjustedSelectionStart + lines.length - 1, lines[lines.length - 1].length);
            edits.push(EditOperation.replace(selectionToReplace, lines.join('\n')));
            endCursorState.push(finalSelection);
            linesDeleted += (selection.endLineNumber - selection.startLineNumber + 1) - lines.length;
        }
        editor.pushUndoStop();
        editor.executeEdits(this.id, edits, updateSelection ? endCursorState : undefined);
        editor.pushUndoStop();
    }
}
export class ReverseLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.reverseLines',
            label: nls.localize2('lines.reverseLines', "Reverse lines"),
            precondition: EditorContextKeys.writable
        });
    }
    run(_accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        const originalSelections = editor.getSelections();
        let selections = originalSelections;
        if (selections.length === 1 && selections[0].isEmpty()) {
            // Apply to whole document.
            selections = [new Selection(1, 1, model.getLineCount(), model.getLineMaxColumn(model.getLineCount()))];
        }
        const edits = [];
        const resultingSelections = [];
        for (let i = 0; i < selections.length; i++) {
            const selection = selections[i];
            const originalSelection = originalSelections[i];
            let endLineNumber = selection.endLineNumber;
            if (selection.startLineNumber < selection.endLineNumber && selection.endColumn === 1) {
                endLineNumber--;
            }
            let range = new Range(selection.startLineNumber, 1, endLineNumber, model.getLineMaxColumn(endLineNumber));
            // Exclude last line if empty and we're at the end of the document
            if (endLineNumber === model.getLineCount() && model.getLineContent(range.endLineNumber) === '') {
                range = range.setEndPosition(range.endLineNumber - 1, model.getLineMaxColumn(range.endLineNumber - 1));
            }
            const lines = [];
            for (let i = range.endLineNumber; i >= range.startLineNumber; i--) {
                lines.push(model.getLineContent(i));
            }
            const edit = EditOperation.replace(range, lines.join('\n'));
            edits.push(edit);
            const updateLineNumber = function (lineNumber) {
                return lineNumber <= range.endLineNumber ? range.endLineNumber - lineNumber + range.startLineNumber : lineNumber;
            };
            const updateSelection = function (sel) {
                if (sel.isEmpty()) {
                    // keep just the cursor
                    return new Selection(updateLineNumber(sel.positionLineNumber), sel.positionColumn, updateLineNumber(sel.positionLineNumber), sel.positionColumn);
                }
                else {
                    // keep selection - maintain direction by creating backward selection
                    const newSelectionStart = updateLineNumber(sel.selectionStartLineNumber);
                    const newPosition = updateLineNumber(sel.positionLineNumber);
                    const newSelectionStartColumn = sel.selectionStartColumn;
                    const newPositionColumn = sel.positionColumn;
                    // Create selection: from (newSelectionStart, newSelectionStartColumn) to (newPosition, newPositionColumn)
                    // After reversal: from (3, 2) to (1, 3)
                    return new Selection(newSelectionStart, newSelectionStartColumn, newPosition, newPositionColumn);
                }
            };
            resultingSelections.push(updateSelection(originalSelection));
        }
        editor.pushUndoStop();
        editor.executeEdits(this.id, edits, resultingSelections);
        editor.pushUndoStop();
    }
}
export class TrimTrailingWhitespaceAction extends EditorAction {
    static { this.ID = 'editor.action.trimTrailingWhitespace'; }
    constructor() {
        super({
            id: TrimTrailingWhitespaceAction.ID,
            label: nls.localize2('lines.trimTrailingWhitespace', "Trim Trailing Whitespace"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(_accessor, editor, args) {
        let cursors = [];
        if (args.reason === 'auto-save') {
            // See https://github.com/editorconfig/editorconfig-vscode/issues/47
            // It is very convenient for the editor config extension to invoke this action.
            // So, if we get a reason:'auto-save' passed in, let's preserve cursor positions.
            cursors = (editor.getSelections() || []).map(s => new Position(s.positionLineNumber, s.positionColumn));
        }
        const selection = editor.getSelection();
        if (selection === null) {
            return;
        }
        const config = _accessor.get(IConfigurationService);
        const model = editor.getModel();
        const trimInRegexAndStrings = config.getValue('files.trimTrailingWhitespaceInRegexAndStrings', { overrideIdentifier: model?.getLanguageId(), resource: model?.uri });
        const command = new TrimTrailingWhitespaceCommand(selection, cursors, trimInRegexAndStrings);
        editor.pushUndoStop();
        editor.executeCommands(this.id, [command]);
        editor.pushUndoStop();
    }
}
export class DeleteLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.deleteLines',
            label: nls.localize2('lines.delete', "Delete Line"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 41 /* KeyCode.KeyK */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(_accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const ops = this._getLinesToRemove(editor);
        const model = editor.getModel();
        if (model.getLineCount() === 1 && model.getLineMaxColumn(1) === 1) {
            // Model is empty
            return;
        }
        let linesDeleted = 0;
        const edits = [];
        const cursorState = [];
        for (let i = 0, len = ops.length; i < len; i++) {
            const op = ops[i];
            let startLineNumber = op.startLineNumber;
            let endLineNumber = op.endLineNumber;
            let startColumn = 1;
            let endColumn = model.getLineMaxColumn(endLineNumber);
            if (endLineNumber < model.getLineCount()) {
                endLineNumber += 1;
                endColumn = 1;
            }
            else if (startLineNumber > 1) {
                startLineNumber -= 1;
                startColumn = model.getLineMaxColumn(startLineNumber);
            }
            edits.push(EditOperation.replace(new Selection(startLineNumber, startColumn, endLineNumber, endColumn), ''));
            cursorState.push(new Selection(startLineNumber - linesDeleted, op.positionColumn, startLineNumber - linesDeleted, op.positionColumn));
            linesDeleted += (op.endLineNumber - op.startLineNumber + 1);
        }
        editor.pushUndoStop();
        editor.executeEdits(this.id, edits, cursorState);
        editor.pushUndoStop();
    }
    _getLinesToRemove(editor) {
        // Construct delete operations
        const operations = editor.getSelections().map((s) => {
            let endLineNumber = s.endLineNumber;
            if (s.startLineNumber < s.endLineNumber && s.endColumn === 1) {
                endLineNumber -= 1;
            }
            return {
                startLineNumber: s.startLineNumber,
                selectionStartColumn: s.selectionStartColumn,
                endLineNumber: endLineNumber,
                positionColumn: s.positionColumn
            };
        });
        // Sort delete operations
        operations.sort((a, b) => {
            if (a.startLineNumber === b.startLineNumber) {
                return a.endLineNumber - b.endLineNumber;
            }
            return a.startLineNumber - b.startLineNumber;
        });
        // Merge delete operations which are adjacent or overlapping
        const mergedOperations = [];
        let previousOperation = operations[0];
        for (let i = 1; i < operations.length; i++) {
            if (previousOperation.endLineNumber + 1 >= operations[i].startLineNumber) {
                // Merge current operations into the previous one
                previousOperation.endLineNumber = operations[i].endLineNumber;
            }
            else {
                // Push previous operation
                mergedOperations.push(previousOperation);
                previousOperation = operations[i];
            }
        }
        // Push the last operation
        mergedOperations.push(previousOperation);
        return mergedOperations;
    }
}
export class IndentLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.indentLines',
            label: nls.localize2('lines.indent', "Indent Line"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 94 /* KeyCode.BracketRight */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(_accessor, editor) {
        const viewModel = editor._getViewModel();
        if (!viewModel) {
            return;
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, TypeOperations.indent(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
        editor.pushUndoStop();
    }
}
class OutdentLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.outdentLines',
            label: nls.localize2('lines.outdent', "Outdent Line"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 92 /* KeyCode.BracketLeft */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(_accessor, editor) {
        CoreEditingCommands.Outdent.runEditorCommand(_accessor, editor, null);
    }
}
export class InsertLineBeforeAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.insertLineBefore',
            label: nls.localize2('lines.insertBefore', "Insert Line Above"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(_accessor, editor) {
        const viewModel = editor._getViewModel();
        if (!viewModel) {
            return;
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, EnterOperation.lineInsertBefore(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
    }
}
export class InsertLineAfterAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.insertLineAfter',
            label: nls.localize2('lines.insertAfter', "Insert Line Below"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(_accessor, editor) {
        const viewModel = editor._getViewModel();
        if (!viewModel) {
            return;
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, EnterOperation.lineInsertAfter(viewModel.cursorConfig, editor.getModel(), editor.getSelections()));
    }
}
export class AbstractDeleteAllToBoundaryAction extends EditorAction {
    run(_accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const primaryCursor = editor.getSelection();
        const rangesToDelete = this._getRangesToDelete(editor);
        // merge overlapping selections
        const effectiveRanges = [];
        for (let i = 0, count = rangesToDelete.length - 1; i < count; i++) {
            const range = rangesToDelete[i];
            const nextRange = rangesToDelete[i + 1];
            if (Range.intersectRanges(range, nextRange) === null) {
                effectiveRanges.push(range);
            }
            else {
                rangesToDelete[i + 1] = Range.plusRange(range, nextRange);
            }
        }
        effectiveRanges.push(rangesToDelete[rangesToDelete.length - 1]);
        const endCursorState = this._getEndCursorState(primaryCursor, effectiveRanges);
        const edits = effectiveRanges.map(range => {
            return EditOperation.replace(range, '');
        });
        editor.pushUndoStop();
        editor.executeEdits(this.id, edits, endCursorState);
        editor.pushUndoStop();
    }
}
export class DeleteAllLeftAction extends AbstractDeleteAllToBoundaryAction {
    constructor() {
        super({
            id: 'deleteAllLeft',
            label: nls.localize2('lines.deleteAllLeft', "Delete All Left"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    _getEndCursorState(primaryCursor, rangesToDelete) {
        let endPrimaryCursor = null;
        const endCursorState = [];
        let deletedLines = 0;
        rangesToDelete.forEach(range => {
            let endCursor;
            if (range.endColumn === 1 && deletedLines > 0) {
                const newStartLine = range.startLineNumber - deletedLines;
                endCursor = new Selection(newStartLine, range.startColumn, newStartLine, range.startColumn);
            }
            else {
                endCursor = new Selection(range.startLineNumber, range.startColumn, range.startLineNumber, range.startColumn);
            }
            deletedLines += range.endLineNumber - range.startLineNumber;
            if (range.intersectRanges(primaryCursor)) {
                endPrimaryCursor = endCursor;
            }
            else {
                endCursorState.push(endCursor);
            }
        });
        if (endPrimaryCursor) {
            endCursorState.unshift(endPrimaryCursor);
        }
        return endCursorState;
    }
    _getRangesToDelete(editor) {
        const selections = editor.getSelections();
        if (selections === null) {
            return [];
        }
        let rangesToDelete = selections;
        const model = editor.getModel();
        if (model === null) {
            return [];
        }
        rangesToDelete.sort(Range.compareRangesUsingStarts);
        rangesToDelete = rangesToDelete.map(selection => {
            if (selection.isEmpty()) {
                if (selection.startColumn === 1) {
                    const deleteFromLine = Math.max(1, selection.startLineNumber - 1);
                    const deleteFromColumn = selection.startLineNumber === 1 ? 1 : model.getLineLength(deleteFromLine) + 1;
                    return new Range(deleteFromLine, deleteFromColumn, selection.startLineNumber, 1);
                }
                else {
                    return new Range(selection.startLineNumber, 1, selection.startLineNumber, selection.startColumn);
                }
            }
            else {
                return new Range(selection.startLineNumber, 1, selection.endLineNumber, selection.endColumn);
            }
        });
        return rangesToDelete;
    }
}
export class DeleteAllRightAction extends AbstractDeleteAllToBoundaryAction {
    constructor() {
        super({
            id: 'deleteAllRight',
            label: nls.localize2('lines.deleteAllRight', "Delete All Right"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 41 /* KeyCode.KeyK */, secondary: [2048 /* KeyMod.CtrlCmd */ | 20 /* KeyCode.Delete */] },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    _getEndCursorState(primaryCursor, rangesToDelete) {
        let endPrimaryCursor = null;
        const endCursorState = [];
        for (let i = 0, len = rangesToDelete.length, offset = 0; i < len; i++) {
            const range = rangesToDelete[i];
            const endCursor = new Selection(range.startLineNumber - offset, range.startColumn, range.startLineNumber - offset, range.startColumn);
            if (range.intersectRanges(primaryCursor)) {
                endPrimaryCursor = endCursor;
            }
            else {
                endCursorState.push(endCursor);
            }
        }
        if (endPrimaryCursor) {
            endCursorState.unshift(endPrimaryCursor);
        }
        return endCursorState;
    }
    _getRangesToDelete(editor) {
        const model = editor.getModel();
        if (model === null) {
            return [];
        }
        const selections = editor.getSelections();
        if (selections === null) {
            return [];
        }
        const rangesToDelete = selections.map((sel) => {
            if (sel.isEmpty()) {
                const maxColumn = model.getLineMaxColumn(sel.startLineNumber);
                if (sel.startColumn === maxColumn) {
                    return new Range(sel.startLineNumber, sel.startColumn, sel.startLineNumber + 1, 1);
                }
                else {
                    return new Range(sel.startLineNumber, sel.startColumn, sel.startLineNumber, maxColumn);
                }
            }
            return sel;
        });
        rangesToDelete.sort(Range.compareRangesUsingStarts);
        return rangesToDelete;
    }
}
export class JoinLinesAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.joinLines',
            label: nls.localize2('lines.joinLines', "Join Lines"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 40 /* KeyCode.KeyJ */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(_accessor, editor) {
        const selections = editor.getSelections();
        if (selections === null) {
            return;
        }
        let primaryCursor = editor.getSelection();
        if (primaryCursor === null) {
            return;
        }
        selections.sort(Range.compareRangesUsingStarts);
        const reducedSelections = [];
        const lastSelection = selections.reduce((previousValue, currentValue) => {
            if (previousValue.isEmpty()) {
                if (previousValue.endLineNumber === currentValue.startLineNumber) {
                    if (primaryCursor.equalsSelection(previousValue)) {
                        primaryCursor = currentValue;
                    }
                    return currentValue;
                }
                if (currentValue.startLineNumber > previousValue.endLineNumber + 1) {
                    reducedSelections.push(previousValue);
                    return currentValue;
                }
                else {
                    return new Selection(previousValue.startLineNumber, previousValue.startColumn, currentValue.endLineNumber, currentValue.endColumn);
                }
            }
            else {
                if (currentValue.startLineNumber > previousValue.endLineNumber) {
                    reducedSelections.push(previousValue);
                    return currentValue;
                }
                else {
                    return new Selection(previousValue.startLineNumber, previousValue.startColumn, currentValue.endLineNumber, currentValue.endColumn);
                }
            }
        });
        reducedSelections.push(lastSelection);
        const model = editor.getModel();
        if (model === null) {
            return;
        }
        const edits = [];
        const endCursorState = [];
        let endPrimaryCursor = primaryCursor;
        let lineOffset = 0;
        for (let i = 0, len = reducedSelections.length; i < len; i++) {
            const selection = reducedSelections[i];
            const startLineNumber = selection.startLineNumber;
            const startColumn = 1;
            let columnDeltaOffset = 0;
            let endLineNumber, endColumn;
            const selectionEndPositionOffset = model.getLineLength(selection.endLineNumber) - selection.endColumn;
            if (selection.isEmpty() || selection.startLineNumber === selection.endLineNumber) {
                const position = selection.getStartPosition();
                if (position.lineNumber < model.getLineCount()) {
                    endLineNumber = startLineNumber + 1;
                    endColumn = model.getLineMaxColumn(endLineNumber);
                }
                else {
                    endLineNumber = position.lineNumber;
                    endColumn = model.getLineMaxColumn(position.lineNumber);
                }
            }
            else {
                endLineNumber = selection.endLineNumber;
                endColumn = model.getLineMaxColumn(endLineNumber);
            }
            let trimmedLinesContent = model.getLineContent(startLineNumber);
            for (let i = startLineNumber + 1; i <= endLineNumber; i++) {
                const lineText = model.getLineContent(i);
                const firstNonWhitespaceIdx = model.getLineFirstNonWhitespaceColumn(i);
                if (firstNonWhitespaceIdx >= 1) {
                    let insertSpace = true;
                    if (trimmedLinesContent === '') {
                        insertSpace = false;
                    }
                    if (insertSpace && (trimmedLinesContent.charAt(trimmedLinesContent.length - 1) === ' ' ||
                        trimmedLinesContent.charAt(trimmedLinesContent.length - 1) === '\t')) {
                        insertSpace = false;
                        trimmedLinesContent = trimmedLinesContent.replace(/[\s\uFEFF\xA0]+$/g, ' ');
                    }
                    const lineTextWithoutIndent = lineText.substr(firstNonWhitespaceIdx - 1);
                    trimmedLinesContent += (insertSpace ? ' ' : '') + lineTextWithoutIndent;
                    if (insertSpace) {
                        columnDeltaOffset = lineTextWithoutIndent.length + 1;
                    }
                    else {
                        columnDeltaOffset = lineTextWithoutIndent.length;
                    }
                }
                else {
                    columnDeltaOffset = 0;
                }
            }
            const deleteSelection = new Range(startLineNumber, startColumn, endLineNumber, endColumn);
            if (!deleteSelection.isEmpty()) {
                let resultSelection;
                if (selection.isEmpty()) {
                    edits.push(EditOperation.replace(deleteSelection, trimmedLinesContent));
                    resultSelection = new Selection(deleteSelection.startLineNumber - lineOffset, trimmedLinesContent.length - columnDeltaOffset + 1, startLineNumber - lineOffset, trimmedLinesContent.length - columnDeltaOffset + 1);
                }
                else {
                    if (selection.startLineNumber === selection.endLineNumber) {
                        edits.push(EditOperation.replace(deleteSelection, trimmedLinesContent));
                        resultSelection = new Selection(selection.startLineNumber - lineOffset, selection.startColumn, selection.endLineNumber - lineOffset, selection.endColumn);
                    }
                    else {
                        edits.push(EditOperation.replace(deleteSelection, trimmedLinesContent));
                        resultSelection = new Selection(selection.startLineNumber - lineOffset, selection.startColumn, selection.startLineNumber - lineOffset, trimmedLinesContent.length - selectionEndPositionOffset);
                    }
                }
                if (Range.intersectRanges(deleteSelection, primaryCursor) !== null) {
                    endPrimaryCursor = resultSelection;
                }
                else {
                    endCursorState.push(resultSelection);
                }
            }
            lineOffset += deleteSelection.endLineNumber - deleteSelection.startLineNumber;
        }
        endCursorState.unshift(endPrimaryCursor);
        editor.pushUndoStop();
        editor.executeEdits(this.id, edits, endCursorState);
        editor.pushUndoStop();
    }
}
export class TransposeAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.transpose',
            label: nls.localize2('editor.transpose', "Transpose Characters around the Cursor"),
            precondition: EditorContextKeys.writable
        });
    }
    run(_accessor, editor) {
        const selections = editor.getSelections();
        if (selections === null) {
            return;
        }
        const model = editor.getModel();
        if (model === null) {
            return;
        }
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            if (!selection.isEmpty()) {
                continue;
            }
            const cursor = selection.getStartPosition();
            const maxColumn = model.getLineMaxColumn(cursor.lineNumber);
            if (cursor.column >= maxColumn) {
                if (cursor.lineNumber === model.getLineCount()) {
                    continue;
                }
                // The cursor is at the end of current line and current line is not empty
                // then we transpose the character before the cursor and the line break if there is any following line.
                const deleteSelection = new Range(cursor.lineNumber, Math.max(1, cursor.column - 1), cursor.lineNumber + 1, 1);
                const chars = model.getValueInRange(deleteSelection).split('').reverse().join('');
                commands.push(new ReplaceCommand(new Selection(cursor.lineNumber, Math.max(1, cursor.column - 1), cursor.lineNumber + 1, 1), chars));
            }
            else {
                const deleteSelection = new Range(cursor.lineNumber, Math.max(1, cursor.column - 1), cursor.lineNumber, cursor.column + 1);
                const chars = model.getValueInRange(deleteSelection).split('').reverse().join('');
                commands.push(new ReplaceCommandThatPreservesSelection(deleteSelection, chars, new Selection(cursor.lineNumber, cursor.column + 1, cursor.lineNumber, cursor.column + 1)));
            }
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
export class AbstractCaseAction extends EditorAction {
    run(_accessor, editor) {
        const selections = editor.getSelections();
        if (selections === null) {
            return;
        }
        const model = editor.getModel();
        if (model === null) {
            return;
        }
        const wordSeparators = editor.getOption(147 /* EditorOption.wordSeparators */);
        const textEdits = [];
        for (const selection of selections) {
            if (selection.isEmpty()) {
                const cursor = selection.getStartPosition();
                const word = editor.getConfiguredWordAtPosition(cursor);
                if (!word) {
                    continue;
                }
                const wordRange = new Range(cursor.lineNumber, word.startColumn, cursor.lineNumber, word.endColumn);
                const text = model.getValueInRange(wordRange);
                textEdits.push(EditOperation.replace(wordRange, this._modifyText(text, wordSeparators)));
            }
            else {
                const text = model.getValueInRange(selection);
                textEdits.push(EditOperation.replace(selection, this._modifyText(text, wordSeparators)));
            }
        }
        editor.pushUndoStop();
        editor.executeEdits(this.id, textEdits);
        editor.pushUndoStop();
    }
}
export class UpperCaseAction extends AbstractCaseAction {
    constructor() {
        super({
            id: 'editor.action.transformToUppercase',
            label: nls.localize2('editor.transformToUppercase', "Transform to Uppercase"),
            precondition: EditorContextKeys.writable
        });
    }
    _modifyText(text, wordSeparators) {
        return text.toLocaleUpperCase();
    }
}
export class LowerCaseAction extends AbstractCaseAction {
    constructor() {
        super({
            id: 'editor.action.transformToLowercase',
            label: nls.localize2('editor.transformToLowercase', "Transform to Lowercase"),
            precondition: EditorContextKeys.writable
        });
    }
    _modifyText(text, wordSeparators) {
        return text.toLocaleLowerCase();
    }
}
class BackwardsCompatibleRegExp {
    constructor(_pattern, _flags) {
        this._pattern = _pattern;
        this._flags = _flags;
        this._actual = null;
        this._evaluated = false;
    }
    get() {
        if (!this._evaluated) {
            this._evaluated = true;
            try {
                this._actual = new RegExp(this._pattern, this._flags);
            }
            catch (err) {
                // this browser does not support this regular expression
            }
        }
        return this._actual;
    }
    isSupported() {
        return (this.get() !== null);
    }
}
export class TitleCaseAction extends AbstractCaseAction {
    static { this.titleBoundary = new BackwardsCompatibleRegExp('(^|[^\\p{L}\\p{N}\']|((^|\\P{L})\'))\\p{L}', 'gmu'); }
    constructor() {
        super({
            id: 'editor.action.transformToTitlecase',
            label: nls.localize2('editor.transformToTitlecase', "Transform to Title Case"),
            precondition: EditorContextKeys.writable
        });
    }
    _modifyText(text, wordSeparators) {
        const titleBoundary = TitleCaseAction.titleBoundary.get();
        if (!titleBoundary) {
            // cannot support this
            return text;
        }
        return text
            .toLocaleLowerCase()
            .replace(titleBoundary, (b) => b.toLocaleUpperCase());
    }
}
export class SnakeCaseAction extends AbstractCaseAction {
    static { this.caseBoundary = new BackwardsCompatibleRegExp('(\\p{Ll})(\\p{Lu})', 'gmu'); }
    static { this.singleLetters = new BackwardsCompatibleRegExp('(\\p{Lu}|\\p{N})(\\p{Lu})(\\p{Ll})', 'gmu'); }
    constructor() {
        super({
            id: 'editor.action.transformToSnakecase',
            label: nls.localize2('editor.transformToSnakecase', "Transform to Snake Case"),
            precondition: EditorContextKeys.writable
        });
    }
    _modifyText(text, wordSeparators) {
        const caseBoundary = SnakeCaseAction.caseBoundary.get();
        const singleLetters = SnakeCaseAction.singleLetters.get();
        if (!caseBoundary || !singleLetters) {
            // cannot support this
            return text;
        }
        return (text
            .replace(caseBoundary, '$1_$2')
            .replace(singleLetters, '$1_$2$3')
            .toLocaleLowerCase());
    }
}
export class CamelCaseAction extends AbstractCaseAction {
    static { this.wordBoundary = new BackwardsCompatibleRegExp('[_\\s-]', 'gm'); }
    static { this.validWordStart = new BackwardsCompatibleRegExp('^(\\p{Lu}[^\\p{Lu}])', 'gmu'); }
    constructor() {
        super({
            id: 'editor.action.transformToCamelcase',
            label: nls.localize2('editor.transformToCamelcase', "Transform to Camel Case"),
            precondition: EditorContextKeys.writable
        });
    }
    _modifyText(text, wordSeparators) {
        const wordBoundary = CamelCaseAction.wordBoundary.get();
        const validWordStart = CamelCaseAction.validWordStart.get();
        if (!wordBoundary || !validWordStart) {
            // cannot support this
            return text;
        }
        const words = text.split(wordBoundary);
        const firstWord = words.shift()?.replace(validWordStart, (start) => start.toLocaleLowerCase());
        return firstWord + words.map((word) => word.substring(0, 1).toLocaleUpperCase() + word.substring(1))
            .join('');
    }
}
export class PascalCaseAction extends AbstractCaseAction {
    static { this.wordBoundary = new BackwardsCompatibleRegExp('[_\\s-]', 'gm'); }
    static { this.wordBoundaryToMaintain = new BackwardsCompatibleRegExp('(?<=\\.)', 'gm'); }
    constructor() {
        super({
            id: 'editor.action.transformToPascalcase',
            label: nls.localize2('editor.transformToPascalcase', "Transform to Pascal Case"),
            precondition: EditorContextKeys.writable
        });
    }
    _modifyText(text, wordSeparators) {
        const wordBoundary = PascalCaseAction.wordBoundary.get();
        const wordBoundaryToMaintain = PascalCaseAction.wordBoundaryToMaintain.get();
        if (!wordBoundary || !wordBoundaryToMaintain) {
            // cannot support this
            return text;
        }
        const wordsWithMaintainBoundaries = text.split(wordBoundaryToMaintain);
        const words = wordsWithMaintainBoundaries.map((word) => word.split(wordBoundary)).flat();
        return words.map((word) => word.substring(0, 1).toLocaleUpperCase() + word.substring(1))
            .join('');
    }
}
export class KebabCaseAction extends AbstractCaseAction {
    static isSupported() {
        const areAllRegexpsSupported = [
            this.caseBoundary,
            this.singleLetters,
            this.underscoreBoundary,
        ].every((regexp) => regexp.isSupported());
        return areAllRegexpsSupported;
    }
    static { this.caseBoundary = new BackwardsCompatibleRegExp('(\\p{Ll})(\\p{Lu})', 'gmu'); }
    static { this.singleLetters = new BackwardsCompatibleRegExp('(\\p{Lu}|\\p{N})(\\p{Lu}\\p{Ll})', 'gmu'); }
    static { this.underscoreBoundary = new BackwardsCompatibleRegExp('(\\S)(_)(\\S)', 'gm'); }
    constructor() {
        super({
            id: 'editor.action.transformToKebabcase',
            label: nls.localize2('editor.transformToKebabcase', 'Transform to Kebab Case'),
            precondition: EditorContextKeys.writable
        });
    }
    _modifyText(text, _) {
        const caseBoundary = KebabCaseAction.caseBoundary.get();
        const singleLetters = KebabCaseAction.singleLetters.get();
        const underscoreBoundary = KebabCaseAction.underscoreBoundary.get();
        if (!caseBoundary || !singleLetters || !underscoreBoundary) {
            // one or more regexps aren't supported
            return text;
        }
        return text
            .replace(underscoreBoundary, '$1-$3')
            .replace(caseBoundary, '$1-$2')
            .replace(singleLetters, '$1-$2')
            .toLocaleLowerCase();
    }
}
registerEditorAction(CopyLinesUpAction);
registerEditorAction(CopyLinesDownAction);
registerEditorAction(DuplicateSelectionAction);
registerEditorAction(MoveLinesUpAction);
registerEditorAction(MoveLinesDownAction);
registerEditorAction(SortLinesAscendingAction);
registerEditorAction(SortLinesDescendingAction);
registerEditorAction(DeleteDuplicateLinesAction);
registerEditorAction(TrimTrailingWhitespaceAction);
registerEditorAction(DeleteLinesAction);
registerEditorAction(IndentLinesAction);
registerEditorAction(OutdentLinesAction);
registerEditorAction(InsertLineBeforeAction);
registerEditorAction(InsertLineAfterAction);
registerEditorAction(DeleteAllLeftAction);
registerEditorAction(DeleteAllRightAction);
registerEditorAction(JoinLinesAction);
registerEditorAction(TransposeAction);
registerEditorAction(UpperCaseAction);
registerEditorAction(LowerCaseAction);
registerEditorAction(ReverseLinesAction);
if (SnakeCaseAction.caseBoundary.isSupported() && SnakeCaseAction.singleLetters.isSupported()) {
    registerEditorAction(SnakeCaseAction);
}
if (CamelCaseAction.wordBoundary.isSupported()) {
    registerEditorAction(CamelCaseAction);
}
if (PascalCaseAction.wordBoundary.isSupported()) {
    registerEditorAction(PascalCaseAction);
}
if (TitleCaseAction.titleBoundary.isSupported()) {
    registerEditorAction(TitleCaseAction);
}
if (KebabCaseAction.isSupported()) {
    registerEditorAction(KebabCaseAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNPcGVyYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9saW5lc09wZXJhdGlvbnMvYnJvd3Nlci9saW5lc09wZXJhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsWUFBWSxFQUFrQixvQkFBb0IsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1SCxPQUFPLEVBQUUsY0FBYyxFQUFFLG9DQUFvQyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakosT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFFMUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLHVDQUF1QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxn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