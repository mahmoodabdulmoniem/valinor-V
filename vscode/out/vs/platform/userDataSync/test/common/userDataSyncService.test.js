/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { dirname, joinPath } from '../../../../base/common/resources.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { IFileService } from '../../../files/common/files.js';
import { IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { IUserDataSyncEnablementService, IUserDataSyncService } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
suite('UserDataSyncService', () => {
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    test('test first time sync ever', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // Sync for first time
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '0' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
            // Tasks
            { type: 'POST', url: `${target.url}/v1/resource/tasks`, headers: { 'If-Match': '0' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '0' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '0' } },
        ]);
    });
    test('test first time sync ever when a sync resource is disabled', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        client.instantiationService.get(IUserDataSyncEnablementService).setResourceEnablement("settings" /* SyncResource.Settings */, false);
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // Sync for first time
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/tasks`, headers: { 'If-Match': '0' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '0' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '0' } },
        ]);
    });
    test('test first time sync ever with no data', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp(true);
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // Sync for first time
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
        ]);
    });
    test('test first time sync from the client with no changes - merge', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // Sync (merge) from the test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
        ]);
    });
    test('test first time sync from the client with changes - merge', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client with changes
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const fileService = testClient.instantiationService.get(IFileService);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'mine.prompt.md'), VSBuffer.fromString('text'));
        await fileService.writeFile(joinPath(dirname(userDataProfilesService.defaultProfile.settingsResource), 'tasks.json'), VSBuffer.fromString(JSON.stringify({})));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // Sync (merge) from the test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
        ]);
    });
    test('test first time sync from the client with changes - merge with profile', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client with changes
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const fileService = testClient.instantiationService.get(IFileService);
        const environmentService = testClient.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1');
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'my.prompt.md'), VSBuffer.fromString('some prompt text'));
        await fileService.writeFile(joinPath(dirname(userDataProfilesService.defaultProfile.settingsResource), 'tasks.json'), VSBuffer.fromString(JSON.stringify({})));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // Sync (merge) from the test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            { type: 'GET', url: `${target.url}/v1/resource/tasks/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: {} },
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            { type: 'POST', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/profiles`, headers: { 'If-Match': '0' } },
        ]);
    });
    test('test sync when there are no changes', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // sync from the client again
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
        ]);
    });
    test('test sync when there are local changes', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'shared.prompt.md'), VSBuffer.fromString('prompt text'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
        ]);
    });
    test('test sync when there are local changes with profile', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1');
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'default.prompt.md'), VSBuffer.fromString('some prompt file contents'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            // Profiles
            { type: 'POST', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/profiles`, headers: { 'If-Match': '0' } },
        ]);
    });
    test('test sync when there are local changes and sync resource is disabled', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, '1.prompt.md'), VSBuffer.fromString('random prompt text'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        client.instantiationService.get(IUserDataSyncEnablementService).setResourceEnablement("snippets" /* SyncResource.Snippets */, false);
        client.instantiationService.get(IUserDataSyncEnablementService).setResourceEnablement("prompts" /* SyncResource.Prompts */, false);
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
        ]);
    });
    test('test sync when there are remote changes', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Do changes in first client and sync
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{ "a": "changed" }`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'unknown.prompt.md'), VSBuffer.fromString('prompt text'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: { 'If-None-Match': '1' } },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: { 'If-None-Match': '1' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: { 'If-None-Match': '1' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: { 'If-None-Match': '1' } },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: { 'If-None-Match': '1' } },
        ]);
    });
    test('test sync when there are remote changes with profile', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Do changes in first client and sync
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1');
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{ "a": "changed" }`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'global.prompt.md'), VSBuffer.fromString('some text goes here'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: { 'If-None-Match': '1' } },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: { 'If-None-Match': '1' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: { 'If-None-Match': '1' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: { 'If-None-Match': '1' } },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: { 'If-None-Match': '1' } },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: { 'If-None-Match': '0' } },
        ]);
    });
    test('test delete', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from the client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Reset from the client
        target.reset();
        await testObject.reset();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'DELETE', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'DELETE', url: `${target.url}/v1/resource`, headers: {} },
        ]);
    });
    test('test delete and sync', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from the client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Reset from the client
        await testObject.reset();
        // Sync again
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '0' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '0' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '0' } },
            // Tasks
            { type: 'POST', url: `${target.url}/v1/resource/tasks`, headers: { 'If-Match': '0' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '0' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '0' } },
        ]);
    });
    test('test sync status', async () => {
        const target = new UserDataSyncTestServer();
        // Setup the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        // sync from the client
        const actualStatuses = [];
        const disposable = testObject.onDidChangeStatus(status => actualStatuses.push(status));
        await (await testObject.createSyncTask(null)).run();
        disposable.dispose();
        assert.deepStrictEqual(actualStatuses, ["syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */, "syncing" /* SyncStatus.Syncing */, "idle" /* SyncStatus.Idle */]);
    });
    test('test sync conflicts status', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        let fileService = client.instantiationService.get(IFileService);
        let userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        fileService = testClient.instantiationService.get(IFileService);
        userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        // sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assert.deepStrictEqual(testObject.conflicts.map(({ syncResource }) => syncResource), ["settings" /* SyncResource.Settings */]);
    });
    test('test sync will sync other non conflicted areas', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const fileService = client.instantiationService.get(IFileService);
        let userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client and get conflicts in settings
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testFileService = testClient.instantiationService.get(IFileService);
        userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await testFileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // sync from the first client with changes in keybindings
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // sync from the test client
        target.reset();
        const actualStatuses = [];
        const disposable = testObject.onDidChangeStatus(status => actualStatuses.push(status));
        await (await testObject.createSyncTask(null)).run();
        disposable.dispose();
        assert.deepStrictEqual(actualStatuses, []);
        assert.deepStrictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: { 'If-None-Match': '1' } },
        ]);
    });
    test('test stop sync reset status', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        let fileService = client.instantiationService.get(IFileService);
        let userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Setup the test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        fileService = testClient.instantiationService.get(IFileService);
        userDataProfilesService = testClient.instantiationService.get(IUserDataProfilesService);
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 16 })));
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        const syncTask = (await testObject.createSyncTask(null));
        syncTask.run().then(null, () => null /* ignore error */);
        await syncTask.stop();
        assert.deepStrictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        assert.deepStrictEqual(testObject.conflicts, []);
    });
    test('test sync send execution id header', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        for (const request of target.requestsWithAllHeaders) {
            const hasExecutionIdHeader = request.headers && request.headers['X-Execution-Id'] && request.headers['X-Execution-Id'].length > 0;
            assert.ok(hasExecutionIdHeader, `Should have execution header: ${request.url}`);
        }
    });
    test('test can run sync taks only once', async () => {
        // Setup the client
        const target = new UserDataSyncTestServer();
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        const syncTask = await testObject.createSyncTask(null);
        await syncTask.run();
        try {
            await syncTask.run();
            assert.fail('Should fail running the task again');
        }
        catch (error) {
            /* expected */
        }
    });
    test('test sync when there are local profile that uses default profile', async () => {
        const target = new UserDataSyncTestServer();
        // Setup and sync from the client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        const testObject = client.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        target.reset();
        // Do changes in the client
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1', { useDefaultFlags: { settings: true } });
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{}`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, '2.prompt.md'), VSBuffer.fromString('file contents'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        // Sync from the client
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'POST', url: `${target.url}/v1/resource/settings`, headers: { 'If-Match': '1' } },
            // Keybindings
            { type: 'POST', url: `${target.url}/v1/resource/keybindings`, headers: { 'If-Match': '1' } },
            // Snippets
            { type: 'POST', url: `${target.url}/v1/resource/snippets`, headers: { 'If-Match': '1' } },
            // Global state
            { type: 'POST', url: `${target.url}/v1/resource/globalState`, headers: { 'If-Match': '1' } },
            // Prompts
            { type: 'POST', url: `${target.url}/v1/resource/prompts`, headers: { 'If-Match': '1' } },
            // Profiles
            { type: 'POST', url: `${target.url}/v1/collection`, headers: {} },
            { type: 'POST', url: `${target.url}/v1/resource/profiles`, headers: { 'If-Match': '0' } },
        ]);
    });
    test('test sync when there is a remote profile that uses default profile', async () => {
        const target = new UserDataSyncTestServer();
        // Sync from first client
        const client = disposableStore.add(new UserDataSyncClient(target));
        await client.setUp();
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        const testClient = disposableStore.add(new UserDataSyncClient(target));
        await testClient.setUp();
        const testObject = testClient.instantiationService.get(IUserDataSyncService);
        await (await testObject.createSyncTask(null)).run();
        // Do changes in first client and sync
        const fileService = client.instantiationService.get(IFileService);
        const environmentService = client.instantiationService.get(IEnvironmentService);
        const userDataProfilesService = client.instantiationService.get(IUserDataProfilesService);
        await userDataProfilesService.createNamedProfile('1', { useDefaultFlags: { keybindings: true } });
        await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({ 'editor.fontSize': 14 })));
        await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([{ 'command': 'abcd', 'key': 'cmd+c' }])));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'html.json'), VSBuffer.fromString(`{ "a": "changed" }`));
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'best.prompt.md'), VSBuffer.fromString('prompt prompt'));
        await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'de' })));
        await (await client.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
        // Sync from test client
        target.reset();
        await (await testObject.createSyncTask(null)).run();
        assert.deepStrictEqual(target.requests, [
            // Manifest
            { type: 'GET', url: `${target.url}/v1/manifest`, headers: {} },
            // Settings
            { type: 'GET', url: `${target.url}/v1/resource/settings/latest`, headers: { 'If-None-Match': '1' } },
            // Keybindings
            { type: 'GET', url: `${target.url}/v1/resource/keybindings/latest`, headers: { 'If-None-Match': '1' } },
            // Snippets
            { type: 'GET', url: `${target.url}/v1/resource/snippets/latest`, headers: { 'If-None-Match': '1' } },
            // Global state
            { type: 'GET', url: `${target.url}/v1/resource/globalState/latest`, headers: { 'If-None-Match': '1' } },
            // Prompts
            { type: 'GET', url: `${target.url}/v1/resource/prompts/latest`, headers: { 'If-None-Match': '1' } },
            // Profiles
            { type: 'GET', url: `${target.url}/v1/resource/profiles/latest`, headers: { 'If-None-Match': '0' } },
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vdXNlckRhdGFTeW5jU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDOUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLG9CQUFvQixFQUE0QixNQUFNLDhCQUE4QixDQUFDO0FBQzlILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXJGLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFFakMsTUFBTSxlQUFlLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUVsRSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDNUMsbUJBQW1CO1FBQ25CLE1BQU0sTUFBTSxHQUFHLElBQUksc0JBQXNCLEVBQUUsQ0FBQztRQUM1QyxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLENBQUMsTUFB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