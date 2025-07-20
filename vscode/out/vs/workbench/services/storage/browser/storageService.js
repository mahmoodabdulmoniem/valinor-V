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
var BrowserStorageService_1;
import { BroadcastDataChannel } from '../../../../base/browser/broadcast.js';
import { isSafari } from '../../../../base/browser/browser.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { IndexedDB } from '../../../../base/browser/indexedDB.js';
import { DeferredPromise, Promises } from '../../../../base/common/async.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { InMemoryStorageDatabase, isStorageItemsChangeEvent, Storage } from '../../../../base/parts/storage/common/storage.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractStorageService, isProfileUsingDefaultStorage, IS_NEW_KEY } from '../../../../platform/storage/common/storage.js';
import { isUserDataProfile } from '../../../../platform/userDataProfile/common/userDataProfile.js';
let BrowserStorageService = class BrowserStorageService extends AbstractStorageService {
    static { BrowserStorageService_1 = this; }
    static { this.BROWSER_DEFAULT_FLUSH_INTERVAL = 5 * 1000; } // every 5s because async operations are not permitted on shutdown
    get hasPendingUpdate() {
        return Boolean(this.applicationStorageDatabase?.hasPendingUpdate ||
            this.profileStorageDatabase?.hasPendingUpdate ||
            this.workspaceStorageDatabase?.hasPendingUpdate);
    }
    constructor(workspace, userDataProfileService, logService) {
        super({ flushInterval: BrowserStorageService_1.BROWSER_DEFAULT_FLUSH_INTERVAL });
        this.workspace = workspace;
        this.userDataProfileService = userDataProfileService;
        this.logService = logService;
        this.applicationStoragePromise = new DeferredPromise();
        this.profileStorageDisposables = this._register(new DisposableStore());
        this.profileStorageProfile = this.userDataProfileService.currentProfile;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.userDataProfileService.onDidChangeCurrentProfile(e => e.join(this.switchToProfile(e.profile))));
    }
    async doInitialize() {
        // Init storages
        await Promises.settled([
            this.createApplicationStorage(),
            this.createProfileStorage(this.profileStorageProfile),
            this.createWorkspaceStorage()
        ]);
    }
    async createApplicationStorage() {
        const applicationStorageIndexedDB = await IndexedDBStorageDatabase.createApplicationStorage(this.logService);
        this.applicationStorageDatabase = this._register(applicationStorageIndexedDB);
        this.applicationStorage = this._register(new Storage(this.applicationStorageDatabase));
        this._register(this.applicationStorage.onDidChangeStorage(e => this.emitDidChangeValue(-1 /* StorageScope.APPLICATION */, e)));
        await this.applicationStorage.init();
        this.updateIsNew(this.applicationStorage);
        this.applicationStoragePromise.complete({ indexedDb: applicationStorageIndexedDB, storage: this.applicationStorage });
    }
    async createProfileStorage(profile) {
        // First clear any previously associated disposables
        this.profileStorageDisposables.clear();
        // Remember profile associated to profile storage
        this.profileStorageProfile = profile;
        if (isProfileUsingDefaultStorage(this.profileStorageProfile)) {
            // If we are using default profile storage, the profile storage is
            // actually the same as application storage. As such we
            // avoid creating the storage library a second time on
            // the same DB.
            const { indexedDb: applicationStorageIndexedDB, storage: applicationStorage } = await this.applicationStoragePromise.p;
            this.profileStorageDatabase = applicationStorageIndexedDB;
            this.profileStorage = applicationStorage;
            this.profileStorageDisposables.add(this.profileStorage.onDidChangeStorage(e => this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e)));
        }
        else {
            const profileStorageIndexedDB = await IndexedDBStorageDatabase.createProfileStorage(this.profileStorageProfile, this.logService);
            this.profileStorageDatabase = this.profileStorageDisposables.add(profileStorageIndexedDB);
            this.profileStorage = this.profileStorageDisposables.add(new Storage(this.profileStorageDatabase));
            this.profileStorageDisposables.add(this.profileStorage.onDidChangeStorage(e => this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e)));
            await this.profileStorage.init();
            this.updateIsNew(this.profileStorage);
        }
    }
    async createWorkspaceStorage() {
        const workspaceStorageIndexedDB = await IndexedDBStorageDatabase.createWorkspaceStorage(this.workspace.id, this.logService);
        this.workspaceStorageDatabase = this._register(workspaceStorageIndexedDB);
        this.workspaceStorage = this._register(new Storage(this.workspaceStorageDatabase));
        this._register(this.workspaceStorage.onDidChangeStorage(e => this.emitDidChangeValue(1 /* StorageScope.WORKSPACE */, e)));
        await this.workspaceStorage.init();
        this.updateIsNew(this.workspaceStorage);
    }
    updateIsNew(storage) {
        const firstOpen = storage.getBoolean(IS_NEW_KEY);
        if (firstOpen === undefined) {
            storage.set(IS_NEW_KEY, true);
        }
        else if (firstOpen) {
            storage.set(IS_NEW_KEY, false);
        }
    }
    getStorage(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationStorage;
            case 0 /* StorageScope.PROFILE */:
                return this.profileStorage;
            default:
                return this.workspaceStorage;
        }
    }
    getLogDetails(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationStorageDatabase?.name;
            case 0 /* StorageScope.PROFILE */:
                return this.profileStorageDatabase?.name;
            default:
                return this.workspaceStorageDatabase?.name;
        }
    }
    async switchToProfile(toProfile) {
        if (!this.canSwitchProfile(this.profileStorageProfile, toProfile)) {
            return;
        }
        const oldProfileStorage = assertReturnsDefined(this.profileStorage);
        const oldItems = oldProfileStorage.items;
        // Close old profile storage but only if this is
        // different from application storage!
        if (oldProfileStorage !== this.applicationStorage) {
            await oldProfileStorage.close();
        }
        // Create new profile storage & init
        await this.createProfileStorage(toProfile);
        // Handle data switch and eventing
        this.switchData(oldItems, assertReturnsDefined(this.profileStorage), 0 /* StorageScope.PROFILE */);
    }
    async switchToWorkspace(toWorkspace, preserveData) {
        throw new Error('Migrating storage is currently unsupported in Web');
    }
    shouldFlushWhenIdle() {
        // this flush() will potentially cause new state to be stored
        // since new state will only be created while the document
        // has focus, one optimization is to not run this when the
        // document has no focus, assuming that state has not changed
        //
        // another optimization is to not collect more state if we
        // have a pending update already running which indicates
        // that the connection is either slow or disconnected and
        // thus unhealthy.
        return getActiveWindow().document.hasFocus() && !this.hasPendingUpdate;
    }
    close() {
        // Safari: there is an issue where the page can hang on load when
        // a previous session has kept IndexedDB transactions running.
        // The only fix seems to be to cancel any pending transactions
        // (https://github.com/microsoft/vscode/issues/136295)
        //
        // On all other browsers, we keep the databases opened because
        // we expect data to be written when the unload happens.
        if (isSafari) {
            this.applicationStorage?.close();
            this.profileStorageDatabase?.close();
            this.workspaceStorageDatabase?.close();
        }
        // Always dispose to ensure that no timeouts or callbacks
        // get triggered in this phase.
        this.dispose();
    }
    async clear() {
        // Clear key/values
        for (const scope of [-1 /* StorageScope.APPLICATION */, 0 /* StorageScope.PROFILE */, 1 /* StorageScope.WORKSPACE */]) {
            for (const target of [0 /* StorageTarget.USER */, 1 /* StorageTarget.MACHINE */]) {
                for (const key of this.keys(scope, target)) {
                    this.remove(key, scope);
                }
            }
            await this.getStorage(scope)?.whenFlushed();
        }
        // Clear databases
        await Promises.settled([
            this.applicationStorageDatabase?.clear() ?? Promise.resolve(),
            this.profileStorageDatabase?.clear() ?? Promise.resolve(),
            this.workspaceStorageDatabase?.clear() ?? Promise.resolve()
        ]);
    }
    hasScope(scope) {
        if (isUserDataProfile(scope)) {
            return this.profileStorageProfile.id === scope.id;
        }
        return this.workspace.id === scope.id;
    }
};
BrowserStorageService = BrowserStorageService_1 = __decorate([
    __param(2, ILogService)
], BrowserStorageService);
export { BrowserStorageService };
class InMemoryIndexedDBStorageDatabase extends InMemoryStorageDatabase {
    constructor() {
        super(...arguments);
        this.hasPendingUpdate = false;
        this.name = 'in-memory-indexedb-storage';
    }
    async clear() {
        (await this.getItems()).clear();
    }
    dispose() {
        // No-op
    }
}
export class IndexedDBStorageDatabase extends Disposable {
    static async createApplicationStorage(logService) {
        return IndexedDBStorageDatabase.create({ id: 'global', broadcastChanges: true }, logService);
    }
    static async createProfileStorage(profile, logService) {
        return IndexedDBStorageDatabase.create({ id: `global-${profile.id}`, broadcastChanges: true }, logService);
    }
    static async createWorkspaceStorage(workspaceId, logService) {
        return IndexedDBStorageDatabase.create({ id: workspaceId }, logService);
    }
    static async create(options, logService) {
        try {
            const database = new IndexedDBStorageDatabase(options, logService);
            await database.whenConnected;
            return database;
        }
        catch (error) {
            logService.error(`[IndexedDB Storage ${options.id}] create(): ${toErrorMessage(error, true)}`);
            return new InMemoryIndexedDBStorageDatabase();
        }
    }
    static { this.STORAGE_DATABASE_PREFIX = 'vscode-web-state-db-'; }
    static { this.STORAGE_OBJECT_STORE = 'ItemTable'; }
    get hasPendingUpdate() { return !!this.pendingUpdate; }
    constructor(options, logService) {
        super();
        this.logService = logService;
        this._onDidChangeItemsExternal = this._register(new Emitter());
        this.onDidChangeItemsExternal = this._onDidChangeItemsExternal.event;
        this.pendingUpdate = undefined;
        this.name = `${IndexedDBStorageDatabase.STORAGE_DATABASE_PREFIX}${options.id}`;
        this.broadcastChannel = options.broadcastChanges ? this._register(new BroadcastDataChannel(this.name)) : undefined;
        this.whenConnected = this.connect();
        this.registerListeners();
    }
    registerListeners() {
        // Check for storage change events from other
        // windows/tabs via `BroadcastChannel` mechanisms.
        if (this.broadcastChannel) {
            this._register(this.broadcastChannel.onDidReceiveData(data => {
                if (isStorageItemsChangeEvent(data)) {
                    this._onDidChangeItemsExternal.fire(data);
                }
            }));
        }
    }
    async connect() {
        try {
            return await IndexedDB.create(this.name, undefined, [IndexedDBStorageDatabase.STORAGE_OBJECT_STORE]);
        }
        catch (error) {
            this.logService.error(`[IndexedDB Storage ${this.name}] connect() error: ${toErrorMessage(error)}`);
            throw error;
        }
    }
    async getItems() {
        const db = await this.whenConnected;
        function isValid(value) {
            return typeof value === 'string';
        }
        return db.getKeyValues(IndexedDBStorageDatabase.STORAGE_OBJECT_STORE, isValid);
    }
    async updateItems(request) {
        // Run the update
        let didUpdate = false;
        this.pendingUpdate = this.doUpdateItems(request);
        try {
            didUpdate = await this.pendingUpdate;
        }
        finally {
            this.pendingUpdate = undefined;
        }
        // Broadcast changes to other windows/tabs if enabled
        // and only if we actually did update storage items.
        if (this.broadcastChannel && didUpdate) {
            const event = {
                changed: request.insert,
                deleted: request.delete
            };
            this.broadcastChannel.postData(event);
        }
    }
    async doUpdateItems(request) {
        // Return early if the request is empty
        const toInsert = request.insert;
        const toDelete = request.delete;
        if ((!toInsert && !toDelete) || (toInsert?.size === 0 && toDelete?.size === 0)) {
            return false;
        }
        const db = await this.whenConnected;
        // Update `ItemTable` with inserts and/or deletes
        await db.runInTransaction(IndexedDBStorageDatabase.STORAGE_OBJECT_STORE, 'readwrite', objectStore => {
            const requests = [];
            // Inserts
            if (toInsert) {
                for (const [key, value] of toInsert) {
                    requests.push(objectStore.put(value, key));
                }
            }
            // Deletes
            if (toDelete) {
                for (const key of toDelete) {
                    requests.push(objectStore.delete(key));
                }
            }
            return requests;
        });
        return true;
    }
    async optimize() {
        // not suported in IndexedDB
    }
    async close() {
        const db = await this.whenConnected;
        // Wait for pending updates to having finished
        await this.pendingUpdate;
        // Finally, close IndexedDB
        return db.close();
    }
    async clear() {
        const db = await this.whenConnected;
        await db.runInTransaction(IndexedDBStorageDatabase.STORAGE_OBJECT_STORE, 'readwrite', objectStore => objectStore.clear());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zdG9yYWdlL2Jyb3dzZXIvc3RvcmFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSx5QkFBeUIsRUFBd0UsT0FBTyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDck0sT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSw0QkFBNEIsRUFBRSxVQUFVLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDL0osT0FBTyxFQUFFLGlCQUFpQixFQUFvQixNQUFNLGdFQUFnRSxDQUFDO0FBSTlHLElBQU0scUJBQXFCLEdBQTNCLE1BQU0s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