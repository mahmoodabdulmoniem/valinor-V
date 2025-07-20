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
import { bufferToStream, newWriteableBufferStream, VSBuffer } from '../../../../base/common/buffer.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { StoredValue } from './storedValue.js';
import { HydratedTestResult } from './testResult.js';
export const RETAIN_MAX_RESULTS = 128;
const RETAIN_MIN_RESULTS = 16;
const RETAIN_MAX_BYTES = 1024 * 128;
const CLEANUP_PROBABILITY = 0.2;
export const ITestResultStorage = createDecorator('ITestResultStorage');
/**
 * Data revision this version of VS Code deals with. Should be bumped whenever
 * a breaking change is made to the stored results, which will cause previous
 * revisions to be discarded.
 */
const currentRevision = 1;
let BaseTestResultStorage = class BaseTestResultStorage extends Disposable {
    constructor(uriIdentityService, storageService, logService) {
        super();
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.stored = this._register(new StoredValue({
            key: 'storedTestResults',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */
        }, storageService));
    }
    /**
     * @override
     */
    async read() {
        const results = await Promise.all(this.stored.get([]).map(async (rec) => {
            if (rec.rev !== currentRevision) {
                return undefined;
            }
            try {
                const contents = await this.readForResultId(rec.id);
                if (!contents) {
                    return undefined;
                }
                return { rec, result: new HydratedTestResult(this.uriIdentityService, contents) };
            }
            catch (e) {
                this.logService.warn(`Error deserializing stored test result ${rec.id}`, e);
                return undefined;
            }
        }));
        const defined = results.filter(isDefined);
        if (defined.length !== results.length) {
            this.stored.store(defined.map(({ rec }) => rec));
        }
        return defined.map(({ result }) => result);
    }
    /**
     * @override
     */
    getResultOutputWriter(resultId) {
        const stream = newWriteableBufferStream();
        this.storeOutputForResultId(resultId, stream);
        return stream;
    }
    /**
     * @override
     */
    async persist(results) {
        const toDelete = new Map(this.stored.get([]).map(({ id, bytes }) => [id, bytes]));
        const toStore = [];
        const todo = [];
        let budget = RETAIN_MAX_BYTES;
        // Run until either:
        // 1. We store all results
        // 2. We store the max results
        // 3. We store the min results, and have no more byte budget
        for (let i = 0; i < results.length && i < RETAIN_MAX_RESULTS && (budget > 0 || toStore.length < RETAIN_MIN_RESULTS); i++) {
            const result = results[i];
            const existingBytes = toDelete.get(result.id);
            if (existingBytes !== undefined) {
                toDelete.delete(result.id);
                toStore.push({ id: result.id, rev: currentRevision, bytes: existingBytes });
                budget -= existingBytes;
                continue;
            }
            const obj = result.toJSON();
            if (!obj) {
                continue;
            }
            const contents = VSBuffer.fromString(JSON.stringify(obj));
            todo.push(this.storeForResultId(result.id, obj));
            toStore.push({ id: result.id, rev: currentRevision, bytes: contents.byteLength });
            budget -= contents.byteLength;
        }
        for (const id of toDelete.keys()) {
            todo.push(this.deleteForResultId(id).catch(() => undefined));
        }
        this.stored.store(toStore);
        await Promise.all(todo);
    }
};
BaseTestResultStorage = __decorate([
    __param(0, IUriIdentityService),
    __param(1, IStorageService),
    __param(2, ILogService)
], BaseTestResultStorage);
export { BaseTestResultStorage };
export class InMemoryResultStorage extends BaseTestResultStorage {
    constructor() {
        super(...arguments);
        this.cache = new Map();
    }
    async readForResultId(id) {
        return Promise.resolve(this.cache.get(id));
    }
    storeForResultId(id, contents) {
        this.cache.set(id, contents);
        return Promise.resolve();
    }
    deleteForResultId(id) {
        this.cache.delete(id);
        return Promise.resolve();
    }
    readOutputForResultId(id) {
        throw new Error('Method not implemented.');
    }
    storeOutputForResultId(id, input) {
        throw new Error('Method not implemented.');
    }
    readOutputRangeForResultId(id, offset, length) {
        throw new Error('Method not implemented.');
    }
}
let TestResultStorage = class TestResultStorage extends BaseTestResultStorage {
    constructor(uriIdentityService, storageService, logService, workspaceContext, fileService, environmentService) {
        super(uriIdentityService, storageService, logService);
        this.fileService = fileService;
        this.directory = URI.joinPath(environmentService.workspaceStorageHome, workspaceContext.getWorkspace().id, 'testResults');
    }
    async readForResultId(id) {
        const contents = await this.fileService.readFile(this.getResultJsonPath(id));
        return JSON.parse(contents.value.toString());
    }
    storeForResultId(id, contents) {
        return this.fileService.writeFile(this.getResultJsonPath(id), VSBuffer.fromString(JSON.stringify(contents)));
    }
    deleteForResultId(id) {
        return this.fileService.del(this.getResultJsonPath(id)).catch(() => undefined);
    }
    async readOutputRangeForResultId(id, offset, length) {
        try {
            const { value } = await this.fileService.readFile(this.getResultOutputPath(id), { position: offset, length });
            return value;
        }
        catch {
            return VSBuffer.alloc(0);
        }
    }
    async readOutputForResultId(id) {
        try {
            const { value } = await this.fileService.readFileStream(this.getResultOutputPath(id));
            return value;
        }
        catch {
            return bufferToStream(VSBuffer.alloc(0));
        }
    }
    async storeOutputForResultId(id, input) {
        await this.fileService.createFile(this.getResultOutputPath(id), input);
    }
    /**
     * @inheritdoc
     */
    async persist(results) {
        await super.persist(results);
        if (Math.random() < CLEANUP_PROBABILITY) {
            await this.cleanupDereferenced();
        }
    }
    /**
     * Cleans up orphaned files. For instance, output can get orphaned if it's
     * written but the editor is closed before the test run is complete.
     */
    async cleanupDereferenced() {
        const { children } = await this.fileService.resolve(this.directory);
        if (!children) {
            return;
        }
        const stored = new Set(this.stored.get([]).filter(s => s.rev === currentRevision).map(s => s.id));
        await Promise.all(children
            .filter(child => !stored.has(child.name.replace(/\.[a-z]+$/, '')))
            .map(child => this.fileService.del(child.resource).catch(() => undefined)));
    }
    getResultJsonPath(id) {
        return URI.joinPath(this.directory, `${id}.json`);
    }
    getResultOutputPath(id) {
        return URI.joinPath(this.directory, `${id}.output`);
    }
};
TestResultStorage = __decorate([
    __param(0, IUriIdentityService),
    __param(1, IStorageService),
    __param(2, ILogService),
    __param(3, IWorkspaceContextService),
    __param(4, IFileService),
    __param(5, IEnvironmentService)
], TestResultStorage);
export { TestResultStorage };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdFN0b3JhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RSZXN1bHRTdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsUUFBUSxFQUFtRCxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hKLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxrQkFBa0IsRUFBZSxNQUFNLGlCQUFpQixDQUFDO0FBR2xFLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQztBQUN0QyxNQUFNLGtCQUFrQixHQUFHLEVBQUUs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