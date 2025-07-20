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
var TerminalProcess_1;
import * as fs from 'fs';
import { exec } from 'child_process';
import { timeout } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import * as path from '../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { findExecutable } from '../../../base/node/processes.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ILogService, LogLevel } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { ChildProcessMonitor } from './childProcessMonitor.js';
import { getShellIntegrationInjection, getWindowsBuildNumber } from './terminalEnvironment.js';
import { WindowsShellHelper } from './windowsShellHelper.js';
import { spawn } from 'node-pty';
import { chunkInput } from '../common/terminalProcess.js';
var ShutdownConstants;
(function (ShutdownConstants) {
    /**
     * The amount of ms that must pass between data events after exit is queued before the actual
     * kill call is triggered. This data flush mechanism works around an [issue in node-pty][1]
     * where not all data is flushed which causes problems for task problem matchers. Additionally
     * on Windows under conpty, killing a process while data is being output will cause the [conhost
     * flush to hang the pty host][2] because [conhost should be hosted on another thread][3].
     *
     * [1]: https://github.com/Tyriar/node-pty/issues/72
     * [2]: https://github.com/microsoft/vscode/issues/71966
     * [3]: https://github.com/microsoft/node-pty/pull/415
     */
    ShutdownConstants[ShutdownConstants["DataFlushTimeout"] = 250] = "DataFlushTimeout";
    /**
     * The maximum ms to allow after dispose is called because forcefully killing the process.
     */
    ShutdownConstants[ShutdownConstants["MaximumShutdownTime"] = 5000] = "MaximumShutdownTime";
})(ShutdownConstants || (ShutdownConstants = {}));
var Constants;
(function (Constants) {
    /**
     * The minimum duration between kill and spawn calls on Windows/conpty as a mitigation for a
     * hang issue. See:
     * - https://github.com/microsoft/vscode/issues/71966
     * - https://github.com/microsoft/vscode/issues/117956
     * - https://github.com/microsoft/vscode/issues/121336
     */
    Constants[Constants["KillSpawnThrottleInterval"] = 250] = "KillSpawnThrottleInterval";
    /**
     * The amount of time to wait when a call is throttled beyond the exact amount, this is used to
     * try prevent early timeouts causing a kill/spawn call to happen at double the regular
     * interval.
     */
    Constants[Constants["KillSpawnSpacingDuration"] = 50] = "KillSpawnSpacingDuration";
    /**
     * How long to wait between chunk writes.
     */
    Constants[Constants["WriteInterval"] = 5] = "WriteInterval";
})(Constants || (Constants = {}));
const posixShellTypeMap = new Map([
    ['bash', "bash" /* PosixShellType.Bash */],
    ['csh', "csh" /* PosixShellType.Csh */],
    ['fish', "fish" /* PosixShellType.Fish */],
    ['ksh', "ksh" /* PosixShellType.Ksh */],
    ['sh', "sh" /* PosixShellType.Sh */],
    ['zsh', "zsh" /* PosixShellType.Zsh */]
]);
const generalShellTypeMap = new Map([
    ['pwsh', "pwsh" /* GeneralShellType.PowerShell */],
    ['powershell', "pwsh" /* GeneralShellType.PowerShell */],
    ['python', "python" /* GeneralShellType.Python */],
    ['julia', "julia" /* GeneralShellType.Julia */],
    ['nu', "nu" /* GeneralShellType.NuShell */],
    ['node', "node" /* GeneralShellType.Node */],
]);
let TerminalProcess = class TerminalProcess extends Disposable {
    static { TerminalProcess_1 = this; }
    static { this._lastKillOrStart = 0; }
    get exitMessage() { return this._exitMessage; }
    get currentTitle() { return this._windowsShellHelper?.shellTitle || this._currentTitle; }
    get shellType() { return isWindows ? this._windowsShellHelper?.shellType : posixShellTypeMap.get(this._currentTitle) || generalShellTypeMap.get(this._currentTitle); }
    get hasChildProcesses() { return this._childProcessMonitor?.hasChildProcesses || false; }
    constructor(shellLaunchConfig, cwd, cols, rows, env, 
    /**
     * environment used for `findExecutable`
     */
    _executableEnv, _options, _logService, _productService) {
        super();
        this.shellLaunchConfig = shellLaunchConfig;
        this._executableEnv = _executableEnv;
        this._options = _options;
        this._logService = _logService;
        this._productService = _productService;
        this.id = 0;
        this.shouldPersist = false;
        this._properties = {
            cwd: '',
            initialCwd: '',
            fixedDimensions: { cols: undefined, rows: undefined },
            title: '',
            shellType: undefined,
            hasChildProcesses: true,
            resolvedShellLaunchConfig: {},
            overrideDimensions: undefined,
            failedShellIntegrationActivation: false,
            usedShellIntegrationInjection: undefined,
            shellIntegrationInjectionFailureReason: undefined,
        };
        this._currentTitle = '';
        this._writeQueue = [];
        this._isPtyPaused = false;
        this._unacknowledgedCharCount = 0;
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._onProcessData.event;
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._onProcessReady.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        let name;
        if (isWindows) {
            name = path.basename(this.shellLaunchConfig.executable || '');
        }
        else {
            // Using 'xterm-256color' here helps ensure that the majority of Linux distributions will use a
            // color prompt as defined in the default ~/.bashrc file.
            name = 'xterm-256color';
        }
        this._initialCwd = cwd;
        this._properties["initialCwd" /* ProcessPropertyType.InitialCwd */] = this._initialCwd;
        this._properties["cwd" /* ProcessPropertyType.Cwd */] = this._initialCwd;
        const useConpty = this._options.windowsEnableConpty && process.platform === 'win32' && getWindowsBuildNumber() >= 18309;
        const useConptyDll = useConpty && this._options.windowsUseConptyDll;
        this._ptyOptions = {
            name,
            cwd,
            // TODO: When node-pty is updated this cast can be removed
            env: env,
            cols,
            rows,
            useConpty,
            useConptyDll,
            // This option will force conpty to not redraw the whole viewport on launch
            conptyInheritCursor: useConpty && !!shellLaunchConfig.initialText
        };
        // Delay resizes to avoid conpty not respecting very early resize calls
        if (isWindows) {
            if (useConpty && cols === 0 && rows === 0 && this.shellLaunchConfig.executable?.endsWith('Git\\bin\\bash.exe')) {
                this._delayedResizer = new DelayedResizer();
                this._register(this._delayedResizer.onTrigger(dimensions => {
                    this._delayedResizer?.dispose();
                    this._delayedResizer = undefined;
                    if (dimensions.cols && dimensions.rows) {
                        this.resize(dimensions.cols, dimensions.rows);
                    }
                }));
            }
            // WindowsShellHelper is used to fetch the process title and shell type
            this.onProcessReady(e => {
                this._windowsShellHelper = this._register(new WindowsShellHelper(e.pid));
                this._register(this._windowsShellHelper.onShellTypeChanged(e => this._onDidChangeProperty.fire({ type: "shellType" /* ProcessPropertyType.ShellType */, value: e })));
                this._register(this._windowsShellHelper.onShellNameChanged(e => this._onDidChangeProperty.fire({ type: "title" /* ProcessPropertyType.Title */, value: e })));
            });
        }
        this._register(toDisposable(() => {
            if (this._titleInterval) {
                clearInterval(this._titleInterval);
                this._titleInterval = undefined;
            }
        }));
    }
    async start() {
        const results = await Promise.all([this._validateCwd(), this._validateExecutable()]);
        const firstError = results.find(r => r !== undefined);
        if (firstError) {
            return firstError;
        }
        const injection = await getShellIntegrationInjection(this.shellLaunchConfig, this._options, this._ptyOptions.env, this._logService, this._productService);
        if (injection.type === 'injection') {
            this._onDidChangeProperty.fire({ type: "usedShellIntegrationInjection" /* ProcessPropertyType.UsedShellIntegrationInjection */, value: true });
            if (injection.envMixin) {
                for (const [key, value] of Object.entries(injection.envMixin)) {
                    this._ptyOptions.env ||= {};
                    this._ptyOptions.env[key] = value;
                }
            }
            if (injection.filesToCopy) {
                for (const f of injection.filesToCopy) {
                    try {
                        await fs.promises.mkdir(path.dirname(f.dest), { recursive: true });
                        await fs.promises.copyFile(f.source, f.dest);
                    }
                    catch {
                        // Swallow error, this should only happen when multiple users are on the same
                        // machine. Since the shell integration scripts rarely change, plus the other user
                        // should be using the same version of the server in this case, assume the script is
                        // fine if copy fails and swallow the error.
                    }
                }
            }
        }
        else {
            this._onDidChangeProperty.fire({ type: "failedShellIntegrationActivation" /* ProcessPropertyType.FailedShellIntegrationActivation */, value: true });
            this._onDidChangeProperty.fire({ type: "shellIntegrationInjectionFailureReason" /* ProcessPropertyType.ShellIntegrationInjectionFailureReason */, value: injection.reason });
        }
        try {
            const injectionConfig = injection.type === 'injection' ? injection : undefined;
            await this.setupPtyProcess(this.shellLaunchConfig, this._ptyOptions, injectionConfig);
            if (injectionConfig?.newArgs) {
                return { injectedArgs: injectionConfig.newArgs };
            }
            return undefined;
        }
        catch (err) {
            this._logService.trace('node-pty.node-pty.IPty#spawn native exception', err);
            return { message: `A native exception occurred during launch (${err.message})` };
        }
    }
    async _validateCwd() {
        try {
            const result = await fs.promises.stat(this._initialCwd);
            if (!result.isDirectory()) {
                return { message: localize('launchFail.cwdNotDirectory', "Starting directory (cwd) \"{0}\" is not a directory", this._initialCwd.toString()) };
            }
        }
        catch (err) {
            if (err?.code === 'ENOENT') {
                return { message: localize('launchFail.cwdDoesNotExist', "Starting directory (cwd) \"{0}\" does not exist", this._initialCwd.toString()) };
            }
        }
        this._onDidChangeProperty.fire({ type: "initialCwd" /* ProcessPropertyType.InitialCwd */, value: this._initialCwd });
        return undefined;
    }
    async _validateExecutable() {
        const slc = this.shellLaunchConfig;
        if (!slc.executable) {
            throw new Error('IShellLaunchConfig.executable not set');
        }
        const cwd = slc.cwd instanceof URI ? slc.cwd.path : slc.cwd;
        const envPaths = (slc.env && slc.env.PATH) ? slc.env.PATH.split(path.delimiter) : undefined;
        const executable = await findExecutable(slc.executable, cwd, envPaths, this._executableEnv);
        if (!executable) {
            return { message: localize('launchFail.executableDoesNotExist', "Path to shell executable \"{0}\" does not exist", slc.executable) };
        }
        try {
            const result = await fs.promises.stat(executable);
            if (!result.isFile() && !result.isSymbolicLink()) {
                return { message: localize('launchFail.executableIsNotFileOrSymlink', "Path to shell executable \"{0}\" is not a file or a symlink", slc.executable) };
            }
            // Set the executable explicitly here so that node-pty doesn't need to search the
            // $PATH too.
            slc.executable = executable;
        }
        catch (err) {
            if (err?.code === 'EACCES') {
                // Swallow
            }
            else {
                throw err;
            }
        }
        return undefined;
    }
    async setupPtyProcess(shellLaunchConfig, options, shellIntegrationInjection) {
        const args = shellIntegrationInjection?.newArgs || shellLaunchConfig.args || [];
        await this._throttleKillSpawn();
        this._logService.trace('node-pty.IPty#spawn', shellLaunchConfig.executable, args, options);
        const ptyProcess = spawn(shellLaunchConfig.executable, args, options);
        this._ptyProcess = ptyProcess;
        this._childProcessMonitor = this._register(new ChildProcessMonitor(ptyProcess.pid, this._logService));
        this._childProcessMonitor.onDidChangeHasChildProcesses(value => this._onDidChangeProperty.fire({ type: "hasChildProcesses" /* ProcessPropertyType.HasChildProcesses */, value }));
        this._processStartupComplete = new Promise(c => {
            this.onProcessReady(() => c());
        });
        ptyProcess.onData(data => {
            // Handle flow control
            this._unacknowledgedCharCount += data.length;
            if (!this._isPtyPaused && this._unacknowledgedCharCount > 100000 /* FlowControlConstants.HighWatermarkChars */) {
                this._logService.trace(`Flow control: Pause (${this._unacknowledgedCharCount} > ${100000 /* FlowControlConstants.HighWatermarkChars */})`);
                this._isPtyPaused = true;
                ptyProcess.pause();
            }
            // Refire the data event
            this._logService.trace('node-pty.IPty#onData', data);
            this._onProcessData.fire(data);
            if (this._closeTimeout) {
                this._queueProcessExit();
            }
            this._windowsShellHelper?.checkShell();
            this._childProcessMonitor?.handleOutput();
        });
        ptyProcess.onExit(e => {
            this._exitCode = e.exitCode;
            this._queueProcessExit();
        });
        this._sendProcessId(ptyProcess.pid);
        this._setupTitlePolling(ptyProcess);
    }
    _setupTitlePolling(ptyProcess) {
        // Send initial timeout async to give event listeners a chance to init
        setTimeout(() => this._sendProcessTitle(ptyProcess));
        // Setup polling for non-Windows, for Windows `process` doesn't change
        if (!isWindows) {
            this._titleInterval = setInterval(() => {
                if (this._currentTitle !== ptyProcess.process) {
                    this._sendProcessTitle(ptyProcess);
                }
            }, 200);
        }
    }
    // Allow any trailing data events to be sent before the exit event is sent.
    // See https://github.com/Tyriar/node-pty/issues/72
    _queueProcessExit() {
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace('TerminalProcess#_queueProcessExit', new Error().stack?.replace(/^Error/, ''));
        }
        if (this._closeTimeout) {
            clearTimeout(this._closeTimeout);
        }
        this._closeTimeout = setTimeout(() => {
            this._closeTimeout = undefined;
            this._kill();
        }, 250 /* ShutdownConstants.DataFlushTimeout */);
    }
    async _kill() {
        // Wait to kill to process until the start up code has run. This prevents us from firing a process exit before a
        // process start.
        await this._processStartupComplete;
        if (this._store.isDisposed) {
            return;
        }
        // Attempt to kill the pty, it may have already been killed at this
        // point but we want to make sure
        try {
            if (this._ptyProcess) {
                await this._throttleKillSpawn();
                this._logService.trace('node-pty.IPty#kill');
                this._ptyProcess.kill();
            }
        }
        catch (ex) {
            // Swallow, the pty has already been killed
        }
        this._onProcessExit.fire(this._exitCode || 0);
        this.dispose();
    }
    async _throttleKillSpawn() {
        // Only throttle on Windows/conpty
        if (!isWindows || !('useConpty' in this._ptyOptions) || !this._ptyOptions.useConpty) {
            return;
        }
        // Don't throttle when using conpty.dll as it seems to have been fixed in later versions
        if (this._ptyOptions.useConptyDll) {
            return;
        }
        // Use a loop to ensure multiple calls in a single interval space out
        while (Date.now() - TerminalProcess_1._lastKillOrStart < 250 /* Constants.KillSpawnThrottleInterval */) {
            this._logService.trace('Throttling kill/spawn call');
            await timeout(250 /* Constants.KillSpawnThrottleInterval */ - (Date.now() - TerminalProcess_1._lastKillOrStart) + 50 /* Constants.KillSpawnSpacingDuration */);
        }
        TerminalProcess_1._lastKillOrStart = Date.now();
    }
    _sendProcessId(pid) {
        this._onProcessReady.fire({
            pid,
            cwd: this._initialCwd,
            windowsPty: this.getWindowsPty()
        });
    }
    _sendProcessTitle(ptyProcess) {
        if (this._store.isDisposed) {
            return;
        }
        // HACK: The node-pty API can return undefined somehow https://github.com/microsoft/vscode/issues/222323
        this._currentTitle = (ptyProcess.process ?? '');
        this._onDidChangeProperty.fire({ type: "title" /* ProcessPropertyType.Title */, value: this._currentTitle });
        // If fig is installed it may change the title of the process
        let sanitizedTitle = this.currentTitle.replace(/ \(figterm\)$/g, '');
        // Ensure any prefixed path is removed so that the executable name since we use this to
        // detect the shell type
        if (!isWindows) {
            sanitizedTitle = path.basename(sanitizedTitle);
        }
        if (sanitizedTitle.toLowerCase().startsWith('python')) {
            this._onDidChangeProperty.fire({ type: "shellType" /* ProcessPropertyType.ShellType */, value: "python" /* GeneralShellType.Python */ });
        }
        else if (sanitizedTitle.toLowerCase().startsWith('julia')) {
            this._onDidChangeProperty.fire({ type: "shellType" /* ProcessPropertyType.ShellType */, value: "julia" /* GeneralShellType.Julia */ });
        }
        else {
            const shellTypeValue = posixShellTypeMap.get(sanitizedTitle) || generalShellTypeMap.get(sanitizedTitle);
            this._onDidChangeProperty.fire({ type: "shellType" /* ProcessPropertyType.ShellType */, value: shellTypeValue });
        }
    }
    shutdown(immediate) {
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace('TerminalProcess#shutdown', new Error().stack?.replace(/^Error/, ''));
        }
        // don't force immediate disposal of the terminal processes on Windows as an additional
        // mitigation for https://github.com/microsoft/vscode/issues/71966 which causes the pty host
        // to become unresponsive, disconnecting all terminals across all windows.
        if (immediate && !isWindows) {
            this._kill();
        }
        else {
            if (!this._closeTimeout && !this._store.isDisposed) {
                this._queueProcessExit();
                // Allow a maximum amount of time for the process to exit, otherwise force kill it
                setTimeout(() => {
                    if (this._closeTimeout && !this._store.isDisposed) {
                        this._closeTimeout = undefined;
                        this._kill();
                    }
                }, 5000 /* ShutdownConstants.MaximumShutdownTime */);
            }
        }
    }
    input(data, isBinary = false) {
        if (this._store.isDisposed || !this._ptyProcess) {
            return;
        }
        this._writeQueue.push(...chunkInput(data).map(e => {
            return { isBinary, data: e };
        }));
        this._startWrite();
    }
    sendSignal(signal) {
        if (this._store.isDisposed || !this._ptyProcess) {
            return;
        }
        this._ptyProcess.kill(signal);
    }
    async processBinary(data) {
        this.input(data, true);
    }
    async refreshProperty(type) {
        switch (type) {
            case "cwd" /* ProcessPropertyType.Cwd */: {
                const newCwd = await this.getCwd();
                if (newCwd !== this._properties.cwd) {
                    this._properties.cwd = newCwd;
                    this._onDidChangeProperty.fire({ type: "cwd" /* ProcessPropertyType.Cwd */, value: this._properties.cwd });
                }
                return newCwd;
            }
            case "initialCwd" /* ProcessPropertyType.InitialCwd */: {
                const initialCwd = await this.getInitialCwd();
                if (initialCwd !== this._properties.initialCwd) {
                    this._properties.initialCwd = initialCwd;
                    this._onDidChangeProperty.fire({ type: "initialCwd" /* ProcessPropertyType.InitialCwd */, value: this._properties.initialCwd });
                }
                return initialCwd;
            }
            case "title" /* ProcessPropertyType.Title */:
                return this.currentTitle;
            default:
                return this.shellType;
        }
    }
    async updateProperty(type, value) {
        if (type === "fixedDimensions" /* ProcessPropertyType.FixedDimensions */) {
            this._properties.fixedDimensions = value;
        }
    }
    _startWrite() {
        // Don't write if it's already queued of is there is nothing to write
        if (this._writeTimeout !== undefined || this._writeQueue.length === 0) {
            return;
        }
        this._doWrite();
        // Don't queue more writes if the queue is empty
        if (this._writeQueue.length === 0) {
            this._writeTimeout = undefined;
            return;
        }
        // Queue the next write
        this._writeTimeout = setTimeout(() => {
            this._writeTimeout = undefined;
            this._startWrite();
        }, 5 /* Constants.WriteInterval */);
    }
    _doWrite() {
        const object = this._writeQueue.shift();
        this._logService.trace('node-pty.IPty#write', object.data);
        if (object.isBinary) {
            this._ptyProcess.write(Buffer.from(object.data, 'binary'));
        }
        else {
            this._ptyProcess.write(object.data);
        }
        this._childProcessMonitor?.handleInput();
    }
    resize(cols, rows) {
        if (this._store.isDisposed) {
            return;
        }
        if (typeof cols !== 'number' || typeof rows !== 'number' || isNaN(cols) || isNaN(rows)) {
            return;
        }
        // Ensure that cols and rows are always >= 1, this prevents a native
        // exception in winpty.
        if (this._ptyProcess) {
            cols = Math.max(cols, 1);
            rows = Math.max(rows, 1);
            // Delay resize if needed
            if (this._delayedResizer) {
                this._delayedResizer.cols = cols;
                this._delayedResizer.rows = rows;
                return;
            }
            this._logService.trace('node-pty.IPty#resize', cols, rows);
            try {
                this._ptyProcess.resize(cols, rows);
            }
            catch (e) {
                // Swallow error if the pty has already exited
                this._logService.trace('node-pty.IPty#resize exception ' + e.message);
                if (this._exitCode !== undefined &&
                    e.message !== 'ioctl(2) failed, EBADF' &&
                    e.message !== 'Cannot resize a pty that has already exited') {
                    throw e;
                }
            }
        }
    }
    clearBuffer() {
        this._ptyProcess?.clear();
    }
    acknowledgeDataEvent(charCount) {
        // Prevent lower than 0 to heal from errors
        this._unacknowledgedCharCount = Math.max(this._unacknowledgedCharCount - charCount, 0);
        this._logService.trace(`Flow control: Ack ${charCount} chars (unacknowledged: ${this._unacknowledgedCharCount})`);
        if (this._isPtyPaused && this._unacknowledgedCharCount < 5000 /* FlowControlConstants.LowWatermarkChars */) {
            this._logService.trace(`Flow control: Resume (${this._unacknowledgedCharCount} < ${5000 /* FlowControlConstants.LowWatermarkChars */})`);
            this._ptyProcess?.resume();
            this._isPtyPaused = false;
        }
    }
    clearUnacknowledgedChars() {
        this._unacknowledgedCharCount = 0;
        this._logService.trace(`Flow control: Cleared all unacknowledged chars, forcing resume`);
        if (this._isPtyPaused) {
            this._ptyProcess?.resume();
            this._isPtyPaused = false;
        }
    }
    async setUnicodeVersion(version) {
        // No-op
    }
    getInitialCwd() {
        return Promise.resolve(this._initialCwd);
    }
    async getCwd() {
        if (isMacintosh) {
            // From Big Sur (darwin v20) there is a spawn blocking thread issue on Electron,
            // this is fixed in VS Code's internal Electron.
            // https://github.com/Microsoft/vscode/issues/105446
            return new Promise(resolve => {
                if (!this._ptyProcess) {
                    resolve(this._initialCwd);
                    return;
                }
                this._logService.trace('node-pty.IPty#pid');
                exec('lsof -OPln -p ' + this._ptyProcess.pid + ' | grep cwd', { env: { ...process.env, LANG: 'en_US.UTF-8' } }, (error, stdout, stderr) => {
                    if (!error && stdout !== '') {
                        resolve(stdout.substring(stdout.indexOf('/'), stdout.length - 1));
                    }
                    else {
                        this._logService.error('lsof did not run successfully, it may not be on the $PATH?', error, stdout, stderr);
                        resolve(this._initialCwd);
                    }
                });
            });
        }
        if (isLinux) {
            if (!this._ptyProcess) {
                return this._initialCwd;
            }
            this._logService.trace('node-pty.IPty#pid');
            try {
                return await fs.promises.readlink(`/proc/${this._ptyProcess.pid}/cwd`);
            }
            catch (error) {
                return this._initialCwd;
            }
        }
        return this._initialCwd;
    }
    getWindowsPty() {
        return isWindows ? {
            backend: 'useConpty' in this._ptyOptions && this._ptyOptions.useConpty ? 'conpty' : 'winpty',
            buildNumber: getWindowsBuildNumber()
        } : undefined;
    }
};
TerminalProcess = TerminalProcess_1 = __decorate([
    __param(7, ILogService),
    __param(8, IProductService)
], TerminalProcess);
export { TerminalProcess };
/**
 * Tracks the latest resize event to be trigger at a later point.
 */
class DelayedResizer extends Disposable {
    get onTrigger() { return this._onTrigger.event; }
    constructor() {
        super();
        this._onTrigger = this._register(new Emitter());
        this._timeout = setTimeout(() => {
            this._onTrigger.fire({ rows: this.rows, cols: this.cols });
        }, 1000);
        this._register(toDisposable(() => clearTimeout(this._timeout)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9ub2RlL3Rlcm1pbmFsUHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNyQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0UsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEVBQXVCLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0QsT0FBTyxFQUFFLDRCQUE0QixFQUFFLHFCQUFxQixFQUFvQyxNQUFNLDBCQUEwQixDQUFDO0FBQ2pJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxN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