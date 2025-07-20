/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeBase64, encodeBase64, VSBuffer } from '../../../../../../base/common/buffer.js';
import { filter } from '../../../../../../base/common/objects.js';
import { URI } from '../../../../../../base/common/uri.js';
import { NotebookCellTextModel } from '../../../../notebook/common/model/notebookCellTextModel.js';
import { NotebookSetting } from '../../../../notebook/common/notebookCommon.js';
const BufferMarker = 'ArrayBuffer-4f56482b-5a03-49ba-8356-210d3b0c1c3d';
export const ChatEditingNotebookSnapshotScheme = 'chat-editing-notebook-snapshot-model';
export function getNotebookSnapshotFileURI(chatSessionId, requestId, undoStop, path, viewType) {
    return URI.from({
        scheme: ChatEditingNotebookSnapshotScheme,
        path,
        query: JSON.stringify({ sessionId: chatSessionId, requestId: requestId ?? '', undoStop: undoStop ?? '', viewType }),
    });
}
export function parseNotebookSnapshotFileURI(resource) {
    const data = JSON.parse(resource.query);
    return { sessionId: data.sessionId ?? '', requestId: data.requestId ?? '', undoStop: data.undoStop ?? '', viewType: data.viewType };
}
export function createSnapshot(notebook, transientOptions, outputSizeConfig) {
    const outputSizeLimit = (typeof outputSizeConfig === 'number' ? outputSizeConfig : outputSizeConfig.getValue(NotebookSetting.outputBackupSizeLimit)) * 1024;
    return serializeSnapshot(notebook.createSnapshot({ context: 2 /* SnapshotContext.Backup */, outputSizeLimit, transientOptions }), transientOptions);
}
export function restoreSnapshot(notebook, snapshot) {
    try {
        const { transientOptions, data } = deserializeSnapshot(snapshot);
        notebook.restoreSnapshot(data, transientOptions);
        const edits = [];
        data.cells.forEach((cell, index) => {
            const internalId = cell.internalMetadata?.internalId;
            if (internalId) {
                edits.push({ editType: 9 /* CellEditType.PartialInternalMetadata */, index, internalMetadata: { internalId } });
            }
        });
        notebook.applyEdits(edits, true, undefined, () => undefined, undefined, false);
    }
    catch (ex) {
        console.error('Error restoring Notebook snapshot', ex);
    }
}
export class SnapshotComparer {
    constructor(initialCotent) {
        const { transientOptions, data } = deserializeSnapshot(initialCotent);
        this.transientOptions = transientOptions;
        this.data = data;
    }
    isEqual(notebook) {
        if (notebook.cells.length !== this.data.cells.length) {
            return false;
        }
        const transientDocumentMetadata = this.transientOptions?.transientDocumentMetadata || {};
        const notebookMetadata = filter(notebook.metadata || {}, key => !transientDocumentMetadata[key]);
        const comparerMetadata = filter(this.data.metadata || {}, key => !transientDocumentMetadata[key]);
        // When comparing ignore transient items.
        if (JSON.stringify(notebookMetadata) !== JSON.stringify(comparerMetadata)) {
            return false;
        }
        const transientCellMetadata = this.transientOptions?.transientCellMetadata || {};
        for (let i = 0; i < notebook.cells.length; i++) {
            const notebookCell = notebook.cells[i];
            const comparerCell = this.data.cells[i];
            if (notebookCell instanceof NotebookCellTextModel) {
                if (!notebookCell.fastEqual(comparerCell, true)) {
                    return false;
                }
            }
            else {
                if (notebookCell.cellKind !== comparerCell.cellKind) {
                    return false;
                }
                if (notebookCell.language !== comparerCell.language) {
                    return false;
                }
                if (notebookCell.mime !== comparerCell.mime) {
                    return false;
                }
                if (notebookCell.source !== comparerCell.source) {
                    return false;
                }
                if (!this.transientOptions?.transientOutputs && notebookCell.outputs.length !== comparerCell.outputs.length) {
                    return false;
                }
                // When comparing ignore transient items.
                const cellMetadata = filter(notebookCell.metadata || {}, key => !transientCellMetadata[key]);
                const comparerCellMetadata = filter(comparerCell.metadata || {}, key => !transientCellMetadata[key]);
                if (JSON.stringify(cellMetadata) !== JSON.stringify(comparerCellMetadata)) {
                    return false;
                }
                // When comparing ignore transient items.
                if (JSON.stringify(sanitizeCellDto2(notebookCell, true, this.transientOptions)) !== JSON.stringify(sanitizeCellDto2(comparerCell, true, this.transientOptions))) {
                    return false;
                }
            }
        }
        return true;
    }
}
function sanitizeCellDto2(cell, ignoreInternalMetadata, transientOptions) {
    const transientCellMetadata = transientOptions?.transientCellMetadata || {};
    const outputs = transientOptions?.transientOutputs ? [] : cell.outputs.map(output => {
        // Ensure we're in full control of the data being stored.
        // Possible we have classes instead of plain objects.
        return {
            outputId: output.outputId,
            metadata: output.metadata,
            outputs: output.outputs.map(item => {
                return {
                    data: item.data,
                    mime: item.mime,
                };
            }),
        };
    });
    // Ensure we're in full control of the data being stored.
    // Possible we have classes instead of plain objects.
    return {
        cellKind: cell.cellKind,
        language: cell.language,
        metadata: cell.metadata ? filter(cell.metadata, key => !transientCellMetadata[key]) : cell.metadata,
        outputs,
        mime: cell.mime,
        source: cell.source,
        collapseState: cell.collapseState,
        internalMetadata: ignoreInternalMetadata ? undefined : cell.internalMetadata
    };
}
function serializeSnapshot(data, transientOptions) {
    const dataDto = {
        // Never pass transient options, as we're after a backup here.
        // Else we end up stripping outputs from backups.
        // Whether its persisted or not is up to the serializer.
        // However when reloading/restoring we need to preserve outputs.
        cells: data.cells.map(cell => sanitizeCellDto2(cell)),
        metadata: data.metadata,
    };
    return JSON.stringify([
        JSON.stringify(transientOptions),
        JSON.stringify(dataDto, (_key, value) => {
            if (value instanceof VSBuffer) {
                return {
                    type: BufferMarker,
                    data: encodeBase64(value)
                };
            }
            return value;
        })
    ]);
}
export function deserializeSnapshot(snapshot) {
    const [transientOptionsStr, dataStr] = JSON.parse(snapshot);
    const transientOptions = transientOptionsStr ? JSON.parse(transientOptionsStr) : undefined;
    const data = JSON.parse(dataStr, (_key, value) => {
        if (value && value.type === BufferMarker) {
            return decodeBase64(value.data);
        }
        return value;
    });
    return { transientOptions, data };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZE5vdGVib29rU25hcHNob3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9ub3RlYm9vay9jaGF0RWRpdGluZ01vZGlmaWVkTm90ZWJvb2tTbmFwc2hvdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBNkUsZUFBZSxFQUFvQixNQUFNLCtDQUErQyxDQUFDO0FBRTdLLE1BQU0sWUFBWSxHQUFHLGtEQUFrRCxDQUFDO0FBR3hFLE1BQU0sQ0FBQyxNQUFNLGlDQUFpQyxHQUFHLHNDQUFzQyxDQUFDO0FBRXhGLE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxhQUFxQixFQUFFLFNBQTZCLEVBQUUsUUFBNEIsRUFBRSxJQUFZLEVBQUUsUUFBZ0I7SUFDNUosT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2YsTUFBTSxFQUFFLGlDQUFpQztRQUN6QyxJQUFJO1FBQ0osS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxTQUFTLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBd0QsQ0FBQztLQUN6SyxDQUFDLENBQUM7QUFDSixD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