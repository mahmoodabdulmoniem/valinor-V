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
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { Barrier, DeferredPromise } from '../../../base/common/async.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { IPolicyService } from '../../policy/common/policy.js';
import { ILoggerMainService } from '../../log/electron-main/loggerService.js';
import { UtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
import { NullTelemetryService } from '../../telemetry/common/telemetryUtils.js';
import { parseSharedProcessDebugPort } from '../../environment/node/environmentService.js';
import { assertReturnsDefined } from '../../../base/common/types.js';
import { SharedProcessChannelConnection, SharedProcessRawConnection, SharedProcessLifecycle } from '../common/sharedProcess.js';
import { Emitter } from '../../../base/common/event.js';
let SharedProcess = class SharedProcess extends Disposable {
    constructor(machineId, sqmId, devDeviceId, environmentMainService, userDataProfilesService, lifecycleMainService, logService, loggerMainService, policyService) {
        super();
        this.machineId = machineId;
        this.sqmId = sqmId;
        this.devDeviceId = devDeviceId;
        this.environmentMainService = environmentMainService;
        this.userDataProfilesService = userDataProfilesService;
        this.lifecycleMainService = lifecycleMainService;
        this.logService = logService;
        this.loggerMainService = loggerMainService;
        this.policyService = policyService;
        this.firstWindowConnectionBarrier = new Barrier();
        this.utilityProcess = undefined;
        this.utilityProcessLogListener = undefined;
        this._onDidCrash = this._register(new Emitter());
        this.onDidCrash = this._onDidCrash.event;
        this._whenReady = undefined;
        this._whenIpcReady = undefined;
        this.registerListeners();
    }
    registerListeners() {
        // Shared process channel connections from workbench windows
        validatedIpcMain.on(SharedProcessChannelConnection.request, (e, nonce) => this.onWindowConnection(e, nonce, SharedProcessChannelConnection.response));
        // Shared process raw connections from workbench windows
        validatedIpcMain.on(SharedProcessRawConnection.request, (e, nonce) => this.onWindowConnection(e, nonce, SharedProcessRawConnection.response));
        // Lifecycle
        this._register(this.lifecycleMainService.onWillShutdown(() => this.onWillShutdown()));
    }
    async onWindowConnection(e, nonce, responseChannel) {
        this.logService.trace(`[SharedProcess] onWindowConnection for: ${responseChannel}`);
        // release barrier if this is the first window connection
        if (!this.firstWindowConnectionBarrier.isOpen()) {
            this.firstWindowConnectionBarrier.open();
        }
        // await the shared process to be overall ready
        // we do not just wait for IPC ready because the
        // workbench window will communicate directly
        await this.whenReady();
        // connect to the shared process passing the responseChannel
        // as payload to give a hint what the connection is about
        const port = await this.connect(responseChannel);
        // Check back if the requesting window meanwhile closed
        // Since shared process is delayed on startup there is
        // a chance that the window close before the shared process
        // was ready for a connection.
        if (e.sender.isDestroyed()) {
            return port.close();
        }
        // send the port back to the requesting window
        e.sender.postMessage(responseChannel, nonce, [port]);
    }
    onWillShutdown() {
        this.logService.trace('[SharedProcess] onWillShutdown');
        this.utilityProcess?.postMessage(SharedProcessLifecycle.exit);
        this.utilityProcess = undefined;
    }
    whenReady() {
        if (!this._whenReady) {
            this._whenReady = (async () => {
                // Wait for shared process being ready to accept connection
                await this.whenIpcReady;
                // Overall signal that the shared process was loaded and
                // all services within have been created.
                const whenReady = new DeferredPromise();
                this.utilityProcess?.once(SharedProcessLifecycle.initDone, () => whenReady.complete());
                await whenReady.p;
                this.utilityProcessLogListener?.dispose();
                this.logService.trace('[SharedProcess] Overall ready');
            })();
        }
        return this._whenReady;
    }
    get whenIpcReady() {
        if (!this._whenIpcReady) {
            this._whenIpcReady = (async () => {
                // Always wait for first window asking for connection
                await this.firstWindowConnectionBarrier.wait();
                // Spawn shared process
                this.createUtilityProcess();
                // Wait for shared process indicating that IPC connections are accepted
                const sharedProcessIpcReady = new DeferredPromise();
                this.utilityProcess?.once(SharedProcessLifecycle.ipcReady, () => sharedProcessIpcReady.complete());
                await sharedProcessIpcReady.p;
                this.logService.trace('[SharedProcess] IPC ready');
            })();
        }
        return this._whenIpcReady;
    }
    createUtilityProcess() {
        this.utilityProcess = this._register(new UtilityProcess(this.logService, NullTelemetryService, this.lifecycleMainService));
        // Install a log listener for very early shared process warnings and errors
        this.utilityProcessLogListener = this.utilityProcess.onMessage((e) => {
            if (typeof e.warning === 'string') {
                this.logService.warn(e.warning);
            }
            else if (typeof e.error === 'string') {
                this.logService.error(e.error);
            }
        });
        const inspectParams = parseSharedProcessDebugPort(this.environmentMainService.args, this.environmentMainService.isBuilt);
        let execArgv = undefined;
        if (inspectParams.port) {
            execArgv = ['--nolazy', '--experimental-network-inspection'];
            if (inspectParams.break) {
                execArgv.push(`--inspect-brk=${inspectParams.port}`);
            }
            else {
                execArgv.push(`--inspect=${inspectParams.port}`);
            }
        }
        this.utilityProcess.start({
            type: 'shared-process',
            name: 'shared-process',
            entryPoint: 'vs/code/electron-utility/sharedProcess/sharedProcessMain',
            payload: this.createSharedProcessConfiguration(),
            respondToAuthRequestsFromMainProcess: true,
            execArgv
        });
        this._register(this.utilityProcess.onCrash(() => this._onDidCrash.fire()));
    }
    createSharedProcessConfiguration() {
        return {
            machineId: this.machineId,
            sqmId: this.sqmId,
            devDeviceId: this.devDeviceId,
            codeCachePath: this.environmentMainService.codeCachePath,
            profiles: {
                home: this.userDataProfilesService.profilesHome,
                all: this.userDataProfilesService.profiles,
            },
            args: this.environmentMainService.args,
            logLevel: this.loggerMainService.getLogLevel(),
            loggers: this.loggerMainService.getGlobalLoggers(),
            policiesData: this.policyService.serialize()
        };
    }
    async connect(payload) {
        // Wait for shared process being ready to accept connection
        await this.whenIpcReady;
        // Connect and return message port
        const utilityProcess = assertReturnsDefined(this.utilityProcess);
        return utilityProcess.connect(payload);
    }
};
SharedProcess = __decorate([
    __param(3, IEnvironmentMainService),
    __param(4, IUserDataProfilesService),
    __param(5, ILifecycleMainService),
    __param(6, ILogService),
    __param(7, ILoggerMainService),
    __param(8, IPolicyService)
], SharedProcess);
export { SharedProcess };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc2hhcmVkUHJvY2Vzcy9lbGVjdHJvbi1tYWluL3NoYXJlZFByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDNUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDOUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXRELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDaEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDM0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDckUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLDBCQUEwQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDaEksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRWpELElBQU0sYUFBYSxHQUFuQixNQUFNLGFBQWMsU0FBUSxVQUFVO0lBVTVDLFlBQ2tCLFNBQWlCLEVBQ2pCLEtBQWEsRUFDYixXQUFtQixFQUNYLHNCQUFnRSxFQUMvRCx1QkFBa0UsRUFDckUsb0JBQTRELEVBQ3RFLFVBQXdDLEVBQ2pDLGlCQUFzRCxFQUMxRCxhQUE4QztRQUU5RCxLQUFLLEVBQUUsQ0FBQztRQVZTLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ00sMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUM5Qyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ3BELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDckQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNoQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3pDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQWpCOUMsaUNBQTRCLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUV0RCxtQkFBYyxHQUErQixTQUFTLENBQUM7UUFDdkQsOEJBQXlCLEdBQTRCLFNBQVMsQ0FBQztRQUV0RCxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQzFELGVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztRQXFFckMsZUFBVSxHQUE4QixTQUFTLENBQUM7UUF1QmxELGtCQUFhLEdBQThCLFNBQVMsQ0FBQztRQTdFNUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVPLGlCQUFpQjtRQUV4Qiw0REFBNEQ7UUFDNUQsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLDhCQUE4QixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFhLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLDhCQUE4QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFOUosd0RBQXdEO1FBQ3hELGdCQUFnQixDQUFDLEVBQUUsQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBYSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSwwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRXRKLFlBQVk7UUFDWixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN2RixDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQWUsRUFBRSxLQUFhLEVBQUUsZUFBdUI7UUFDdkYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsMkNBQTJDLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFFcEYseURBQXlEO1FBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUNqRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDMUMsQ0FBQztRQUVELCtDQUErQztRQUMvQyxnREFBZ0Q7UUFDaEQsNkNBQTZDO1FBRTdDLE1BQU0sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRXZCLDREQUE0RDtRQUM1RCx5REFBeUQ7UUFFekQsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRWpELHVEQUF1RDtRQUN2RCxzREFBc0Q7UUFDdEQsMkRBQTJEO1FBQzNELDhCQUE4QjtRQUU5QixJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztZQUM1QixPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNyQixDQUFDO1FBRUQsOENBQThDO1FBQzlDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFTyxjQUFjO1FBQ3JCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFFeEQsSUFBSSxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUM7SUFDakMsQ0FBQztJQUdELFNBQVM7UUFDUixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRTtnQkFFN0IsMkRBQTJEO2dCQUMzRCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBRXhCLHdEQUF3RDtnQkFDeEQseUNBQXlDO2dCQUV6QyxNQUFNLFNBQVMsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFDO2dCQUM5QyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBRXZGLE1BQU0sU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDbEIsSUFBSSxDQUFDLHlCQUF5QixFQUFFLE9BQU8sRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1lBQ3hELENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDTixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3hCLENBQUM7SUFHRCxJQUFZLFlBQVk7UUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBRWhDLHFEQUFxRDtnQkFDckQsTUFBTSxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBRS9DLHVCQUF1QjtnQkFDdkIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBRTVCLHVFQUF1RTtnQkFDdkUsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFDO2dCQUMxRCxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFFbkcsTUFBTSxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDcEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNOLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDM0IsQ0FBQztJQUVPLG9CQUFvQjtRQUMzQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxvQkFBb0IsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBRTNILDJFQUEyRTtRQUMzRSxJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRTtZQUN6RSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2pDLENBQUM7aUJBQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsR0FBRywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN6SCxJQUFJLFFBQVEsR0FBeUIsU0FBUyxDQUFDO1FBQy9DLElBQUksYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3hCLFFBQVEsR0FBRyxDQUFDLFVBQVUsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDO1lBQzdELElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN6QixRQUFRLENBQUMsSUFBSSxDQUFDLGlCQUFpQixhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUN0RCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsUUFBUSxDQUFDLElBQUksQ0FBQyxhQUFhLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUM7WUFDekIsSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixJQUFJLEVBQUUsZ0JBQWdCO1lBQ3RCLFVBQVUsRUFBRSwwREFBMEQ7WUFDdEUsT0FBTyxFQUFFLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRTtZQUNoRCxvQ0FBb0MsRUFBRSxJQUFJO1lBQzFDLFFBQVE7U0FDUixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFTyxnQ0FBZ0M7UUFDdkMsT0FBTztZQUNOLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDakIsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLGFBQWEsRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsYUFBYTtZQUN4RCxRQUFRLEVBQUU7Z0JBQ1QsSUFBSSxFQUFFLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZO2dCQUMvQyxHQUFHLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVE7YUFDMUM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUk7WUFDdEMsUUFBUSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUU7WUFDOUMsT0FBTyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRTtZQUNsRCxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUU7U0FDNUMsQ0FBQztJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQWlCO1FBRTlCLDJEQUEyRDtRQUMzRCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUM7UUFFeEIsa0NBQWtDO1FBQ2xDLE1BQU0sY0FBYyxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNqRSxPQUFPLGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDeEMsQ0FBQztDQUNELENBQUE7QUF4TFksYUFBYTtJQWN2QixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxjQUFjLENBQUE7R0FuQkosYUFBYSxDQXdMekIifQ==