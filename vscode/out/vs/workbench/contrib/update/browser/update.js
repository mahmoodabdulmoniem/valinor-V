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
var ProductContribution_1;
import * as nls from '../../../../nls.js';
import severity from '../../../../base/common/severity.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IActivityService, NumberBadge, ProgressBadge } from '../../../services/activity/common/activity.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { ReleaseNotesManager } from './releaseNotesEditor.js';
import { isMacintosh, isWeb, isWindows } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { RawContextKey, IContextKeyService, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuRegistry, MenuId, registerAction2, Action2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { Promises } from '../../../../base/common/async.js';
import { IUserDataSyncWorkbenchService } from '../../../services/userDataSync/common/userDataSync.js';
import { Event } from '../../../../base/common/event.js';
import { toAction } from '../../../../base/common/actions.js';
export const CONTEXT_UPDATE_STATE = new RawContextKey('updateState', "uninitialized" /* StateType.Uninitialized */);
export const MAJOR_MINOR_UPDATE_AVAILABLE = new RawContextKey('majorMinorUpdateAvailable', false);
export const RELEASE_NOTES_URL = new RawContextKey('releaseNotesUrl', '');
export const DOWNLOAD_URL = new RawContextKey('downloadUrl', '');
let releaseNotesManager = undefined;
export function showReleaseNotesInEditor(instantiationService, version, useCurrentFile) {
    if (!releaseNotesManager) {
        releaseNotesManager = instantiationService.createInstance(ReleaseNotesManager);
    }
    return releaseNotesManager.show(version, useCurrentFile);
}
async function openLatestReleaseNotesInBrowser(accessor) {
    const openerService = accessor.get(IOpenerService);
    const productService = accessor.get(IProductService);
    if (productService.releaseNotesUrl) {
        const uri = URI.parse(productService.releaseNotesUrl);
        await openerService.open(uri);
    }
    else {
        throw new Error(nls.localize('update.noReleaseNotesOnline', "This version of {0} does not have release notes online", productService.nameLong));
    }
}
async function showReleaseNotes(accessor, version) {
    const instantiationService = accessor.get(IInstantiationService);
    try {
        await showReleaseNotesInEditor(instantiationService, version, false);
    }
    catch (err) {
        try {
            await instantiationService.invokeFunction(openLatestReleaseNotesInBrowser);
        }
        catch (err2) {
            throw new Error(`${err.message} and ${err2.message}`);
        }
    }
}
function parseVersion(version) {
    const match = /([0-9]+)\.([0-9]+)\.([0-9]+)/.exec(version);
    if (!match) {
        return undefined;
    }
    return {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3])
    };
}
function isMajorMinorUpdate(before, after) {
    return before.major < after.major || before.minor < after.minor;
}
let ProductContribution = class ProductContribution {
    static { ProductContribution_1 = this; }
    static { this.KEY = 'releaseNotes/lastVersion'; }
    constructor(storageService, instantiationService, notificationService, environmentService, openerService, configurationService, hostService, productService, contextKeyService) {
        if (productService.releaseNotesUrl) {
            const releaseNotesUrlKey = RELEASE_NOTES_URL.bindTo(contextKeyService);
            releaseNotesUrlKey.set(productService.releaseNotesUrl);
        }
        if (productService.downloadUrl) {
            const downloadUrlKey = DOWNLOAD_URL.bindTo(contextKeyService);
            downloadUrlKey.set(productService.downloadUrl);
        }
        if (isWeb) {
            return;
        }
        hostService.hadLastFocus().then(async (hadLastFocus) => {
            if (!hadLastFocus) {
                return;
            }
            const lastVersion = parseVersion(storageService.get(ProductContribution_1.KEY, -1 /* StorageScope.APPLICATION */, ''));
            const currentVersion = parseVersion(productService.version);
            const shouldShowReleaseNotes = configurationService.getValue('update.showReleaseNotes');
            const releaseNotesUrl = productService.releaseNotesUrl;
            // was there a major/minor update? if so, open release notes
            if (shouldShowReleaseNotes && !environmentService.skipReleaseNotes && releaseNotesUrl && lastVersion && currentVersion && isMajorMinorUpdate(lastVersion, currentVersion)) {
                showReleaseNotesInEditor(instantiationService, productService.version, false)
                    .then(undefined, () => {
                    notificationService.prompt(severity.Info, nls.localize('read the release notes', "Welcome to {0} v{1}! Would you like to read the Release Notes?", productService.nameLong, productService.version), [{
                            label: nls.localize('releaseNotes', "Release Notes"),
                            run: () => {
                                const uri = URI.parse(releaseNotesUrl);
                                openerService.open(uri);
                            }
                        }], { priority: NotificationPriority.OPTIONAL });
                });
            }
            storageService.store(ProductContribution_1.KEY, productService.version, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        });
    }
};
ProductContribution = ProductContribution_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IBrowserWorkbenchEnvironmentService),
    __param(4, IOpenerService),
    __param(5, IConfigurationService),
    __param(6, IHostService),
    __param(7, IProductService),
    __param(8, IContextKeyService)
], ProductContribution);
export { ProductContribution };
let UpdateContribution = class UpdateContribution extends Disposable {
    constructor(storageService, instantiationService, notificationService, dialogService, updateService, activityService, contextKeyService, productService, openerService, configurationService, hostService) {
        super();
        this.storageService = storageService;
        this.instantiationService = instantiationService;
        this.notificationService = notificationService;
        this.dialogService = dialogService;
        this.updateService = updateService;
        this.activityService = activityService;
        this.contextKeyService = contextKeyService;
        this.productService = productService;
        this.openerService = openerService;
        this.configurationService = configurationService;
        this.hostService = hostService;
        this.badgeDisposable = this._register(new MutableDisposable());
        this.state = updateService.state;
        this.updateStateContextKey = CONTEXT_UPDATE_STATE.bindTo(this.contextKeyService);
        this.majorMinorUpdateAvailableContextKey = MAJOR_MINOR_UPDATE_AVAILABLE.bindTo(this.contextKeyService);
        this._register(updateService.onStateChange(this.onUpdateStateChange, this));
        this.onUpdateStateChange(this.updateService.state);
        /*
        The `update/lastKnownVersion` and `update/updateNotificationTime` storage keys are used in
        combination to figure out when to show a message to the user that he should update.

        This message should appear if the user has received an update notification but hasn't
        updated since 5 days.
        */
        const currentVersion = this.productService.commit;
        const lastKnownVersion = this.storageService.get('update/lastKnownVersion', -1 /* StorageScope.APPLICATION */);
        // if current version != stored version, clear both fields
        if (currentVersion !== lastKnownVersion) {
            this.storageService.remove('update/lastKnownVersion', -1 /* StorageScope.APPLICATION */);
            this.storageService.remove('update/updateNotificationTime', -1 /* StorageScope.APPLICATION */);
        }
        this.registerGlobalActivityActions();
    }
    async onUpdateStateChange(state) {
        this.updateStateContextKey.set(state.type);
        switch (state.type) {
            case "disabled" /* StateType.Disabled */:
                if (state.reason === 5 /* DisablementReason.RunningAsAdmin */) {
                    this.notificationService.notify({
                        severity: Severity.Info,
                        message: nls.localize('update service disabled', "Updates are disabled because you are running the user-scope installation of {0} as Administrator.", this.productService.nameLong),
                        actions: {
                            primary: [
                                toAction({
                                    id: '',
                                    label: nls.localize('learn more', "Learn More"),
                                    run: () => this.openerService.open('https://aka.ms/vscode-windows-setup')
                                })
                            ]
                        },
                        neverShowAgain: { id: 'no-updates-running-as-admin', }
                    });
                }
                break;
            case "idle" /* StateType.Idle */:
                if (state.error) {
                    this.onError(state.error);
                }
                else if (this.state.type === "checking for updates" /* StateType.CheckingForUpdates */ && this.state.explicit && await this.hostService.hadLastFocus()) {
                    this.onUpdateNotAvailable();
                }
                break;
            case "available for download" /* StateType.AvailableForDownload */:
                this.onUpdateAvailable(state.update);
                break;
            case "downloaded" /* StateType.Downloaded */:
                this.onUpdateDownloaded(state.update);
                break;
            case "ready" /* StateType.Ready */: {
                const productVersion = state.update.productVersion;
                if (productVersion) {
                    const currentVersion = parseVersion(this.productService.version);
                    const nextVersion = parseVersion(productVersion);
                    this.majorMinorUpdateAvailableContextKey.set(Boolean(currentVersion && nextVersion && isMajorMinorUpdate(currentVersion, nextVersion)));
                    this.onUpdateReady(state.update);
                }
                break;
            }
        }
        let badge = undefined;
        if (state.type === "available for download" /* StateType.AvailableForDownload */ || state.type === "downloaded" /* StateType.Downloaded */ || state.type === "ready" /* StateType.Ready */) {
            badge = new NumberBadge(1, () => nls.localize('updateIsReady', "New {0} update available.", this.productService.nameShort));
        }
        else if (state.type === "checking for updates" /* StateType.CheckingForUpdates */) {
            badge = new ProgressBadge(() => nls.localize('checkingForUpdates', "Checking for {0} updates...", this.productService.nameShort));
        }
        else if (state.type === "downloading" /* StateType.Downloading */) {
            badge = new ProgressBadge(() => nls.localize('downloading', "Downloading {0} update...", this.productService.nameShort));
        }
        else if (state.type === "updating" /* StateType.Updating */) {
            badge = new ProgressBadge(() => nls.localize('updating', "Updating {0}...", this.productService.nameShort));
        }
        this.badgeDisposable.clear();
        if (badge) {
            this.badgeDisposable.value = this.activityService.showGlobalActivity({ badge });
        }
        this.state = state;
    }
    onError(error) {
        if (/The request timed out|The network connection was lost/i.test(error)) {
            return;
        }
        error = error.replace(/See https:\/\/github\.com\/Squirrel\/Squirrel\.Mac\/issues\/182 for more information/, 'This might mean the application was put on quarantine by macOS. See [this link](https://github.com/microsoft/vscode/issues/7426#issuecomment-425093469) for more information');
        this.notificationService.notify({
            severity: Severity.Error,
            message: error,
            source: nls.localize('update service', "Update Service"),
        });
    }
    onUpdateNotAvailable() {
        this.dialogService.info(nls.localize('noUpdatesAvailable', "There are currently no updates available."));
    }
    // linux
    onUpdateAvailable(update) {
        if (!this.shouldShowNotification()) {
            return;
        }
        const productVersion = update.productVersion;
        if (!productVersion) {
            return;
        }
        this.notificationService.prompt(severity.Info, nls.localize('thereIsUpdateAvailable', "There is an available update."), [{
                label: nls.localize('download update', "Download Update"),
                run: () => this.updateService.downloadUpdate()
            }, {
                label: nls.localize('later', "Later"),
                run: () => { }
            }, {
                label: nls.localize('releaseNotes', "Release Notes"),
                run: () => {
                    this.instantiationService.invokeFunction(accessor => showReleaseNotes(accessor, productVersion));
                }
            }], { priority: NotificationPriority.OPTIONAL });
    }
    // windows fast updates
    onUpdateDownloaded(update) {
        if (isMacintosh) {
            return;
        }
        if (this.configurationService.getValue('update.enableWindowsBackgroundUpdates') && this.productService.target === 'user') {
            return;
        }
        if (!this.shouldShowNotification()) {
            return;
        }
        const productVersion = update.productVersion;
        if (!productVersion) {
            return;
        }
        this.notificationService.prompt(severity.Info, nls.localize('updateAvailable', "There's an update available: {0} {1}", this.productService.nameLong, productVersion), [{
                label: nls.localize('installUpdate', "Install Update"),
                run: () => this.updateService.applyUpdate()
            }, {
                label: nls.localize('later', "Later"),
                run: () => { }
            }, {
                label: nls.localize('releaseNotes', "Release Notes"),
                run: () => {
                    this.instantiationService.invokeFunction(accessor => showReleaseNotes(accessor, productVersion));
                }
            }], { priority: NotificationPriority.OPTIONAL });
    }
    // windows and mac
    onUpdateReady(update) {
        if (!(isWindows && this.productService.target !== 'user') && !this.shouldShowNotification()) {
            return;
        }
        const actions = [{
                label: nls.localize('updateNow', "Update Now"),
                run: () => this.updateService.quitAndInstall()
            }, {
                label: nls.localize('later', "Later"),
                run: () => { }
            }];
        const productVersion = update.productVersion;
        if (productVersion) {
            actions.push({
                label: nls.localize('releaseNotes', "Release Notes"),
                run: () => {
                    this.instantiationService.invokeFunction(accessor => showReleaseNotes(accessor, productVersion));
                }
            });
        }
        // windows user fast updates and mac
        this.notificationService.prompt(severity.Info, nls.localize('updateAvailableAfterRestart', "Restart {0} to apply the latest update.", this.productService.nameLong), actions, {
            sticky: true,
            priority: NotificationPriority.OPTIONAL
        });
    }
    shouldShowNotification() {
        const currentVersion = this.productService.commit;
        const currentMillis = new Date().getTime();
        const lastKnownVersion = this.storageService.get('update/lastKnownVersion', -1 /* StorageScope.APPLICATION */);
        // if version != stored version, save version and date
        if (currentVersion !== lastKnownVersion) {
            this.storageService.store('update/lastKnownVersion', currentVersion, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.storageService.store('update/updateNotificationTime', currentMillis, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        const updateNotificationMillis = this.storageService.getNumber('update/updateNotificationTime', -1 /* StorageScope.APPLICATION */, currentMillis);
        const diffDays = (currentMillis - updateNotificationMillis) / (1000 * 60 * 60 * 24);
        return diffDays > 5;
    }
    registerGlobalActivityActions() {
        CommandsRegistry.registerCommand('update.check', () => this.updateService.checkForUpdates(true));
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.check',
                title: nls.localize('checkForUpdates', "Check for Updates...")
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("idle" /* StateType.Idle */)
        });
        CommandsRegistry.registerCommand('update.checking', () => { });
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.checking',
                title: nls.localize('checkingForUpdates2', "Checking for Updates..."),
                precondition: ContextKeyExpr.false()
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("checking for updates" /* StateType.CheckingForUpdates */)
        });
        CommandsRegistry.registerCommand('update.downloadNow', () => this.updateService.downloadUpdate());
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.downloadNow',
                title: nls.localize('download update_1', "Download Update (1)")
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("available for download" /* StateType.AvailableForDownload */)
        });
        CommandsRegistry.registerCommand('update.downloading', () => { });
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.downloading',
                title: nls.localize('DownloadingUpdate', "Downloading Update..."),
                precondition: ContextKeyExpr.false()
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("downloading" /* StateType.Downloading */)
        });
        CommandsRegistry.registerCommand('update.install', () => this.updateService.applyUpdate());
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.install',
                title: nls.localize('installUpdate...', "Install Update... (1)")
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("downloaded" /* StateType.Downloaded */)
        });
        CommandsRegistry.registerCommand('update.updating', () => { });
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            command: {
                id: 'update.updating',
                title: nls.localize('installingUpdate', "Installing Update..."),
                precondition: ContextKeyExpr.false()
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("updating" /* StateType.Updating */)
        });
        if (this.productService.quality === 'stable') {
            CommandsRegistry.registerCommand('update.showUpdateReleaseNotes', () => {
                if (this.updateService.state.type !== "ready" /* StateType.Ready */) {
                    return;
                }
                const productVersion = this.updateService.state.update.productVersion;
                if (productVersion) {
                    this.instantiationService.invokeFunction(accessor => showReleaseNotes(accessor, productVersion));
                }
            });
            MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
                group: '7_update',
                order: 1,
                command: {
                    id: 'update.showUpdateReleaseNotes',
                    title: nls.localize('showUpdateReleaseNotes', "Show Update Release Notes")
                },
                when: ContextKeyExpr.and(CONTEXT_UPDATE_STATE.isEqualTo("ready" /* StateType.Ready */), MAJOR_MINOR_UPDATE_AVAILABLE)
            });
        }
        CommandsRegistry.registerCommand('update.restart', () => this.updateService.quitAndInstall());
        MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
            group: '7_update',
            order: 2,
            command: {
                id: 'update.restart',
                title: nls.localize('restartToUpdate', "Restart to Update (1)")
            },
            when: CONTEXT_UPDATE_STATE.isEqualTo("ready" /* StateType.Ready */)
        });
        CommandsRegistry.registerCommand('_update.state', () => {
            return this.state;
        });
    }
};
UpdateContribution = __decorate([
    __param(0, IStorageService),
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IDialogService),
    __param(4, IUpdateService),
    __param(5, IActivityService),
    __param(6, IContextKeyService),
    __param(7, IProductService),
    __param(8, IOpenerService),
    __param(9, IConfigurationService),
    __param(10, IHostService)
], UpdateContribution);
export { UpdateContribution };
let SwitchProductQualityContribution = class SwitchProductQualityContribution extends Disposable {
    constructor(productService, environmentService) {
        super();
        this.productService = productService;
        this.environmentService = environmentService;
        this.registerGlobalActivityActions();
    }
    registerGlobalActivityActions() {
        const quality = this.productService.quality;
        const productQualityChangeHandler = this.environmentService.options?.productQualityChangeHandler;
        if (productQualityChangeHandler && (quality === 'stable' || quality === 'insider')) {
            const newQuality = quality === 'stable' ? 'insider' : 'stable';
            const commandId = `update.switchQuality.${newQuality}`;
            const isSwitchingToInsiders = newQuality === 'insider';
            this._register(registerAction2(class SwitchQuality extends Action2 {
                constructor() {
                    super({
                        id: commandId,
                        title: isSwitchingToInsiders ? nls.localize('switchToInsiders', "Switch to Insiders Version...") : nls.localize('switchToStable', "Switch to Stable Version..."),
                        precondition: IsWebContext,
                        menu: {
                            id: MenuId.GlobalActivity,
                            when: IsWebContext,
                            group: '7_update',
                        }
                    });
                }
                async run(accessor) {
                    const dialogService = accessor.get(IDialogService);
                    const userDataSyncEnablementService = accessor.get(IUserDataSyncEnablementService);
                    const userDataSyncStoreManagementService = accessor.get(IUserDataSyncStoreManagementService);
                    const storageService = accessor.get(IStorageService);
                    const userDataSyncWorkbenchService = accessor.get(IUserDataSyncWorkbenchService);
                    const userDataSyncService = accessor.get(IUserDataSyncService);
                    const notificationService = accessor.get(INotificationService);
                    try {
                        const selectSettingsSyncServiceDialogShownKey = 'switchQuality.selectSettingsSyncServiceDialogShown';
                        const userDataSyncStore = userDataSyncStoreManagementService.userDataSyncStore;
                        let userDataSyncStoreType;
                        if (userDataSyncStore && isSwitchingToInsiders && userDataSyncEnablementService.isEnabled()
                            && !storageService.getBoolean(selectSettingsSyncServiceDialogShownKey, -1 /* StorageScope.APPLICATION */, false)) {
                            userDataSyncStoreType = await this.selectSettingsSyncService(dialogService);
                            if (!userDataSyncStoreType) {
                                return;
                            }
                            storageService.store(selectSettingsSyncServiceDialogShownKey, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                            if (userDataSyncStoreType === 'stable') {
                                // Update the stable service type in the current window, so that it uses stable service after switched to insiders version (after reload).
                                await userDataSyncStoreManagementService.switch(userDataSyncStoreType);
                            }
                        }
                        const res = await dialogService.confirm({
                            type: 'info',
                            message: nls.localize('relaunchMessage', "Changing the version requires a reload to take effect"),
                            detail: newQuality === 'insider' ?
                                nls.localize('relaunchDetailInsiders', "Press the reload button to switch to the Insiders version of VS Code.") :
                                nls.localize('relaunchDetailStable', "Press the reload button to switch to the Stable version of VS Code."),
                            primaryButton: nls.localize({ key: 'reload', comment: ['&& denotes a mnemonic'] }, "&&Reload")
                        });
                        if (res.confirmed) {
                            const promises = [];
                            // If sync is happening wait until it is finished before reload
                            if (userDataSyncService.status === "syncing" /* SyncStatus.Syncing */) {
                                promises.push(Event.toPromise(Event.filter(userDataSyncService.onDidChangeStatus, status => status !== "syncing" /* SyncStatus.Syncing */)));
                            }
                            // If user chose the sync service then synchronise the store type option in insiders service, so that other clients using insiders service are also updated.
                            if (isSwitchingToInsiders && userDataSyncStoreType) {
                                promises.push(userDataSyncWorkbenchService.synchroniseUserDataSyncStoreType());
                            }
                            await Promises.settled(promises);
                            productQualityChangeHandler(newQuality);
                        }
                        else {
                            // Reset
                            if (userDataSyncStoreType) {
                                storageService.remove(selectSettingsSyncServiceDialogShownKey, -1 /* StorageScope.APPLICATION */);
                            }
                        }
                    }
                    catch (error) {
                        notificationService.error(error);
                    }
                }
                async selectSettingsSyncService(dialogService) {
                    const { result } = await dialogService.prompt({
                        type: Severity.Info,
                        message: nls.localize('selectSyncService.message', "Choose the settings sync service to use after changing the version"),
                        detail: nls.localize('selectSyncService.detail', "The Insiders version of VS Code will synchronize your settings, keybindings, extensions, snippets and UI State using separate insiders settings sync service by default."),
                        buttons: [
                            {
                                label: nls.localize({ key: 'use insiders', comment: ['&& denotes a mnemonic'] }, "&&Insiders"),
                                run: () => 'insiders'
                            },
                            {
                                label: nls.localize({ key: 'use stable', comment: ['&& denotes a mnemonic'] }, "&&Stable (current)"),
                                run: () => 'stable'
                            }
                        ],
                        cancelButton: true
                    });
                    return result;
                }
            }));
        }
    }
};
SwitchProductQualityContribution = __decorate([
    __param(0, IProductService),
    __param(1, IBrowserWorkbenchEnvironmentService)
], SwitchProductQualityContribution);
export { SwitchProductQualityContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi91cGRhdGUvYnJvd3Nlci91cGRhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFVLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUNySCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFOUUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsY0FBYyxFQUErRCxNQUFNLDhDQUE4QyxDQUFDO0FBQzNJLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoSSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbEgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDcEYsT0FB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