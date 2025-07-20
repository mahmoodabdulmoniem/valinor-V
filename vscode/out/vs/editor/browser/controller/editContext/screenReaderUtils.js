/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/core/range.js';
import * as nls from '../../../../nls.js';
export class SimplePagedScreenReaderStrategy {
    _getPageOfLine(lineNumber, linesPerPage) {
        return Math.floor((lineNumber - 1) / linesPerPage);
    }
    _getRangeForPage(page, linesPerPage) {
        const offset = page * linesPerPage;
        const startLineNumber = offset + 1;
        const endLineNumber = offset + linesPerPage;
        return new Range(startLineNumber, 1, endLineNumber + 1, 1);
    }
    fromEditorSelection(model, selection, linesPerPage, trimLongText) {
        // Chromium handles very poorly text even of a few thousand chars
        // Cut text to avoid stalling the entire UI
        const LIMIT_CHARS = 500;
        const selectionStartPage = this._getPageOfLine(selection.startLineNumber, linesPerPage);
        const selectionStartPageRange = this._getRangeForPage(selectionStartPage, linesPerPage);
        const selectionEndPage = this._getPageOfLine(selection.endLineNumber, linesPerPage);
        const selectionEndPageRange = this._getRangeForPage(selectionEndPage, linesPerPage);
        let pretextRange = selectionStartPageRange.intersectRanges(new Range(1, 1, selection.startLineNumber, selection.startColumn));
        if (trimLongText && model.getValueLengthInRange(pretextRange, 1 /* EndOfLinePreference.LF */) > LIMIT_CHARS) {
            const pretextStart = model.modifyPosition(pretextRange.getEndPosition(), -LIMIT_CHARS);
            pretextRange = Range.fromPositions(pretextStart, pretextRange.getEndPosition());
        }
        const pretext = model.getValueInRange(pretextRange, 1 /* EndOfLinePreference.LF */);
        const lastLine = model.getLineCount();
        const lastLineMaxColumn = model.getLineMaxColumn(lastLine);
        let posttextRange = selectionEndPageRange.intersectRanges(new Range(selection.endLineNumber, selection.endColumn, lastLine, lastLineMaxColumn));
        if (trimLongText && model.getValueLengthInRange(posttextRange, 1 /* EndOfLinePreference.LF */) > LIMIT_CHARS) {
            const posttextEnd = model.modifyPosition(posttextRange.getStartPosition(), LIMIT_CHARS);
            posttextRange = Range.fromPositions(posttextRange.getStartPosition(), posttextEnd);
        }
        const posttext = model.getValueInRange(posttextRange, 1 /* EndOfLinePreference.LF */);
        let text;
        if (selectionStartPage === selectionEndPage || selectionStartPage + 1 === selectionEndPage) {
            // take full selection
            text = model.getValueInRange(selection, 1 /* EndOfLinePreference.LF */);
        }
        else {
            const selectionRange1 = selectionStartPageRange.intersectRanges(selection);
            const selectionRange2 = selectionEndPageRange.intersectRanges(selection);
            text = (model.getValueInRange(selectionRange1, 1 /* EndOfLinePreference.LF */)
                + String.fromCharCode(8230)
                + model.getValueInRange(selectionRange2, 1 /* EndOfLinePreference.LF */));
        }
        if (trimLongText && text.length > 2 * LIMIT_CHARS) {
            text = text.substring(0, LIMIT_CHARS) + String.fromCharCode(8230) + text.substring(text.length - LIMIT_CHARS, text.length);
        }
        return {
            value: pretext + text + posttext,
            selection: selection,
            selectionStart: pretext.length,
            selectionEnd: pretext.length + text.length,
            startPositionWithinEditor: pretextRange.getStartPosition(),
            newlineCountBeforeSelection: pretextRange.endLineNumber - pretextRange.startLineNumber,
        };
    }
}
export function ariaLabelForScreenReaderContent(options, keybindingService) {
    const accessibilitySupport = options.get(2 /* EditorOption.accessibilitySupport */);
    if (accessibilitySupport === 1 /* AccessibilitySupport.Disabled */) {
        const toggleKeybindingLabel = keybindingService.lookupKeybinding('editor.action.toggleScreenReaderAccessibilityMode')?.getAriaLabel();
        const runCommandKeybindingLabel = keybindingService.lookupKeybinding('workbench.action.showCommands')?.getAriaLabel();
        const keybindingEditorKeybindingLabel = keybindingService.lookupKeybinding('workbench.action.openGlobalKeybindings')?.getAriaLabel();
        const editorNotAccessibleMessage = nls.localize('accessibilityModeOff', "The editor is not accessible at this time.");
        if (toggleKeybindingLabel) {
            return nls.localize('accessibilityOffAriaLabel', "{0} To enable screen reader optimized mode, use {1}", editorNotAccessibleMessage, toggleKeybindingLabel);
        }
        else if (runCommandKeybindingLabel) {
            return nls.localize('accessibilityOffAriaLabelNoKb', "{0} To enable screen reader optimized mode, open the quick pick with {1} and run the command Toggle Screen Reader Accessibility Mode, which is currently not triggerable via keyboard.", editorNotAccessibleMessage, runCommandKeybindingLabel);
        }
        else if (keybindingEditorKeybindingLabel) {
            return nls.localize('accessibilityOffAriaLabelNoKbs', "{0} Please assign a keybinding for the command Toggle Screen Reader Accessibility Mode by accessing the keybindings editor with {1} and run it.", editorNotAccessibleMessage, keybindingEditorKeybindingLabel);
        }
        else {
            // SOS
            return editorNotAccessibleMessage;
        }
    }
    return options.get(8 /* EditorOption.ariaLabel */);
}
export function newlinecount(text) {
    let result = 0;
    let startIndex = -1;
    do {
        startIndex = text.indexOf('\n', startIndex + 1);
        if (startIndex === -1) {
            break;
        }
        result++;
    } while (true);
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuUmVhZGVyVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvZWRpdENvbnRleHQvc2NyZWVuUmVhZGVyVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBS3RELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUEwQjFDLE1BQU0sT0FBTywrQkFBK0I7SUFDbkMsY0FBYyxDQUFDLFVBQWtCLEVBQUUsWUFBb0I7UUFDOUQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsWUFBb0I7UUFDMUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLFlBQVksQ0FBQztRQUNuQyxNQUFNLGVBQWUsR0FBRyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sYUFBYSxHQUFHLE1BQU0sR0FBRyxZQUFZLENBQUM7UUFDNUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLGFBQWEsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVNLG1CQUFtQixDQUFDLEtBQW1CLEVBQUUsU0FBZ0IsRUFBRSxZQUFvQixFQUFFLFlBQXFCO1FBQzVHLGlFQUFpRTtRQUNqRSwyQ0FBMkM7UUFDM0MsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDO1FBRXhCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FB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