/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { IFileService } from '../../../files/common/files.js';
import { IStorageService } from '../../../storage/common/storage.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { IUserDataSyncStoreService } from '../../common/userDataSync.js';
import { IUserDataProfileStorageService } from '../../../userDataProfile/common/userDataProfileStorageService.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('GlobalStateSync', () => {
    const server = new UserDataSyncTestServer();
    let testClient;
    let client2;
    let testObject;
    teardown(async () => {
        await testClient.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        testClient = disposableStore.add(new UserDataSyncClient(server));
        await testClient.setUp(true);
        testObject = testClient.getSynchronizer("globalState" /* SyncResource.GlobalState */);
        client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
    });
    test('when global state does not exist', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        assert.deepStrictEqual(await testObject.getLastSyncUserData(), null);
        let manifest = await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assert.strictEqual(lastSyncUserData.syncData, null);
        manifest = await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
        manifest = await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
    }));
    test('when global state is created after first sync', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        updateUserStorage('a', 'value1', testClient);
        let lastSyncUserData = await testObject.getLastSyncUserData();
        const manifest = await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, [
            { type: 'POST', url: `${server.url}/v1/resource/${testObject.resource}`, headers: { 'If-Match': lastSyncUserData?.ref } },
        ]);
        lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assert.deepStrictEqual(JSON.parse(lastSyncUserData.syncData.content).storage, { 'a': { version: 1, value: 'value1' } });
    }));
    test('first time sync - outgoing to server (no state)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        updateMachineStorage('b', 'value1', testClient);
        await updateLocale(testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'globalState.argv.locale': { version: 1, value: 'en' }, 'a': { version: 1, value: 'value1' } });
    }));
    test('first time sync - incoming from server (no state)', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', client2);
        await updateLocale(client2);
        await client2.sync();
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(await readLocale(testClient), 'en');
    }));
    test('first time sync when storage exists', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', client2);
        await client2.sync();
        updateUserStorage('b', 'value2', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(readStorage('b', testClient), 'value2');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value1' }, 'b': { version: 1, value: 'value2' } });
    }));
    test('first time sync when storage exists - has conflicts', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', client2);
        await client2.sync();
        updateUserStorage('a', 'value2', client2);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value1' } });
    }));
    test('sync adding a storage value', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        updateUserStorage('b', 'value2', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(readStorage('b', testClient), 'value2');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value1' }, 'b': { version: 1, value: 'value2' } });
    }));
    test('sync updating a storage value', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        updateUserStorage('a', 'value2', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value2');
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value2' } });
    }));
    test('sync removing a storage value', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        updateUserStorage('a', 'value1', testClient);
        updateUserStorage('b', 'value2', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        removeStorage('b', testClient);
        await testObject.sync(await testClient.getLatestRef("globalState" /* SyncResource.GlobalState */));
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts.conflicts, []);
        assert.strictEqual(readStorage('a', testClient), 'value1');
        assert.strictEqual(readStorage('b', testClient), undefined);
        const { content } = await testClient.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value1' } });
    }));
    test('sync profile state', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const profile = await client2.instantiationService.get(IUserDataProfilesService).createNamedProfile('profile1');
        await updateLocale(client2);
        await updateUserStorageForProfile('a', 'value1', profile, testClient);
        await client2.sync();
        await testClient.sync();
        const syncedProfile = testClient.instantiationService.get(IUserDataProfilesService).profiles.find(p => p.id === profile.id);
        const profileStorage = await testClient.instantiationService.get(IUserDataProfileStorageService).readStorageData(syncedProfile);
        assert.strictEqual(profileStorage.get('a')?.value, 'value1');
        assert.strictEqual(await readLocale(testClient), 'en');
        const { content } = await testClient.read(testObject.resource, '1');
        assert.ok(content !== null);
        const actual = parseGlobalState(content);
        assert.deepStrictEqual(actual.storage, { 'a': { version: 1, value: 'value1' } });
    }));
    function parseGlobalState(content) {
        const syncData = JSON.parse(content);
        return JSON.parse(syncData.content);
    }
    async function updateLocale(client) {
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'en' })));
    }
    function updateUserStorage(key, value, client, profile) {
        const storageService = client.instantiationService.get(IStorageService);
        storageService.store(key, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    async function updateUserStorageForProfile(key, value, profile, client) {
        const storageService = client.instantiationService.get(IUserDataProfileStorageService);
        const data = new Map();
        data.set(key, value);
        await storageService.updateStorageData(profile, data, 0 /* StorageTarget.USER */);
    }
    function updateMachineStorage(key, value, client) {
        const storageService = client.instantiationService.get(IStorageService);
        storageService.store(key, value, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    function removeStorage(key, client) {
        const storageService = client.instantiationService.get(IStorageService);
        storageService.remove(key, 0 /* StorageScope.PROFILE */);
    }
    function readStorage(key, client) {
        const storageService = client.instantiationService.get(IStorageService);
        return storageService.get(key, 0 /* StorageScope.PROFILE */);
    }
    async function readLocale(client) {
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const content = await fileService.readFile(environmentService.argvResource);
        return JSON.parse(content.value.toString()).locale;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsU3RhdGVTeW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi9nbG9iYWxTdGF0ZVN5bmMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLG9DQUFvQyxDQUFDO0FBQ2xHLE9BQU8sRUFBb0Isd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUVoSCxPQUFPLEVBQTJCLHlCQUF5QixFQUE0QixNQUFNLDhCQUE4QixDQUFDO0FBQzVILE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ2xILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3JGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBR2hHLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFFN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO0lBQzVDLElBQUksVUFBOEIsQ0FBQztJQUNuQyxJQUFJLE9BQTJCLENBQUM7SUFFaEMsSUFBSSxVQUFtQyxDQUFDO0lBRXhDLFFBQVEsQ0FBQyxLQUFLLElBQUks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