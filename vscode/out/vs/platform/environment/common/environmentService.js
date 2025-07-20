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
import { toLocalISOString } from '../../../base/common/date.js';
import { memoize } from '../../../base/common/decorators.js';
import { FileAccess, Schemas } from '../../../base/common/network.js';
import { dirname, join, normalize, resolve } from '../../../base/common/path.js';
import { env } from '../../../base/common/process.js';
import { joinPath } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
export const EXTENSION_IDENTIFIER_WITH_LOG_REGEX = /^([^.]+\..+)[:=](.+)$/;
export class AbstractNativeEnvironmentService {
    get appRoot() { return dirname(FileAccess.asFileUri('').fsPath); }
    get userHome() { return URI.file(this.paths.homeDir); }
    get userDataPath() { return this.paths.userDataDir; }
    get appSettingsHome() { return URI.file(join(this.userDataPath, 'User')); }
    get tmpDir() { return URI.file(this.paths.tmpDir); }
    get cacheHome() { return URI.file(this.userDataPath); }
    get stateResource() { return joinPath(this.appSettingsHome, 'globalStorage', 'storage.json'); }
    get userRoamingDataHome() { return this.appSettingsHome.with({ scheme: Schemas.vscodeUserData }); }
    get userDataSyncHome() { return joinPath(this.appSettingsHome, 'sync'); }
    get logsHome() {
        if (!this.args.logsPath) {
            const key = toLocalISOString(new Date()).replace(/-|:|\.\d+Z$/g, '');
            this.args.logsPath = join(this.userDataPath, 'logs', key);
        }
        return URI.file(this.args.logsPath);
    }
    get sync() { return this.args.sync; }
    get workspaceStorageHome() { return joinPath(this.appSettingsHome, 'workspaceStorage'); }
    get localHistoryHome() { return joinPath(this.appSettingsHome, 'History'); }
    get keyboardLayoutResource() { return joinPath(this.userRoamingDataHome, 'keyboardLayout.json'); }
    get argvResource() {
        const vscodePortable = env['VSCODE_PORTABLE'];
        if (vscodePortable) {
            return URI.file(join(vscodePortable, 'argv.json'));
        }
        return joinPath(this.userHome, this.productService.dataFolderName, 'argv.json');
    }
    get isExtensionDevelopment() { return !!this.args.extensionDevelopmentPath; }
    get untitledWorkspacesHome() { return URI.file(join(this.userDataPath, 'Workspaces')); }
    get builtinExtensionsPath() {
        const cliBuiltinExtensionsDir = this.args['builtin-extensions-dir'];
        if (cliBuiltinExtensionsDir) {
            return resolve(cliBuiltinExtensionsDir);
        }
        return normalize(join(FileAccess.asFileUri('').fsPath, '..', 'extensions'));
    }
    get extensionsDownloadLocation() {
        const cliExtensionsDownloadDir = this.args['extensions-download-dir'];
        if (cliExtensionsDownloadDir) {
            return URI.file(resolve(cliExtensionsDownloadDir));
        }
        return URI.file(join(this.userDataPath, 'CachedExtensionVSIXs'));
    }
    get extensionsPath() {
        const cliExtensionsDir = this.args['extensions-dir'];
        if (cliExtensionsDir) {
            return resolve(cliExtensionsDir);
        }
        const vscodeExtensions = env['VSCODE_EXTENSIONS'];
        if (vscodeExtensions) {
            return vscodeExtensions;
        }
        const vscodePortable = env['VSCODE_PORTABLE'];
        if (vscodePortable) {
            return join(vscodePortable, 'extensions');
        }
        return joinPath(this.userHome, this.productService.dataFolderName, 'extensions').fsPath;
    }
    get extensionDevelopmentLocationURI() {
        const extensionDevelopmentPaths = this.args.extensionDevelopmentPath;
        if (Array.isArray(extensionDevelopmentPaths)) {
            return extensionDevelopmentPaths.map(extensionDevelopmentPath => {
                if (/^[^:/?#]+?:\/\//.test(extensionDevelopmentPath)) {
                    return URI.parse(extensionDevelopmentPath);
                }
                return URI.file(normalize(extensionDevelopmentPath));
            });
        }
        return undefined;
    }
    get extensionDevelopmentKind() {
        return this.args.extensionDevelopmentKind?.map(kind => kind === 'ui' || kind === 'workspace' || kind === 'web' ? kind : 'workspace');
    }
    get extensionTestsLocationURI() {
        const extensionTestsPath = this.args.extensionTestsPath;
        if (extensionTestsPath) {
            if (/^[^:/?#]+?:\/\//.test(extensionTestsPath)) {
                return URI.parse(extensionTestsPath);
            }
            return URI.file(normalize(extensionTestsPath));
        }
        return undefined;
    }
    get disableExtensions() {
        if (this.args['disable-extensions']) {
            return true;
        }
        const disableExtensions = this.args['disable-extension'];
        if (disableExtensions) {
            if (typeof disableExtensions === 'string') {
                return [disableExtensions];
            }
            if (Array.isArray(disableExtensions) && disableExtensions.length > 0) {
                return disableExtensions;
            }
        }
        return false;
    }
    get debugExtensionHost() { return parseExtensionHostDebugPort(this.args, this.isBuilt); }
    get debugRenderer() { return !!this.args.debugRenderer; }
    get isBuilt() { return !env['VSCODE_DEV']; }
    get verbose() { return !!this.args.verbose; }
    get logLevel() { return this.args.log?.find(entry => !EXTENSION_IDENTIFIER_WITH_LOG_REGEX.test(entry)); }
    get extensionLogLevel() {
        const result = [];
        for (const entry of this.args.log || []) {
            const matches = EXTENSION_IDENTIFIER_WITH_LOG_REGEX.exec(entry);
            if (matches && matches[1] && matches[2]) {
                result.push([matches[1], matches[2]]);
            }
        }
        return result.length ? result : undefined;
    }
    get serviceMachineIdResource() { return joinPath(URI.file(this.userDataPath), 'machineid'); }
    get crashReporterId() { return this.args['crash-reporter-id']; }
    get crashReporterDirectory() { return this.args['crash-reporter-directory']; }
    get disableTelemetry() { return !!this.args['disable-telemetry']; }
    get disableExperiments() { return !!this.args['disable-experiments']; }
    get disableWorkspaceTrust() { return !!this.args['disable-workspace-trust']; }
    get useInMemorySecretStorage() { return !!this.args['use-inmemory-secretstorage']; }
    get policyFile() {
        if (this.args['__enable-file-policy']) {
            const vscodePortable = env['VSCODE_PORTABLE'];
            if (vscodePortable) {
                return URI.file(join(vscodePortable, 'policy.json'));
            }
            return joinPath(this.userHome, this.productService.dataFolderName, 'policy.json');
        }
        return undefined;
    }
    get editSessionId() { return this.args['editSessionId']; }
    get continueOn() {
        return this.args['continueOn'];
    }
    set continueOn(value) {
        this.args['continueOn'] = value;
    }
    get args() { return this._args; }
    constructor(_args, paths, productService) {
        this._args = _args;
        this.paths = paths;
        this.productService = productService;
    }
}
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "appRoot", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "userHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "userDataPath", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "appSettingsHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "tmpDir", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "cacheHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "stateResource", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "userRoamingDataHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "userDataSyncHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "sync", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "workspaceStorageHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "localHistoryHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "keyboardLayoutResource", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "argvResource", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "isExtensionDevelopment", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "untitledWorkspacesHome", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "builtinExtensionsPath", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "extensionsPath", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "extensionDevelopmentLocationURI", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "extensionDevelopmentKind", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "extensionTestsLocationURI", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "debugExtensionHost", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "logLevel", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "extensionLogLevel", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "serviceMachineIdResource", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "disableTelemetry", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "disableExperiments", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "disableWorkspaceTrust", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "useInMemorySecretStorage", null);
__decorate([
    memoize
], AbstractNativeEnvironmentService.prototype, "policyFile", null);
export function parseExtensionHostDebugPort(args, isBuilt) {
    return parseDebugParams(args['inspect-extensions'], args['inspect-brk-extensions'], 5870, isBuilt, args.debugId, args.extensionEnvironment);
}
export function parseDebugParams(debugArg, debugBrkArg, defaultBuildPort, isBuilt, debugId, environmentString) {
    const portStr = debugBrkArg || debugArg;
    const port = Number(portStr) || (!isBuilt ? defaultBuildPort : null);
    const brk = port ? Boolean(!!debugBrkArg) : false;
    let env;
    if (environmentString) {
        try {
            env = JSON.parse(environmentString);
        }
        catch {
            // ignore
        }
    }
    return { port, break: brk, debugId, env };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbnZpcm9ubWVudC9jb21tb24vZW52aXJvbm1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNqRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUtsRCxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRyx1QkFBdUIsQ0FBQztBQXlCM0UsTUFBTSxPQUFnQixnQ0FBZ0M7SUFLckQsSUFBSSxPQUFPLEtBQWEsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFHMUUsSUFBSSxRQUFRLEtBQVUsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRzVELElBQUksWUFBWSxLQUFhLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lB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