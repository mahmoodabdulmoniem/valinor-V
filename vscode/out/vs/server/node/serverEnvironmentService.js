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
import * as nls from '../../nls.js';
import { NativeEnvironmentService } from '../../platform/environment/node/environmentService.js';
import { OPTIONS } from '../../platform/environment/node/argv.js';
import { refineServiceDecorator } from '../../platform/instantiation/common/instantiation.js';
import { IEnvironmentService } from '../../platform/environment/common/environment.js';
import { memoize } from '../../base/common/decorators.js';
import { URI } from '../../base/common/uri.js';
import { joinPath } from '../../base/common/resources.js';
import { join } from '../../base/common/path.js';
export const serverOptions = {
    /* ----- server setup ----- */
    'host': { type: 'string', cat: 'o', args: 'ip-address', description: nls.localize('host', "The host name or IP address the server should listen to. If not set, defaults to 'localhost'.") },
    'port': { type: 'string', cat: 'o', args: 'port | port range', description: nls.localize('port', "The port the server should listen to. If 0 is passed a random free port is picked. If a range in the format num-num is passed, a free port from the range (end inclusive) is selected.") },
    'socket-path': { type: 'string', cat: 'o', args: 'path', description: nls.localize('socket-path', "The path to a socket file for the server to listen to.") },
    'server-base-path': { type: 'string', cat: 'o', args: 'path', description: nls.localize('server-base-path', "The path under which the web UI and the code server is provided. Defaults to '/'.`") },
    'connection-token': { type: 'string', cat: 'o', args: 'token', deprecates: ['connectionToken'], description: nls.localize('connection-token', "A secret that must be included with all requests.") },
    'connection-token-file': { type: 'string', cat: 'o', args: 'path', deprecates: ['connection-secret', 'connectionTokenFile'], description: nls.localize('connection-token-file', "Path to a file that contains the connection token.") },
    'without-connection-token': { type: 'boolean', cat: 'o', description: nls.localize('without-connection-token', "Run without a connection token. Only use this if the connection is secured by other means.") },
    'disable-websocket-compression': { type: 'boolean' },
    'print-startup-performance': { type: 'boolean' },
    'print-ip-address': { type: 'boolean' },
    'accept-server-license-terms': { type: 'boolean', cat: 'o', description: nls.localize('acceptLicenseTerms', "If set, the user accepts the server license terms and the server will be started without a user prompt.") },
    'server-data-dir': { type: 'string', cat: 'o', description: nls.localize('serverDataDir', "Specifies the directory that server data is kept in.") },
    'telemetry-level': { type: 'string', cat: 'o', args: 'level', description: nls.localize('telemetry-level', "Sets the initial telemetry level. Valid levels are: 'off', 'crash', 'error' and 'all'. If not specified, the server will send telemetry until a client connects, it will then use the clients telemetry setting. Setting this to 'off' is equivalent to --disable-telemetry") },
    /* ----- vs code options ---	-- */
    'user-data-dir': OPTIONS['user-data-dir'],
    'enable-smoke-test-driver': OPTIONS['enable-smoke-test-driver'],
    'disable-telemetry': OPTIONS['disable-telemetry'],
    'disable-experiments': OPTIONS['disable-experiments'],
    'disable-workspace-trust': OPTIONS['disable-workspace-trust'],
    'file-watcher-polling': { type: 'string', deprecates: ['fileWatcherPolling'] },
    'log': OPTIONS['log'],
    'logsPath': OPTIONS['logsPath'],
    'force-disable-user-env': OPTIONS['force-disable-user-env'],
    'enable-proposed-api': OPTIONS['enable-proposed-api'],
    /* ----- vs code web options ----- */
    'folder': { type: 'string', deprecationMessage: 'No longer supported. Folder needs to be provided in the browser URL or with `default-folder`.' },
    'workspace': { type: 'string', deprecationMessage: 'No longer supported. Workspace needs to be provided in the browser URL or with `default-workspace`.' },
    'default-folder': { type: 'string', description: nls.localize('default-folder', 'The workspace folder to open when no input is specified in the browser URL. A relative or absolute path resolved against the current working directory.') },
    'default-workspace': { type: 'string', description: nls.localize('default-workspace', 'The workspace to open when no input is specified in the browser URL. A relative or absolute path resolved against the current working directory.') },
    'enable-sync': { type: 'boolean' },
    'github-auth': { type: 'string' },
    'use-test-resolver': { type: 'boolean' },
    /* ----- extension management ----- */
    'extensions-dir': OPTIONS['extensions-dir'],
    'extensions-download-dir': OPTIONS['extensions-download-dir'],
    'builtin-extensions-dir': OPTIONS['builtin-extensions-dir'],
    'install-extension': OPTIONS['install-extension'],
    'install-builtin-extension': OPTIONS['install-builtin-extension'],
    'update-extensions': OPTIONS['update-extensions'],
    'uninstall-extension': OPTIONS['uninstall-extension'],
    'list-extensions': OPTIONS['list-extensions'],
    'locate-extension': OPTIONS['locate-extension'],
    'show-versions': OPTIONS['show-versions'],
    'category': OPTIONS['category'],
    'force': OPTIONS['force'],
    'do-not-sync': OPTIONS['do-not-sync'],
    'do-not-include-pack-dependencies': OPTIONS['do-not-include-pack-dependencies'],
    'pre-release': OPTIONS['pre-release'],
    'start-server': { type: 'boolean', cat: 'e', description: nls.localize('start-server', "Start the server when installing or uninstalling extensions. To be used in combination with 'install-extension', 'install-builtin-extension' and 'uninstall-extension'.") },
    /* ----- remote development options ----- */
    'enable-remote-auto-shutdown': { type: 'boolean' },
    'remote-auto-shutdown-without-delay': { type: 'boolean' },
    'use-host-proxy': { type: 'boolean' },
    'without-browser-env-var': { type: 'boolean' },
    /* ----- server cli ----- */
    'help': OPTIONS['help'],
    'version': OPTIONS['version'],
    'locate-shell-integration-path': OPTIONS['locate-shell-integration-path'],
    'compatibility': { type: 'string' },
    _: OPTIONS['_']
};
export const IServerEnvironmentService = refineServiceDecorator(IEnvironmentService);
export class ServerEnvironmentService extends NativeEnvironmentService {
    get userRoamingDataHome() { return this.appSettingsHome; }
    get machineSettingsResource() { return joinPath(URI.file(join(this.userDataPath, 'Machine')), 'settings.json'); }
    get mcpResource() { return joinPath(URI.file(join(this.userDataPath, 'User')), 'mcp.json'); }
    get args() { return super.args; }
}
__decorate([
    memoize
], ServerEnvironmentService.prototype, "userRoamingDataHome", null);
__decorate([
    memoize
], ServerEnvironmentService.prototype, "machineSettingsResource", null);
__decorate([
    memoize
], ServerEnvironmentService.prototype, "mcpResource", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyRW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9zZXJ2ZXJFbnZpcm9ubWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUM7QUFFcEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBc0IsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsbUJBQW1CLEVBQTZCLE1BQU0sa0RBQWtELENBQUM7QUFDbEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRWpELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBbUQ7SUFFNUUsOEJBQThCO0lBRTlCLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSwrRkFBK0YsQ0FBQyxFQUFFO0lBQzVMLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FB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