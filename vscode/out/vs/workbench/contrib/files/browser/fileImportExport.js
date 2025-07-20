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
var BrowserFileUpload_1, FileDownload_1;
import { localize } from '../../../../nls.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { getFileNamesMessage, IDialogService, IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ByteSize, IFileService } from '../../../../platform/files/common/files.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IExplorerService } from './files.js';
import { VIEW_ID } from '../common/files.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Limiter, Promises, RunOnceWorker } from '../../../../base/common/async.js';
import { newWriteableBufferStream, VSBuffer } from '../../../../base/common/buffer.js';
import { basename, dirname, joinPath } from '../../../../base/common/resources.js';
import { ResourceFileEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { ExplorerItem } from '../common/explorerModel.js';
import { URI } from '../../../../base/common/uri.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { extractEditorsAndFilesDropData } from '../../../../platform/dnd/browser/dnd.js';
import { IWorkspaceEditingService } from '../../../services/workspaces/common/workspaceEditing.js';
import { isWeb } from '../../../../base/common/platform.js';
import { getActiveWindow, isDragEvent, triggerDownload } from '../../../../base/browser/dom.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { FileAccess, Schemas } from '../../../../base/common/network.js';
import { listenStream } from '../../../../base/common/stream.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { canceled } from '../../../../base/common/errors.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { WebFileSystemAccess } from '../../../../platform/files/browser/webFileSystemAccess.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let BrowserFileUpload = class BrowserFileUpload {
    static { BrowserFileUpload_1 = this; }
    static { this.MAX_PARALLEL_UPLOADS = 20; }
    constructor(progressService, dialogService, explorerService, editorService, fileService) {
        this.progressService = progressService;
        this.dialogService = dialogService;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.fileService = fileService;
    }
    upload(target, source) {
        const cts = new CancellationTokenSource();
        // Indicate progress globally
        const uploadPromise = this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            delay: 800,
            cancellable: true,
            title: localize('uploadingFiles', "Uploading")
        }, async (progress) => this.doUpload(target, this.toTransfer(source), progress, cts.token), () => cts.dispose(true));
        // Also indicate progress in the files view
        this.progressService.withProgress({ location: VIEW_ID, delay: 500 }, () => uploadPromise);
        return uploadPromise;
    }
    toTransfer(source) {
        if (isDragEvent(source)) {
            return source.dataTransfer;
        }
        const transfer = { items: [] };
        // We want to reuse the same code for uploading from
        // Drag & Drop as well as input element based upload
        // so we convert into webkit data transfer when the
        // input element approach is used (simplified).
        for (const file of source) {
            transfer.items.push({
                webkitGetAsEntry: () => {
                    return {
                        name: file.name,
                        isDirectory: false,
                        isFile: true,
                        createReader: () => { throw new Error('Unsupported for files'); },
                        file: resolve => resolve(file)
                    };
                }
            });
        }
        return transfer;
    }
    async doUpload(target, source, progress, token) {
        const items = source.items;
        // Somehow the items thing is being modified at random, maybe as a security
        // measure since this is a DND operation. As such, we copy the items into
        // an array we own as early as possible before using it.
        const entries = [];
        for (const item of items) {
            entries.push(item.webkitGetAsEntry());
        }
        const results = [];
        const operation = {
            startTime: Date.now(),
            progressScheduler: new RunOnceWorker(steps => { progress.report(steps[steps.length - 1]); }, 1000),
            filesTotal: entries.length,
            filesUploaded: 0,
            totalBytesUploaded: 0
        };
        // Upload all entries in parallel up to a
        // certain maximum leveraging the `Limiter`
        const uploadLimiter = new Limiter(BrowserFileUpload_1.MAX_PARALLEL_UPLOADS);
        await Promises.settled(entries.map(entry => {
            return uploadLimiter.queue(async () => {
                if (token.isCancellationRequested) {
                    return;
                }
                // Confirm overwrite as needed
                if (target && entry.name && target.getChild(entry.name)) {
                    const { confirmed } = await this.dialogService.confirm(getFileOverwriteConfirm(entry.name));
                    if (!confirmed) {
                        return;
                    }
                    await this.explorerService.applyBulkEdit([new ResourceFileEdit(joinPath(target.resource, entry.name), undefined, { recursive: true, folder: target.getChild(entry.name)?.isDirectory })], {
                        undoLabel: localize('overwrite', "Overwrite {0}", entry.name),
                        progressLabel: localize('overwriting', "Overwriting {0}", entry.name),
                    });
                    if (token.isCancellationRequested) {
                        return;
                    }
                }
                // Upload entry
                const result = await this.doUploadEntry(entry, target.resource, target, progress, operation, token);
                if (result) {
                    results.push(result);
                }
            });
        }));
        operation.progressScheduler.dispose();
        // Open uploaded file in editor only if we upload just one
        const firstUploadedFile = results[0];
        if (!token.isCancellationRequested && firstUploadedFile?.isFile) {
            await this.editorService.openEditor({ resource: firstUploadedFile.resource, options: { pinned: true } });
        }
    }
    async doUploadEntry(entry, parentResource, target, progress, operation, token) {
        if (token.isCancellationRequested || !entry.name || (!entry.isFile && !entry.isDirectory)) {
            return undefined;
        }
        // Report progress
        let fileBytesUploaded = 0;
        const reportProgress = (fileSize, bytesUploaded) => {
            fileBytesUploaded += bytesUploaded;
            operation.totalBytesUploaded += bytesUploaded;
            const bytesUploadedPerSecond = operation.totalBytesUploaded / ((Date.now() - operation.startTime) / 1000);
            // Small file
            let message;
            if (fileSize < ByteSize.MB) {
                if (operation.filesTotal === 1) {
                    message = `${entry.name}`;
                }
                else {
                    message = localize('uploadProgressSmallMany', "{0} of {1} files ({2}/s)", operation.filesUploaded, operation.filesTotal, ByteSize.formatSize(bytesUploadedPerSecond));
                }
            }
            // Large file
            else {
                message = localize('uploadProgressLarge', "{0} ({1} of {2}, {3}/s)", entry.name, ByteSize.formatSize(fileBytesUploaded), ByteSize.formatSize(fileSize), ByteSize.formatSize(bytesUploadedPerSecond));
            }
            // Report progress but limit to update only once per second
            operation.progressScheduler.work({ message });
        };
        operation.filesUploaded++;
        reportProgress(0, 0);
        // Handle file upload
        const resource = joinPath(parentResource, entry.name);
        if (entry.isFile) {
            const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
            if (token.isCancellationRequested) {
                return undefined;
            }
            // Chrome/Edge/Firefox support stream method, but only use it for
            // larger files to reduce the overhead of the streaming approach
            if (typeof file.stream === 'function' && file.size > ByteSize.MB) {
                await this.doUploadFileBuffered(resource, file, reportProgress, token);
            }
            // Fallback to unbuffered upload for other browsers or small files
            else {
                await this.doUploadFileUnbuffered(resource, file, reportProgress);
            }
            return { isFile: true, resource };
        }
        // Handle folder upload
        else {
            // Create target folder
            await this.fileService.createFolder(resource);
            if (token.isCancellationRequested) {
                return undefined;
            }
            // Recursive upload files in this directory
            const dirReader = entry.createReader();
            const childEntries = [];
            let done = false;
            do {
                const childEntriesChunk = await new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
                if (childEntriesChunk.length > 0) {
                    childEntries.push(...childEntriesChunk);
                }
                else {
                    done = true; // an empty array is a signal that all entries have been read
                }
            } while (!done && !token.isCancellationRequested);
            // Update operation total based on new counts
            operation.filesTotal += childEntries.length;
            // Split up files from folders to upload
            const folderTarget = target && target.getChild(entry.name) || undefined;
            const fileChildEntries = [];
            const folderChildEntries = [];
            for (const childEntry of childEntries) {
                if (childEntry.isFile) {
                    fileChildEntries.push(childEntry);
                }
                else if (childEntry.isDirectory) {
                    folderChildEntries.push(childEntry);
                }
            }
            // Upload files (up to `MAX_PARALLEL_UPLOADS` in parallel)
            const fileUploadQueue = new Limiter(BrowserFileUpload_1.MAX_PARALLEL_UPLOADS);
            await Promises.settled(fileChildEntries.map(fileChildEntry => {
                return fileUploadQueue.queue(() => this.doUploadEntry(fileChildEntry, resource, folderTarget, progress, operation, token));
            }));
            // Upload folders (sequentially give we don't know their sizes)
            for (const folderChildEntry of folderChildEntries) {
                await this.doUploadEntry(folderChildEntry, resource, folderTarget, progress, operation, token);
            }
            return { isFile: false, resource };
        }
    }
    async doUploadFileBuffered(resource, file, progressReporter, token) {
        const writeableStream = newWriteableBufferStream({
            // Set a highWaterMark to prevent the stream
            // for file upload to produce large buffers
            // in-memory
            highWaterMark: 10
        });
        const writeFilePromise = this.fileService.writeFile(resource, writeableStream);
        // Read the file in chunks using File.stream() web APIs
        try {
            const reader = file.stream().getReader();
            let res = await reader.read();
            while (!res.done) {
                if (token.isCancellationRequested) {
                    break;
                }
                // Write buffer into stream but make sure to wait
                // in case the `highWaterMark` is reached
                const buffer = VSBuffer.wrap(res.value);
                await writeableStream.write(buffer);
                if (token.isCancellationRequested) {
                    break;
                }
                // Report progress
                progressReporter(file.size, buffer.byteLength);
                res = await reader.read();
            }
            writeableStream.end(undefined);
        }
        catch (error) {
            writeableStream.error(error);
            writeableStream.end();
        }
        if (token.isCancellationRequested) {
            return undefined;
        }
        // Wait for file being written to target
        await writeFilePromise;
    }
    doUploadFileUnbuffered(resource, file, progressReporter) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    if (event.target?.result instanceof ArrayBuffer) {
                        const buffer = VSBuffer.wrap(new Uint8Array(event.target.result));
                        await this.fileService.writeFile(resource, buffer);
                        // Report progress
                        progressReporter(file.size, buffer.byteLength);
                    }
                    else {
                        throw new Error('Could not read from dropped file.');
                    }
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            };
            // Start reading the file to trigger `onload`
            reader.readAsArrayBuffer(file);
        });
    }
};
BrowserFileUpload = BrowserFileUpload_1 = __decorate([
    __param(0, IProgressService),
    __param(1, IDialogService),
    __param(2, IExplorerService),
    __param(3, IEditorService),
    __param(4, IFileService)
], BrowserFileUpload);
export { BrowserFileUpload };
//#endregion
//#region External File Import (drag and drop)
let ExternalFileImport = class ExternalFileImport {
    constructor(fileService, hostService, contextService, configurationService, dialogService, workspaceEditingService, explorerService, editorService, progressService, notificationService, instantiationService) {
        this.fileService = fileService;
        this.hostService = hostService;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.dialogService = dialogService;
        this.workspaceEditingService = workspaceEditingService;
        this.explorerService = explorerService;
        this.editorService = editorService;
        this.progressService = progressService;
        this.notificationService = notificationService;
        this.instantiationService = instantiationService;
    }
    async import(target, source, targetWindow) {
        const cts = new CancellationTokenSource();
        // Indicate progress globally
        const importPromise = this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            delay: 800,
            cancellable: true,
            title: localize('copyingFiles', "Copying...")
        }, async () => await this.doImport(target, source, targetWindow, cts.token), () => cts.dispose(true));
        // Also indicate progress in the files view
        this.progressService.withProgress({ location: VIEW_ID, delay: 500 }, () => importPromise);
        return importPromise;
    }
    async doImport(target, source, targetWindow, token) {
        // Activate all providers for the resources dropped
        const candidateFiles = coalesce((await this.instantiationService.invokeFunction(accessor => extractEditorsAndFilesDropData(accessor, source))).map(editor => editor.resource));
        await Promise.all(candidateFiles.map(resource => this.fileService.activateProvider(resource.scheme)));
        // Check for dropped external files to be folders
        const files = coalesce(candidateFiles.filter(resource => this.fileService.hasProvider(resource)));
        const resolvedFiles = await this.fileService.resolveAll(files.map(file => ({ resource: file })));
        if (token.isCancellationRequested) {
            return;
        }
        // Pass focus to window
        this.hostService.focus(targetWindow);
        // Handle folders by adding to workspace if we are in workspace context and if dropped on top
        const folders = resolvedFiles.filter(resolvedFile => resolvedFile.success && resolvedFile.stat?.isDirectory).map(resolvedFile => ({ uri: resolvedFile.stat.resource }));
        if (folders.length > 0 && target.isRoot) {
            let ImportChoice;
            (function (ImportChoice) {
                ImportChoice[ImportChoice["Copy"] = 1] = "Copy";
                ImportChoice[ImportChoice["Add"] = 2] = "Add";
            })(ImportChoice || (ImportChoice = {}));
            const buttons = [
                {
                    label: folders.length > 1 ?
                        localize('copyFolders', "&&Copy Folders") :
                        localize('copyFolder', "&&Copy Folder"),
                    run: () => ImportChoice.Copy
                }
            ];
            let message;
            // We only allow to add a folder to the workspace if there is already a workspace folder with that scheme
            const workspaceFolderSchemas = this.contextService.getWorkspace().folders.map(folder => folder.uri.scheme);
            if (folders.some(folder => workspaceFolderSchemas.indexOf(folder.uri.scheme) >= 0)) {
                buttons.unshift({
                    label: folders.length > 1 ?
                        localize('addFolders', "&&Add Folders to Workspace") :
                        localize('addFolder', "&&Add Folder to Workspace"),
                    run: () => ImportChoice.Add
                });
                message = folders.length > 1 ?
                    localize('dropFolders', "Do you want to copy the folders or add the folders to the workspace?") :
                    localize('dropFolder', "Do you want to copy '{0}' or add '{0}' as a folder to the workspace?", basename(folders[0].uri));
            }
            else {
                message = folders.length > 1 ?
                    localize('copyfolders', "Are you sure to want to copy folders?") :
                    localize('copyfolder', "Are you sure to want to copy '{0}'?", basename(folders[0].uri));
            }
            const { result } = await this.dialogService.prompt({
                type: Severity.Info,
                message,
                buttons,
                cancelButton: true
            });
            // Add folders
            if (result === ImportChoice.Add) {
                return this.workspaceEditingService.addFolders(folders);
            }
            // Copy resources
            if (result === ImportChoice.Copy) {
                return this.importResources(target, files, token);
            }
        }
        // Handle dropped files (only support FileStat as target)
        else if (target instanceof ExplorerItem) {
            return this.importResources(target, files, token);
        }
    }
    async importResources(target, resources, token) {
        if (resources && resources.length > 0) {
            // Resolve target to check for name collisions and ask user
            const targetStat = await this.fileService.resolve(target.resource);
            if (token.isCancellationRequested) {
                return;
            }
            // Check for name collisions
            const targetNames = new Set();
            const caseSensitive = this.fileService.hasCapability(target.resource, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
            if (targetStat.children) {
                targetStat.children.forEach(child => {
                    targetNames.add(caseSensitive ? child.name : child.name.toLowerCase());
                });
            }
            let inaccessibleFileCount = 0;
            const resourcesFiltered = coalesce((await Promises.settled(resources.map(async (resource) => {
                const fileDoesNotExist = !(await this.fileService.exists(resource));
                if (fileDoesNotExist) {
                    inaccessibleFileCount++;
                    return undefined;
                }
                if (targetNames.has(caseSensitive ? basename(resource) : basename(resource).toLowerCase())) {
                    const confirmationResult = await this.dialogService.confirm(getFileOverwriteConfirm(basename(resource)));
                    if (!confirmationResult.confirmed) {
                        return undefined;
                    }
                }
                return resource;
            }))));
            if (inaccessibleFileCount > 0) {
                this.notificationService.error(inaccessibleFileCount > 1 ? localize('filesInaccessible', "Some or all of the dropped files could not be accessed for import.") : localize('fileInaccessible', "The dropped file could not be accessed for import."));
            }
            // Copy resources through bulk edit API
            const resourceFileEdits = resourcesFiltered.map(resource => {
                const sourceFileName = basename(resource);
                const targetFile = joinPath(target.resource, sourceFileName);
                return new ResourceFileEdit(resource, targetFile, { overwrite: true, copy: true });
            });
            const undoLevel = this.configurationService.getValue().explorer.confirmUndo;
            await this.explorerService.applyBulkEdit(resourceFileEdits, {
                undoLabel: resourcesFiltered.length === 1 ?
                    localize({ comment: ['substitution will be the name of the file that was imported'], key: 'importFile' }, "Import {0}", basename(resourcesFiltered[0])) :
                    localize({ comment: ['substitution will be the number of files that were imported'], key: 'importnFile' }, "Import {0} resources", resourcesFiltered.length),
                progressLabel: resourcesFiltered.length === 1 ?
                    localize({ comment: ['substitution will be the name of the file that was copied'], key: 'copyingFile' }, "Copying {0}", basename(resourcesFiltered[0])) :
                    localize({ comment: ['substitution will be the number of files that were copied'], key: 'copyingnFile' }, "Copying {0} resources", resourcesFiltered.length),
                progressLocation: 10 /* ProgressLocation.Window */,
                confirmBeforeUndo: undoLevel === "verbose" /* UndoConfirmLevel.Verbose */ || undoLevel === "default" /* UndoConfirmLevel.Default */,
            });
            // if we only add one file, just open it directly
            const autoOpen = this.configurationService.getValue().explorer.autoOpenDroppedFile;
            if (autoOpen && resourceFileEdits.length === 1) {
                const item = this.explorerService.findClosest(resourceFileEdits[0].newResource);
                if (item && !item.isDirectory) {
                    this.editorService.openEditor({ resource: item.resource, options: { pinned: true } });
                }
            }
        }
    }
};
ExternalFileImport = __decorate([
    __param(0, IFileService),
    __param(1, IHostService),
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationService),
    __param(4, IDialogService),
    __param(5, IWorkspaceEditingService),
    __param(6, IExplorerService),
    __param(7, IEditorService),
    __param(8, IProgressService),
    __param(9, INotificationService),
    __param(10, IInstantiationService)
], ExternalFileImport);
export { ExternalFileImport };
let FileDownload = class FileDownload {
    static { FileDownload_1 = this; }
    static { this.LAST_USED_DOWNLOAD_PATH_STORAGE_KEY = 'workbench.explorer.downloadPath'; }
    constructor(fileService, explorerService, progressService, logService, fileDialogService, storageService) {
        this.fileService = fileService;
        this.explorerService = explorerService;
        this.progressService = progressService;
        this.logService = logService;
        this.fileDialogService = fileDialogService;
        this.storageService = storageService;
    }
    download(source) {
        const cts = new CancellationTokenSource();
        // Indicate progress globally
        const downloadPromise = this.progressService.withProgress({
            location: 10 /* ProgressLocation.Window */,
            delay: 800,
            cancellable: isWeb,
            title: localize('downloadingFiles', "Downloading")
        }, async (progress) => this.doDownload(source, progress, cts), () => cts.dispose(true));
        // Also indicate progress in the files view
        this.progressService.withProgress({ location: VIEW_ID, delay: 500 }, () => downloadPromise);
        return downloadPromise;
    }
    async doDownload(sources, progress, cts) {
        for (const source of sources) {
            if (cts.token.isCancellationRequested) {
                return;
            }
            // Web: use DOM APIs to download files with optional support
            // for folders and large files
            if (isWeb) {
                await this.doDownloadBrowser(source.resource, progress, cts);
            }
            // Native: use working copy file service to get at the contents
            else {
                await this.doDownloadNative(source, progress, cts);
            }
        }
    }
    async doDownloadBrowser(resource, progress, cts) {
        const stat = await this.fileService.resolve(resource, { resolveMetadata: true });
        if (cts.token.isCancellationRequested) {
            return;
        }
        const maxBlobDownloadSize = 32 * ByteSize.MB; // avoid to download via blob-trick >32MB to avoid memory pressure
        const preferFileSystemAccessWebApis = stat.isDirectory || stat.size > maxBlobDownloadSize;
        // Folder: use FS APIs to download files and folders if available and preferred
        const activeWindow = getActiveWindow();
        if (preferFileSystemAccessWebApis && WebFileSystemAccess.supported(activeWindow)) {
            try {
                const parentFolder = await activeWindow.showDirectoryPicker();
                const operation = {
                    startTime: Date.now(),
                    progressScheduler: new RunOnceWorker(steps => { progress.report(steps[steps.length - 1]); }, 1000),
                    filesTotal: stat.isDirectory ? 0 : 1, // folders increment filesTotal within downloadFolder method
                    filesDownloaded: 0,
                    totalBytesDownloaded: 0,
                    fileBytesDownloaded: 0
                };
                if (stat.isDirectory) {
                    const targetFolder = await parentFolder.getDirectoryHandle(stat.name, { create: true });
                    await this.downloadFolderBrowser(stat, targetFolder, operation, cts.token);
                }
                else {
                    await this.downloadFileBrowser(parentFolder, stat, operation, cts.token);
                }
                operation.progressScheduler.dispose();
            }
            catch (error) {
                this.logService.warn(error);
                cts.cancel(); // `showDirectoryPicker` will throw an error when the user cancels
            }
        }
        // File: use traditional download to circumvent browser limitations
        else if (stat.isFile) {
            let bufferOrUri;
            try {
                bufferOrUri = (await this.fileService.readFile(stat.resource, { limits: { size: maxBlobDownloadSize } }, cts.token)).value.buffer;
            }
            catch (error) {
                bufferOrUri = FileAccess.uriToBrowserUri(stat.resource);
            }
            if (!cts.token.isCancellationRequested) {
                triggerDownload(bufferOrUri, stat.name);
            }
        }
    }
    async downloadFileBufferedBrowser(resource, target, operation, token) {
        const contents = await this.fileService.readFileStream(resource, undefined, token);
        if (token.isCancellationRequested) {
            target.close();
            return;
        }
        return new Promise((resolve, reject) => {
            const sourceStream = contents.value;
            const disposables = new DisposableStore();
            disposables.add(toDisposable(() => target.close()));
            disposables.add(createSingleCallFunction(token.onCancellationRequested)(() => {
                disposables.dispose();
                reject(canceled());
            }));
            listenStream(sourceStream, {
                onData: data => {
                    target.write(data.buffer);
                    this.reportProgress(contents.name, contents.size, data.byteLength, operation);
                },
                onError: error => {
                    disposables.dispose();
                    reject(error);
                },
                onEnd: () => {
                    disposables.dispose();
                    resolve();
                }
            }, token);
        });
    }
    async downloadFileUnbufferedBrowser(resource, target, operation, token) {
        const contents = await this.fileService.readFile(resource, undefined, token);
        if (!token.isCancellationRequested) {
            target.write(contents.value.buffer);
            this.reportProgress(contents.name, contents.size, contents.value.byteLength, operation);
        }
        target.close();
    }
    async downloadFileBrowser(targetFolder, file, operation, token) {
        // Report progress
        operation.filesDownloaded++;
        operation.fileBytesDownloaded = 0; // reset for this file
        this.reportProgress(file.name, 0, 0, operation);
        // Start to download
        const targetFile = await targetFolder.getFileHandle(file.name, { create: true });
        const targetFileWriter = await targetFile.createWritable();
        // For large files, write buffered using streams
        if (file.size > ByteSize.MB) {
            return this.downloadFileBufferedBrowser(file.resource, targetFileWriter, operation, token);
        }
        // For small files prefer to write unbuffered to reduce overhead
        return this.downloadFileUnbufferedBrowser(file.resource, targetFileWriter, operation, token);
    }
    async downloadFolderBrowser(folder, targetFolder, operation, token) {
        if (folder.children) {
            operation.filesTotal += (folder.children.map(child => child.isFile)).length;
            for (const child of folder.children) {
                if (token.isCancellationRequested) {
                    return;
                }
                if (child.isFile) {
                    await this.downloadFileBrowser(targetFolder, child, operation, token);
                }
                else {
                    const childFolder = await targetFolder.getDirectoryHandle(child.name, { create: true });
                    const resolvedChildFolder = await this.fileService.resolve(child.resource, { resolveMetadata: true });
                    await this.downloadFolderBrowser(resolvedChildFolder, childFolder, operation, token);
                }
            }
        }
    }
    reportProgress(name, fileSize, bytesDownloaded, operation) {
        operation.fileBytesDownloaded += bytesDownloaded;
        operation.totalBytesDownloaded += bytesDownloaded;
        const bytesDownloadedPerSecond = operation.totalBytesDownloaded / ((Date.now() - operation.startTime) / 1000);
        // Small file
        let message;
        if (fileSize < ByteSize.MB) {
            if (operation.filesTotal === 1) {
                message = name;
            }
            else {
                message = localize('downloadProgressSmallMany', "{0} of {1} files ({2}/s)", operation.filesDownloaded, operation.filesTotal, ByteSize.formatSize(bytesDownloadedPerSecond));
            }
        }
        // Large file
        else {
            message = localize('downloadProgressLarge', "{0} ({1} of {2}, {3}/s)", name, ByteSize.formatSize(operation.fileBytesDownloaded), ByteSize.formatSize(fileSize), ByteSize.formatSize(bytesDownloadedPerSecond));
        }
        // Report progress but limit to update only once per second
        operation.progressScheduler.work({ message });
    }
    async doDownloadNative(explorerItem, progress, cts) {
        progress.report({ message: explorerItem.name });
        let defaultUri;
        const lastUsedDownloadPath = this.storageService.get(FileDownload_1.LAST_USED_DOWNLOAD_PATH_STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (lastUsedDownloadPath) {
            defaultUri = joinPath(URI.file(lastUsedDownloadPath), explorerItem.name);
        }
        else {
            defaultUri = joinPath(explorerItem.isDirectory ?
                await this.fileDialogService.defaultFolderPath(Schemas.file) :
                await this.fileDialogService.defaultFilePath(Schemas.file), explorerItem.name);
        }
        const destination = await this.fileDialogService.showSaveDialog({
            availableFileSystems: [Schemas.file],
            saveLabel: localize('downloadButton', "Download"),
            title: localize('chooseWhereToDownload', "Choose Where to Download"),
            defaultUri
        });
        if (destination) {
            // Remember as last used download folder
            this.storageService.store(FileDownload_1.LAST_USED_DOWNLOAD_PATH_STORAGE_KEY, dirname(destination).fsPath, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            // Perform download
            await this.explorerService.applyBulkEdit([new ResourceFileEdit(explorerItem.resource, destination, { overwrite: true, copy: true })], {
                undoLabel: localize('downloadBulkEdit', "Download {0}", explorerItem.name),
                progressLabel: localize('downloadingBulkEdit', "Downloading {0}", explorerItem.name),
                progressLocation: 10 /* ProgressLocation.Window */
            });
        }
        else {
            cts.cancel(); // User canceled a download. In case there were multiple files selected we should cancel the remainder of the prompts #86100
        }
    }
};
FileDownload = FileDownload_1 = __decorate([
    __param(0, IFileService),
    __param(1, IExplorerService),
    __param(2, IProgressService),
    __param(3, ILogService),
    __param(4, IFileDialogService),
    __param(5, IStorageService)
], FileDownload);
export { FileDownload };
//#endregion
//#region Helpers
export function getFileOverwriteConfirm(name) {
    return {
        message: localize('confirmOverwrite', "A file or folder with the name '{0}' already exists in the destination folder. Do you want to replace it?", name),
        detail: localize('irreversible', "This action is irreversible!"),
        primaryButton: localize({ key: 'replaceButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Replace"),
        type: 'warning'
    };
}
export function getMultipleFilesOverwriteConfirm(files) {
    if (files.length > 1) {
        return {
            message: localize('confirmManyOverwrites', "The following {0} files and/or folders already exist in the destination folder. Do you want to replace them?", files.length),
            detail: getFileNamesMessage(files) + '\n' + localize('irreversible', "This action is irreversible!"),
            primaryButton: localize({ key: 'replaceButtonLabel', comment: ['&& denotes a mnemonic'] }, "&&Replace"),
            type: 'warning'
        };
    }
    return getFileOverwriteConfirm(basename(files[0]));
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUltcG9ydEV4cG9ydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9maWxlSW1wb3J0RXhwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxtQkFBbUIsRUFBaUIsY0FBYyxFQUFFLGtCQUFrQixFQUFpQixNQUFNLGdEQUFnRCxDQUFDO0FBQ3ZKLE9BQU8sRUFBRSxRQUFRLEVBQWtDLFlBQVksRUFBeUIsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzSSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUcsT0FBTyxFQUFhLGdCQUFnQixFQUFtQyxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM5QyxPQUFPLEVBQXlDLE9BQU8sRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0RBQXdE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