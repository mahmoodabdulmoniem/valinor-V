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
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { AbstractNativeEnvironmentService } from '../../../../platform/environment/common/environmentService.js';
import { memoize } from '../../../../base/common/decorators.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
export const INativeWorkbenchEnvironmentService = refineServiceDecorator(IEnvironmentService);
export class NativeWorkbenchEnvironmentService extends AbstractNativeEnvironmentService {
    get mainPid() { return this.configuration.mainPid; }
    get machineId() { return this.configuration.machineId; }
    get sqmId() { return this.configuration.sqmId; }
    get devDeviceId() { return this.configuration.devDeviceId; }
    get remoteAuthority() { return this.configuration.remoteAuthority; }
    get expectsResolverExtension() { return !!this.configuration.remoteAuthority?.includes('+'); }
    get execPath() { return this.configuration.execPath; }
    get backupPath() { return this.configuration.backupPath; }
    get window() {
        return {
            id: this.configuration.windowId,
            handle: this.configuration.handle,
            colorScheme: this.configuration.colorScheme,
            maximized: this.configuration.maximized,
            accessibilitySupport: this.configuration.accessibilitySupport,
            perfMarks: this.configuration.perfMarks,
            isInitialStartup: this.configuration.isInitialStartup,
            isCodeCaching: typeof this.configuration.codeCachePath === 'string'
        };
    }
    get windowLogsPath() { return joinPath(this.logsHome, `window${this.configuration.windowId}`); }
    get logFile() { return joinPath(this.windowLogsPath, `renderer.log`); }
    get extHostLogsPath() { return joinPath(this.windowLogsPath, 'exthost'); }
    get webviewExternalEndpoint() { return `${Schemas.vscodeWebview}://{{uuid}}`; }
    get skipReleaseNotes() { return !!this.args['skip-release-notes']; }
    get skipWelcome() { return !!this.args['skip-welcome']; }
    get logExtensionHostCommunication() { return !!this.args.logExtensionHostCommunication; }
    get enableSmokeTestDriver() { return !!this.args['enable-smoke-test-driver']; }
    get extensionEnabledProposedApi() {
        if (Array.isArray(this.args['enable-proposed-api'])) {
            return this.args['enable-proposed-api'];
        }
        if ('enable-proposed-api' in this.args) {
            return [];
        }
        return undefined;
    }
    get os() { return this.configuration.os; }
    get filesToOpenOrCreate() { return this.configuration.filesToOpenOrCreate; }
    get filesToDiff() { return this.configuration.filesToDiff; }
    get filesToMerge() { return this.configuration.filesToMerge; }
    get filesToWait() { return this.configuration.filesToWait; }
    get startupExperimentGroup() {
        const group = this.args['startup-experiment-group'];
        if (typeof group === 'string') {
            return group;
        }
        return undefined;
    }
    constructor(configuration, productService) {
        super(configuration, { homeDir: configuration.homeDir, tmpDir: configuration.tmpDir, userDataDir: configuration.userDataDir }, productService);
        this.configuration = configuration;
    }
}
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "mainPid", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "machineId", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "sqmId", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "devDeviceId", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "remoteAuthority", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "expectsResolverExtension", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "execPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "backupPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "window", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "windowLogsPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "logFile", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "extHostLogsPath", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "webviewExternalEndpoint", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "skipReleaseNotes", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "skipWelcome", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "logExtensionHostCommunication", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "enableSmokeTestDriver", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "extensionEnabledProposedApi", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "os", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToOpenOrCreate", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToDiff", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToMerge", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "filesToWait", null);
__decorate([
    memoize
], NativeWorkbenchEnvironmentService.prototype, "startupExperimentGroup", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZW52aXJvbm1lbnQvZWxlY3Ryb24tYnJvd3Nlci9lbnZpcm9ubWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFLaEcsT0FBTyxFQUFFLG1CQUFtQixFQUE2QixNQUFNLHdEQUF3RCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2hFLE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLHNCQUFzQixDQUEwRCxtQkFBbUIsQ0FBQyxDQUFDO0FBdUN2SixNQUFNLE9BQU8saUNBQWtDLFNBQVEsZ0NBQWdDO0lBR3RGLElBQUksT0FBTyxLQUFLLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBR3BELElBQUksU0FBUyxLQUFLLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBR3hELElBQUksS0FBSyxLQUFLLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBR2hELElBQUksV0FBVyxLQUFLLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBRzVELElBQUksZUFBZSxLQUFL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