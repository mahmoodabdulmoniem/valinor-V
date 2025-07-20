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
import { spawn } from 'child_process';
import * as fs from 'fs';
import { tmpdir } from 'os';
import { timeout } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { memoize } from '../../../base/common/decorators.js';
import { hash } from '../../../base/common/hash.js';
import * as path from '../../../base/common/path.js';
import { URI } from '../../../base/common/uri.js';
import { checksum } from '../../../base/node/crypto.js';
import * as pfs from '../../../base/node/pfs.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { IFileService } from '../../files/common/files.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, IRequestService } from '../../request/common/request.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { State } from '../common/update.js';
import { AbstractUpdateService, createUpdateURL } from './abstractUpdateService.js';
async function pollUntil(fn, millis = 1000) {
    while (!fn()) {
        await timeout(millis);
    }
}
let _updateType = undefined;
function getUpdateType() {
    if (typeof _updateType === 'undefined') {
        _updateType = fs.existsSync(path.join(path.dirname(process.execPath), 'unins000.exe'))
            ? 0 /* UpdateType.Setup */
            : 1 /* UpdateType.Archive */;
    }
    return _updateType;
}
let Win32UpdateService = class Win32UpdateService extends AbstractUpdateService {
    get cachePath() {
        const result = path.join(tmpdir(), `vscode-${this.productService.quality}-${this.productService.target}-${process.arch}`);
        return fs.promises.mkdir(result, { recursive: true }).then(() => result);
    }
    constructor(lifecycleMainService, configurationService, telemetryService, environmentMainService, requestService, logService, fileService, nativeHostMainService, productService) {
        super(lifecycleMainService, configurationService, environmentMainService, requestService, logService, productService);
        this.telemetryService = telemetryService;
        this.fileService = fileService;
        this.nativeHostMainService = nativeHostMainService;
        lifecycleMainService.setRelaunchHandler(this);
    }
    handleRelaunch(options) {
        if (options?.addArgs || options?.removeArgs) {
            return false; // we cannot apply an update and restart with different args
        }
        if (this.state.type !== "ready" /* StateType.Ready */ || !this.availableUpdate) {
            return false; // we only handle the relaunch when we have a pending update
        }
        this.logService.trace('update#handleRelaunch(): running raw#quitAndInstall()');
        this.doQuitAndInstall();
        return true;
    }
    async initialize() {
        if (this.productService.target === 'user' && await this.nativeHostMainService.isAdmin(undefined)) {
            this.setState(State.Disabled(5 /* DisablementReason.RunningAsAdmin */));
            this.logService.info('update#ctor - updates are disabled due to running as Admin in user setup');
            return;
        }
        await super.initialize();
    }
    buildUpdateFeedUrl(quality) {
        let platform = `win32-${process.arch}`;
        if (getUpdateType() === 1 /* UpdateType.Archive */) {
            platform += '-archive';
        }
        else if (this.productService.target === 'user') {
            platform += '-user';
        }
        return createUpdateURL(platform, quality, this.productService);
    }
    doCheckForUpdates(explicit) {
        if (!this.url) {
            return;
        }
        const url = explicit ? this.url : `${this.url}?bg=true`;
        this.setState(State.CheckingForUpdates(explicit));
        this.requestService.request({ url }, CancellationToken.None)
            .then(asJson)
            .then(update => {
            const updateType = getUpdateType();
            if (!update || !update.url || !update.version || !update.productVersion) {
                this.setState(State.Idle(updateType));
                return Promise.resolve(null);
            }
            if (updateType === 1 /* UpdateType.Archive */) {
                this.setState(State.AvailableForDownload(update));
                return Promise.resolve(null);
            }
            this.setState(State.Downloading);
            return this.cleanup(update.version).then(() => {
                return this.getUpdatePackagePath(update.version).then(updatePackagePath => {
                    return pfs.Promises.exists(updatePackagePath).then(exists => {
                        if (exists) {
                            return Promise.resolve(updatePackagePath);
                        }
                        const downloadPath = `${updatePackagePath}.tmp`;
                        return this.requestService.request({ url: update.url }, CancellationToken.None)
                            .then(context => this.fileService.writeFile(URI.file(downloadPath), context.stream))
                            .then(update.sha256hash ? () => checksum(downloadPath, update.sha256hash) : () => undefined)
                            .then(() => pfs.Promises.rename(downloadPath, updatePackagePath, false /* no retry */))
                            .then(() => updatePackagePath);
                    });
                }).then(packagePath => {
                    this.availableUpdate = { packagePath };
                    this.setState(State.Downloaded(update));
                    const fastUpdatesEnabled = this.configurationService.getValue('update.enableWindowsBackgroundUpdates');
                    if (fastUpdatesEnabled) {
                        if (this.productService.target === 'user') {
                            this.doApplyUpdate();
                        }
                    }
                    else {
                        this.setState(State.Ready(update));
                    }
                });
            });
        })
            .then(undefined, err => {
            this.telemetryService.publicLog2('update:error', { messageHash: String(hash(String(err))) });
            this.logService.error(err);
            // only show message when explicitly checking for updates
            const message = explicit ? (err.message || err) : undefined;
            this.setState(State.Idle(getUpdateType(), message));
        });
    }
    async doDownloadUpdate(state) {
        if (state.update.url) {
            this.nativeHostMainService.openExternal(undefined, state.update.url);
        }
        this.setState(State.Idle(getUpdateType()));
    }
    async getUpdatePackagePath(version) {
        const cachePath = await this.cachePath;
        return path.join(cachePath, `CodeSetup-${this.productService.quality}-${version}.exe`);
    }
    async cleanup(exceptVersion = null) {
        const filter = exceptVersion ? (one) => !(new RegExp(`${this.productService.quality}-${exceptVersion}\\.exe$`).test(one)) : () => true;
        const cachePath = await this.cachePath;
        const versions = await pfs.Promises.readdir(cachePath);
        const promises = versions.filter(filter).map(async (one) => {
            try {
                await fs.promises.unlink(path.join(cachePath, one));
            }
            catch (err) {
                // ignore
            }
        });
        await Promise.all(promises);
    }
    async doApplyUpdate() {
        if (this.state.type !== "downloaded" /* StateType.Downloaded */) {
            return Promise.resolve(undefined);
        }
        if (!this.availableUpdate) {
            return Promise.resolve(undefined);
        }
        const update = this.state.update;
        this.setState(State.Updating(update));
        const cachePath = await this.cachePath;
        this.availableUpdate.updateFilePath = path.join(cachePath, `CodeSetup-${this.productService.quality}-${update.version}.flag`);
        await pfs.Promises.writeFile(this.availableUpdate.updateFilePath, 'flag');
        const child = spawn(this.availableUpdate.packagePath, ['/verysilent', '/log', `/update="${this.availableUpdate.updateFilePath}"`, '/nocloseapplications', '/mergetasks=runcode,!desktopicon,!quicklaunchicon'], {
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore'],
            windowsVerbatimArguments: true
        });
        child.once('exit', () => {
            this.availableUpdate = undefined;
            this.setState(State.Idle(getUpdateType()));
        });
        const readyMutexName = `${this.productService.win32MutexName}-ready`;
        const mutex = await import('@vscode/windows-mutex');
        // poll for mutex-ready
        pollUntil(() => mutex.isActive(readyMutexName))
            .then(() => this.setState(State.Ready(update)));
    }
    doQuitAndInstall() {
        if (this.state.type !== "ready" /* StateType.Ready */ || !this.availableUpdate) {
            return;
        }
        this.logService.trace('update#quitAndInstall(): running raw#quitAndInstall()');
        if (this.availableUpdate.updateFilePath) {
            fs.unlinkSync(this.availableUpdate.updateFilePath);
        }
        else {
            spawn(this.availableUpdate.packagePath, ['/silent', '/log', '/mergetasks=runcode,!desktopicon,!quicklaunchicon'], {
                detached: true,
                stdio: ['ignore', 'ignore', 'ignore']
            });
        }
    }
    getUpdateType() {
        return getUpdateType();
    }
    async _applySpecificUpdate(packagePath) {
        if (this.state.type !== "idle" /* StateType.Idle */) {
            return;
        }
        const fastUpdatesEnabled = this.configurationService.getValue('update.enableWindowsBackgroundUpdates');
        const update = { version: 'unknown', productVersion: 'unknown' };
        this.setState(State.Downloading);
        this.availableUpdate = { packagePath };
        this.setState(State.Downloaded(update));
        if (fastUpdatesEnabled) {
            if (this.productService.target === 'user') {
                this.doApplyUpdate();
            }
        }
        else {
            this.setState(State.Ready(update));
        }
    }
};
__decorate([
    memoize
], Win32UpdateService.prototype, "cachePath", null);
Win32UpdateService = __decorate([
    __param(0, ILifecycleMainService),
    __param(1, IConfigurationService),
    __param(2, ITelemetryService),
    __param(3, IEnvironmentMainService),
    __param(4, IRequestService),
    __param(5, ILogService),
    __param(6, IFileService),
    __param(7, INativeHostMainService),
    __param(8, IProductService)
], Win32UpdateService);
export { Win32UpdateService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS53aW4zMi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXBkYXRlL2VsZWN0cm9uLW1haW4vdXBkYXRlU2VydmljZS53aW4zMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3RDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hELE9BQU8sS0FBSyxHQUFHLE1BQU0sMkJBQTJCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBc0MsTUFBTSx1REFBdUQsQ0FBQztBQUNsSSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFvRCxLQUFLLEVBQXlCLE1BQU0scUJBQXFCLENBQUM7QUFDckgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGVBQWUsRUFBNkIsTUFBTSw0QkFBNEIsQ0FBQztBQUUvRyxLQUFLLFVBQVUsU0FBUyxDQUFDLEVBQWlCLEVBQUUsTUFBTSxHQUFHLElBQUk7SUFDeEQsT0FBTyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7UUFDZCxNQUFNLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN2QixDQUFDO0FBQ0YsQ0FBQztBQU9ELElBQUksV0FBVyxHQUEyQixTQUFTLENBQUM7QUFDcEQsU0FBUyxhQUFhO0lBQ3JCLElBQUksT0FBTyxXQUFXLEtBQUssV0FBVyxFQUFFLENBQUM7UUFDeEMsV0FBVyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUNyRixDQUFDO1lBQ0QsQ0FBQywyQkFBbUIsQ0FBQztJQUN2QixDQUFDO0lBRUQsT0FBTyxXQUFXLENBQUM7QUFDcEIsQ0FBQztBQUVNLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEscUJBQXFCO0lBSzVELElBQUksU0FBUztRQUNaLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsVUFBVSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMxSCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQsWUFDd0Isb0JBQTJDLEVBQzNDLG9CQUEyQyxFQUM5QixnQkFBbUMsRUFDOUMsc0JBQStDLEVBQ3ZELGNBQStCLEVBQ25DLFVBQXVCLEVBQ0wsV0FBeUIsRUFDZixxQkFBNkMsRUFDckUsY0FBK0I7UUFFaEQsS0FBSyxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLHNCQUFzQixFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFSbEYscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUl4QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNmLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7UUFLdEYsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELGNBQWMsQ0FBQyxPQUEwQjtRQUN4QyxJQUFJLE9BQU8sRUFBRSxPQUFPLElBQUksT0FBTyxFQUFFLFVBQVUsRUFBRSxDQUFDO1lBQzdDLE9BQU8sS0FBSyxDQUFDLENBQUMsNERBQTREO1FBQzNFLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxrQ0FBb0IsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNsRSxPQUFPLEtBQUssQ0FBQyxDQUFDLDREQUE0RDtRQUMzRSxDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQztRQUMvRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUV4QixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFa0IsS0FBSyxDQUFDLFVBQVU7UUFDbEMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDbEcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSwwQ0FBa0MsQ0FBQyxDQUFDO1lBQ2hFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLDBFQUEwRSxDQUFDLENBQUM7WUFDakcsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRVMsa0JBQWtCLENBQUMsT0FBZTtRQUMzQyxJQUFJLFFBQVEsR0FBRyxTQUFTLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUV2QyxJQUFJLGFBQWEsRUFBRSwrQkFBdUIsRUFBRSxDQUFDO1lBQzVDLFFBQVEsSUFBSSxVQUFVLENBQUM7UUFDeEIsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDbEQsUUFBUSxJQUFJLE9BQU8sQ0FBQztRQUNyQixDQUFDO1FBRUQsT0FBTyxlQUFlLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVTLGlCQUFpQixDQUFDLFFBQWlCO1FBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDZixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUM7UUFDeEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUVsRCxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQzthQUMxRCxJQUFJLENBQWlCLE1BQU0sQ0FBQzthQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDZCxNQUFNLFVBQVUsR0FBRyxhQUFhLEVBQUUsQ0FBQztZQUVuQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3pFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUN0QyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUIsQ0FBQztZQUVELElBQUksVUFBVSwrQkFBdUIsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNsRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUIsQ0FBQztZQUVELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRWpDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDN0MsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO29CQUN6RSxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO3dCQUMzRCxJQUFJLE1BQU0sRUFBRSxDQUFDOzRCQUNaLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO3dCQUMzQyxDQUFDO3dCQUVELE1BQU0sWUFBWSxHQUFHLEdBQUcsaUJBQWlCLE1BQU0sQ0FBQzt3QkFFaEQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDOzZCQUM3RSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQzs2QkFDbkYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUM7NkJBQzNGLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDOzZCQUN0RixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQztvQkFDakMsQ0FBQyxDQUFDLENBQUM7Z0JBQ0osQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFO29CQUNyQixJQUFJLENBQUMsZUFBZSxHQUFHLEVBQUUsV0FBVyxFQUFFLENBQUM7b0JBQ3ZDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUV4QyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsdUNBQXVDLENBQUMsQ0FBQztvQkFDdkcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO3dCQUN4QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDOzRCQUMzQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7d0JBQ3RCLENBQUM7b0JBQ0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUNwQyxDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUM7YUFDRCxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxFQUFFO1lBQ3RCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQXFELGNBQWMsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2pKLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRTNCLHlEQUF5RDtZQUN6RCxNQUFNLE9BQU8sR0FBdUIsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztZQUNoRixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUNyRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFa0IsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQTJCO1FBQ3BFLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsT0FBZTtRQUNqRCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDdkMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxJQUFJLE9BQU8sTUFBTSxDQUFDLENBQUM7SUFDeEYsQ0FBQztJQUVPLEtBQUssQ0FBQyxPQUFPLENBQUMsZ0JBQStCLElBQUk7UUFDeEQsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLElBQUksYUFBYSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDO1FBRS9JLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN2QyxNQUFNLFFBQVEsR0FBRyxNQUFNLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXZELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxHQUFHLEVBQUMsRUFBRTtZQUN4RCxJQUFJLENBQUM7Z0JBQ0osTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JELENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLFNBQVM7WUFDVixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVrQixLQUFLLENBQUMsYUFBYTtRQUNyQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSw0Q0FBeUIsRUFBRSxDQUFDO1lBQzlDLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMzQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRXRDLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUV2QyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxhQUFhLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxPQUFPLE9BQU8sQ0FBQyxDQUFDO1FBRTlILE1BQU0sR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDMUUsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLENBQUMsYUFBYSxFQUFFLE1BQU0sRUFBRSxZQUFZLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxHQUFHLEVBQUUsc0JBQXNCLEVBQUUsbURBQW1ELENBQUMsRUFBRTtZQUMvTSxRQUFRLEVBQUUsSUFBSTtZQUNkLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDO1lBQ3JDLHdCQUF3QixFQUFFLElBQUk7U0FDOUIsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDO1lBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxRQUFRLENBQUM7UUFDckUsTUFBTSxLQUFLLEdBQUcsTUFBTSxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUVwRCx1QkFBdUI7UUFDdkIsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUM7YUFDN0MsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVrQixnQkFBZ0I7UUFDbEMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksa0NBQW9CLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDbEUsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyx1REFBdUQsQ0FBQyxDQUFDO1FBRS9FLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6QyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDcEQsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLG1EQUFtRCxDQUFDLEVBQUU7Z0JBQ2pILFFBQVEsRUFBRSxJQUFJO2dCQUNkLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDO2FBQ3JDLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRWtCLGFBQWE7UUFDL0IsT0FBTyxhQUFhLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRVEsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFdBQW1CO1FBQ3RELElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLGdDQUFtQixFQUFFLENBQUM7WUFDeEMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsdUNBQXVDLENBQUMsQ0FBQztRQUN2RyxNQUFNLE1BQU0sR0FBWSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxDQUFDO1FBRTFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxXQUFXLEVBQUUsQ0FBQztRQUN2QyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUV4QyxJQUFJLGtCQUFrQixFQUFFLENBQUM7WUFDeEIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDM0MsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3RCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXJPQTtJQURDLE9BQU87bURBSVA7QUFSVyxrQkFBa0I7SUFXNUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEsZUFBZSxDQUFBO0dBbkJMLGtCQUFrQixDQTBPOUIifQ==