/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event, Emitter } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { StoredFileWorkingCopy, isStoredFileWorkingCopySaveEvent } from '../../common/storedFileWorkingCopy.js';
import { bufferToStream, newWriteableBufferStream, streamToBuffer, VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { getLastResolvedFileStat, TestServiceAccessor, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { basename } from '../../../../../base/common/resources.js';
import { FileChangesEvent, FileOperationError, NotModifiedSinceFileOperationError } from '../../../../../platform/files/common/files.js';
import { SaveSourceRegistry } from '../../../../common/editor.js';
import { Promises, timeout } from '../../../../../base/common/async.js';
import { consumeReadable, consumeStream, isReadableStream } from '../../../../../base/common/stream.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { assertReturnsDefined } from '../../../../../base/common/types.js';
export class TestStoredFileWorkingCopyModel extends Disposable {
    constructor(resource, contents) {
        super();
        this.resource = resource;
        this.contents = contents;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.throwOnSnapshot = false;
        this.versionId = 0;
        this.pushedStackElement = false;
    }
    fireContentChangeEvent(event) {
        this._onDidChangeContent.fire(event);
    }
    updateContents(newContents) {
        this.doUpdate(newContents);
    }
    setThrowOnSnapshot() {
        this.throwOnSnapshot = true;
    }
    async snapshot(context, token) {
        if (this.throwOnSnapshot) {
            throw new Error('Fail');
        }
        const stream = newWriteableBufferStream();
        stream.end(VSBuffer.fromString(this.contents));
        return stream;
    }
    async update(contents, token) {
        this.doUpdate((await streamToBuffer(contents)).toString());
    }
    doUpdate(newContents) {
        this.contents = newContents;
        this.versionId++;
        this._onDidChangeContent.fire({ isRedoing: false, isUndoing: false });
    }
    pushStackElement() {
        this.pushedStackElement = true;
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
}
export class TestStoredFileWorkingCopyModelWithCustomSave extends TestStoredFileWorkingCopyModel {
    constructor() {
        super(...arguments);
        this.saveCounter = 0;
        this.throwOnSave = false;
        this.saveOperation = undefined;
    }
    async save(options, token) {
        if (this.throwOnSave) {
            throw new Error('Fail');
        }
        if (this.saveOperation) {
            await this.saveOperation;
        }
        if (token.isCancellationRequested) {
            throw new Error('Canceled');
        }
        this.saveCounter++;
        return {
            resource: this.resource,
            ctime: 0,
            etag: '',
            isDirectory: false,
            isFile: true,
            mtime: 0,
            name: 'resource2',
            size: 0,
            isSymbolicLink: false,
            readonly: false,
            locked: false,
            children: undefined
        };
    }
}
export class TestStoredFileWorkingCopyModelFactory {
    async createModel(resource, contents, token) {
        return new TestStoredFileWorkingCopyModel(resource, (await streamToBuffer(contents)).toString());
    }
}
export class TestStoredFileWorkingCopyModelWithCustomSaveFactory {
    async createModel(resource, contents, token) {
        return new TestStoredFileWorkingCopyModelWithCustomSave(resource, (await streamToBuffer(contents)).toString());
    }
}
suite('StoredFileWorkingCopy (with custom save)', function () {
    const factory = new TestStoredFileWorkingCopyModelWithCustomSaveFactory();
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let workingCopy;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        const resource = URI.file('test/resource');
        workingCopy = disposables.add(new StoredFileWorkingCopy('testStoredFileWorkingCopyType', resource, basename(resource), factory, options => workingCopy.resolve(options), accessor.fileService, accessor.logService, accessor.workingCopyFileService, accessor.filesConfigurationService, accessor.workingCopyBackupService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.progressService));
    });
    teardown(() => {
        disposables.clear();
    });
    test('save (custom implemented)', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // unresolved
        await workingCopy.save();
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 0);
        // simple
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        await workingCopy.save();
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 1 /* SaveReason.EXPLICIT */);
        assert.ok(lastSaveEvent.stat);
        assert.ok(isStoredFileWorkingCopySaveEvent(lastSaveEvent));
        assert.strictEqual(workingCopy.model?.pushedStackElement, true);
        assert.strictEqual(workingCopy.model.saveCounter, 1);
        // error
        workingCopy.model?.updateContents('hello save error');
        workingCopy.model.throwOnSave = true;
        await workingCopy.save();
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
    });
    test('save cancelled (custom implemented)', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        await workingCopy.resolve();
        let resolve;
        workingCopy.model.saveOperation = new Promise(r => resolve = r);
        workingCopy.model?.updateContents('first');
        const firstSave = workingCopy.save();
        // cancel the first save by requesting a second while it is still mid operation
        workingCopy.model?.updateContents('second');
        const secondSave = workingCopy.save();
        resolve();
        await firstSave;
        await secondSave;
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 1 /* SaveReason.EXPLICIT */);
        assert.ok(lastSaveEvent.stat);
        assert.ok(isStoredFileWorkingCopySaveEvent(lastSaveEvent));
        assert.strictEqual(workingCopy.model?.pushedStackElement, true);
        assert.strictEqual(workingCopy.model.saveCounter, 1);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('StoredFileWorkingCopy', function () {
    const factory = new TestStoredFileWorkingCopyModelFactory();
    const disposables = new DisposableStore();
    const resource = URI.file('test/resource');
    let instantiationService;
    let accessor;
    let workingCopy;
    function createWorkingCopy(uri = resource) {
        const workingCopy = new StoredFileWorkingCopy('testStoredFileWorkingCopyType', uri, basename(uri), factory, options => workingCopy.resolve(options), accessor.fileService, accessor.logService, accessor.workingCopyFileService, accessor.filesConfigurationService, accessor.workingCopyBackupService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.progressService);
        return workingCopy;
    }
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        workingCopy = disposables.add(createWorkingCopy());
    });
    teardown(() => {
        workingCopy.dispose();
        for (const workingCopy of accessor.workingCopyService.workingCopies) {
            workingCopy.dispose();
        }
        disposables.clear();
    });
    test('registers with working copy service', async () => {
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 1);
        workingCopy.dispose();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
    });
    test('orphaned tracking', async () => {
        return runWithFakedTimers({}, async () => {
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
            let onDidChangeOrphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await onDidChangeOrphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            onDidChangeOrphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.delete(resource);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 1 /* FileChangeType.ADDED */ }], false));
            await onDidChangeOrphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
        });
    });
    test('dirty / modified', async () => {
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isResolved(), true);
        let changeDirtyCounter = 0;
        disposables.add(workingCopy.onDidChangeDirty(() => {
            changeDirtyCounter++;
        }));
        let contentChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeContent(() => {
            contentChangeCounter++;
        }));
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(() => {
            savedCounter++;
        }));
        // Dirty from: Model content change
        workingCopy.model?.updateContents('hello dirty');
        assert.strictEqual(contentChangeCounter, 1);
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(changeDirtyCounter, 1);
        await workingCopy.save();
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(changeDirtyCounter, 2);
        assert.strictEqual(savedCounter, 1);
        // Dirty from: Initial contents
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello dirty stream')) });
        assert.strictEqual(contentChangeCounter, 2); // content of model did not change
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(changeDirtyCounter, 3);
        await workingCopy.revert({ soft: true });
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(changeDirtyCounter, 4);
        // Modified from: API
        workingCopy.markModified();
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(changeDirtyCounter, 5);
        await workingCopy.revert();
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(changeDirtyCounter, 6);
    });
    test('dirty - working copy marks non-dirty when undo reaches saved version ID', async () => {
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello saved state');
        await workingCopy.save();
        assert.strictEqual(workingCopy.isDirty(), false);
        workingCopy.model?.updateContents('changing content once');
        assert.strictEqual(workingCopy.isDirty(), true);
        // Simulate an undo that goes back to the last (saved) version ID
        workingCopy.model.versionId--;
        workingCopy.model?.fireContentChangeEvent({ isRedoing: false, isUndoing: true });
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('resolve (without backup)', async () => {
        let onDidResolveCounter = 0;
        disposables.add(workingCopy.onDidResolve(() => {
            onDidResolveCounter++;
        }));
        // resolve from file
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isResolved(), true);
        assert.strictEqual(onDidResolveCounter, 1);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
        // dirty resolve returns early
        workingCopy.model?.updateContents('hello resolve');
        assert.strictEqual(workingCopy.isDirty(), true);
        await workingCopy.resolve();
        assert.strictEqual(onDidResolveCounter, 1);
        assert.strictEqual(workingCopy.model?.contents, 'hello resolve');
        // dirty resolve with contents updates contents
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello initial contents')) });
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.model?.contents, 'hello initial contents');
        assert.strictEqual(onDidResolveCounter, 2);
        // resolve with pending save returns directly
        const pendingSave = workingCopy.save();
        await workingCopy.resolve();
        await pendingSave;
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.model?.contents, 'hello initial contents');
        assert.strictEqual(onDidResolveCounter, 2);
        // disposed resolve is not throwing an error
        workingCopy.dispose();
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDisposed(), true);
        assert.strictEqual(onDidResolveCounter, 2);
    });
    test('resolve (with backup)', async () => {
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello backup')) });
        const backup = await workingCopy.backup(CancellationToken.None);
        await accessor.workingCopyBackupService.backup(workingCopy, backup.content, undefined, backup.meta);
        assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(workingCopy), true);
        workingCopy.dispose();
        // first resolve loads from backup
        workingCopy = createWorkingCopy();
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(workingCopy.model?.contents, 'hello backup');
        workingCopy.model.updateContents('hello updated');
        await workingCopy.save();
        // subsequent resolve ignores any backups
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
    });
    test('resolve (with backup, preserves metadata and orphaned state)', async () => {
        return runWithFakedTimers({}, async () => {
            await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello backup')) });
            const orphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await orphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            const backup = await workingCopy.backup(CancellationToken.None);
            await accessor.workingCopyBackupService.backup(workingCopy, backup.content, undefined, backup.meta);
            assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(workingCopy), true);
            workingCopy.dispose();
            workingCopy = createWorkingCopy();
            await workingCopy.resolve();
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            const backup2 = await workingCopy.backup(CancellationToken.None);
            assert.deepStrictEqual(backup.meta, backup2.meta);
        });
    });
    test('resolve (updates orphaned state accordingly)', async () => {
        return runWithFakedTimers({}, async () => {
            await workingCopy.resolve();
            const orphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await orphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            // resolving clears orphaned state when successful
            accessor.fileService.notExistsSet.delete(resource);
            await workingCopy.resolve({ forceReadFromFile: true });
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
            // resolving adds orphaned state when fail to read
            try {
                accessor.fileService.readShouldThrowError = new FileOperationError('file not found', 1 /* FileOperationResult.FILE_NOT_FOUND */);
                await workingCopy.resolve();
                assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            }
            finally {
                accessor.fileService.readShouldThrowError = undefined;
            }
        });
    });
    test('stat.readonly and stat.locked can change when decreased mtime is ignored', async function () {
        await workingCopy.resolve();
        const stat = assertReturnsDefined(getLastResolvedFileStat(workingCopy));
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('error', { ...stat, mtime: stat.mtime - 1, readonly: !stat.readonly, locked: !stat.locked });
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(getLastResolvedFileStat(workingCopy)?.mtime, stat.mtime, 'mtime should not decrease');
        assert.notStrictEqual(getLastResolvedFileStat(workingCopy)?.readonly, stat.readonly, 'readonly should have changed despite simultaneous attempt to decrease mtime');
        assert.notStrictEqual(getLastResolvedFileStat(workingCopy)?.locked, stat.locked, 'locked should have changed despite simultaneous attempt to decrease mtime');
    });
    test('resolve (FILE_NOT_MODIFIED_SINCE can be handled for resolved working copies)', async () => {
        await workingCopy.resolve();
        try {
            accessor.fileService.readShouldThrowError = new FileOperationError('file not modified since', 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */);
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
    });
    test('resolve (FILE_NOT_MODIFIED_SINCE still updates readonly state)', async () => {
        let readonlyChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeReadonly(() => readonlyChangeCounter++));
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isReadonly(), false);
        const stat = await accessor.fileService.resolve(workingCopy.resource, { resolveMetadata: true });
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('file not modified since', { ...stat, readonly: true });
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(!!workingCopy.isReadonly(), true);
        assert.strictEqual(readonlyChangeCounter, 1);
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('file not modified since', { ...stat, readonly: false });
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(readonlyChangeCounter, 2);
    });
    test('resolve does not alter content when model content changed in parallel', async () => {
        await workingCopy.resolve();
        const resolvePromise = workingCopy.resolve();
        workingCopy.model?.updateContents('changed content');
        await resolvePromise;
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.model?.contents, 'changed content');
    });
    test('backup', async () => {
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello backup');
        const backup = await workingCopy.backup(CancellationToken.None);
        assert.ok(backup.meta);
        let backupContents = undefined;
        if (backup.content instanceof VSBuffer) {
            backupContents = backup.content.toString();
        }
        else if (isReadableStream(backup.content)) {
            backupContents = (await consumeStream(backup.content, chunks => VSBuffer.concat(chunks))).toString();
        }
        else if (backup.content) {
            backupContents = consumeReadable(backup.content, chunks => VSBuffer.concat(chunks)).toString();
        }
        assert.strictEqual(backupContents, 'hello backup');
    });
    test('save (no errors) - simple', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // unresolved
        await workingCopy.save();
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 0);
        // simple
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        await workingCopy.save();
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 1 /* SaveReason.EXPLICIT */);
        assert.ok(lastSaveEvent.stat);
        assert.ok(isStoredFileWorkingCopySaveEvent(lastSaveEvent));
        assert.strictEqual(workingCopy.model?.pushedStackElement, true);
    });
    test('save (no errors) - save reason', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // save reason
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        const source = SaveSourceRegistry.registerSource('testSource', 'Hello Save');
        await workingCopy.save({ reason: 2 /* SaveReason.AUTO */, source });
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 2 /* SaveReason.AUTO */);
        assert.strictEqual(lastSaveEvent.source, source);
    });
    test('save (no errors) - multiple', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // multiple saves in parallel are fine and result
        // in a single save when content does not change
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        await Promises.settled([
            workingCopy.save({ reason: 2 /* SaveReason.AUTO */ }),
            workingCopy.save({ reason: 1 /* SaveReason.EXPLICIT */ }),
            workingCopy.save({ reason: 4 /* SaveReason.WINDOW_CHANGE */ })
        ]);
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - multiple, cancellation', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // multiple saves in parallel are fine and result
        // in just one save operation (the second one
        // cancels the first)
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        const firstSave = workingCopy.save();
        workingCopy.model?.updateContents('hello save more');
        const secondSave = workingCopy.save();
        await Promises.settled([firstSave, secondSave]);
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - not forced but not dirty', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // no save when not forced and not dirty
        await workingCopy.resolve();
        await workingCopy.save();
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - forced but not dirty', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(e => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // save when forced even when not dirty
        await workingCopy.resolve();
        await workingCopy.save({ force: true });
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - save clears orphaned', async () => {
        return runWithFakedTimers({}, async () => {
            let savedCounter = 0;
            disposables.add(workingCopy.onDidSave(e => {
                savedCounter++;
            }));
            let saveErrorCounter = 0;
            disposables.add(workingCopy.onDidSaveError(() => {
                saveErrorCounter++;
            }));
            await workingCopy.resolve();
            // save clears orphaned
            const orphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await orphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            await workingCopy.save({ force: true });
            assert.strictEqual(savedCounter, 1);
            assert.strictEqual(saveErrorCounter, 0);
            assert.strictEqual(workingCopy.isDirty(), false);
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
        });
    });
    test('save (errors)', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(reason => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        await workingCopy.resolve();
        // save error: any error marks working copy dirty
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            await workingCopy.save({ force: true });
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), true);
        // save is a no-op unless forced when in error case
        await workingCopy.save({ reason: 2 /* SaveReason.AUTO */ });
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), true);
        // save clears error flags when successful
        await workingCopy.save({ reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        // save error: conflict
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error conflict', 3 /* FileOperationResult.FILE_MODIFIED_SINCE */);
            await workingCopy.save({ force: true });
        }
        catch (error) {
            // error is expected
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 2);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        // save clears error flags when successful
        await workingCopy.save({ reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(savedCounter, 2);
        assert.strictEqual(saveErrorCounter, 2);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (errors, bubbles up with `ignoreErrorHandler`)', async () => {
        await workingCopy.resolve();
        let error = undefined;
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            await workingCopy.save({ force: true, ignoreErrorHandler: true });
        }
        catch (e) {
            error = e;
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        assert.ok(error);
    });
    test('save - returns false when save fails', async function () {
        await workingCopy.resolve();
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            const res = await workingCopy.save({ force: true });
            assert.strictEqual(res, false);
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        const res = await workingCopy.save({ force: true });
        assert.strictEqual(res, true);
    });
    test('save participant', async () => {
        await workingCopy.resolve();
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        let participationCounter = 0;
        const disposable = accessor.workingCopyFileService.addSaveParticipant({
            participate: async (wc) => {
                if (workingCopy === wc) {
                    participationCounter++;
                }
            }
        });
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, true);
        await workingCopy.save({ force: true });
        assert.strictEqual(participationCounter, 1);
        await workingCopy.save({ force: true, skipSaveParticipants: true });
        assert.strictEqual(participationCounter, 1);
        disposable.dispose();
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        await workingCopy.save({ force: true });
        assert.strictEqual(participationCounter, 1);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (sync save)', async function () {
        await workingCopy.resolve();
        await testSaveFromSaveParticipant(workingCopy, false);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (async save)', async function () {
        await workingCopy.resolve();
        await testSaveFromSaveParticipant(workingCopy, true);
    });
    async function testSaveFromSaveParticipant(workingCopy, async) {
        const from = URI.file('testFrom');
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        const disposable = accessor.workingCopyFileService.addSaveParticipant({
            participate: async (wc, context) => {
                if (async) {
                    await timeout(10);
                }
                await workingCopy.save({ force: true });
            }
        });
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, true);
        await workingCopy.save({ force: true, from });
        disposable.dispose();
    }
    test('Save Participant carries context', async function () {
        await workingCopy.resolve();
        const from = URI.file('testFrom');
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        let e = undefined;
        const disposable = accessor.workingCopyFileService.addSaveParticipant({
            participate: async (wc, context) => {
                try {
                    assert.strictEqual(context.reason, 1 /* SaveReason.EXPLICIT */);
                    assert.strictEqual(context.savedFrom?.toString(), from.toString());
                }
                catch (error) {
                    e = error;
                }
            }
        });
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, true);
        await workingCopy.save({ force: true, from });
        if (e) {
            throw e;
        }
        disposable.dispose();
    });
    test('revert', async () => {
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello revert');
        let revertedCounter = 0;
        disposables.add(workingCopy.onDidRevert(() => {
            revertedCounter++;
        }));
        // revert: soft
        await workingCopy.revert({ soft: true });
        assert.strictEqual(revertedCounter, 1);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.model?.contents, 'hello revert');
        // revert: not forced
        await workingCopy.revert();
        assert.strictEqual(revertedCounter, 1);
        assert.strictEqual(workingCopy.model?.contents, 'hello revert');
        // revert: forced
        await workingCopy.revert({ force: true });
        assert.strictEqual(revertedCounter, 2);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
        // revert: forced, error
        try {
            workingCopy.model?.updateContents('hello revert');
            accessor.fileService.readShouldThrowError = new FileOperationError('error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            await workingCopy.revert({ force: true });
        }
        catch (error) {
            // expected (our error)
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(revertedCounter, 2);
        assert.strictEqual(workingCopy.isDirty(), true);
        // revert: forced, file not found error is ignored
        try {
            workingCopy.model?.updateContents('hello revert');
            accessor.fileService.readShouldThrowError = new FileOperationError('error', 1 /* FileOperationResult.FILE_NOT_FOUND */);
            await workingCopy.revert({ force: true });
        }
        catch (error) {
            // expected (our error)
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(revertedCounter, 3);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('state', async () => {
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello state')) });
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        const savePromise = workingCopy.save();
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), true);
        await savePromise;
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
    });
    test('joinState', async () => {
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello state')) });
        workingCopy.save();
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), true);
        await workingCopy.joinState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
    });
    test('isReadonly, isResolved, dispose, isDisposed', async () => {
        assert.strictEqual(workingCopy.isResolved(), false);
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(workingCopy.isDisposed(), false);
        await workingCopy.resolve();
        assert.ok(workingCopy.model);
        assert.strictEqual(workingCopy.isResolved(), true);
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(workingCopy.isDisposed(), false);
        let disposedEvent = false;
        disposables.add(workingCopy.onWillDispose(() => {
            disposedEvent = true;
        }));
        let disposedModelEvent = false;
        disposables.add(workingCopy.model.onWillDispose(() => {
            disposedModelEvent = true;
        }));
        workingCopy.dispose();
        assert.strictEqual(workingCopy.isDisposed(), true);
        assert.strictEqual(disposedEvent, true);
        assert.strictEqual(disposedModelEvent, true);
    });
    test('readonly change event', async () => {
        accessor.fileService.readonly = true;
        await workingCopy.resolve();
        assert.strictEqual(!!workingCopy.isReadonly(), true);
        accessor.fileService.readonly = false;
        let readonlyEvent = false;
        disposables.add(workingCopy.onDidChangeReadonly(() => {
            readonlyEvent = true;
        }));
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(readonlyEvent, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkRmlsZVdvcmtpbmdDb3B5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS90ZXN0L2Jyb3dzZXIvc3RvcmVkRmlsZVdvcmtpbmdDb3B5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBK0ksZ0NBQWdDLEVBQW1DLE1BQU0sdUNBQXVDLENBQUM7QUFDOVIsT0FBTyxFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUEwQixNQUFNLHNDQUFzQyxDQUFDO0FBQ2xKLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLG1CQUFtQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFaEosT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBa0Isa0JBQWtCLEVBQWlFLGtDQUFrQyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDeE4sT0FBTyxFQUFjLGtCQUFrQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztB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