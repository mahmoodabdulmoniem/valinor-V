/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { bufferToStream, VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IConfigurationService } from '../../../configuration/common/configuration.js';
import { ConfigurationService } from '../../../configuration/common/configurationService.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { GlobalExtensionEnablementService } from '../../../extensionManagement/common/extensionEnablementService.js';
import { IExtensionGalleryService, IExtensionManagementService, IGlobalExtensionEnablementService } from '../../../extensionManagement/common/extensionManagement.js';
import { IFileService } from '../../../files/common/files.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { IProductService } from '../../../product/common/productService.js';
import { IRequestService } from '../../../request/common/request.js';
import { InMemoryStorageService, IStorageService } from '../../../storage/common/storage.js';
import { ITelemetryService } from '../../../telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../telemetry/common/telemetryUtils.js';
import { IUriIdentityService } from '../../../uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { ExtensionStorageService, IExtensionStorageService } from '../../../extensionManagement/common/extensionStorage.js';
import { IgnoredExtensionsManagementService, IIgnoredExtensionsManagementService } from '../../common/ignoredExtensions.js';
import { ALL_SYNC_RESOURCES, getDefaultIgnoredSettings, IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService, IUserDataSyncUtilService, registerConfiguration, USER_DATA_SYNC_SCHEME } from '../../common/userDataSync.js';
import { IUserDataSyncAccountService, UserDataSyncAccountService } from '../../common/userDataSyncAccount.js';
import { UserDataSyncLocalStoreService } from '../../common/userDataSyncLocalStoreService.js';
import { IUserDataSyncMachinesService, UserDataSyncMachinesService } from '../../common/userDataSyncMachines.js';
import { UserDataSyncEnablementService } from '../../common/userDataSyncEnablementService.js';
import { UserDataSyncService } from '../../common/userDataSyncService.js';
import { UserDataSyncStoreManagementService, UserDataSyncStoreService } from '../../common/userDataSyncStoreService.js';
import { InMemoryUserDataProfilesService, IUserDataProfilesService } from '../../../userDataProfile/common/userDataProfile.js';
import { NullPolicyService } from '../../../policy/common/policy.js';
import { IUserDataProfileStorageService } from '../../../userDataProfile/common/userDataProfileStorageService.js';
import { TestUserDataProfileStorageService } from '../../../userDataProfile/test/common/userDataProfileStorageService.test.js';
export class UserDataSyncClient extends Disposable {
    constructor(testServer = new UserDataSyncTestServer()) {
        super();
        this.testServer = testServer;
        this.instantiationService = this._register(new TestInstantiationService());
    }
    async setUp(empty = false) {
        this._register(registerConfiguration());
        const logService = this.instantiationService.stub(ILogService, new NullLogService());
        const userRoamingDataHome = URI.file('userdata').with({ scheme: Schemas.inMemory });
        const userDataSyncHome = joinPath(userRoamingDataHome, '.sync');
        const environmentService = this.instantiationService.stub(IEnvironmentService, {
            userDataSyncHome,
            userRoamingDataHome,
            cacheHome: joinPath(userRoamingDataHome, 'cache'),
            argvResource: joinPath(userRoamingDataHome, 'argv.json'),
            sync: 'on',
        });
        this.instantiationService.stub(IProductService, {
            _serviceBrand: undefined, ...product, ...{
                'configurationSync.store': {
                    url: this.testServer.url,
                    stableUrl: this.testServer.url,
                    insidersUrl: this.testServer.url,
                    canSwitch: false,
                    authenticationProviders: { 'test': { scopes: [] } }
                }
            }
        });
        const fileService = this._register(new FileService(logService));
        this._register(fileService.registerProvider(Schemas.inMemory, this._register(new InMemoryFileSystemProvider())));
        this._register(fileService.registerProvider(USER_DATA_SYNC_SCHEME, this._register(new InMemoryFileSystemProvider())));
        this.instantiationService.stub(IFileService, fileService);
        const uriIdentityService = this._register(this.instantiationService.createInstance(UriIdentityService));
        this.instantiationService.stub(IUriIdentityService, uriIdentityService);
        const userDataProfilesService = this._register(new InMemoryUserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        this.instantiationService.stub(IUserDataProfilesService, userDataProfilesService);
        const storageService = this._register(new TestStorageService(userDataProfilesService.defaultProfile));
        this.instantiationService.stub(IStorageService, this._register(storageService));
        this.instantiationService.stub(IUserDataProfileStorageService, this._register(new TestUserDataProfileStorageService(false, storageService)));
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, new NullPolicyService(), logService));
        await configurationService.initialize();
        this.instantiationService.stub(IConfigurationService, configurationService);
        this.instantiationService.stub(IRequestService, this.testServer);
        this.instantiationService.stub(IUserDataSyncLogService, logService);
        this.instantiationService.stub(ITelemetryService, NullTelemetryService);
        this.instantiationService.stub(IUserDataSyncStoreManagementService, this._register(this.instantiationService.createInstance(UserDataSyncStoreManagementService)));
        this.instantiationService.stub(IUserDataSyncStoreService, this._register(this.instantiationService.createInstance(UserDataSyncStoreService)));
        const userDataSyncAccountService = this._register(this.instantiationService.createInstance(UserDataSyncAccountService));
        await userDataSyncAccountService.updateAccount({ authenticationProviderId: 'authenticationProviderId', token: 'token' });
        this.instantiationService.stub(IUserDataSyncAccountService, userDataSyncAccountService);
        this.instantiationService.stub(IUserDataSyncMachinesService, this._register(this.instantiationService.createInstance(UserDataSyncMachinesService)));
        this.instantiationService.stub(IUserDataSyncLocalStoreService, this._register(this.instantiationService.createInstance(UserDataSyncLocalStoreService)));
        this.instantiationService.stub(IUserDataSyncUtilService, new TestUserDataSyncUtilService());
        this.instantiationService.stub(IUserDataSyncEnablementService, this._register(this.instantiationService.createInstance(UserDataSyncEnablementService)));
        this.instantiationService.stub(IExtensionManagementService, {
            async getInstalled() { return []; },
            onDidInstallExtensions: new Emitter().event,
            onDidUninstallExtension: new Emitter().event,
        });
        this.instantiationService.stub(IGlobalExtensionEnablementService, this._register(this.instantiationService.createInstance(GlobalExtensionEnablementService)));
        this.instantiationService.stub(IExtensionStorageService, this._register(this.instantiationService.createInstance(ExtensionStorageService)));
        this.instantiationService.stub(IIgnoredExtensionsManagementService, this.instantiationService.createInstance(IgnoredExtensionsManagementService));
        this.instantiationService.stub(IExtensionGalleryService, {
            isEnabled() { return true; },
            async getCompatibleExtension() { return null; }
        });
        this.instantiationService.stub(IUserDataSyncService, this._register(this.instantiationService.createInstance(UserDataSyncService)));
        if (!empty) {
            await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({})));
            await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([])));
            await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'c.json'), VSBuffer.fromString(`{}`));
            await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'c.prompt.md'), VSBuffer.fromString(' '));
            await fileService.writeFile(userDataProfilesService.defaultProfile.tasksResource, VSBuffer.fromString(`{}`));
            await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'en' })));
        }
        await configurationService.reloadConfiguration();
        // `prompts` resource is disabled by default, so enable it for tests
        this.instantiationService
            .get(IUserDataSyncEnablementService)
            .setResourceEnablement("prompts" /* SyncResource.Prompts */, true);
    }
    async sync() {
        await (await this.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
    }
    read(resource, collection) {
        return this.instantiationService.get(IUserDataSyncStoreService).readResource(resource, null, collection);
    }
    async getLatestRef(resource) {
        const manifest = await this._getResourceManifest();
        return manifest?.[resource] ?? null;
    }
    async _getResourceManifest() {
        const manifest = await this.instantiationService.get(IUserDataSyncStoreService).manifest(null);
        return manifest?.latest ?? null;
    }
    getSynchronizer(source) {
        return this.instantiationService.get(IUserDataSyncService).getOrCreateActiveProfileSynchronizer(this.instantiationService.get(IUserDataProfilesService).defaultProfile, undefined).enabled.find(s => s.resource === source);
    }
}
const ALL_SERVER_RESOURCES = [...ALL_SYNC_RESOURCES, 'machines'];
export class UserDataSyncTestServer {
    get requests() { return this._requests; }
    get requestsWithAllHeaders() { return this._requestsWithAllHeaders; }
    get responses() { return this._responses; }
    reset() { this._requests = []; this._responses = []; this._requestsWithAllHeaders = []; }
    constructor(rateLimit = Number.MAX_SAFE_INTEGER, retryAfter) {
        this.rateLimit = rateLimit;
        this.retryAfter = retryAfter;
        this.url = 'http://host:3000';
        this.session = null;
        this.collections = new Map();
        this.data = new Map();
        this._requests = [];
        this._requestsWithAllHeaders = [];
        this._responses = [];
        this.manifestRef = 0;
        this.collectionCounter = 0;
    }
    async resolveProxy(url) { return url; }
    async lookupAuthorization(authInfo) { return undefined; }
    async lookupKerberosAuthorization(url) { return undefined; }
    async loadCertificates() { return []; }
    async request(options, token) {
        if (this._requests.length === this.rateLimit) {
            return this.toResponse(429, this.retryAfter ? { 'retry-after': `${this.retryAfter}` } : undefined);
        }
        const headers = {};
        if (options.headers) {
            if (options.headers['If-None-Match']) {
                headers['If-None-Match'] = options.headers['If-None-Match'];
            }
            if (options.headers['If-Match']) {
                headers['If-Match'] = options.headers['If-Match'];
            }
        }
        this._requests.push({ url: options.url, type: options.type, headers });
        this._requestsWithAllHeaders.push({ url: options.url, type: options.type, headers: options.headers });
        const requestContext = await this.doRequest(options);
        this._responses.push({ status: requestContext.res.statusCode });
        return requestContext;
    }
    async doRequest(options) {
        const versionUrl = `${this.url}/v1/`;
        const relativePath = options.url.indexOf(versionUrl) === 0 ? options.url.substring(versionUrl.length) : undefined;
        const segments = relativePath ? relativePath.split('/') : [];
        if (options.type === 'GET' && segments.length === 1 && segments[0] === 'manifest') {
            return this.getManifest(options.headers);
        }
        if (options.type === 'GET' && segments.length === 3 && segments[0] === 'resource') {
            return this.getResourceData(undefined, segments[1], segments[2] === 'latest' ? undefined : segments[2], options.headers);
        }
        if (options.type === 'POST' && segments.length === 2 && segments[0] === 'resource') {
            return this.writeData(undefined, segments[1], options.data, options.headers);
        }
        // resources in collection
        if (options.type === 'GET' && segments.length === 5 && segments[0] === 'collection' && segments[2] === 'resource') {
            return this.getResourceData(segments[1], segments[3], segments[4] === 'latest' ? undefined : segments[4], options.headers);
        }
        if (options.type === 'POST' && segments.length === 4 && segments[0] === 'collection' && segments[2] === 'resource') {
            return this.writeData(segments[1], segments[3], options.data, options.headers);
        }
        if (options.type === 'DELETE' && segments.length === 2 && segments[0] === 'resource') {
            return this.deleteResourceData(undefined, segments[1]);
        }
        if (options.type === 'DELETE' && segments.length === 1 && segments[0] === 'resource') {
            return this.clear(options.headers);
        }
        if (options.type === 'DELETE' && segments[0] === 'collection') {
            return this.toResponse(204);
        }
        if (options.type === 'POST' && segments.length === 1 && segments[0] === 'collection') {
            return this.createCollection();
        }
        return this.toResponse(501);
    }
    async getManifest(headers) {
        if (this.session) {
            const latest = Object.create({});
            this.data.forEach((value, key) => latest[key] = value.ref);
            let collections = undefined;
            if (this.collectionCounter) {
                collections = {};
                for (let collectionId = 1; collectionId <= this.collectionCounter; collectionId++) {
                    const collectionData = this.collections.get(`${collectionId}`);
                    if (collectionData) {
                        const latest = Object.create({});
                        collectionData.forEach((value, key) => latest[key] = value.ref);
                        collections[`${collectionId}`] = { latest };
                    }
                }
            }
            const manifest = { session: this.session, latest, collections, ref: '1' };
            return this.toResponse(200, { 'Content-Type': 'application/json', etag: `${this.manifestRef++}` }, JSON.stringify(manifest));
        }
        return this.toResponse(204, { etag: `${this.manifestRef++}` });
    }
    async getResourceData(collection, resource, ref, headers = {}) {
        const collectionData = collection ? this.collections.get(collection) : this.data;
        if (!collectionData) {
            return this.toResponse(501);
        }
        const resourceKey = ALL_SERVER_RESOURCES.find(key => key === resource);
        if (resourceKey) {
            const data = collectionData.get(resourceKey);
            if (ref && data?.ref !== ref) {
                return this.toResponse(404);
            }
            if (!data) {
                return this.toResponse(204, { etag: '0' });
            }
            if (headers['If-None-Match'] === data.ref) {
                return this.toResponse(304);
            }
            return this.toResponse(200, { etag: data.ref }, data.content || '');
        }
        return this.toResponse(204);
    }
    async writeData(collection, resource, content = '', headers = {}) {
        if (!this.session) {
            this.session = generateUuid();
        }
        const collectionData = collection ? this.collections.get(collection) : this.data;
        if (!collectionData) {
            return this.toResponse(501);
        }
        const resourceKey = ALL_SERVER_RESOURCES.find(key => key === resource);
        if (resourceKey) {
            const data = collectionData.get(resourceKey);
            if (headers['If-Match'] !== undefined && headers['If-Match'] !== (data ? data.ref : '0')) {
                return this.toResponse(412);
            }
            const ref = `${parseInt(data?.ref || '0') + 1}`;
            collectionData.set(resourceKey, { ref, content });
            return this.toResponse(200, { etag: ref });
        }
        return this.toResponse(204);
    }
    async deleteResourceData(collection, resource, headers = {}) {
        const collectionData = collection ? this.collections.get(collection) : this.data;
        if (!collectionData) {
            return this.toResponse(501);
        }
        const resourceKey = ALL_SERVER_RESOURCES.find(key => key === resource);
        if (resourceKey) {
            collectionData.delete(resourceKey);
            return this.toResponse(200);
        }
        return this.toResponse(404);
    }
    async createCollection() {
        const collectionId = `${++this.collectionCounter}`;
        this.collections.set(collectionId, new Map());
        return this.toResponse(200, {}, collectionId);
    }
    async clear(headers) {
        this.collections.clear();
        this.data.clear();
        this.session = null;
        this.collectionCounter = 0;
        return this.toResponse(204);
    }
    toResponse(statusCode, headers, data) {
        return {
            res: {
                headers: headers || {},
                statusCode
            },
            stream: bufferToStream(VSBuffer.fromString(data || ''))
        };
    }
}
export class TestUserDataSyncUtilService {
    async resolveDefaultCoreIgnoredSettings() {
        return getDefaultIgnoredSettings();
    }
    async resolveUserBindings(userbindings) {
        const keys = {};
        for (const keybinding of userbindings) {
            keys[keybinding] = keybinding;
        }
        return keys;
    }
    async resolveFormattingOptions(file) {
        return { eol: '\n', insertSpaces: false, tabSize: 4 };
    }
}
class TestStorageService extends InMemoryStorageService {
    constructor(profileStorageProfile) {
        super();
        this.profileStorageProfile = profileStorageProfile;
    }
    hasScope(profile) {
        return this.profileStorageProfile.id === profile.id;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jQ2xpZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vdXNlckRhdGFTeW5jQ2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFHN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDckgsT0FBTyxFQUE4Qix3QkFBd0IsRUFBRSwyQkFBMkIsRUFBRSxpQ0FBaUMsRUFBMEIsTUFBTSw0REFBNEQsQ0FBQztBQUMxTixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSwwQkFB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QUUsQ0FBQztRQUM3RCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssS0FBSyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNuRixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssS0FBSyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNuRixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDMUgsQ0FBQztRQUNELElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3BGLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlFLENBQUM7UUFDRCwwQkFBMEI7UUFDMUIsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLEtBQUssSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssWUFBWSxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNuSCxPQUFPLElBQUksQ0FBQyxl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