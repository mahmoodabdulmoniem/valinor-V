/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NOTEBOOK_EDITOR_ID, NOTEBOOK_DIFF_EDITOR_ID } from '../common/notebookCommon.js';
import { isCompositeNotebookEditorInput } from '../common/notebookEditorInput.js';
import { cellRangesToIndexes, reduceCellRanges } from '../common/notebookRange.js';
//#region Shared commands
export const EXPAND_CELL_INPUT_COMMAND_ID = 'notebook.cell.expandCellInput';
export const EXECUTE_CELL_COMMAND_ID = 'notebook.cell.execute';
export const DETECT_CELL_LANGUAGE = 'notebook.cell.detectLanguage';
export const CHANGE_CELL_LANGUAGE = 'notebook.cell.changeLanguage';
export const QUIT_EDIT_CELL_COMMAND_ID = 'notebook.cell.quitEdit';
export const EXPAND_CELL_OUTPUT_COMMAND_ID = 'notebook.cell.expandCellOutput';
//#endregion
//#region Notebook extensions
// Hardcoding viewType/extension ID for now. TODO these should be replaced once we can
// look them up in the marketplace dynamically.
export const IPYNB_VIEW_TYPE = 'jupyter-notebook';
export const JUPYTER_EXTENSION_ID = 'ms-toolsai.jupyter';
/** @deprecated use the notebookKernel<Type> "keyword" instead */
export const KERNEL_EXTENSIONS = new Map([
    [IPYNB_VIEW_TYPE, JUPYTER_EXTENSION_ID],
]);
// @TODO lramos15, place this in a similar spot to our normal recommendations.
export const KERNEL_RECOMMENDATIONS = new Map();
KERNEL_RECOMMENDATIONS.set(IPYNB_VIEW_TYPE, new Map());
KERNEL_RECOMMENDATIONS.get(IPYNB_VIEW_TYPE)?.set('python', {
    extensionIds: [
        'ms-python.python',
        JUPYTER_EXTENSION_ID
    ],
    displayName: 'Python + Jupyter',
});
//#endregion
//#region  Output related types
// !! IMPORTANT !! ----------------------------------------------------------------------------------
// NOTE that you MUST update vs/workbench/contrib/notebook/browser/view/renderers/webviewPreloads.ts#L1986
// whenever changing the values of this const enum. The webviewPreloads-files manually inlines these values
// because it cannot have dependencies.
// !! IMPORTANT !! ----------------------------------------------------------------------------------
export var RenderOutputType;
(function (RenderOutputType) {
    RenderOutputType[RenderOutputType["Html"] = 0] = "Html";
    RenderOutputType[RenderOutputType["Extension"] = 1] = "Extension";
})(RenderOutputType || (RenderOutputType = {}));
export var ScrollToRevealBehavior;
(function (ScrollToRevealBehavior) {
    ScrollToRevealBehavior[ScrollToRevealBehavior["fullCell"] = 0] = "fullCell";
    ScrollToRevealBehavior[ScrollToRevealBehavior["firstLine"] = 1] = "firstLine";
})(ScrollToRevealBehavior || (ScrollToRevealBehavior = {}));
//#endregion
export var CellLayoutState;
(function (CellLayoutState) {
    CellLayoutState[CellLayoutState["Uninitialized"] = 0] = "Uninitialized";
    CellLayoutState[CellLayoutState["Estimated"] = 1] = "Estimated";
    CellLayoutState[CellLayoutState["FromCache"] = 2] = "FromCache";
    CellLayoutState[CellLayoutState["Measured"] = 3] = "Measured";
})(CellLayoutState || (CellLayoutState = {}));
export var CellLayoutContext;
(function (CellLayoutContext) {
    CellLayoutContext[CellLayoutContext["Fold"] = 0] = "Fold";
})(CellLayoutContext || (CellLayoutContext = {}));
/**
 * Vertical Lane in the overview ruler of the notebook editor.
 */
export var NotebookOverviewRulerLane;
(function (NotebookOverviewRulerLane) {
    NotebookOverviewRulerLane[NotebookOverviewRulerLane["Left"] = 1] = "Left";
    NotebookOverviewRulerLane[NotebookOverviewRulerLane["Center"] = 2] = "Center";
    NotebookOverviewRulerLane[NotebookOverviewRulerLane["Right"] = 4] = "Right";
    NotebookOverviewRulerLane[NotebookOverviewRulerLane["Full"] = 7] = "Full";
})(NotebookOverviewRulerLane || (NotebookOverviewRulerLane = {}));
export function isNotebookCellDecoration(obj) {
    return !!obj && typeof obj.handle === 'number';
}
export function isNotebookViewZoneDecoration(obj) {
    return !!obj && typeof obj.viewZoneId === 'string';
}
export var CellRevealType;
(function (CellRevealType) {
    CellRevealType[CellRevealType["Default"] = 1] = "Default";
    CellRevealType[CellRevealType["Top"] = 2] = "Top";
    CellRevealType[CellRevealType["Center"] = 3] = "Center";
    CellRevealType[CellRevealType["CenterIfOutsideViewport"] = 4] = "CenterIfOutsideViewport";
    CellRevealType[CellRevealType["NearTopIfOutsideViewport"] = 5] = "NearTopIfOutsideViewport";
    CellRevealType[CellRevealType["FirstLineIfOutsideViewport"] = 6] = "FirstLineIfOutsideViewport";
})(CellRevealType || (CellRevealType = {}));
export var CellRevealRangeType;
(function (CellRevealRangeType) {
    CellRevealRangeType[CellRevealRangeType["Default"] = 1] = "Default";
    CellRevealRangeType[CellRevealRangeType["Center"] = 2] = "Center";
    CellRevealRangeType[CellRevealRangeType["CenterIfOutsideViewport"] = 3] = "CenterIfOutsideViewport";
})(CellRevealRangeType || (CellRevealRangeType = {}));
export var CellEditState;
(function (CellEditState) {
    /**
     * Default state.
     * For markup cells, this is the renderer version of the markup.
     * For code cell, the browser focus should be on the container instead of the editor
     */
    CellEditState[CellEditState["Preview"] = 0] = "Preview";
    /**
     * Editing mode. Source for markup or code is rendered in editors and the state will be persistent.
     */
    CellEditState[CellEditState["Editing"] = 1] = "Editing";
})(CellEditState || (CellEditState = {}));
export var CellFocusMode;
(function (CellFocusMode) {
    CellFocusMode[CellFocusMode["Container"] = 0] = "Container";
    CellFocusMode[CellFocusMode["Editor"] = 1] = "Editor";
    CellFocusMode[CellFocusMode["Output"] = 2] = "Output";
    CellFocusMode[CellFocusMode["ChatInput"] = 3] = "ChatInput";
})(CellFocusMode || (CellFocusMode = {}));
export var CursorAtBoundary;
(function (CursorAtBoundary) {
    CursorAtBoundary[CursorAtBoundary["None"] = 0] = "None";
    CursorAtBoundary[CursorAtBoundary["Top"] = 1] = "Top";
    CursorAtBoundary[CursorAtBoundary["Bottom"] = 2] = "Bottom";
    CursorAtBoundary[CursorAtBoundary["Both"] = 3] = "Both";
})(CursorAtBoundary || (CursorAtBoundary = {}));
export var CursorAtLineBoundary;
(function (CursorAtLineBoundary) {
    CursorAtLineBoundary[CursorAtLineBoundary["None"] = 0] = "None";
    CursorAtLineBoundary[CursorAtLineBoundary["Start"] = 1] = "Start";
    CursorAtLineBoundary[CursorAtLineBoundary["End"] = 2] = "End";
    CursorAtLineBoundary[CursorAtLineBoundary["Both"] = 3] = "Both";
})(CursorAtLineBoundary || (CursorAtLineBoundary = {}));
export function getNotebookEditorFromEditorPane(editorPane) {
    if (!editorPane) {
        return;
    }
    if (editorPane.getId() === NOTEBOOK_EDITOR_ID) {
        return editorPane.getControl();
    }
    if (editorPane.getId() === NOTEBOOK_DIFF_EDITOR_ID) {
        return editorPane.getControl().inlineNotebookEditor;
    }
    const input = editorPane.input;
    const isCompositeNotebook = input && isCompositeNotebookEditorInput(input);
    if (isCompositeNotebook) {
        return editorPane.getControl()?.notebookEditor;
    }
    return undefined;
}
/**
 * ranges: model selections
 * this will convert model selections to view indexes first, and then include the hidden ranges in the list view
 */
export function expandCellRangesWithHiddenCells(editor, ranges) {
    // assuming ranges are sorted and no overlap
    const indexes = cellRangesToIndexes(ranges);
    const modelRanges = [];
    indexes.forEach(index => {
        const viewCell = editor.cellAt(index);
        if (!viewCell) {
            return;
        }
        const viewIndex = editor.getViewIndexByModelIndex(index);
        if (viewIndex < 0) {
            return;
        }
        const nextViewIndex = viewIndex + 1;
        const range = editor.getCellRangeFromViewRange(viewIndex, nextViewIndex);
        if (range) {
            modelRanges.push(range);
        }
    });
    return reduceCellRanges(modelRanges);
}
export function cellRangeToViewCells(editor, ranges) {
    const cells = [];
    reduceCellRanges(ranges).forEach(range => {
        cells.push(...editor.getCellsInRange(range));
    });
    return cells;
}
//#region Cell Folding
export var CellFoldingState;
(function (CellFoldingState) {
    CellFoldingState[CellFoldingState["None"] = 0] = "None";
    CellFoldingState[CellFoldingState["Expanded"] = 1] = "Expanded";
    CellFoldingState[CellFoldingState["Collapsed"] = 2] = "Collapsed";
})(CellFoldingState || (CellFoldingState = {}));
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tCcm93c2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rQnJvd3Nlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQXFCaEcsT0FBTyxFQUF3SyxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2hRLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBR2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBYyxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBUS9GLHlCQUF5QjtBQUN6QixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRywrQkFBK0IsQ0FBQztBQUM1RSxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyx1QkFBdUIsQ0FBQztBQUMvRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyw4QkFBOEIsQ0FBQztBQUNuRSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyw4QkFBOEIsQ0FBQztBQUNuRSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyx3QkFBd0IsQ0FBQztBQUNsRSxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxnQ0FBZ0MsQ0FBQztBQUc5RSxZQUFZO0FBRVosNkJBQTZCO0FBRTdCLHNGQUFzRjtBQUN0RiwrQ0FBK0M7QUFDL0MsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGtCQUFrQixDQUFDO0FBQ2xELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDO0FBQ3pELGlFQUFpRTtBQUNqRSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsQ0FBaUI7SUFDeEQsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENB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