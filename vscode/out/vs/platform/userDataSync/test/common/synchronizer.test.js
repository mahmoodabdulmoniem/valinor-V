/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Barrier } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { isEqual, joinPath } from '../../../../base/common/resources.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IFileService } from '../../../files/common/files.js';
import { IStorageService } from '../../../storage/common/storage.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { AbstractSynchroniser } from '../../common/abstractSynchronizer.js';
import { IUserDataSyncStoreService, USER_DATA_SYNC_SCHEME } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
class TestSynchroniser extends AbstractSynchroniser {
    constructor() {
        super(...arguments);
        this.syncBarrier = new Barrier();
        this.syncResult = { hasConflicts: false, hasError: false };
        this.onDoSyncCall = this._register(new Emitter());
        this.failWhenGettingLatestRemoteUserData = false;
        this.version = 1;
        this.cancelled = false;
        this.localResource = joinPath(this.environmentService.userRoamingDataHome, 'testResource.json');
        this.onDidTriggerLocalChangeCall = this._register(new Emitter());
    }
    getMachineId() { return this.currentMachineIdPromise; }
    getLastSyncResource() { return this.lastSyncResource; }
    getLatestRemoteUserData(refOrLatestData, lastSyncUserData) {
        if (this.failWhenGettingLatestRemoteUserData) {
            throw new Error();
        }
        return super.getLatestRemoteUserData(refOrLatestData, lastSyncUserData);
    }
    async doSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration) {
        this.cancelled = false;
        this.onDoSyncCall.fire();
        await this.syncBarrier.wait();
        if (this.cancelled) {
            return "idle" /* SyncStatus.Idle */;
        }
        return super.doSync(remoteUserData, lastSyncUserData, strategy, userDataSyncConfiguration);
    }
    async generateSyncPreview(remoteUserData) {
        if (this.syncResult.hasError) {
            throw new Error('failed');
        }
        let fileContent = null;
        try {
            fileContent = await this.fileService.readFile(this.localResource);
        }
        catch (error) { }
        return [{
                baseResource: this.localResource.with(({ scheme: USER_DATA_SYNC_SCHEME, authority: 'base' })),
                baseContent: null,
                localResource: this.localResource,
                localContent: fileContent ? fileContent.value.toString() : null,
                remoteResource: this.localResource.with(({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' })),
                remoteContent: remoteUserData.syncData ? remoteUserData.syncData.content : null,
                previewResource: this.localResource.with(({ scheme: USER_DATA_SYNC_SCHEME, authority: 'preview' })),
                ref: remoteUserData.ref,
                localChange: 2 /* Change.Modified */,
                remoteChange: 2 /* Change.Modified */,
                acceptedResource: this.localResource.with(({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' })),
            }];
    }
    async hasRemoteChanged(lastSyncUserData) {
        return true;
    }
    async getMergeResult(resourcePreview, token) {
        return {
            content: resourcePreview.ref,
            localChange: 2 /* Change.Modified */,
            remoteChange: 2 /* Change.Modified */,
            hasConflicts: this.syncResult.hasConflicts,
        };
    }
    async getAcceptResult(resourcePreview, resource, content, token) {
        if (isEqual(resource, resourcePreview.localResource)) {
            return {
                content: resourcePreview.localContent,
                localChange: 0 /* Change.None */,
                remoteChange: resourcePreview.localContent === null ? 3 /* Change.Deleted */ : 2 /* Change.Modified */,
            };
        }
        if (isEqual(resource, resourcePreview.remoteResource)) {
            return {
                content: resourcePreview.remoteContent,
                localChange: resourcePreview.remoteContent === null ? 3 /* Change.Deleted */ : 2 /* Change.Modified */,
                remoteChange: 0 /* Change.None */,
            };
        }
        if (isEqual(resource, resourcePreview.previewResource)) {
            if (content === undefined) {
                return {
                    content: resourcePreview.ref,
                    localChange: 2 /* Change.Modified */,
                    remoteChange: 2 /* Change.Modified */,
                };
            }
            else {
                return {
                    content,
                    localChange: content === null ? resourcePreview.localContent !== null ? 3 /* Change.Deleted */ : 0 /* Change.None */ : 2 /* Change.Modified */,
                    remoteChange: content === null ? resourcePreview.remoteContent !== null ? 3 /* Change.Deleted */ : 0 /* Change.None */ : 2 /* Change.Modified */,
                };
            }
        }
        throw new Error(`Invalid Resource: ${resource.toString()}`);
    }
    async applyResult(remoteUserData, lastSyncUserData, resourcePreviews, force) {
        if (resourcePreviews[0][1].localChange === 3 /* Change.Deleted */) {
            await this.fileService.del(this.localResource);
        }
        if (resourcePreviews[0][1].localChange === 1 /* Change.Added */ || resourcePreviews[0][1].localChange === 2 /* Change.Modified */) {
            await this.fileService.writeFile(this.localResource, VSBuffer.fromString(resourcePreviews[0][1].content));
        }
        if (resourcePreviews[0][1].remoteChange === 3 /* Change.Deleted */) {
            await this.applyRef(null, remoteUserData.ref);
        }
        if (resourcePreviews[0][1].remoteChange === 1 /* Change.Added */ || resourcePreviews[0][1].remoteChange === 2 /* Change.Modified */) {
            await this.applyRef(resourcePreviews[0][1].content, remoteUserData.ref);
        }
    }
    async applyRef(content, ref) {
        const remoteUserData = await this.updateRemoteUserData(content === null ? '' : content, ref);
        await this.updateLastSyncUserData(remoteUserData);
    }
    async stop() {
        this.cancelled = true;
        this.syncBarrier.open();
        super.stop();
    }
    testTriggerLocalChange() {
        this.triggerLocalChange();
    }
    async doTriggerLocalChange() {
        await super.doTriggerLocalChange();
        this.onDidTriggerLocalChangeCall.fire();
    }
    hasLocalData() { throw new Error('not implemented'); }
    async resolveContent(uri) { return null; }
}
suite('TestSynchronizer - Auto Sync', () => {
    const server = new UserDataSyncTestServer();
    let client;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp();
    });
    test('status is syncing', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus(status => actual.push(status)));
            const promise = Event.toPromise(testObject.onDoSyncCall.event);
            testObject.sync(await client.getLatestRef(testObject.resource));
            await promise;
            assert.deepStrictEqual(actual, ["syncing" /* SyncStatus.Syncing */]);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            testObject.stop();
        });
    });
    test('status is set correctly when sync is finished', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus(status => actual.push(status)));
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(actual, ["syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */]);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        });
    });
    test('status is set correctly when sync has errors', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasError: true, hasConflicts: false };
            testObject.syncBarrier.open();
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus(status => actual.push(status)));
            try {
                await testObject.sync(await client.getLatestRef(testObject.resource));
                assert.fail('Should fail');
            }
            catch (e) {
                assert.deepStrictEqual(actual, ["syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */]);
                assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            }
        });
    });
    test('status is set to hasConflicts when asked to sync if there are conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            assertConflicts(testObject.conflicts.conflicts, [testObject.localResource]);
        });
    });
    test('sync should not run if syncing already', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            const promise = Event.toPromise(testObject.onDoSyncCall.event);
            testObject.sync(await client.getLatestRef(testObject.resource));
            await promise;
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus(status => actual.push(status)));
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(actual, []);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            await testObject.stop();
        });
    });
    test('sync should not run if there are conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const actual = [];
            disposableStore.add(testObject.onDidChangeStatus(status => actual.push(status)));
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(actual, []);
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        });
    });
    test('accept preview during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            const fileService = client.instantiationService.get(IFileService);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, (await fileService.readFile(testObject.localResource)).value.toString());
        });
    });
    test('accept remote during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const fileService = client.instantiationService.get(IFileService);
            const currentRemoteContent = (await testObject.getRemoteUserData(null)).syncData?.content;
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, currentRemoteContent);
            assert.strictEqual((await fileService.readFile(testObject.localResource)).value.toString(), currentRemoteContent);
        });
    });
    test('accept local during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const fileService = client.instantiationService.get(IFileService);
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].localResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, newLocalContent);
            assert.strictEqual((await fileService.readFile(testObject.localResource)).value.toString(), newLocalContent);
        });
    });
    test('accept new content during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const fileService = client.instantiationService.get(IFileService);
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            const mergeContent = 'newContent';
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource, mergeContent);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, mergeContent);
            assert.strictEqual((await fileService.readFile(testObject.localResource)).value.toString(), mergeContent);
        });
    });
    test('accept delete during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const fileService = client.instantiationService.get(IFileService);
            const newLocalContent = 'conflict';
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString(newLocalContent));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].previewResource, null);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, '');
            assert.ok(!(await fileService.exists(testObject.localResource)));
        });
    });
    test('accept deleted local during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const fileService = client.instantiationService.get(IFileService);
            await fileService.del(testObject.localResource);
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].localResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, '');
            assert.ok(!(await fileService.exists(testObject.localResource)));
        });
    });
    test('accept deleted remote during conflicts', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            const fileService = client.instantiationService.get(IFileService);
            await fileService.writeFile(testObject.localResource, VSBuffer.fromString('some content'));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            await testObject.accept(testObject.conflicts.conflicts[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertConflicts(testObject.conflicts.conflicts, []);
            await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData, null);
            assert.ok(!(await fileService.exists(testObject.localResource)));
        });
    });
    test('request latest data on precondition failure', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            // Sync once
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            testObject.syncBarrier = new Barrier();
            // update remote data before syncing so that 412 is thrown by server
            const disposable = testObject.onDoSyncCall.event(async () => {
                disposable.dispose();
                await testObject.applyRef(ref, ref);
                server.reset();
                testObject.syncBarrier.open();
            });
            // Start sycing
            const ref = await client.getLatestRef(testObject.resource);
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(server.requests, [
                { type: 'POST', url: `${server.url}/v1/resource/${testObject.resource}`, headers: { 'If-Match': ref } },
                { type: 'GET', url: `${server.url}/v1/resource/${testObject.resource}/latest`, headers: {} },
                { type: 'POST', url: `${server.url}/v1/resource/${testObject.resource}`, headers: { 'If-Match': `${parseInt(ref) + 1}` } },
            ]);
        });
    });
    test('no requests are made to server when local change is triggered', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            server.reset();
            const promise = Event.toPromise(testObject.onDidTriggerLocalChangeCall.event);
            testObject.testTriggerLocalChange();
            await promise;
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('status is reset when getting latest remote data fails', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.failWhenGettingLatestRemoteUserData = true;
            try {
                await testObject.sync(await client.getLatestRef(testObject.resource));
                assert.fail('Should throw an error');
            }
            catch (error) {
            }
            assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        });
    });
});
suite('TestSynchronizer - Manual Sync', () => {
    const server = new UserDataSyncTestServer();
    let client;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp();
    });
    test('preview', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            const preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preview -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preview -> merge -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const ref = await client.getLatestRef(testObject.resource);
            let preview = await testObject.sync(ref, true);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, ref);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), ref);
        });
    });
    test('preview -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const ref = await client.getLatestRef(testObject.resource);
            let preview = await testObject.sync(ref, true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, ref);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), ref);
        });
    });
    test('preivew -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> accept -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> accept -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('preivew -> discard -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const expectedContent = (await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('conflicts: preview', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            const preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "conflict" /* MergeState.Conflict */);
            assertConflicts(testObject.conflicts.conflicts, [preview.resourcePreviews[0].localResource]);
        });
    });
    test('conflicts: preview -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            const preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preview -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            const content = await testObject.resolveContent(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource, content);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preview -> accept 2', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            const content = await testObject.resolveContent(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource, content);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preview -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            const ref = await client.getLatestRef(testObject.resource);
            let preview = await testObject.sync(ref, true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, ref);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), ref);
        });
    });
    test('conflicts: preivew -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> accept -> discard -> accept', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: true, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "accepted" /* MergeState.Accepted */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> accept -> discard', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            assert.deepStrictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
            assertPreviews(preview.resourcePreviews, [testObject.localResource]);
            assert.strictEqual(preview.resourcePreviews[0].mergeState, "preview" /* MergeState.Preview */);
            assertConflicts(testObject.conflicts.conflicts, []);
        });
    });
    test('conflicts: preivew -> discard -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const expectedContent = (await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('conflicts: preivew -> accept -> discard -> accept -> apply', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncResult = { hasConflicts: false, hasError: false };
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const expectedContent = (await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString();
            let preview = await testObject.sync(await client.getLatestRef(testObject.resource), true);
            preview = await testObject.accept(preview.resourcePreviews[0].remoteResource);
            preview = await testObject.discard(preview.resourcePreviews[0].previewResource);
            preview = await testObject.accept(preview.resourcePreviews[0].localResource);
            preview = await testObject.apply(false);
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual(preview, null);
            assertConflicts(testObject.conflicts.conflicts, []);
            assert.strictEqual((await testObject.getRemoteUserData(null)).syncData?.content, expectedContent);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), expectedContent);
        });
    });
    test('remote is accepted if last sync state does not exists in server', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const client2 = disposableStore.add(new UserDataSyncClient(server));
            await client2.setUp();
            const synchronizer2 = disposableStore.add(client2.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client2.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            synchronizer2.syncBarrier.open();
            const ref = await client2.getLatestRef(testObject.resource);
            await synchronizer2.sync(ref);
            await fileService.del(testObject.getLastSyncResource());
            await testObject.sync(await client.getLatestRef(testObject.resource));
            assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
            assert.strictEqual((await client.instantiationService.get(IFileService).readFile(testObject.localResource)).value.toString(), ref);
        });
    });
});
suite('TestSynchronizer - Last Sync Data', () => {
    const server = new UserDataSyncTestServer();
    let client;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp();
    });
    test('last sync data is null when not synced before', async () => {
        await runWithFakedTimers({}, async () => {
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            const actual = await testObject.getLastSyncUserData();
            assert.strictEqual(actual, null);
        });
    });
    test('last sync data is set after sync', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const machineId = await testObject.getMachineId();
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(JSON.parse((await fileService.readFile(testObject.getLastSyncResource())).value.toString()), { ref: '1', syncData: { version: 1, machineId, content: '0' } });
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1
                },
            });
        });
    });
    test('last sync data is read from server after sync if last sync resource is deleted', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const machineId = await testObject.getMachineId();
            await fileService.del(testObject.getLastSyncResource());
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1
                },
            });
        });
    });
    test('last sync data is read from server after sync and sync data is invalid', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const machineId = await testObject.getMachineId();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '1',
                version: 1,
                content: JSON.stringify({
                    content: '0',
                    machineId,
                    version: 1
                }),
                additionalData: {
                    foo: 'bar'
                }
            })));
            server.reset();
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1
                },
            });
            assert.deepStrictEqual(server.requests, [{ headers: {}, type: 'GET', url: 'http://host:3000/v1/resource/settings/1' }]);
        });
    });
    test('last sync data is read from server after sync and stored sync data is tampered', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const machineId = await testObject.getMachineId();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '2',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1
                }
            })));
            server.reset();
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.deepStrictEqual(actual, {
                ref: '1',
                syncData: {
                    content: '0',
                    machineId,
                    version: 1
                }
            });
            assert.deepStrictEqual(server.requests, [{ headers: {}, type: 'GET', url: 'http://host:3000/v1/resource/settings/1' }]);
        });
    });
    test('reading last sync data: no requests are made to server when sync data is invalid', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            const machineId = await testObject.getMachineId();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '1',
                version: 1,
                content: JSON.stringify({
                    content: '0',
                    machineId,
                    version: 1
                }),
                additionalData: {
                    foo: 'bar'
                }
            })));
            await testObject.getLastSyncUserData();
            server.reset();
            await testObject.getLastSyncUserData();
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('reading last sync data: no requests are made to server when sync data is null', async () => {
        await runWithFakedTimers({}, async () => {
            const fileService = client.instantiationService.get(IFileService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            server.reset();
            await fileService.writeFile(testObject.getLastSyncResource(), VSBuffer.fromString(JSON.stringify({
                ref: '1',
                syncData: null,
            })));
            await testObject.getLastSyncUserData();
            assert.deepStrictEqual(server.requests, []);
        });
    });
    test('last sync data is null after sync if last sync state is deleted', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            storageService.remove('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */);
            const actual = await testObject.getLastSyncUserData();
            assert.strictEqual(actual, null);
        });
    });
    test('last sync data is null after sync if last sync content is deleted everywhere', async () => {
        await runWithFakedTimers({}, async () => {
            const storageService = client.instantiationService.get(IStorageService);
            const fileService = client.instantiationService.get(IFileService);
            const userDataSyncStoreService = client.instantiationService.get(IUserDataSyncStoreService);
            const testObject = disposableStore.add(client.instantiationService.createInstance(TestSynchroniser, { syncResource: "settings" /* SyncResource.Settings */, profile: client.instantiationService.get(IUserDataProfilesService).defaultProfile }, undefined));
            testObject.syncBarrier.open();
            await testObject.sync(await client.getLatestRef(testObject.resource));
            await fileService.del(testObject.getLastSyncResource());
            await userDataSyncStoreService.deleteResource(testObject.syncResource.syncResource, null);
            const actual = await testObject.getLastSyncUserData();
            assert.deepStrictEqual(storageService.get('settings.lastSyncUserData', -1 /* StorageScope.APPLICATION */), JSON.stringify({ ref: '1' }));
            assert.strictEqual(actual, null);
        });
    });
});
function assertConflicts(actual, expected) {
    assert.deepStrictEqual(actual.map(({ localResource }) => localResource.toString()), expected.map(uri => uri.toString()));
}
function assertPreviews(actual, expected) {
    assert.deepStrictEqual(actual.map(({ localResource }) => localResource.toString()), expected.map(uri => uri.toString()));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luY2hyb25pemVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi9zeW5jaHJvbml6ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDekYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sb0NBQW9DLENBQUM7QUFDbkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLG9CQUFvQixFQUErRCxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pJLE9BQU8sRUFBaUcseUJBQXlCLEVBQXdDLHFCQUFxQixFQUFhLE1BQU0sOEJBQThCLENBQUM7QUFDaFAsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFNckYsTUFBTSxnQkFBaUIsU0FBUSxvQkFBb0I7SUFBbkQ7O1FBRUMsZ0JBQVcsR0FBWSxJQUFJLE9BQU8s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