/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IFileService } from '../../../files/common/files.js';
import { ILogService } from '../../../log/common/log.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { getKeybindingsContentFromSyncContent } from '../../common/keybindingsSync.js';
import { IUserDataSyncStoreService, UserDataSyncError } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
suite('KeybindingsSync', () => {
    const server = new UserDataSyncTestServer();
    let client;
    let testObject;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp(true);
        testObject = client.getSynchronizer("keybindings" /* SyncResource.Keybindings */);
    });
    test('when keybindings file does not exist', async () => {
        const fileService = client.instantiationService.get(IFileService);
        const keybindingsResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource;
        assert.deepStrictEqual(await testObject.getLastSyncUserData(), null);
        let manifest = await client.getLatestRef("keybindings" /* SyncResource.Keybindings */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
        assert.ok(!await fileService.exists(keybindingsResource));
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assert.strictEqual(lastSyncUserData.syncData, null);
        manifest = await client.getLatestRef("keybindings" /* SyncResource.Keybindings */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
        manifest = await client.getLatestRef("keybindings" /* SyncResource.Keybindings */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
    });
    test('when keybindings file is empty and remote has no changes', async () => {
        const fileService = client.instantiationService.get(IFileService);
        const keybindingsResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource;
        await fileService.writeFile(keybindingsResource, VSBuffer.fromString(''));
        await testObject.sync(await client.getLatestRef("keybindings" /* SyncResource.Keybindings */));
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.strictEqual(getKeybindingsContentFromSyncContent(lastSyncUserData.syncData.content, true, client.instantiationService.get(ILogService)), '[]');
        assert.strictEqual(getKeybindingsContentFromSyncContent(remoteUserData.syncData.content, true, client.instantiationService.get(ILogService)), '[]');
        assert.strictEqual((await fileService.readFile(keybindingsResource)).value.toString(), '');
    });
    test('when keybindings file is empty and remote has changes', async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const content = JSON.stringify([
            {
                'key': 'shift+cmd+w',
                'command': 'workbench.action.closeAllEditors',
            }
        ]);
        await client2.instantiationService.get(IFileService).writeFile(client2.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource, VSBuffer.fromString(content));
        await client2.sync();
        const fileService = client.instantiationService.get(IFileService);
        const keybindingsResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource;
        await fileService.writeFile(keybindingsResource, VSBuffer.fromString(''));
        await testObject.sync(await client.getLatestRef("keybindings" /* SyncResource.Keybindings */));
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.strictEqual(getKeybindingsContentFromSyncContent(lastSyncUserData.syncData.content, true, client.instantiationService.get(ILogService)), content);
        assert.strictEqual(getKeybindingsContentFromSyncContent(remoteUserData.syncData.content, true, client.instantiationService.get(ILogService)), content);
        assert.strictEqual((await fileService.readFile(keybindingsResource)).value.toString(), content);
    });
    test('when keybindings file is empty with comment and remote has no changes', async () => {
        const fileService = client.instantiationService.get(IFileService);
        const keybindingsResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource;
        const expectedContent = '// Empty Keybindings';
        await fileService.writeFile(keybindingsResource, VSBuffer.fromString(expectedContent));
        await testObject.sync(await client.getLatestRef("keybindings" /* SyncResource.Keybindings */));
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.strictEqual(getKeybindingsContentFromSyncContent(lastSyncUserData.syncData.content, true, client.instantiationService.get(ILogService)), expectedContent);
        assert.strictEqual(getKeybindingsContentFromSyncContent(remoteUserData.syncData.content, true, client.instantiationService.get(ILogService)), expectedContent);
        assert.strictEqual((await fileService.readFile(keybindingsResource)).value.toString(), expectedContent);
    });
    test('when keybindings file is empty and remote has keybindings', async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const content = JSON.stringify([
            {
                'key': 'shift+cmd+w',
                'command': 'workbench.action.closeAllEditors',
            }
        ]);
        await client2.instantiationService.get(IFileService).writeFile(client2.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource, VSBuffer.fromString(content));
        await client2.sync();
        const fileService = client.instantiationService.get(IFileService);
        const keybindingsResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource;
        await fileService.writeFile(keybindingsResource, VSBuffer.fromString('// Empty Keybindings'));
        await testObject.sync(await client.getLatestRef("keybindings" /* SyncResource.Keybindings */));
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.strictEqual(getKeybindingsContentFromSyncContent(lastSyncUserData.syncData.content, true, client.instantiationService.get(ILogService)), content);
        assert.strictEqual(getKeybindingsContentFromSyncContent(remoteUserData.syncData.content, true, client.instantiationService.get(ILogService)), content);
        assert.strictEqual((await fileService.readFile(keybindingsResource)).value.toString(), content);
    });
    test('when keybindings file is empty and remote has empty array', async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const content = `// Place your key bindings in this file to override the defaults
[
]`;
        await client2.instantiationService.get(IFileService).writeFile(client2.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource, VSBuffer.fromString(content));
        await client2.sync();
        const fileService = client.instantiationService.get(IFileService);
        const keybindingsResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource;
        const expectedLocalContent = '// Empty Keybindings';
        await fileService.writeFile(keybindingsResource, VSBuffer.fromString(expectedLocalContent));
        await testObject.sync(await client.getLatestRef("keybindings" /* SyncResource.Keybindings */));
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.strictEqual(getKeybindingsContentFromSyncContent(lastSyncUserData.syncData.content, true, client.instantiationService.get(ILogService)), content);
        assert.strictEqual(getKeybindingsContentFromSyncContent(remoteUserData.syncData.content, true, client.instantiationService.get(ILogService)), content);
        assert.strictEqual((await fileService.readFile(keybindingsResource)).value.toString(), expectedLocalContent);
    });
    test('when keybindings file is created after first sync', async () => {
        const fileService = client.instantiationService.get(IFileService);
        const keybindingsResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource;
        await testObject.sync(await client.getLatestRef("keybindings" /* SyncResource.Keybindings */));
        await fileService.createFile(keybindingsResource, VSBuffer.fromString('[]'));
        let lastSyncUserData = await testObject.getLastSyncUserData();
        const manifest = await client.getLatestRef("keybindings" /* SyncResource.Keybindings */);
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, [
            { type: 'POST', url: `${server.url}/v1/resource/${testObject.resource}`, headers: { 'If-Match': lastSyncUserData?.ref } },
        ]);
        lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assert.strictEqual(getKeybindingsContentFromSyncContent(lastSyncUserData.syncData.content, true, client.instantiationService.get(ILogService)), '[]');
    });
    test('test apply remote when keybindings file does not exist', async () => {
        const fileService = client.instantiationService.get(IFileService);
        const keybindingsResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource;
        if (await fileService.exists(keybindingsResource)) {
            await fileService.del(keybindingsResource);
        }
        const preview = await testObject.sync(await client.getLatestRef("keybindings" /* SyncResource.Keybindings */), true);
        server.reset();
        const content = await testObject.resolveContent(preview.resourcePreviews[0].remoteResource);
        await testObject.accept(preview.resourcePreviews[0].remoteResource, content);
        await testObject.apply(false);
        assert.deepStrictEqual(server.requests, []);
    });
    test('sync throws invalid content error - content is an object', async () => {
        await client.instantiationService.get(IFileService).writeFile(client.instantiationService.get(IUserDataProfilesService).defaultProfile.keybindingsResource, VSBuffer.fromString('{}'));
        try {
            await testObject.sync(await client.getLatestRef("keybindings" /* SyncResource.Keybindings */));
            assert.fail('should fail with invalid content error');
        }
        catch (e) {
            assert.ok(e instanceof UserDataSyncError);
            assert.deepStrictEqual(e.code, "LocalInvalidContent" /* UserDataSyncErrorCode.LocalInvalidContent */);
        }
    });
    test('sync profile keybindings', async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const profile = await client2.instantiationService.get(IUserDataProfilesService).createNamedProfile('profile1');
        await client2.instantiationService.get(IFileService).writeFile(profile.keybindingsResource, VSBuffer.fromString(JSON.stringify([
            {
                'key': 'shift+cmd+w',
                'command': 'workbench.action.closeAllEditors',
            }
        ])));
        await client2.sync();
        await client.sync();
        const syncedProfile = client.instantiationService.get(IUserDataProfilesService).profiles.find(p => p.id === profile.id);
        const content = (await client.instantiationService.get(IFileService).readFile(syncedProfile.keybindingsResource)).value.toString();
        assert.deepStrictEqual(JSON.parse(content), [
            {
                'key': 'shift+cmd+w',
                'command': 'workbench.action.closeAllEditors',
            }
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NTeW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi9rZXliaW5kaW5nc1N5bmMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDekQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLG9DQUFvQyxFQUEyQixNQUFNLGlDQUFpQyxDQUFDO0FBQ2hILE9BQU8sRUFBRSx5QkFBeUIsRUFBZ0IsaUJBQWlCLEVBQXlCLE1BQU0sOEJBQThCLENBQUM7QUFDakksT0FBTyxFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFckYsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtJQUU3QixNQUFNLE1BQU0sR0FBRyxJQUFJLHNCQUFzQixFQUFFLENBQUM7SUFDNUMsSUFBSSxNQUEwQixDQUFDO0lBRS9CLElBQUksVUFBbUMsQ0FBQztJQUV4QyxRQUFRLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDbkIsTUFBTSxNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDMUUsQ0FBQyxDQUFDLENBQUM7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