/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
import * as glob from '../../../../base/common/glob.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Mimes } from '../../../../base/common/mime.js';
import { Schemas } from '../../../../base/common/network.js';
import { basename } from '../../../../base/common/path.js';
import { isWindows } from '../../../../base/common/platform.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { generateMetadataUri, generate as generateUri, extractCellOutputDetails, parseMetadataUri, parse as parseUri } from '../../../services/notebook/common/notebookDocumentService.js';
export const NOTEBOOK_EDITOR_ID = 'workbench.editor.notebook';
export const NOTEBOOK_DIFF_EDITOR_ID = 'workbench.editor.notebookTextDiffEditor';
export const NOTEBOOK_MULTI_DIFF_EDITOR_ID = 'workbench.editor.notebookMultiTextDiffEditor';
export const INTERACTIVE_WINDOW_EDITOR_ID = 'workbench.editor.interactive';
export const REPL_EDITOR_ID = 'workbench.editor.repl';
export const NOTEBOOK_OUTPUT_EDITOR_ID = 'workbench.editor.notebookOutputEditor';
export const EXECUTE_REPL_COMMAND_ID = 'replNotebook.input.execute';
export var CellKind;
(function (CellKind) {
    CellKind[CellKind["Markup"] = 1] = "Markup";
    CellKind[CellKind["Code"] = 2] = "Code";
})(CellKind || (CellKind = {}));
export const NOTEBOOK_DISPLAY_ORDER = [
    'application/json',
    'application/javascript',
    'text/html',
    'image/svg+xml',
    Mimes.latex,
    Mimes.markdown,
    'image/png',
    'image/jpeg',
    Mimes.text
];
export const ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER = [
    Mimes.latex,
    Mimes.markdown,
    'application/json',
    'text/html',
    'image/svg+xml',
    'image/png',
    'image/jpeg',
    Mimes.text,
];
/**
 * A mapping of extension IDs who contain renderers, to notebook ids who they
 * should be treated as the same in the renderer selection logic. This is used
 * to prefer the 1st party Jupyter renderers even though they're in a separate
 * extension, for instance. See #136247.
 */
export const RENDERER_EQUIVALENT_EXTENSIONS = new Map([
    ['ms-toolsai.jupyter', new Set(['jupyter-notebook', 'interactive'])],
    ['ms-toolsai.jupyter-renderers', new Set(['jupyter-notebook', 'interactive'])],
]);
export const RENDERER_NOT_AVAILABLE = '_notAvailable';
export var NotebookRunState;
(function (NotebookRunState) {
    NotebookRunState[NotebookRunState["Running"] = 1] = "Running";
    NotebookRunState[NotebookRunState["Idle"] = 2] = "Idle";
})(NotebookRunState || (NotebookRunState = {}));
export var NotebookCellExecutionState;
(function (NotebookCellExecutionState) {
    NotebookCellExecutionState[NotebookCellExecutionState["Unconfirmed"] = 1] = "Unconfirmed";
    NotebookCellExecutionState[NotebookCellExecutionState["Pending"] = 2] = "Pending";
    NotebookCellExecutionState[NotebookCellExecutionState["Executing"] = 3] = "Executing";
})(NotebookCellExecutionState || (NotebookCellExecutionState = {}));
export var NotebookExecutionState;
(function (NotebookExecutionState) {
    NotebookExecutionState[NotebookExecutionState["Unconfirmed"] = 1] = "Unconfirmed";
    NotebookExecutionState[NotebookExecutionState["Pending"] = 2] = "Pending";
    NotebookExecutionState[NotebookExecutionState["Executing"] = 3] = "Executing";
})(NotebookExecutionState || (NotebookExecutionState = {}));
/** Note: enum values are used for sorting */
export var NotebookRendererMatch;
(function (NotebookRendererMatch) {
    /** Renderer has a hard dependency on an available kernel */
    NotebookRendererMatch[NotebookRendererMatch["WithHardKernelDependency"] = 0] = "WithHardKernelDependency";
    /** Renderer works better with an available kernel */
    NotebookRendererMatch[NotebookRendererMatch["WithOptionalKernelDependency"] = 1] = "WithOptionalKernelDependency";
    /** Renderer is kernel-agnostic */
    NotebookRendererMatch[NotebookRendererMatch["Pure"] = 2] = "Pure";
    /** Renderer is for a different mimeType or has a hard dependency which is unsatisfied */
    NotebookRendererMatch[NotebookRendererMatch["Never"] = 3] = "Never";
})(NotebookRendererMatch || (NotebookRendererMatch = {}));
/**
 * Renderer messaging requirement. While this allows for 'optional' messaging,
 * VS Code effectively treats it the same as true right now. "Partial
 * activation" of extensions is a very tricky problem, which could allow
 * solving this. But for now, optional is mostly only honored for aznb.
 */
export var RendererMessagingSpec;
(function (RendererMessagingSpec) {
    RendererMessagingSpec["Always"] = "always";
    RendererMessagingSpec["Never"] = "never";
    RendererMessagingSpec["Optional"] = "optional";
})(RendererMessagingSpec || (RendererMessagingSpec = {}));
export var NotebookCellsChangeType;
(function (NotebookCellsChangeType) {
    NotebookCellsChangeType[NotebookCellsChangeType["ModelChange"] = 1] = "ModelChange";
    NotebookCellsChangeType[NotebookCellsChangeType["Move"] = 2] = "Move";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellLanguage"] = 5] = "ChangeCellLanguage";
    NotebookCellsChangeType[NotebookCellsChangeType["Initialize"] = 6] = "Initialize";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellMetadata"] = 7] = "ChangeCellMetadata";
    NotebookCellsChangeType[NotebookCellsChangeType["Output"] = 8] = "Output";
    NotebookCellsChangeType[NotebookCellsChangeType["OutputItem"] = 9] = "OutputItem";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellContent"] = 10] = "ChangeCellContent";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeDocumentMetadata"] = 11] = "ChangeDocumentMetadata";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellInternalMetadata"] = 12] = "ChangeCellInternalMetadata";
    NotebookCellsChangeType[NotebookCellsChangeType["ChangeCellMime"] = 13] = "ChangeCellMime";
    NotebookCellsChangeType[NotebookCellsChangeType["Unknown"] = 100] = "Unknown";
})(NotebookCellsChangeType || (NotebookCellsChangeType = {}));
export var SelectionStateType;
(function (SelectionStateType) {
    SelectionStateType[SelectionStateType["Handle"] = 0] = "Handle";
    SelectionStateType[SelectionStateType["Index"] = 1] = "Index";
})(SelectionStateType || (SelectionStateType = {}));
export var CellEditType;
(function (CellEditType) {
    CellEditType[CellEditType["Replace"] = 1] = "Replace";
    CellEditType[CellEditType["Output"] = 2] = "Output";
    CellEditType[CellEditType["Metadata"] = 3] = "Metadata";
    CellEditType[CellEditType["CellLanguage"] = 4] = "CellLanguage";
    CellEditType[CellEditType["DocumentMetadata"] = 5] = "DocumentMetadata";
    CellEditType[CellEditType["Move"] = 6] = "Move";
    CellEditType[CellEditType["OutputItems"] = 7] = "OutputItems";
    CellEditType[CellEditType["PartialMetadata"] = 8] = "PartialMetadata";
    CellEditType[CellEditType["PartialInternalMetadata"] = 9] = "PartialInternalMetadata";
})(CellEditType || (CellEditType = {}));
export var NotebookMetadataUri;
(function (NotebookMetadataUri) {
    NotebookMetadataUri.scheme = Schemas.vscodeNotebookMetadata;
    function generate(notebook) {
        return generateMetadataUri(notebook);
    }
    NotebookMetadataUri.generate = generate;
    function parse(metadata) {
        return parseMetadataUri(metadata);
    }
    NotebookMetadataUri.parse = parse;
})(NotebookMetadataUri || (NotebookMetadataUri = {}));
export var CellUri;
(function (CellUri) {
    CellUri.scheme = Schemas.vscodeNotebookCell;
    function generate(notebook, handle) {
        return generateUri(notebook, handle);
    }
    CellUri.generate = generate;
    function parse(cell) {
        return parseUri(cell);
    }
    CellUri.parse = parse;
    /**
     * Generates a URI for a cell output in a notebook using the output ID.
     * Used when URI should be opened as text in the editor.
     */
    function generateCellOutputUriWithId(notebook, outputId) {
        return notebook.with({
            scheme: Schemas.vscodeNotebookCellOutput,
            query: new URLSearchParams({
                openIn: 'editor',
                outputId: outputId ?? '',
                notebookScheme: notebook.scheme !== Schemas.file ? notebook.scheme : '',
            }).toString()
        });
    }
    CellUri.generateCellOutputUriWithId = generateCellOutputUriWithId;
    /**
     * Generates a URI for a cell output in a notebook using the output index.
     * Used when URI should be opened in notebook editor.
     */
    function generateCellOutputUriWithIndex(notebook, cellUri, outputIndex) {
        return notebook.with({
            scheme: Schemas.vscodeNotebookCellOutput,
            fragment: cellUri.fragment,
            query: new URLSearchParams({
                openIn: 'notebook',
                outputIndex: String(outputIndex),
            }).toString()
        });
    }
    CellUri.generateCellOutputUriWithIndex = generateCellOutputUriWithIndex;
    function generateOutputEditorUri(notebook, cellId, cellIndex, outputId, outputIndex) {
        return notebook.with({
            scheme: Schemas.vscodeNotebookCellOutput,
            query: new URLSearchParams({
                openIn: 'notebookOutputEditor',
                notebook: notebook.toString(),
                cellIndex: String(cellIndex),
                outputId: outputId,
                outputIndex: String(outputIndex),
            }).toString()
        });
    }
    CellUri.generateOutputEditorUri = generateOutputEditorUri;
    function parseCellOutputUri(uri) {
        return extractCellOutputDetails(uri);
    }
    CellUri.parseCellOutputUri = parseCellOutputUri;
    function generateCellPropertyUri(notebook, handle, scheme) {
        return CellUri.generate(notebook, handle).with({ scheme: scheme });
    }
    CellUri.generateCellPropertyUri = generateCellPropertyUri;
    function parseCellPropertyUri(uri, propertyScheme) {
        if (uri.scheme !== propertyScheme) {
            return undefined;
        }
        return CellUri.parse(uri.with({ scheme: CellUri.scheme }));
    }
    CellUri.parseCellPropertyUri = parseCellPropertyUri;
})(CellUri || (CellUri = {}));
const normalizeSlashes = (str) => isWindows ? str.replace(/\//g, '\\') : str;
export class MimeTypeDisplayOrder {
    constructor(initialValue = [], defaultOrder = NOTEBOOK_DISPLAY_ORDER) {
        this.defaultOrder = defaultOrder;
        this.order = [...new Set(initialValue)].map(pattern => ({
            pattern,
            matches: glob.parse(normalizeSlashes(pattern))
        }));
    }
    /**
     * Returns a sorted array of the input mimetypes.
     */
    sort(mimetypes) {
        const remaining = new Map(Iterable.map(mimetypes, m => [m, normalizeSlashes(m)]));
        let sorted = [];
        for (const { matches } of this.order) {
            for (const [original, normalized] of remaining) {
                if (matches(normalized)) {
                    sorted.push(original);
                    remaining.delete(original);
                    break;
                }
            }
        }
        if (remaining.size) {
            sorted = sorted.concat([...remaining.keys()].sort((a, b) => this.defaultOrder.indexOf(a) - this.defaultOrder.indexOf(b)));
        }
        return sorted;
    }
    /**
     * Records that the user selected the given mimetype over the other
     * possible mimetypes, prioritizing it for future reference.
     */
    prioritize(chosenMimetype, otherMimetypes) {
        const chosenIndex = this.findIndex(chosenMimetype);
        if (chosenIndex === -1) {
            // always first, nothing more to do
            this.order.unshift({ pattern: chosenMimetype, matches: glob.parse(normalizeSlashes(chosenMimetype)) });
            return;
        }
        // Get the other mimetypes that are before the chosenMimetype. Then, move
        // them after it, retaining order.
        const uniqueIndicies = new Set(otherMimetypes.map(m => this.findIndex(m, chosenIndex)));
        uniqueIndicies.delete(-1);
        const otherIndices = Array.from(uniqueIndicies).sort();
        this.order.splice(chosenIndex + 1, 0, ...otherIndices.map(i => this.order[i]));
        for (let oi = otherIndices.length - 1; oi >= 0; oi--) {
            this.order.splice(otherIndices[oi], 1);
        }
    }
    /**
     * Gets an array of in-order mimetype preferences.
     */
    toArray() {
        return this.order.map(o => o.pattern);
    }
    findIndex(mimeType, maxIndex = this.order.length) {
        const normalized = normalizeSlashes(mimeType);
        for (let i = 0; i < maxIndex; i++) {
            if (this.order[i].matches(normalized)) {
                return i;
            }
        }
        return -1;
    }
}
export function diff(before, after, contains, equal = (a, b) => a === b) {
    const result = [];
    function pushSplice(start, deleteCount, toInsert) {
        if (deleteCount === 0 && toInsert.length === 0) {
            return;
        }
        const latest = result[result.length - 1];
        if (latest && latest.start + latest.deleteCount === start) {
            latest.deleteCount += deleteCount;
            latest.toInsert.push(...toInsert);
        }
        else {
            result.push({ start, deleteCount, toInsert });
        }
    }
    let beforeIdx = 0;
    let afterIdx = 0;
    while (true) {
        if (beforeIdx === before.length) {
            pushSplice(beforeIdx, 0, after.slice(afterIdx));
            break;
        }
        if (afterIdx === after.length) {
            pushSplice(beforeIdx, before.length - beforeIdx, []);
            break;
        }
        const beforeElement = before[beforeIdx];
        const afterElement = after[afterIdx];
        if (equal(beforeElement, afterElement)) {
            // equal
            beforeIdx += 1;
            afterIdx += 1;
            continue;
        }
        if (contains(afterElement)) {
            // `afterElement` exists before, which means some elements before `afterElement` are deleted
            pushSplice(beforeIdx, 1, []);
            beforeIdx += 1;
        }
        else {
            // `afterElement` added
            pushSplice(beforeIdx, 0, [afterElement]);
            afterIdx += 1;
        }
    }
    return result;
}
export const NOTEBOOK_EDITOR_CURSOR_BOUNDARY = new RawContextKey('notebookEditorCursorAtBoundary', 'none');
export const NOTEBOOK_EDITOR_CURSOR_LINE_BOUNDARY = new RawContextKey('notebookEditorCursorAtLineBoundary', 'none');
export var NotebookEditorPriority;
(function (NotebookEditorPriority) {
    NotebookEditorPriority["default"] = "default";
    NotebookEditorPriority["option"] = "option";
})(NotebookEditorPriority || (NotebookEditorPriority = {}));
export var NotebookFindScopeType;
(function (NotebookFindScopeType) {
    NotebookFindScopeType["Cells"] = "cells";
    NotebookFindScopeType["Text"] = "text";
    NotebookFindScopeType["None"] = "none";
})(NotebookFindScopeType || (NotebookFindScopeType = {}));
//TODO@rebornix test
export function isDocumentExcludePattern(filenamePattern) {
    const arg = filenamePattern;
    if ((typeof arg.include === 'string' || glob.isRelativePattern(arg.include))
        && (typeof arg.exclude === 'string' || glob.isRelativePattern(arg.exclude))) {
        return true;
    }
    return false;
}
export function notebookDocumentFilterMatch(filter, viewType, resource) {
    if (Array.isArray(filter.viewType) && filter.viewType.indexOf(viewType) >= 0) {
        return true;
    }
    if (filter.viewType === viewType) {
        return true;
    }
    if (filter.filenamePattern) {
        const filenamePattern = isDocumentExcludePattern(filter.filenamePattern) ? filter.filenamePattern.include : filter.filenamePattern;
        const excludeFilenamePattern = isDocumentExcludePattern(filter.filenamePattern) ? filter.filenamePattern.exclude : undefined;
        if (glob.match(filenamePattern, basename(resource.fsPath).toLowerCase())) {
            if (excludeFilenamePattern) {
                if (glob.match(excludeFilenamePattern, basename(resource.fsPath).toLowerCase())) {
                    // should exclude
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}
export const NotebookSetting = {
    displayOrder: 'notebook.displayOrder',
    cellToolbarLocation: 'notebook.cellToolbarLocation',
    cellToolbarVisibility: 'notebook.cellToolbarVisibility',
    showCellStatusBar: 'notebook.showCellStatusBar',
    cellExecutionTimeVerbosity: 'notebook.cellExecutionTimeVerbosity',
    textDiffEditorPreview: 'notebook.diff.enablePreview',
    diffOverviewRuler: 'notebook.diff.overviewRuler',
    experimentalInsertToolbarAlignment: 'notebook.experimental.insertToolbarAlignment',
    compactView: 'notebook.compactView',
    focusIndicator: 'notebook.cellFocusIndicator',
    insertToolbarLocation: 'notebook.insertToolbarLocation',
    globalToolbar: 'notebook.globalToolbar',
    stickyScrollEnabled: 'notebook.stickyScroll.enabled',
    stickyScrollMode: 'notebook.stickyScroll.mode',
    undoRedoPerCell: 'notebook.undoRedoPerCell',
    consolidatedOutputButton: 'notebook.consolidatedOutputButton',
    openOutputInPreviewEditor: 'notebook.output.openInPreviewEditor.enabled',
    showFoldingControls: 'notebook.showFoldingControls',
    dragAndDropEnabled: 'notebook.dragAndDropEnabled',
    cellEditorOptionsCustomizations: 'notebook.editorOptionsCustomizations',
    consolidatedRunButton: 'notebook.consolidatedRunButton',
    openGettingStarted: 'notebook.experimental.openGettingStarted',
    globalToolbarShowLabel: 'notebook.globalToolbarShowLabel',
    markupFontSize: 'notebook.markup.fontSize',
    markdownLineHeight: 'notebook.markdown.lineHeight',
    interactiveWindowCollapseCodeCells: 'interactiveWindow.collapseCellInputCode',
    outputScrollingDeprecated: 'notebook.experimental.outputScrolling',
    outputScrolling: 'notebook.output.scrolling',
    textOutputLineLimit: 'notebook.output.textLineLimit',
    LinkifyOutputFilePaths: 'notebook.output.linkifyFilePaths',
    minimalErrorRendering: 'notebook.output.minimalErrorRendering',
    formatOnSave: 'notebook.formatOnSave.enabled',
    insertFinalNewline: 'notebook.insertFinalNewline',
    defaultFormatter: 'notebook.defaultFormatter',
    formatOnCellExecution: 'notebook.formatOnCellExecution',
    codeActionsOnSave: 'notebook.codeActionsOnSave',
    outputWordWrap: 'notebook.output.wordWrap',
    outputLineHeightDeprecated: 'notebook.outputLineHeight',
    outputLineHeight: 'notebook.output.lineHeight',
    outputFontSizeDeprecated: 'notebook.outputFontSize',
    outputFontSize: 'notebook.output.fontSize',
    outputFontFamilyDeprecated: 'notebook.outputFontFamily',
    outputFontFamily: 'notebook.output.fontFamily',
    findFilters: 'notebook.find.filters',
    logging: 'notebook.logging',
    confirmDeleteRunningCell: 'notebook.confirmDeleteRunningCell',
    remoteSaving: 'notebook.experimental.remoteSave',
    gotoSymbolsAllSymbols: 'notebook.gotoSymbols.showAllSymbols',
    outlineShowMarkdownHeadersOnly: 'notebook.outline.showMarkdownHeadersOnly',
    outlineShowCodeCells: 'notebook.outline.showCodeCells',
    outlineShowCodeCellSymbols: 'notebook.outline.showCodeCellSymbols',
    breadcrumbsShowCodeCells: 'notebook.breadcrumbs.showCodeCells',
    scrollToRevealCell: 'notebook.scrolling.revealNextCellOnExecute',
    cellChat: 'notebook.experimental.cellChat',
    cellGenerate: 'notebook.experimental.generate',
    notebookVariablesView: 'notebook.variablesView',
    notebookInlineValues: 'notebook.inlineValues',
    InteractiveWindowPromptToSave: 'interactiveWindow.promptToSaveOnClose',
    cellFailureDiagnostics: 'notebook.cellFailureDiagnostics',
    outputBackupSizeLimit: 'notebook.backup.sizeLimit',
    multiCursor: 'notebook.multiCursor.enabled',
    markupFontFamily: 'notebook.markup.fontFamily',
};
export var CellStatusbarAlignment;
(function (CellStatusbarAlignment) {
    CellStatusbarAlignment[CellStatusbarAlignment["Left"] = 1] = "Left";
    CellStatusbarAlignment[CellStatusbarAlignment["Right"] = 2] = "Right";
})(CellStatusbarAlignment || (CellStatusbarAlignment = {}));
export class NotebookWorkingCopyTypeIdentifier {
    static { this._prefix = 'notebook/'; }
    static create(notebookType, viewType) {
        return `${NotebookWorkingCopyTypeIdentifier._prefix}${notebookType}/${viewType ?? notebookType}`;
    }
    static parse(candidate) {
        if (candidate.startsWith(NotebookWorkingCopyTypeIdentifier._prefix)) {
            const split = candidate.substring(NotebookWorkingCopyTypeIdentifier._prefix.length).split('/');
            if (split.length === 2) {
                return { notebookType: split[0], viewType: split[1] };
            }
        }
        return undefined;
    }
}
/**
 * Whether the provided mime type is a text stream like `stdout`, `stderr`.
 */
export function isTextStreamMime(mimeType) {
    return ['application/vnd.code.notebook.stdout', 'application/vnd.code.notebook.stderr'].includes(mimeType);
}
const textDecoder = new TextDecoder();
/**
 * Given a stream of individual stdout outputs, this function will return the compressed lines, escaping some of the common terminal escape codes.
 * E.g. some terminal escape codes would result in the previous line getting cleared, such if we had 3 lines and
 * last line contained such a code, then the result string would be just the first two lines.
 * @returns a single VSBuffer with the concatenated and compressed data, and whether any compression was done.
 */
export function compressOutputItemStreams(outputs) {
    const buffers = [];
    let startAppending = false;
    // Pick the first set of outputs with the same mime type.
    for (const output of outputs) {
        if ((buffers.length === 0 || startAppending)) {
            buffers.push(output);
            startAppending = true;
        }
    }
    let didCompression = compressStreamBuffer(buffers);
    const concatenated = VSBuffer.concat(buffers.map(buffer => VSBuffer.wrap(buffer)));
    const data = formatStreamText(concatenated);
    didCompression = didCompression || data.byteLength !== concatenated.byteLength;
    return { data, didCompression };
}
export const MOVE_CURSOR_1_LINE_COMMAND = `${String.fromCharCode(27)}[A`;
const MOVE_CURSOR_1_LINE_COMMAND_BYTES = MOVE_CURSOR_1_LINE_COMMAND.split('').map(c => c.charCodeAt(0));
const LINE_FEED = 10;
function compressStreamBuffer(streams) {
    let didCompress = false;
    streams.forEach((stream, index) => {
        if (index === 0 || stream.length < MOVE_CURSOR_1_LINE_COMMAND.length) {
            return;
        }
        const previousStream = streams[index - 1];
        // Remove the previous line if required.
        const command = stream.subarray(0, MOVE_CURSOR_1_LINE_COMMAND.length);
        if (command[0] === MOVE_CURSOR_1_LINE_COMMAND_BYTES[0] && command[1] === MOVE_CURSOR_1_LINE_COMMAND_BYTES[1] && command[2] === MOVE_CURSOR_1_LINE_COMMAND_BYTES[2]) {
            const lastIndexOfLineFeed = previousStream.lastIndexOf(LINE_FEED);
            if (lastIndexOfLineFeed === -1) {
                return;
            }
            didCompress = true;
            streams[index - 1] = previousStream.subarray(0, lastIndexOfLineFeed);
            streams[index] = stream.subarray(MOVE_CURSOR_1_LINE_COMMAND.length);
        }
    });
    return didCompress;
}
/**
 * Took this from jupyter/notebook
 * https://github.com/jupyter/notebook/blob/b8b66332e2023e83d2ee04f83d8814f567e01a4e/notebook/static/base/js/utils.js
 * Remove characters that are overridden by backspace characters
 */
function fixBackspace(txt) {
    let tmp = txt;
    do {
        txt = tmp;
        // Cancel out anything-but-newline followed by backspace
        tmp = txt.replace(/[^\n]\x08/gm, '');
    } while (tmp.length < txt.length);
    return txt;
}
/**
 * Remove chunks that should be overridden by the effect of carriage return characters
 * From https://github.com/jupyter/notebook/blob/master/notebook/static/base/js/utils.js
 */
function fixCarriageReturn(txt) {
    txt = txt.replace(/\r+\n/gm, '\n'); // \r followed by \n --> newline
    while (txt.search(/\r[^$]/g) > -1) {
        const base = txt.match(/^(.*)\r+/m)[1];
        let insert = txt.match(/\r+(.*)$/m)[1];
        insert = insert + base.slice(insert.length, base.length);
        txt = txt.replace(/\r+.*$/m, '\r').replace(/^.*\r/m, insert);
    }
    return txt;
}
const BACKSPACE_CHARACTER = '\b'.charCodeAt(0);
const CARRIAGE_RETURN_CHARACTER = '\r'.charCodeAt(0);
function formatStreamText(buffer) {
    // We have special handling for backspace and carriage return characters.
    // Don't unnecessary decode the bytes if we don't need to perform any processing.
    if (!buffer.buffer.includes(BACKSPACE_CHARACTER) && !buffer.buffer.includes(CARRIAGE_RETURN_CHARACTER)) {
        return buffer;
    }
    // Do the same thing jupyter is doing
    return VSBuffer.fromString(fixCarriageReturn(fixBackspace(textDecoder.decode(buffer.buffer))));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDb21tb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9ub3RlYm9va0NvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFJN0QsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUV4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBU2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQVVyRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxJQUFJLFdBQVcsRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLElBQUksUUFBUSxFQUFFLE1BQU0sOERBQThELENBQUM7QUFJM0wsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsMkJBQTJCLENBQUM7QUFDOUQsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcseUNBQXlDLENBQUM7QUFDakYsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsOENBQThDLENBQUM7QUFDNUYsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQUcsOEJBQThCLENBQUM7QUFDM0UsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLHVCQUF1QixDQUFDO0FBQ3RE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