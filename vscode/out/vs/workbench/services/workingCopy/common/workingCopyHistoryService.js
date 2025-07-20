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
var WorkingCopyHistoryService_1, NativeWorkingCopyHistoryService_1;
import { localize } from '../../../../nls.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { WorkingCopyHistoryTracker } from './workingCopyHistoryTracker.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { MAX_PARALLEL_HISTORY_IO_OPS } from './workingCopyHistory.js';
import { FileOperationError, IFileService } from '../../../../platform/files/common/files.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { URI } from '../../../../base/common/uri.js';
import { DeferredPromise, Limiter, RunOnceScheduler } from '../../../../base/common/async.js';
import { dirname, extname, isEqual, joinPath } from '../../../../base/common/resources.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { hash } from '../../../../base/common/hash.js';
import { indexOfPath, randomPath } from '../../../../base/common/extpath.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { SaveSourceRegistry } from '../../../common/editor.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { distinct } from '../../../../base/common/arrays.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
export class WorkingCopyHistoryModel {
    static { this.ENTRIES_FILE = 'entries.json'; }
    static { this.FILE_SAVED_SOURCE = SaveSourceRegistry.registerSource('default.source', localize('default.source', "File Saved")); }
    static { this.SETTINGS = {
        MAX_ENTRIES: 'workbench.localHistory.maxFileEntries',
        MERGE_PERIOD: 'workbench.localHistory.mergeWindow'
    }; }
    constructor(workingCopyResource, historyHome, entryAddedEmitter, entryChangedEmitter, entryReplacedEmitter, entryRemovedEmitter, options, fileService, labelService, logService, configurationService) {
        this.historyHome = historyHome;
        this.entryAddedEmitter = entryAddedEmitter;
        this.entryChangedEmitter = entryChangedEmitter;
        this.entryReplacedEmitter = entryReplacedEmitter;
        this.entryRemovedEmitter = entryRemovedEmitter;
        this.options = options;
        this.fileService = fileService;
        this.labelService = labelService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.entries = [];
        this.whenResolved = undefined;
        this.workingCopyResource = undefined;
        this.workingCopyName = undefined;
        this.historyEntriesFolder = undefined;
        this.historyEntriesListingFile = undefined;
        this.historyEntriesNameMatcher = undefined;
        this.versionId = 0;
        this.storedVersionId = this.versionId;
        this.storeLimiter = new Limiter(1);
        this.setWorkingCopy(workingCopyResource);
    }
    setWorkingCopy(workingCopyResource) {
        // Update working copy
        this.workingCopyResource = workingCopyResource;
        this.workingCopyName = this.labelService.getUriBasenameLabel(workingCopyResource);
        this.historyEntriesNameMatcher = new RegExp(`[A-Za-z0-9]{4}${escapeRegExpCharacters(extname(workingCopyResource))}`);
        // Update locations
        this.historyEntriesFolder = this.toHistoryEntriesFolder(this.historyHome, workingCopyResource);
        this.historyEntriesListingFile = joinPath(this.historyEntriesFolder, WorkingCopyHistoryModel.ENTRIES_FILE);
        // Reset entries and resolved cache
        this.entries = [];
        this.whenResolved = undefined;
    }
    toHistoryEntriesFolder(historyHome, workingCopyResource) {
        return joinPath(historyHome, hash(workingCopyResource.toString()).toString(16));
    }
    async addEntry(source = WorkingCopyHistoryModel.FILE_SAVED_SOURCE, sourceDescription = undefined, timestamp = Date.now(), token) {
        let entryToReplace = undefined;
        // Figure out if the last entry should be replaced based
        // on settings that can define a interval for when an
        // entry is not added as new entry but should replace.
        // However, when save source is different, never replace.
        const lastEntry = this.entries.at(-1);
        if (lastEntry && lastEntry.source === source) {
            const configuredReplaceInterval = this.configurationService.getValue(WorkingCopyHistoryModel.SETTINGS.MERGE_PERIOD, { resource: this.workingCopyResource });
            if (timestamp - lastEntry.timestamp <= (configuredReplaceInterval * 1000 /* convert to millies */)) {
                entryToReplace = lastEntry;
            }
        }
        let entry;
        // Replace lastest entry in history
        if (entryToReplace) {
            entry = await this.doReplaceEntry(entryToReplace, source, sourceDescription, timestamp, token);
        }
        // Add entry to history
        else {
            entry = await this.doAddEntry(source, sourceDescription, timestamp, token);
        }
        // Flush now if configured
        if (this.options.flushOnChange && !token.isCancellationRequested) {
            await this.store(token);
        }
        return entry;
    }
    async doAddEntry(source, sourceDescription = undefined, timestamp, token) {
        const workingCopyResource = assertReturnsDefined(this.workingCopyResource);
        const workingCopyName = assertReturnsDefined(this.workingCopyName);
        const historyEntriesFolder = assertReturnsDefined(this.historyEntriesFolder);
        // Perform a fast clone operation with minimal overhead to a new random location
        const id = `${randomPath(undefined, undefined, 4)}${extname(workingCopyResource)}`;
        const location = joinPath(historyEntriesFolder, id);
        await this.fileService.cloneFile(workingCopyResource, location);
        // Add to list of entries
        const entry = {
            id,
            workingCopy: { resource: workingCopyResource, name: workingCopyName },
            location,
            timestamp,
            source,
            sourceDescription
        };
        this.entries.push(entry);
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryAddedEmitter.fire({ entry });
        return entry;
    }
    async doReplaceEntry(entry, source, sourceDescription = undefined, timestamp, token) {
        const workingCopyResource = assertReturnsDefined(this.workingCopyResource);
        // Perform a fast clone operation with minimal overhead to the existing location
        await this.fileService.cloneFile(workingCopyResource, entry.location);
        // Update entry
        entry.source = source;
        entry.sourceDescription = sourceDescription;
        entry.timestamp = timestamp;
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryReplacedEmitter.fire({ entry });
        return entry;
    }
    async removeEntry(entry, token) {
        // Make sure to await resolving when removing entries
        await this.resolveEntriesOnce();
        if (token.isCancellationRequested) {
            return false;
        }
        const index = this.entries.indexOf(entry);
        if (index === -1) {
            return false;
        }
        // Delete from disk
        await this.deleteEntry(entry);
        // Remove from model
        this.entries.splice(index, 1);
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryRemovedEmitter.fire({ entry });
        // Flush now if configured
        if (this.options.flushOnChange && !token.isCancellationRequested) {
            await this.store(token);
        }
        return true;
    }
    async updateEntry(entry, properties, token) {
        // Make sure to await resolving when updating entries
        await this.resolveEntriesOnce();
        if (token.isCancellationRequested) {
            return;
        }
        const index = this.entries.indexOf(entry);
        if (index === -1) {
            return;
        }
        // Update entry
        entry.source = properties.source;
        // Update version ID of model to use for storing later
        this.versionId++;
        // Events
        this.entryChangedEmitter.fire({ entry });
        // Flush now if configured
        if (this.options.flushOnChange && !token.isCancellationRequested) {
            await this.store(token);
        }
    }
    async getEntries() {
        // Make sure to await resolving when all entries are asked for
        await this.resolveEntriesOnce();
        // Return as many entries as configured by user settings
        const configuredMaxEntries = this.configurationService.getValue(WorkingCopyHistoryModel.SETTINGS.MAX_ENTRIES, { resource: this.workingCopyResource });
        if (this.entries.length > configuredMaxEntries) {
            return this.entries.slice(this.entries.length - configuredMaxEntries);
        }
        return this.entries;
    }
    async hasEntries(skipResolve) {
        // Make sure to await resolving unless explicitly skipped
        if (!skipResolve) {
            await this.resolveEntriesOnce();
        }
        return this.entries.length > 0;
    }
    resolveEntriesOnce() {
        if (!this.whenResolved) {
            this.whenResolved = this.doResolveEntries();
        }
        return this.whenResolved;
    }
    async doResolveEntries() {
        // Resolve from disk
        const entries = await this.resolveEntriesFromDisk();
        // We now need to merge our in-memory entries with the
        // entries we have found on disk because it is possible
        // that new entries have been added before the entries
        // listing file was updated
        for (const entry of this.entries) {
            entries.set(entry.id, entry);
        }
        // Set as entries, sorted by timestamp
        this.entries = Array.from(entries.values()).sort((entryA, entryB) => entryA.timestamp - entryB.timestamp);
    }
    async resolveEntriesFromDisk() {
        const workingCopyResource = assertReturnsDefined(this.workingCopyResource);
        const workingCopyName = assertReturnsDefined(this.workingCopyName);
        const [entryListing, entryStats] = await Promise.all([
            // Resolve entries listing file
            this.readEntriesFile(),
            // Resolve children of history folder
            this.readEntriesFolder()
        ]);
        // Add from raw folder children
        const entries = new Map();
        if (entryStats) {
            for (const entryStat of entryStats) {
                entries.set(entryStat.name, {
                    id: entryStat.name,
                    workingCopy: { resource: workingCopyResource, name: workingCopyName },
                    location: entryStat.resource,
                    timestamp: entryStat.mtime,
                    source: WorkingCopyHistoryModel.FILE_SAVED_SOURCE,
                    sourceDescription: undefined
                });
            }
        }
        // Update from listing (to have more specific metadata)
        if (entryListing) {
            for (const entry of entryListing.entries) {
                const existingEntry = entries.get(entry.id);
                if (existingEntry) {
                    entries.set(entry.id, {
                        ...existingEntry,
                        timestamp: entry.timestamp,
                        source: entry.source ?? existingEntry.source,
                        sourceDescription: entry.sourceDescription ?? existingEntry.sourceDescription
                    });
                }
            }
        }
        return entries;
    }
    async moveEntries(target, source, token) {
        const timestamp = Date.now();
        const sourceDescription = this.labelService.getUriLabel(assertReturnsDefined(this.workingCopyResource));
        // Move all entries into the target folder so that we preserve
        // any existing history entries that might already be present
        const sourceHistoryEntriesFolder = assertReturnsDefined(this.historyEntriesFolder);
        const targetHistoryEntriesFolder = assertReturnsDefined(target.historyEntriesFolder);
        try {
            for (const entry of this.entries) {
                await this.fileService.move(entry.location, joinPath(targetHistoryEntriesFolder, entry.id), true);
            }
            await this.fileService.del(sourceHistoryEntriesFolder, { recursive: true });
        }
        catch (error) {
            if (!this.isFileNotFound(error)) {
                try {
                    // In case of an error (unless not found), fallback to moving the entire folder
                    await this.fileService.move(sourceHistoryEntriesFolder, targetHistoryEntriesFolder, true);
                }
                catch (error) {
                    if (!this.isFileNotFound(error)) {
                        this.traceError(error);
                    }
                }
            }
        }
        // Merge our entries with target entries before updating associated working copy
        const allEntries = distinct([...this.entries, ...target.entries], entry => entry.id).sort((entryA, entryB) => entryA.timestamp - entryB.timestamp);
        // Update our associated working copy
        const targetWorkingCopyResource = assertReturnsDefined(target.workingCopyResource);
        this.setWorkingCopy(targetWorkingCopyResource);
        // Restore our entries and ensure correct metadata
        const targetWorkingCopyName = assertReturnsDefined(target.workingCopyName);
        for (const entry of allEntries) {
            this.entries.push({
                id: entry.id,
                location: joinPath(targetHistoryEntriesFolder, entry.id),
                source: entry.source,
                sourceDescription: entry.sourceDescription,
                timestamp: entry.timestamp,
                workingCopy: {
                    resource: targetWorkingCopyResource,
                    name: targetWorkingCopyName
                }
            });
        }
        // Add entry for the move
        await this.addEntry(source, sourceDescription, timestamp, token);
        // Store model again to updated location
        await this.store(token);
    }
    async store(token) {
        if (!this.shouldStore()) {
            return;
        }
        // Use a `Limiter` to prevent multiple `store` operations
        // potentially running at the same time
        await this.storeLimiter.queue(async () => {
            if (token.isCancellationRequested || !this.shouldStore()) {
                return;
            }
            return this.doStore(token);
        });
    }
    shouldStore() {
        return this.storedVersionId !== this.versionId;
    }
    async doStore(token) {
        const historyEntriesFolder = assertReturnsDefined(this.historyEntriesFolder);
        // Make sure to await resolving when persisting
        await this.resolveEntriesOnce();
        if (token.isCancellationRequested) {
            return undefined;
        }
        // Cleanup based on max-entries setting
        await this.cleanUpEntries();
        // Without entries, remove the history folder
        const storedVersion = this.versionId;
        if (this.entries.length === 0) {
            try {
                await this.fileService.del(historyEntriesFolder, { recursive: true });
            }
            catch (error) {
                this.traceError(error);
            }
        }
        // If we still have entries, update the entries meta file
        else {
            await this.writeEntriesFile();
        }
        // Mark as stored version
        this.storedVersionId = storedVersion;
    }
    async cleanUpEntries() {
        const configuredMaxEntries = this.configurationService.getValue(WorkingCopyHistoryModel.SETTINGS.MAX_ENTRIES, { resource: this.workingCopyResource });
        if (this.entries.length <= configuredMaxEntries) {
            return; // nothing to cleanup
        }
        const entriesToDelete = this.entries.slice(0, this.entries.length - configuredMaxEntries);
        const entriesToKeep = this.entries.slice(this.entries.length - configuredMaxEntries);
        // Delete entries from disk as instructed
        for (const entryToDelete of entriesToDelete) {
            await this.deleteEntry(entryToDelete);
        }
        // Make sure to update our in-memory model as well
        // because it will be persisted right after
        this.entries = entriesToKeep;
        // Events
        for (const entry of entriesToDelete) {
            this.entryRemovedEmitter.fire({ entry });
        }
    }
    async deleteEntry(entry) {
        try {
            await this.fileService.del(entry.location);
        }
        catch (error) {
            this.traceError(error);
        }
    }
    async writeEntriesFile() {
        const workingCopyResource = assertReturnsDefined(this.workingCopyResource);
        const historyEntriesListingFile = assertReturnsDefined(this.historyEntriesListingFile);
        const serializedModel = {
            version: 1,
            resource: workingCopyResource.toString(),
            entries: this.entries.map(entry => {
                return {
                    id: entry.id,
                    source: entry.source !== WorkingCopyHistoryModel.FILE_SAVED_SOURCE ? entry.source : undefined,
                    sourceDescription: entry.sourceDescription,
                    timestamp: entry.timestamp
                };
            })
        };
        await this.fileService.writeFile(historyEntriesListingFile, VSBuffer.fromString(JSON.stringify(serializedModel)));
    }
    async readEntriesFile() {
        const historyEntriesListingFile = assertReturnsDefined(this.historyEntriesListingFile);
        let serializedModel = undefined;
        try {
            serializedModel = JSON.parse((await this.fileService.readFile(historyEntriesListingFile)).value.toString());
        }
        catch (error) {
            if (!this.isFileNotFound(error)) {
                this.traceError(error);
            }
        }
        return serializedModel;
    }
    async readEntriesFolder() {
        const historyEntriesFolder = assertReturnsDefined(this.historyEntriesFolder);
        const historyEntriesNameMatcher = assertReturnsDefined(this.historyEntriesNameMatcher);
        let rawEntries = undefined;
        // Resolve children of folder on disk
        try {
            rawEntries = (await this.fileService.resolve(historyEntriesFolder, { resolveMetadata: true })).children;
        }
        catch (error) {
            if (!this.isFileNotFound(error)) {
                this.traceError(error);
            }
        }
        if (!rawEntries) {
            return undefined;
        }
        // Skip entries that do not seem to have valid file name
        return rawEntries.filter(entry => !isEqual(entry.resource, this.historyEntriesListingFile) && // not the listings file
            historyEntriesNameMatcher.test(entry.name) // matching our expected file pattern for entries
        );
    }
    isFileNotFound(error) {
        return error instanceof FileOperationError && error.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */;
    }
    traceError(error) {
        this.logService.trace('[Working Copy History Service]', error);
    }
}
let WorkingCopyHistoryService = class WorkingCopyHistoryService extends Disposable {
    static { WorkingCopyHistoryService_1 = this; }
    static { this.FILE_MOVED_SOURCE = SaveSourceRegistry.registerSource('moved.source', localize('moved.source', "File Moved")); }
    static { this.FILE_RENAMED_SOURCE = SaveSourceRegistry.registerSource('renamed.source', localize('renamed.source', "File Renamed")); }
    constructor(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, logService, configurationService) {
        super();
        this.fileService = fileService;
        this.remoteAgentService = remoteAgentService;
        this.environmentService = environmentService;
        this.uriIdentityService = uriIdentityService;
        this.labelService = labelService;
        this.logService = logService;
        this.configurationService = configurationService;
        this._onDidAddEntry = this._register(new Emitter());
        this.onDidAddEntry = this._onDidAddEntry.event;
        this._onDidChangeEntry = this._register(new Emitter());
        this.onDidChangeEntry = this._onDidChangeEntry.event;
        this._onDidReplaceEntry = this._register(new Emitter());
        this.onDidReplaceEntry = this._onDidReplaceEntry.event;
        this._onDidMoveEntries = this._register(new Emitter());
        this.onDidMoveEntries = this._onDidMoveEntries.event;
        this._onDidRemoveEntry = this._register(new Emitter());
        this.onDidRemoveEntry = this._onDidRemoveEntry.event;
        this._onDidRemoveEntries = this._register(new Emitter());
        this.onDidRemoveEntries = this._onDidRemoveEntries.event;
        this.localHistoryHome = new DeferredPromise();
        this.models = new ResourceMap(resource => this.uriIdentityService.extUri.getComparisonKey(resource));
        this.resolveLocalHistoryHome();
    }
    async resolveLocalHistoryHome() {
        let historyHome = undefined;
        // Prefer history to be stored in the remote if we are connected to a remote
        try {
            const remoteEnv = await this.remoteAgentService.getEnvironment();
            if (remoteEnv) {
                historyHome = remoteEnv.localHistoryHome;
            }
        }
        catch (error) {
            this.logService.trace(error); // ignore and fallback to local
        }
        // But fallback to local if there is no remote
        if (!historyHome) {
            historyHome = this.environmentService.localHistoryHome;
        }
        this.localHistoryHome.complete(historyHome);
    }
    async moveEntries(source, target) {
        const limiter = new Limiter(MAX_PARALLEL_HISTORY_IO_OPS);
        const promises = [];
        for (const [resource, model] of this.models) {
            if (!this.uriIdentityService.extUri.isEqualOrParent(resource, source)) {
                continue; // model does not match moved resource
            }
            // Determine new resulting target resource
            let targetResource;
            if (this.uriIdentityService.extUri.isEqual(source, resource)) {
                targetResource = target; // file got moved
            }
            else {
                const index = indexOfPath(resource.path, source.path);
                targetResource = joinPath(target, resource.path.substr(index + source.path.length + 1)); // parent folder got moved
            }
            // Figure out save source
            let saveSource;
            if (this.uriIdentityService.extUri.isEqual(dirname(resource), dirname(targetResource))) {
                saveSource = WorkingCopyHistoryService_1.FILE_RENAMED_SOURCE;
            }
            else {
                saveSource = WorkingCopyHistoryService_1.FILE_MOVED_SOURCE;
            }
            // Move entries to target queued
            promises.push(limiter.queue(() => this.doMoveEntries(model, saveSource, resource, targetResource)));
        }
        if (!promises.length) {
            return [];
        }
        // Await move operations
        const resources = await Promise.all(promises);
        // Events
        this._onDidMoveEntries.fire();
        return resources;
    }
    async doMoveEntries(source, saveSource, sourceWorkingCopyResource, targetWorkingCopyResource) {
        // Move to target via model
        const target = await this.getModel(targetWorkingCopyResource);
        await source.moveEntries(target, saveSource, CancellationToken.None);
        // Update model in our map
        this.models.delete(sourceWorkingCopyResource);
        this.models.set(targetWorkingCopyResource, source);
        return targetWorkingCopyResource;
    }
    async addEntry({ resource, source, timestamp }, token) {
        if (!this.fileService.hasProvider(resource)) {
            return undefined; // we require the working copy resource to be file service accessible
        }
        // Resolve history model for working copy
        const model = await this.getModel(resource);
        if (token.isCancellationRequested) {
            return undefined;
        }
        // Add to model
        return model.addEntry(source, undefined, timestamp, token);
    }
    async updateEntry(entry, properties, token) {
        // Resolve history model for working copy
        const model = await this.getModel(entry.workingCopy.resource);
        if (token.isCancellationRequested) {
            return;
        }
        // Rename in model
        return model.updateEntry(entry, properties, token);
    }
    async removeEntry(entry, token) {
        // Resolve history model for working copy
        const model = await this.getModel(entry.workingCopy.resource);
        if (token.isCancellationRequested) {
            return false;
        }
        // Remove from model
        return model.removeEntry(entry, token);
    }
    async removeAll(token) {
        const historyHome = await this.localHistoryHome.p;
        if (token.isCancellationRequested) {
            return;
        }
        // Clear models
        this.models.clear();
        // Remove from disk
        await this.fileService.del(historyHome, { recursive: true });
        // Events
        this._onDidRemoveEntries.fire();
    }
    async getEntries(resource, token) {
        const model = await this.getModel(resource);
        if (token.isCancellationRequested) {
            return [];
        }
        const entries = await model.getEntries();
        return entries ?? [];
    }
    async getAll(token) {
        const historyHome = await this.localHistoryHome.p;
        if (token.isCancellationRequested) {
            return [];
        }
        const all = new ResourceMap();
        // Fill in all known model resources (they might not have yet persisted to disk)
        for (const [resource, model] of this.models) {
            const hasInMemoryEntries = await model.hasEntries(true /* skip resolving because we resolve below from disk */);
            if (hasInMemoryEntries) {
                all.set(resource, true);
            }
        }
        // Resolve all other resources by iterating the history home folder
        try {
            const resolvedHistoryHome = await this.fileService.resolve(historyHome);
            if (resolvedHistoryHome.children) {
                const limiter = new Limiter(MAX_PARALLEL_HISTORY_IO_OPS);
                const promises = [];
                for (const child of resolvedHistoryHome.children) {
                    promises.push(limiter.queue(async () => {
                        if (token.isCancellationRequested) {
                            return;
                        }
                        try {
                            const serializedModel = JSON.parse((await this.fileService.readFile(joinPath(child.resource, WorkingCopyHistoryModel.ENTRIES_FILE))).value.toString());
                            if (serializedModel.entries.length > 0) {
                                all.set(URI.parse(serializedModel.resource), true);
                            }
                        }
                        catch (error) {
                            // ignore - model might be missing or corrupt, but we need it
                        }
                    }));
                }
                await Promise.all(promises);
            }
        }
        catch (error) {
            // ignore - history might be entirely empty
        }
        return Array.from(all.keys());
    }
    async getModel(resource) {
        const historyHome = await this.localHistoryHome.p;
        let model = this.models.get(resource);
        if (!model) {
            model = new WorkingCopyHistoryModel(resource, historyHome, this._onDidAddEntry, this._onDidChangeEntry, this._onDidReplaceEntry, this._onDidRemoveEntry, this.getModelOptions(), this.fileService, this.labelService, this.logService, this.configurationService);
            this.models.set(resource, model);
        }
        return model;
    }
};
WorkingCopyHistoryService = WorkingCopyHistoryService_1 = __decorate([
    __param(0, IFileService),
    __param(1, IRemoteAgentService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IUriIdentityService),
    __param(4, ILabelService),
    __param(5, ILogService),
    __param(6, IConfigurationService)
], WorkingCopyHistoryService);
export { WorkingCopyHistoryService };
let NativeWorkingCopyHistoryService = class NativeWorkingCopyHistoryService extends WorkingCopyHistoryService {
    static { NativeWorkingCopyHistoryService_1 = this; }
    static { this.STORE_ALL_INTERVAL = 5 * 60 * 1000; } // 5min
    constructor(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, lifecycleService, logService, configurationService) {
        super(fileService, remoteAgentService, environmentService, uriIdentityService, labelService, logService, configurationService);
        this.lifecycleService = lifecycleService;
        this.isRemotelyStored = typeof this.environmentService.remoteAuthority === 'string';
        this.storeAllCts = this._register(new CancellationTokenSource());
        this.storeAllScheduler = this._register(new RunOnceScheduler(() => this.storeAll(this.storeAllCts.token), NativeWorkingCopyHistoryService_1.STORE_ALL_INTERVAL));
        this.registerListeners();
    }
    registerListeners() {
        if (!this.isRemotelyStored) {
            // Local: persist all on shutdown
            this._register(this.lifecycleService.onWillShutdown(e => this.onWillShutdown(e)));
            // Local: schedule persist on change
            this._register(Event.any(this.onDidAddEntry, this.onDidChangeEntry, this.onDidReplaceEntry, this.onDidRemoveEntry)(() => this.onDidChangeModels()));
        }
    }
    getModelOptions() {
        return { flushOnChange: this.isRemotelyStored /* because the connection might drop anytime */ };
    }
    onWillShutdown(e) {
        // Dispose the scheduler...
        this.storeAllScheduler.dispose();
        this.storeAllCts.dispose(true);
        // ...because we now explicitly store all models
        e.join(this.storeAll(e.token), { id: 'join.workingCopyHistory', label: localize('join.workingCopyHistory', "Saving local history") });
    }
    onDidChangeModels() {
        if (!this.storeAllScheduler.isScheduled()) {
            this.storeAllScheduler.schedule();
        }
    }
    async storeAll(token) {
        const limiter = new Limiter(MAX_PARALLEL_HISTORY_IO_OPS);
        const promises = [];
        const models = Array.from(this.models.values());
        for (const model of models) {
            promises.push(limiter.queue(async () => {
                if (token.isCancellationRequested) {
                    return;
                }
                try {
                    await model.store(token);
                }
                catch (error) {
                    this.logService.trace(error);
                }
            }));
        }
        await Promise.all(promises);
    }
};
NativeWorkingCopyHistoryService = NativeWorkingCopyHistoryService_1 = __decorate([
    __param(0, IFileService),
    __param(1, IRemoteAgentService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IUriIdentityService),
    __param(4, ILabelService),
    __param(5, ILifecycleService),
    __param(6, ILogService),
    __param(7, IConfigurationService)
], NativeWorkingCopyHistoryService);
export { NativeWorkingCopyHistoryService };
// Register History Tracker
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WorkingCopyHistoryTracker, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi93b3JraW5nQ29weUhpc3RvcnlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFtQyxVQUFVLElBQUksbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0SCxPQUFPLEVBQUUsaUJBQWlCLEVBQXFDLE1BQU0scUNBQXFDLENBQUM7QUFDM0csT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBc0gsMkJBQTJCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMxTCxPQUFPLEVBQUUsa0JBQWtCLEVBQXVCLFlBQVksRUFBeUIsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxSSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNoRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RixPQUFP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