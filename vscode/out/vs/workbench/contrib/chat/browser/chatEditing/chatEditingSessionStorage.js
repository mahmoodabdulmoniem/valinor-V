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
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { hashAsync } from '../../../../../base/common/hash.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
const STORAGE_CONTENTS_FOLDER = 'contents';
const STORAGE_STATE_FILE = 'state.json';
let ChatEditingSessionStorage = class ChatEditingSessionStorage {
    constructor(chatSessionId, _fileService, _environmentService, _logService, _workspaceContextService) {
        this.chatSessionId = chatSessionId;
        this._fileService = _fileService;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._workspaceContextService = _workspaceContextService;
    }
    _getStorageLocation() {
        const workspaceId = this._workspaceContextService.getWorkspace().id;
        return joinPath(this._environmentService.workspaceStorageHome, workspaceId, 'chatEditingSessions', this.chatSessionId);
    }
    async restoreState() {
        const storageLocation = this._getStorageLocation();
        const fileContents = new Map();
        const getFileContent = (hash) => {
            let readPromise = fileContents.get(hash);
            if (!readPromise) {
                readPromise = this._fileService.readFile(joinPath(storageLocation, STORAGE_CONTENTS_FOLDER, hash)).then(content => content.value.toString());
                fileContents.set(hash, readPromise);
            }
            return readPromise;
        };
        const deserializeSnapshotEntriesDTO = async (dtoEntries) => {
            const entries = new ResourceMap();
            for (const entryDTO of dtoEntries) {
                const entry = await deserializeSnapshotEntry(entryDTO);
                entries.set(entry.resource, entry);
            }
            return entries;
        };
        const deserializeChatEditingStopDTO = async (stopDTO) => {
            const entries = await deserializeSnapshotEntriesDTO(stopDTO.entries);
            return { stopId: 'stopId' in stopDTO ? stopDTO.stopId : undefined, entries };
        };
        const normalizeSnapshotDtos = (snapshot) => {
            if ('stops' in snapshot) {
                return snapshot;
            }
            return { requestId: snapshot.requestId, stops: [{ stopId: undefined, entries: snapshot.entries }] };
        };
        const deserializeChatEditingSessionSnapshot = async (startIndex, snapshot) => {
            const stops = await Promise.all(snapshot.stops.map(deserializeChatEditingStopDTO));
            return { startIndex, requestId: snapshot.requestId, stops };
        };
        const deserializeSnapshotEntry = async (entry) => {
            return {
                resource: URI.parse(entry.resource),
                languageId: entry.languageId,
                original: await getFileContent(entry.originalHash),
                current: await getFileContent(entry.currentHash),
                state: entry.state,
                snapshotUri: URI.parse(entry.snapshotUri),
                telemetryInfo: { requestId: entry.telemetryInfo.requestId, agentId: entry.telemetryInfo.agentId, command: entry.telemetryInfo.command, sessionId: this.chatSessionId, result: undefined }
            };
        };
        try {
            const stateFilePath = joinPath(storageLocation, STORAGE_STATE_FILE);
            if (!await this._fileService.exists(stateFilePath)) {
                this._logService.debug(`chatEditingSession: No editing session state found at ${stateFilePath.toString()}`);
                return undefined;
            }
            this._logService.debug(`chatEditingSession: Restoring editing session at ${stateFilePath.toString()}`);
            const stateFileContent = await this._fileService.readFile(stateFilePath);
            const data = JSON.parse(stateFileContent.value.toString());
            if (!COMPATIBLE_STORAGE_VERSIONS.includes(data.version)) {
                return undefined;
            }
            let linearHistoryIndex = 0;
            const linearHistory = await Promise.all(data.linearHistory.map(snapshot => {
                const norm = normalizeSnapshotDtos(snapshot);
                const result = deserializeChatEditingSessionSnapshot(linearHistoryIndex, norm);
                linearHistoryIndex += norm.stops.length;
                return result;
            }));
            const initialFileContents = new ResourceMap();
            for (const fileContentDTO of data.initialFileContents) {
                initialFileContents.set(URI.parse(fileContentDTO[0]), await getFileContent(fileContentDTO[1]));
            }
            const pendingSnapshot = data.pendingSnapshot ? await deserializeChatEditingStopDTO(data.pendingSnapshot) : undefined;
            const recentSnapshot = await deserializeChatEditingStopDTO(data.recentSnapshot);
            return {
                initialFileContents,
                pendingSnapshot,
                recentSnapshot,
                linearHistoryIndex: data.linearHistoryIndex,
                linearHistory
            };
        }
        catch (e) {
            this._logService.error(`Error restoring chat editing session from ${storageLocation.toString()}`, e);
        }
        return undefined;
    }
    async storeState(state) {
        const storageFolder = this._getStorageLocation();
        const contentsFolder = URI.joinPath(storageFolder, STORAGE_CONTENTS_FOLDER);
        // prepare the content folder
        const existingContents = new Set();
        try {
            const stat = await this._fileService.resolve(contentsFolder);
            stat.children?.forEach(child => {
                if (child.isFile) {
                    existingContents.add(child.name);
                }
            });
        }
        catch (e) {
            try {
                // does not exist, create
                await this._fileService.createFolder(contentsFolder);
            }
            catch (e) {
                this._logService.error(`Error creating chat editing session content folder ${contentsFolder.toString()}`, e);
                return;
            }
        }
        const contentWritePromises = new Map();
        // saves a file content under a path containing a hash of the content.
        // Returns the hash to represent the content.
        const writeContent = async (content) => {
            const buffer = VSBuffer.fromString(content);
            const hash = (await hashAsync(buffer)).substring(0, 7);
            if (!existingContents.has(hash)) {
                await this._fileService.writeFile(joinPath(contentsFolder, hash), buffer);
            }
            return hash;
        };
        const addFileContent = async (content) => {
            let storedContentHash = contentWritePromises.get(content);
            if (!storedContentHash) {
                storedContentHash = writeContent(content);
                contentWritePromises.set(content, storedContentHash);
            }
            return storedContentHash;
        };
        const serializeResourceMap = async (resourceMap, serialize) => {
            return await Promise.all(Array.from(resourceMap.entries()).map(async ([resourceURI, value]) => [resourceURI.toString(), await serialize(value)]));
        };
        const serializeChatEditingSessionStop = async (stop) => {
            return {
                stopId: stop.stopId,
                entries: await Promise.all(Array.from(stop.entries.values()).map(serializeSnapshotEntry))
            };
        };
        const serializeChatEditingSessionSnapshot = async (snapshot) => {
            return {
                requestId: snapshot.requestId,
                stops: await Promise.all(snapshot.stops.map(serializeChatEditingSessionStop)),
            };
        };
        const serializeSnapshotEntry = async (entry) => {
            return {
                resource: entry.resource.toString(),
                languageId: entry.languageId,
                originalHash: await addFileContent(entry.original),
                currentHash: await addFileContent(entry.current),
                state: entry.state,
                snapshotUri: entry.snapshotUri.toString(),
                telemetryInfo: { requestId: entry.telemetryInfo.requestId, agentId: entry.telemetryInfo.agentId, command: entry.telemetryInfo.command }
            };
        };
        try {
            const data = {
                version: STORAGE_VERSION,
                sessionId: this.chatSessionId,
                linearHistory: await Promise.all(state.linearHistory.map(serializeChatEditingSessionSnapshot)),
                linearHistoryIndex: state.linearHistoryIndex,
                initialFileContents: await serializeResourceMap(state.initialFileContents, value => addFileContent(value)),
                pendingSnapshot: state.pendingSnapshot ? await serializeChatEditingSessionStop(state.pendingSnapshot) : undefined,
                recentSnapshot: await serializeChatEditingSessionStop(state.recentSnapshot),
            };
            this._logService.debug(`chatEditingSession: Storing editing session at ${storageFolder.toString()}: ${contentWritePromises.size} files`);
            await this._fileService.writeFile(joinPath(storageFolder, STORAGE_STATE_FILE), VSBuffer.fromString(JSON.stringify(data)));
        }
        catch (e) {
            this._logService.debug(`Error storing chat editing session to ${storageFolder.toString()}`, e);
        }
    }
    async clearState() {
        const storageFolder = this._getStorageLocation();
        if (await this._fileService.exists(storageFolder)) {
            this._logService.debug(`chatEditingSession: Clearing editing session at ${storageFolder.toString()}`);
            try {
                await this._fileService.del(storageFolder, { recursive: true });
            }
            catch (e) {
                this._logService.debug(`Error clearing chat editing session from ${storageFolder.toString()}`, e);
            }
        }
    }
};
ChatEditingSessionStorage = __decorate([
    __param(1, IFileService),
    __param(2, IEnvironmentService),
    __param(3, ILogService),
    __param(4, IWorkspaceContextService)
], ChatEditingSessionStorage);
export { ChatEditingSessionStorage };
const COMPATIBLE_STORAGE_VERSIONS = [1, 2];
const STORAGE_VERSION = 2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXNzaW9uU3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nU2Vzc2lvblN0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBR2pHLE1BQU0sdUJBQXVCLEdBQUcsVUFBVSxDQUFDO0FBQzNDLE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxDQUFDO0FBVWpDLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQXlCO0lBQ3JDLFlBQ2tCLGFBQXFCLEVBQ1AsWUFBMEIsRUFDbkIsbUJBQXdDLEVBQ2hELFdBQXdCLEVBQ1gsd0JBQWtEO1FBSjVFLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBQ1AsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDbkIsd0JBQW1CLEdBQW5CLG1CQUFt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