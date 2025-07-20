/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DataTransfers } from '../../../base/browser/dnd.js';
import { mainWindow } from '../../../base/browser/window.js';
import { coalesce } from '../../../base/common/arrays.js';
import { DeferredPromise } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { ResourceMap } from '../../../base/common/map.js';
import { parse } from '../../../base/common/marshalling.js';
import { Schemas } from '../../../base/common/network.js';
import { isNative, isWeb } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IDialogService } from '../../dialogs/common/dialogs.js';
import { HTMLFileSystemProvider } from '../../files/browser/htmlFileSystemProvider.js';
import { WebFileSystemAccess } from '../../files/browser/webFileSystemAccess.js';
import { ByteSize, IFileService } from '../../files/common/files.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { extractSelection } from '../../opener/common/opener.js';
import { Registry } from '../../registry/common/platform.js';
//#region Editor / Resources DND
export const CodeDataTransfers = {
    EDITORS: 'CodeEditors',
    FILES: 'CodeFiles',
    SYMBOLS: 'application/vnd.code.symbols',
    MARKERS: 'application/vnd.code.diagnostics',
    NOTEBOOK_CELL_OUTPUT: 'notebook-cell-output',
};
export function extractEditorsDropData(e) {
    const editors = [];
    if (e.dataTransfer && e.dataTransfer.types.length > 0) {
        // Data Transfer: Code Editors
        const rawEditorsData = e.dataTransfer.getData(CodeDataTransfers.EDITORS);
        if (rawEditorsData) {
            try {
                editors.push(...parse(rawEditorsData));
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Data Transfer: Resources
        else {
            try {
                const rawResourcesData = e.dataTransfer.getData(DataTransfers.RESOURCES);
                editors.push(...createDraggedEditorInputFromRawResourcesData(rawResourcesData));
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Check for native file transfer
        if (e.dataTransfer?.files) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const file = e.dataTransfer.files[i];
                if (file && getPathForFile(file)) {
                    try {
                        editors.push({ resource: URI.file(getPathForFile(file)), isExternal: true, allowWorkspaceOpen: true });
                    }
                    catch (error) {
                        // Invalid URI
                    }
                }
            }
        }
        // Check for CodeFiles transfer
        const rawCodeFiles = e.dataTransfer.getData(CodeDataTransfers.FILES);
        if (rawCodeFiles) {
            try {
                const codeFiles = JSON.parse(rawCodeFiles);
                for (const codeFile of codeFiles) {
                    editors.push({ resource: URI.file(codeFile), isExternal: true, allowWorkspaceOpen: true });
                }
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Workbench contributions
        const contributions = Registry.as(Extensions.DragAndDropContribution).getAll();
        for (const contribution of contributions) {
            const data = e.dataTransfer.getData(contribution.dataFormatKey);
            if (data) {
                try {
                    editors.push(...contribution.getEditorInputs(data));
                }
                catch (error) {
                    // Invalid transfer
                }
            }
        }
    }
    // Prevent duplicates: it is possible that we end up with the same
    // dragged editor multiple times because multiple data transfers
    // are being used (https://github.com/microsoft/vscode/issues/128925)
    const coalescedEditors = [];
    const seen = new ResourceMap();
    for (const editor of editors) {
        if (!editor.resource) {
            coalescedEditors.push(editor);
        }
        else if (!seen.has(editor.resource)) {
            coalescedEditors.push(editor);
            seen.set(editor.resource, true);
        }
    }
    return coalescedEditors;
}
export async function extractEditorsAndFilesDropData(accessor, e) {
    const editors = extractEditorsDropData(e);
    // Web: Check for file transfer
    if (e.dataTransfer && isWeb && containsDragType(e, DataTransfers.FILES)) {
        const files = e.dataTransfer.items;
        if (files) {
            const instantiationService = accessor.get(IInstantiationService);
            const filesData = await instantiationService.invokeFunction(accessor => extractFilesDropData(accessor, e));
            for (const fileData of filesData) {
                editors.push({ resource: fileData.resource, contents: fileData.contents?.toString(), isExternal: true, allowWorkspaceOpen: fileData.isDirectory });
            }
        }
    }
    return editors;
}
export function createDraggedEditorInputFromRawResourcesData(rawResourcesData) {
    const editors = [];
    if (rawResourcesData) {
        const resourcesRaw = JSON.parse(rawResourcesData);
        for (const resourceRaw of resourcesRaw) {
            if (resourceRaw.indexOf(':') > 0) { // mitigate https://github.com/microsoft/vscode/issues/124946
                const { selection, uri } = extractSelection(URI.parse(resourceRaw));
                editors.push({ resource: uri, options: { selection } });
            }
        }
    }
    return editors;
}
async function extractFilesDropData(accessor, event) {
    // Try to extract via `FileSystemHandle`
    if (WebFileSystemAccess.supported(mainWindow)) {
        const items = event.dataTransfer?.items;
        if (items) {
            return extractFileTransferData(accessor, items);
        }
    }
    // Try to extract via `FileList`
    const files = event.dataTransfer?.files;
    if (!files) {
        return [];
    }
    return extractFileListData(accessor, files);
}
async function extractFileTransferData(accessor, items) {
    const fileSystemProvider = accessor.get(IFileService).getProvider(Schemas.file);
    // eslint-disable-next-line no-restricted-syntax
    if (!(fileSystemProvider instanceof HTMLFileSystemProvider)) {
        return []; // only supported when running in web
    }
    const results = [];
    for (let i = 0; i < items.length; i++) {
        const file = items[i];
        if (file) {
            const result = new DeferredPromise();
            results.push(result);
            (async () => {
                try {
                    const handle = await file.getAsFileSystemHandle();
                    if (!handle) {
                        result.complete(undefined);
                        return;
                    }
                    if (WebFileSystemAccess.isFileSystemFileHandle(handle)) {
                        result.complete({
                            resource: await fileSystemProvider.registerFileHandle(handle),
                            isDirectory: false
                        });
                    }
                    else if (WebFileSystemAccess.isFileSystemDirectoryHandle(handle)) {
                        result.complete({
                            resource: await fileSystemProvider.registerDirectoryHandle(handle),
                            isDirectory: true
                        });
                    }
                    else {
                        result.complete(undefined);
                    }
                }
                catch (error) {
                    result.complete(undefined);
                }
            })();
        }
    }
    return coalesce(await Promise.all(results.map(result => result.p)));
}
export async function extractFileListData(accessor, files) {
    const dialogService = accessor.get(IDialogService);
    const results = [];
    for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
            // Skip for very large files because this operation is unbuffered
            if (file.size > 100 * ByteSize.MB) {
                dialogService.warn(localize('fileTooLarge', "File is too large to open as untitled editor. Please upload it first into the file explorer and then try again."));
                continue;
            }
            const result = new DeferredPromise();
            results.push(result);
            const reader = new FileReader();
            reader.onerror = () => result.complete(undefined);
            reader.onabort = () => result.complete(undefined);
            reader.onload = async (event) => {
                const name = file.name;
                const loadResult = event.target?.result ?? undefined;
                if (typeof name !== 'string' || typeof loadResult === 'undefined') {
                    result.complete(undefined);
                    return;
                }
                result.complete({
                    resource: URI.from({ scheme: Schemas.untitled, path: name }),
                    contents: typeof loadResult === 'string' ? VSBuffer.fromString(loadResult) : VSBuffer.wrap(new Uint8Array(loadResult))
                });
            };
            // Start reading
            reader.readAsArrayBuffer(file);
        }
    }
    return coalesce(await Promise.all(results.map(result => result.p)));
}
//#endregion
export function containsDragType(event, ...dragTypesToFind) {
    if (!event.dataTransfer) {
        return false;
    }
    const dragTypes = event.dataTransfer.types;
    const lowercaseDragTypes = [];
    for (let i = 0; i < dragTypes.length; i++) {
        lowercaseDragTypes.push(dragTypes[i].toLowerCase()); // somehow the types are lowercase
    }
    for (const dragType of dragTypesToFind) {
        if (lowercaseDragTypes.indexOf(dragType.toLowerCase()) >= 0) {
            return true;
        }
    }
    return false;
}
class DragAndDropContributionRegistry {
    constructor() {
        this._contributions = new Map();
    }
    register(contribution) {
        if (this._contributions.has(contribution.dataFormatKey)) {
            throw new Error(`A drag and drop contributiont with key '${contribution.dataFormatKey}' was already registered.`);
        }
        this._contributions.set(contribution.dataFormatKey, contribution);
    }
    getAll() {
        return this._contributions.values();
    }
}
export const Extensions = {
    DragAndDropContribution: 'workbench.contributions.dragAndDrop'
};
Registry.add(Extensions.DragAndDropContribution, new DragAndDropContributionRegistry());
//#endregion
//#region DND Utilities
/**
 * A singleton to store transfer data during drag & drop operations that are only valid within the application.
 */
export class LocalSelectionTransfer {
    static { this.INSTANCE = new LocalSelectionTransfer(); }
    constructor() {
        // protect against external instantiation
    }
    static getInstance() {
        return LocalSelectionTransfer.INSTANCE;
    }
    hasData(proto) {
        return proto && proto === this.proto;
    }
    clearData(proto) {
        if (this.hasData(proto)) {
            this.proto = undefined;
            this.data = undefined;
        }
    }
    getData(proto) {
        if (this.hasData(proto)) {
            return this.data;
        }
        return undefined;
    }
    setData(data, proto) {
        if (proto) {
            this.data = data;
            this.proto = proto;
        }
    }
}
function setDataAsJSON(e, kind, data) {
    e.dataTransfer?.setData(kind, JSON.stringify(data));
}
function getDataAsJSON(e, kind, defaultValue) {
    const rawSymbolsData = e.dataTransfer?.getData(kind);
    if (rawSymbolsData) {
        try {
            return JSON.parse(rawSymbolsData);
        }
        catch (error) {
            // Invalid transfer
        }
    }
    return defaultValue;
}
export function extractSymbolDropData(e) {
    return getDataAsJSON(e, CodeDataTransfers.SYMBOLS, []);
}
export function fillInSymbolsDragData(symbolsData, e) {
    setDataAsJSON(e, CodeDataTransfers.SYMBOLS, symbolsData);
}
export function extractMarkerDropData(e) {
    return getDataAsJSON(e, CodeDataTransfers.MARKERS, undefined);
}
export function fillInMarkersDragData(markerData, e) {
    setDataAsJSON(e, CodeDataTransfers.MARKERS, markerData);
}
export function extractNotebookCellOutputDropData(e) {
    return getDataAsJSON(e, CodeDataTransfers.NOTEBOOK_CELL_OUTPUT, undefined);
}
/**
 * A helper to get access to Electrons `webUtils.getPathForFile` function
 * in a safe way without crashing the application when running in the web.
 */
export function getPathForFile(file) {
    if (isNative && typeof globalThis.vscode?.webUtils?.getPathForFile === 'function') {
        return globalThis.vscode.webUtils.getPathForFile(file);
    }
    return undefined;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kbmQvYnJvd3Nlci9kbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUU3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVqRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw2Q0FBNkMs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