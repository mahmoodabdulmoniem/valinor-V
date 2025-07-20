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
import { timeout } from '../../../../base/common/async.js';
import { encodeBase64, VSBuffer } from '../../../../base/common/buffer.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import * as objects from '../../../../base/common/objects.js';
import * as platform from '../../../../base/common/platform.js';
import { removeDangerousEnvVariables } from '../../../../base/common/processes.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { BufferedEmitter } from '../../../../base/parts/ipc/common/ipc.net.js';
import { acquirePort } from '../../../../base/parts/ipc/electron-browser/ipc.mp.js';
import * as nls from '../../../../nls.js';
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { IExtensionHostStarter } from '../../../../platform/extensions/common/extensionHostStarter.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService, ILoggerService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { isLoggingOnly } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService, isUntitledWorkspace } from '../../../../platform/workspace/common/workspace.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-browser/environmentService.js';
import { IShellEnvironmentService } from '../../environment/electron-browser/shellEnvironmentService.js';
import { MessagePortExtHostConnection, writeExtHostConnection } from '../common/extensionHostEnv.js';
import { UIKind, isMessageOfType } from '../common/extensionHostProtocol.js';
import { IHostService } from '../../host/browser/host.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { parseExtensionDevOptions } from '../common/extensionDevOptions.js';
export class ExtensionHostProcess {
    get onStdout() {
        return this._extensionHostStarter.onDynamicStdout(this._id);
    }
    get onStderr() {
        return this._extensionHostStarter.onDynamicStderr(this._id);
    }
    get onMessage() {
        return this._extensionHostStarter.onDynamicMessage(this._id);
    }
    get onExit() {
        return this._extensionHostStarter.onDynamicExit(this._id);
    }
    constructor(id, _extensionHostStarter) {
        this._extensionHostStarter = _extensionHostStarter;
        this._id = id;
    }
    start(opts) {
        return this._extensionHostStarter.start(this._id, opts);
    }
    enableInspectPort() {
        return this._extensionHostStarter.enableInspectPort(this._id);
    }
    kill() {
        return this._extensionHostStarter.kill(this._id);
    }
}
let NativeLocalProcessExtensionHost = class NativeLocalProcessExtensionHost {
    constructor(runningLocation, startup, _initDataProvider, _contextService, _notificationService, _nativeHostService, _lifecycleService, _environmentService, _userDataProfilesService, _telemetryService, _logService, _loggerService, _labelService, _extensionHostDebugService, _hostService, _productService, _shellEnvironmentService, _extensionHostStarter) {
        this.runningLocation = runningLocation;
        this.startup = startup;
        this._initDataProvider = _initDataProvider;
        this._contextService = _contextService;
        this._notificationService = _notificationService;
        this._nativeHostService = _nativeHostService;
        this._lifecycleService = _lifecycleService;
        this._environmentService = _environmentService;
        this._userDataProfilesService = _userDataProfilesService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._loggerService = _loggerService;
        this._labelService = _labelService;
        this._extensionHostDebugService = _extensionHostDebugService;
        this._hostService = _hostService;
        this._productService = _productService;
        this._shellEnvironmentService = _shellEnvironmentService;
        this._extensionHostStarter = _extensionHostStarter;
        this.pid = null;
        this.remoteAuthority = null;
        this.extensions = null;
        this._onExit = new Emitter();
        this.onExit = this._onExit.event;
        this._onDidSetInspectPort = new Emitter();
        this._toDispose = new DisposableStore();
        const devOpts = parseExtensionDevOptions(this._environmentService);
        this._isExtensionDevHost = devOpts.isExtensionDevHost;
        this._isExtensionDevDebug = devOpts.isExtensionDevDebug;
        this._isExtensionDevDebugBrk = devOpts.isExtensionDevDebugBrk;
        this._isExtensionDevTestFromCli = devOpts.isExtensionDevTestFromCli;
        this._terminating = false;
        this._inspectListener = null;
        this._extensionHostProcess = null;
        this._messageProtocol = null;
        this._toDispose.add(this._onExit);
        this._toDispose.add(this._lifecycleService.onWillShutdown(e => this._onWillShutdown(e)));
        this._toDispose.add(this._extensionHostDebugService.onClose(event => {
            if (this._isExtensionDevHost && this._environmentService.debugExtensionHost.debugId === event.sessionId) {
                this._nativeHostService.closeWindow();
            }
        }));
        this._toDispose.add(this._extensionHostDebugService.onReload(event => {
            if (this._isExtensionDevHost && this._environmentService.debugExtensionHost.debugId === event.sessionId) {
                this._hostService.reload();
            }
        }));
    }
    dispose() {
        if (this._terminating) {
            return;
        }
        this._terminating = true;
        this._toDispose.dispose();
    }
    start() {
        if (this._terminating) {
            // .terminate() was called
            throw new CancellationError();
        }
        if (!this._messageProtocol) {
            this._messageProtocol = this._start();
        }
        return this._messageProtocol;
    }
    async _start() {
        const [extensionHostCreationResult, portNumber, processEnv] = await Promise.all([
            this._extensionHostStarter.createExtensionHost(),
            this._tryFindDebugPort(),
            this._shellEnvironmentService.getShellEnv(),
        ]);
        this._extensionHostProcess = new ExtensionHostProcess(extensionHostCreationResult.id, this._extensionHostStarter);
        const env = objects.mixin(processEnv, {
            VSCODE_ESM_ENTRYPOINT: 'vs/workbench/api/node/extensionHostProcess',
            VSCODE_HANDLES_UNCAUGHT_ERRORS: true
        });
        if (this._environmentService.debugExtensionHost.env) {
            objects.mixin(env, this._environmentService.debugExtensionHost.env);
        }
        removeDangerousEnvVariables(env);
        if (this._isExtensionDevHost) {
            // Unset `VSCODE_CODE_CACHE_PATH` when developing extensions because it might
            // be that dependencies, that otherwise would be cached, get modified.
            delete env['VSCODE_CODE_CACHE_PATH'];
        }
        const opts = {
            responseWindowId: this._nativeHostService.windowId,
            responseChannel: 'vscode:startExtensionHostMessagePortResult',
            responseNonce: generateUuid(),
            env,
            // We only detach the extension host on windows. Linux and Mac orphan by default
            // and detach under Linux and Mac create another process group.
            // We detach because we have noticed that when the renderer exits, its child processes
            // (i.e. extension host) are taken down in a brutal fashion by the OS
            detached: !!platform.isWindows,
            execArgv: undefined,
            silent: true
        };
        const inspectHost = '127.0.0.1';
        if (portNumber !== 0) {
            opts.execArgv = [
                '--nolazy',
                (this._isExtensionDevDebugBrk ? '--inspect-brk=' : '--inspect=') + `${inspectHost}:${portNumber}`
            ];
        }
        else {
            opts.execArgv = ['--inspect-port=0'];
        }
        if (this._environmentService.extensionTestsLocationURI) {
            opts.execArgv.unshift('--expose-gc');
        }
        if (this._environmentService.args['prof-v8-extensions']) {
            opts.execArgv.unshift('--prof');
        }
        // Refs https://github.com/microsoft/vscode/issues/189805
        //
        // Enable experimental network inspection
        // inspector agent is always setup hence add this flag
        // unconditionally.
        opts.execArgv.unshift('--dns-result-order=ipv4first', '--experimental-network-inspection');
        const onStdout = this._handleProcessOutputStream(this._extensionHostProcess.onStdout, this._toDispose);
        const onStderr = this._handleProcessOutputStream(this._extensionHostProcess.onStderr, this._toDispose);
        const onOutput = Event.any(Event.map(onStdout.event, o => ({ data: `%c${o}`, format: [''] })), Event.map(onStderr.event, o => ({ data: `%c${o}`, format: ['color: red'] })));
        // Debounce all output, so we can render it in the Chrome console as a group
        const onDebouncedOutput = Event.debounce(onOutput, (r, o) => {
            return r
                ? { data: r.data + o.data, format: [...r.format, ...o.format] }
                : { data: o.data, format: o.format };
        }, 100);
        // Print out extension host output
        this._toDispose.add(onDebouncedOutput(output => {
            const inspectorUrlMatch = output.data && output.data.match(/ws:\/\/([^\s]+):(\d+)\/[^\s]+/);
            if (inspectorUrlMatch) {
                const [, host, port] = inspectorUrlMatch;
                if (!this._environmentService.isBuilt && !this._isExtensionDevTestFromCli) {
                    console.log(`%c[Extension Host] %cdebugger inspector at devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=${inspectorUrlMatch[1]}`, 'color: blue', 'color:');
                }
                if (!this._inspectListener) {
                    this._inspectListener = { host, port: Number(port) };
                    this._onDidSetInspectPort.fire();
                }
            }
            else {
                if (!this._isExtensionDevTestFromCli) {
                    console.group('Extension Host');
                    console.log(output.data, ...output.format);
                    console.groupEnd();
                }
            }
        }));
        // Lifecycle
        this._toDispose.add(this._extensionHostProcess.onExit(({ code, signal }) => this._onExtHostProcessExit(code, signal)));
        // Notify debugger that we are ready to attach to the process if we run a development extension
        if (portNumber) {
            if (this._isExtensionDevHost && this._isExtensionDevDebug && this._environmentService.debugExtensionHost.debugId) {
                this._extensionHostDebugService.attachSession(this._environmentService.debugExtensionHost.debugId, portNumber);
            }
            this._inspectListener = { port: portNumber, host: inspectHost };
            this._onDidSetInspectPort.fire();
        }
        // Help in case we fail to start it
        let startupTimeoutHandle;
        if (!this._environmentService.isBuilt && !this._environmentService.remoteAuthority || this._isExtensionDevHost) {
            startupTimeoutHandle = setTimeout(() => {
                this._logService.error(`[LocalProcessExtensionHost]: Extension host did not start in 10 seconds (debugBrk: ${this._isExtensionDevDebugBrk})`);
                const msg = this._isExtensionDevDebugBrk
                    ? nls.localize('extensionHost.startupFailDebug', "Extension host did not start in 10 seconds, it might be stopped on the first line and needs a debugger to continue.")
                    : nls.localize('extensionHost.startupFail', "Extension host did not start in 10 seconds, that might be a problem.");
                this._notificationService.prompt(Severity.Warning, msg, [{
                        label: nls.localize('reloadWindow', "Reload Window"),
                        run: () => this._hostService.reload()
                    }], {
                    sticky: true,
                    priority: NotificationPriority.URGENT
                });
            }, 10000);
        }
        // Initialize extension host process with hand shakes
        const protocol = await this._establishProtocol(this._extensionHostProcess, opts);
        await this._performHandshake(protocol);
        clearTimeout(startupTimeoutHandle);
        return protocol;
    }
    /**
     * Find a free port if extension host debugging is enabled.
     */
    async _tryFindDebugPort() {
        if (typeof this._environmentService.debugExtensionHost.port !== 'number') {
            return 0;
        }
        const expected = this._environmentService.debugExtensionHost.port;
        const port = await this._nativeHostService.findFreePort(expected, 10 /* try 10 ports */, 5000 /* try up to 5 seconds */, 2048 /* skip 2048 ports between attempts */);
        if (!this._isExtensionDevTestFromCli) {
            if (!port) {
                console.warn('%c[Extension Host] %cCould not find a free port for debugging', 'color: blue', 'color:');
            }
            else {
                if (port !== expected) {
                    console.warn(`%c[Extension Host] %cProvided debugging port ${expected} is not free, using ${port} instead.`, 'color: blue', 'color:');
                }
                if (this._isExtensionDevDebugBrk) {
                    console.warn(`%c[Extension Host] %cSTOPPED on first line for debugging on port ${port}`, 'color: blue', 'color:');
                }
                else {
                    console.info(`%c[Extension Host] %cdebugger listening on port ${port}`, 'color: blue', 'color:');
                }
            }
        }
        return port || 0;
    }
    _establishProtocol(extensionHostProcess, opts) {
        writeExtHostConnection(new MessagePortExtHostConnection(), opts.env);
        // Get ready to acquire the message port from the shared process worker
        const portPromise = acquirePort(undefined /* we trigger the request via service call! */, opts.responseChannel, opts.responseNonce);
        return new Promise((resolve, reject) => {
            const handle = setTimeout(() => {
                reject('The local extension host took longer than 60s to connect.');
            }, 60 * 1000);
            portPromise.then((port) => {
                this._toDispose.add(toDisposable(() => {
                    // Close the message port when the extension host is disposed
                    port.close();
                }));
                clearTimeout(handle);
                const onMessage = new BufferedEmitter();
                port.onmessage = ((e) => {
                    if (e.data) {
                        onMessage.fire(VSBuffer.wrap(e.data));
                    }
                });
                port.start();
                resolve({
                    onMessage: onMessage.event,
                    send: message => port.postMessage(message.buffer),
                });
            });
            // Now that the message port listener is installed, start the ext host process
            const sw = StopWatch.create(false);
            extensionHostProcess.start(opts).then(({ pid }) => {
                if (pid) {
                    this.pid = pid;
                }
                this._logService.info(`Started local extension host with pid ${pid}.`);
                const duration = sw.elapsed();
                if (platform.isCI) {
                    this._logService.info(`IExtensionHostStarter.start() took ${duration} ms.`);
                }
            }, (err) => {
                // Starting the ext host process resulted in an error
                reject(err);
            });
        });
    }
    _performHandshake(protocol) {
        // 1) wait for the incoming `ready` event and send the initialization data.
        // 2) wait for the incoming `initialized` event.
        return new Promise((resolve, reject) => {
            let timeoutHandle;
            const installTimeoutCheck = () => {
                timeoutHandle = setTimeout(() => {
                    reject('The local extension host took longer than 60s to send its ready message.');
                }, 60 * 1000);
            };
            const uninstallTimeoutCheck = () => {
                clearTimeout(timeoutHandle);
            };
            // Wait 60s for the ready message
            installTimeoutCheck();
            const disposable = protocol.onMessage(msg => {
                if (isMessageOfType(msg, 1 /* MessageType.Ready */)) {
                    // 1) Extension Host is ready to receive messages, initialize it
                    uninstallTimeoutCheck();
                    this._createExtHostInitData().then(data => {
                        // Wait 60s for the initialized message
                        installTimeoutCheck();
                        protocol.send(VSBuffer.fromString(JSON.stringify(data)));
                    });
                    return;
                }
                if (isMessageOfType(msg, 0 /* MessageType.Initialized */)) {
                    // 2) Extension Host is initialized
                    uninstallTimeoutCheck();
                    // stop listening for messages here
                    disposable.dispose();
                    // release this promise
                    resolve();
                    return;
                }
                console.error(`received unexpected message during handshake phase from the extension host: `, msg);
            });
        });
    }
    async _createExtHostInitData() {
        const initData = await this._initDataProvider.getInitData();
        this.extensions = initData.extensions;
        const workspace = this._contextService.getWorkspace();
        return {
            commit: this._productService.commit,
            version: this._productService.version,
            quality: this._productService.quality,
            date: this._productService.date,
            parentPid: 0,
            environment: {
                isExtensionDevelopmentDebug: this._isExtensionDevDebug,
                appRoot: this._environmentService.appRoot ? URI.file(this._environmentService.appRoot) : undefined,
                appName: this._productService.nameLong,
                appHost: this._productService.embedderIdentifier || 'desktop',
                appUriScheme: this._productService.urlProtocol,
                isExtensionTelemetryLoggingOnly: isLoggingOnly(this._productService, this._environmentService),
                appLanguage: platform.language,
                extensionDevelopmentLocationURI: this._environmentService.extensionDevelopmentLocationURI,
                extensionTestsLocationURI: this._environmentService.extensionTestsLocationURI,
                globalStorageHome: this._userDataProfilesService.defaultProfile.globalStorageHome,
                workspaceStorageHome: this._environmentService.workspaceStorageHome,
                extensionLogLevel: this._environmentService.extensionLogLevel
            },
            workspace: this._contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ ? undefined : {
                configuration: workspace.configuration ?? undefined,
                id: workspace.id,
                name: this._labelService.getWorkspaceLabel(workspace),
                isUntitled: workspace.configuration ? isUntitledWorkspace(workspace.configuration, this._environmentService) : false,
                transient: workspace.transient
            },
            remote: {
                authority: this._environmentService.remoteAuthority,
                connectionData: null,
                isRemote: false
            },
            consoleForward: {
                includeStack: !this._isExtensionDevTestFromCli && (this._isExtensionDevHost || !this._environmentService.isBuilt || this._productService.quality !== 'stable' || this._environmentService.verbose),
                logNative: !this._isExtensionDevTestFromCli && this._isExtensionDevHost
            },
            extensions: this.extensions.toSnapshot(),
            telemetryInfo: {
                sessionId: this._telemetryService.sessionId,
                machineId: this._telemetryService.machineId,
                sqmId: this._telemetryService.sqmId,
                devDeviceId: this._telemetryService.devDeviceId,
                firstSessionDate: this._telemetryService.firstSessionDate,
                msftInternal: this._telemetryService.msftInternal
            },
            logLevel: this._logService.getLevel(),
            loggers: [...this._loggerService.getRegisteredLoggers()],
            logsLocation: this._environmentService.extHostLogsPath,
            autoStart: (this.startup === 1 /* ExtensionHostStartup.EagerAutoStart */),
            uiKind: UIKind.Desktop,
            handle: this._environmentService.window.handle ? encodeBase64(this._environmentService.window.handle) : undefined
        };
    }
    _onExtHostProcessExit(code, signal) {
        if (this._terminating) {
            // Expected termination path (we asked the process to terminate)
            return;
        }
        this._onExit.fire([code, signal]);
    }
    _handleProcessOutputStream(stream, store) {
        let last = '';
        let isOmitting = false;
        const event = new Emitter();
        stream((chunk) => {
            // not a fancy approach, but this is the same approach used by the split2
            // module which is well-optimized (https://github.com/mcollina/split2)
            last += chunk;
            const lines = last.split(/\r?\n/g);
            last = lines.pop();
            // protected against an extension spamming and leaking memory if no new line is written.
            if (last.length > 10_000) {
                lines.push(last);
                last = '';
            }
            for (const line of lines) {
                if (isOmitting) {
                    if (line === "END_NATIVE_LOG" /* NativeLogMarkers.End */) {
                        isOmitting = false;
                    }
                }
                else if (line === "START_NATIVE_LOG" /* NativeLogMarkers.Start */) {
                    isOmitting = true;
                }
                else if (line.length) {
                    event.fire(line + '\n');
                }
            }
        }, undefined, store);
        return event;
    }
    async enableInspectPort() {
        if (!!this._inspectListener) {
            return true;
        }
        if (!this._extensionHostProcess) {
            return false;
        }
        const result = await this._extensionHostProcess.enableInspectPort();
        if (!result) {
            return false;
        }
        await Promise.race([Event.toPromise(this._onDidSetInspectPort.event), timeout(1000)]);
        return !!this._inspectListener;
    }
    getInspectPort() {
        return this._inspectListener ?? undefined;
    }
    _onWillShutdown(event) {
        // If the extension development host was started without debugger attached we need
        // to communicate this back to the main side to terminate the debug session
        if (this._isExtensionDevHost && !this._isExtensionDevTestFromCli && !this._isExtensionDevDebug && this._environmentService.debugExtensionHost.debugId) {
            this._extensionHostDebugService.terminateSession(this._environmentService.debugExtensionHost.debugId);
            event.join(timeout(100 /* wait a bit for IPC to get delivered */), { id: 'join.extensionDevelopment', label: nls.localize('join.extensionDevelopment', "Terminating extension debug session") });
        }
    }
};
NativeLocalProcessExtensionHost = __decorate([
    __param(3, IWorkspaceContextService),
    __param(4, INotificationService),
    __param(5, INativeHostService),
    __param(6, ILifecycleService),
    __param(7, INativeWorkbenchEnvironmentService),
    __param(8, IUserDataProfilesService),
    __param(9, ITelemetryService),
    __param(10, ILogService),
    __param(11, ILoggerService),
    __param(12, ILabelService),
    __param(13, IExtensionHostDebugService),
    __param(14, IHostService),
    __param(15, IProductService),
    __param(16, IShellEnvironmentService),
    __param(17, IExtensionHostStarter)
], NativeLocalProcessExtensionHost);
export { NativeLocalProcessExtensionHost };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxQcm9jZXNzRXh0ZW5zaW9uSG9zdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvZWxlY3Ryb24tYnJvd3Nlci9sb2NhbFByb2Nlc3NFeHRlbnNpb25Ib3N0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRixPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNwRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8s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