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
var LifecycleMainService_1;
import electron from 'electron';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { Barrier, Promises, timeout } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { isMacintosh, isWindows } from '../../../base/common/platform.js';
import { cwd } from '../../../base/common/process.js';
import { assertReturnsDefined } from '../../../base/common/types.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IStateService } from '../../state/node/state.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { getAllWindowsExcludingOffscreen } from '../../windows/electron-main/windows.js';
export const ILifecycleMainService = createDecorator('lifecycleMainService');
export var ShutdownReason;
(function (ShutdownReason) {
    /**
     * The application exits normally.
     */
    ShutdownReason[ShutdownReason["QUIT"] = 1] = "QUIT";
    /**
     * The application exits abnormally and is being
     * killed with an exit code (e.g. from integration
     * test run)
     */
    ShutdownReason[ShutdownReason["KILL"] = 2] = "KILL";
})(ShutdownReason || (ShutdownReason = {}));
export var LifecycleMainPhase;
(function (LifecycleMainPhase) {
    /**
     * The first phase signals that we are about to startup.
     */
    LifecycleMainPhase[LifecycleMainPhase["Starting"] = 1] = "Starting";
    /**
     * Services are ready and first window is about to open.
     */
    LifecycleMainPhase[LifecycleMainPhase["Ready"] = 2] = "Ready";
    /**
     * This phase signals a point in time after the window has opened
     * and is typically the best place to do work that is not required
     * for the window to open.
     */
    LifecycleMainPhase[LifecycleMainPhase["AfterWindowOpen"] = 3] = "AfterWindowOpen";
    /**
     * The last phase after a window has opened and some time has passed
     * (2-5 seconds).
     */
    LifecycleMainPhase[LifecycleMainPhase["Eventually"] = 4] = "Eventually";
})(LifecycleMainPhase || (LifecycleMainPhase = {}));
let LifecycleMainService = class LifecycleMainService extends Disposable {
    static { LifecycleMainService_1 = this; }
    static { this.QUIT_AND_RESTART_KEY = 'lifecycle.quitAndRestart'; }
    get quitRequested() { return this._quitRequested; }
    get wasRestarted() { return this._wasRestarted; }
    get phase() { return this._phase; }
    constructor(logService, stateService, environmentMainService) {
        super();
        this.logService = logService;
        this.stateService = stateService;
        this.environmentMainService = environmentMainService;
        this._onBeforeShutdown = this._register(new Emitter());
        this.onBeforeShutdown = this._onBeforeShutdown.event;
        this._onWillShutdown = this._register(new Emitter());
        this.onWillShutdown = this._onWillShutdown.event;
        this._onWillLoadWindow = this._register(new Emitter());
        this.onWillLoadWindow = this._onWillLoadWindow.event;
        this._onBeforeCloseWindow = this._register(new Emitter());
        this.onBeforeCloseWindow = this._onBeforeCloseWindow.event;
        this._quitRequested = false;
        this._wasRestarted = false;
        this._phase = 1 /* LifecycleMainPhase.Starting */;
        this.windowToCloseRequest = new Set();
        this.oneTimeListenerTokenGenerator = 0;
        this.windowCounter = 0;
        this.pendingQuitPromise = undefined;
        this.pendingQuitPromiseResolve = undefined;
        this.pendingWillShutdownPromise = undefined;
        this.mapWindowIdToPendingUnload = new Map();
        this.phaseWhen = new Map();
        this.relaunchHandler = undefined;
        this.resolveRestarted();
        this.when(2 /* LifecycleMainPhase.Ready */).then(() => this.registerListeners());
    }
    resolveRestarted() {
        this._wasRestarted = !!this.stateService.getItem(LifecycleMainService_1.QUIT_AND_RESTART_KEY);
        if (this._wasRestarted) {
            // remove the marker right after if found
            this.stateService.removeItem(LifecycleMainService_1.QUIT_AND_RESTART_KEY);
        }
    }
    registerListeners() {
        // before-quit: an event that is fired if application quit was
        // requested but before any window was closed.
        const beforeQuitListener = () => {
            if (this._quitRequested) {
                return;
            }
            this.trace('Lifecycle#app.on(before-quit)');
            this._quitRequested = true;
            // Emit event to indicate that we are about to shutdown
            this.trace('Lifecycle#onBeforeShutdown.fire()');
            this._onBeforeShutdown.fire();
            // macOS: can run without any window open. in that case we fire
            // the onWillShutdown() event directly because there is no veto
            // to be expected.
            if (isMacintosh && this.windowCounter === 0) {
                this.fireOnWillShutdown(1 /* ShutdownReason.QUIT */);
            }
        };
        electron.app.addListener('before-quit', beforeQuitListener);
        // window-all-closed: an event that only fires when the last window
        // was closed. We override this event to be in charge if app.quit()
        // should be called or not.
        const windowAllClosedListener = () => {
            this.trace('Lifecycle#app.on(window-all-closed)');
            // Windows/Linux: we quit when all windows have closed
            // Mac: we only quit when quit was requested
            if (this._quitRequested || !isMacintosh) {
                electron.app.quit();
            }
        };
        electron.app.addListener('window-all-closed', windowAllClosedListener);
        // will-quit: an event that is fired after all windows have been
        // closed, but before actually quitting.
        electron.app.once('will-quit', e => {
            this.trace('Lifecycle#app.on(will-quit) - begin');
            // Prevent the quit until the shutdown promise was resolved
            e.preventDefault();
            // Start shutdown sequence
            const shutdownPromise = this.fireOnWillShutdown(1 /* ShutdownReason.QUIT */);
            // Wait until shutdown is signaled to be complete
            shutdownPromise.finally(() => {
                this.trace('Lifecycle#app.on(will-quit) - after fireOnWillShutdown');
                // Resolve pending quit promise now without veto
                this.resolvePendingQuitPromise(false /* no veto */);
                // Quit again, this time do not prevent this, since our
                // will-quit listener is only installed "once". Also
                // remove any listener we have that is no longer needed
                electron.app.removeListener('before-quit', beforeQuitListener);
                electron.app.removeListener('window-all-closed', windowAllClosedListener);
                this.trace('Lifecycle#app.on(will-quit) - calling app.quit()');
                electron.app.quit();
            });
        });
    }
    fireOnWillShutdown(reason) {
        if (this.pendingWillShutdownPromise) {
            return this.pendingWillShutdownPromise; // shutdown is already running
        }
        const logService = this.logService;
        this.trace('Lifecycle#onWillShutdown.fire()');
        const joiners = [];
        this._onWillShutdown.fire({
            reason,
            join(id, promise) {
                logService.trace(`Lifecycle#onWillShutdown - begin '${id}'`);
                joiners.push(promise.finally(() => {
                    logService.trace(`Lifecycle#onWillShutdown - end '${id}'`);
                }));
            }
        });
        this.pendingWillShutdownPromise = (async () => {
            // Settle all shutdown event joiners
            try {
                await Promises.settled(joiners);
            }
            catch (error) {
                this.logService.error(error);
            }
            // Then, always make sure at the end
            // the state service is flushed.
            try {
                await this.stateService.close();
            }
            catch (error) {
                this.logService.error(error);
            }
        })();
        return this.pendingWillShutdownPromise;
    }
    set phase(value) {
        if (value < this.phase) {
            throw new Error('Lifecycle cannot go backwards');
        }
        if (this._phase === value) {
            return;
        }
        this.trace(`lifecycle (main): phase changed (value: ${value})`);
        this._phase = value;
        const barrier = this.phaseWhen.get(this._phase);
        if (barrier) {
            barrier.open();
            this.phaseWhen.delete(this._phase);
        }
    }
    async when(phase) {
        if (phase <= this._phase) {
            return;
        }
        let barrier = this.phaseWhen.get(phase);
        if (!barrier) {
            barrier = new Barrier();
            this.phaseWhen.set(phase, barrier);
        }
        await barrier.wait();
    }
    registerWindow(window) {
        const windowListeners = new DisposableStore();
        // track window count
        this.windowCounter++;
        // Window Will Load
        windowListeners.add(window.onWillLoad(e => this._onWillLoadWindow.fire({ window, workspace: e.workspace, reason: e.reason })));
        // Window Before Closing: Main -> Renderer
        const win = assertReturnsDefined(window.win);
        windowListeners.add(Event.fromNodeEventEmitter(win, 'close')(e => {
            // The window already acknowledged to be closed
            const windowId = window.id;
            if (this.windowToCloseRequest.has(windowId)) {
                this.windowToCloseRequest.delete(windowId);
                return;
            }
            this.trace(`Lifecycle#window.on('close') - window ID ${window.id}`);
            // Otherwise prevent unload and handle it from window
            e.preventDefault();
            this.unload(window, 1 /* UnloadReason.CLOSE */).then(veto => {
                if (veto) {
                    this.windowToCloseRequest.delete(windowId);
                    return;
                }
                this.windowToCloseRequest.add(windowId);
                // Fire onBeforeCloseWindow before actually closing
                this.trace(`Lifecycle#onBeforeCloseWindow.fire() - window ID ${windowId}`);
                this._onBeforeCloseWindow.fire(window);
                // No veto, close window now
                window.close();
            });
        }));
        windowListeners.add(Event.fromNodeEventEmitter(win, 'closed')(() => {
            this.trace(`Lifecycle#window.on('closed') - window ID ${window.id}`);
            // update window count
            this.windowCounter--;
            // clear window listeners
            windowListeners.dispose();
            // if there are no more code windows opened, fire the onWillShutdown event, unless
            // we are on macOS where it is perfectly fine to close the last window and
            // the application continues running (unless quit was actually requested)
            if (this.windowCounter === 0 && (!isMacintosh || this._quitRequested)) {
                this.fireOnWillShutdown(1 /* ShutdownReason.QUIT */);
            }
        }));
    }
    registerAuxWindow(auxWindow) {
        const win = assertReturnsDefined(auxWindow.win);
        const windowListeners = new DisposableStore();
        windowListeners.add(Event.fromNodeEventEmitter(win, 'close')(e => {
            this.trace(`Lifecycle#auxWindow.on('close') - window ID ${auxWindow.id}`);
            if (this._quitRequested) {
                this.trace(`Lifecycle#auxWindow.on('close') - preventDefault() because quit requested`);
                // When quit is requested, Electron will close all
                // auxiliary windows before closing the main windows.
                // This prevents us from storing the auxiliary window
                // state on shutdown and thus we prevent closing if
                // quit is requested.
                //
                // Interestingly, this will not prevent the application
                // from quitting because the auxiliary windows will still
                // close once the owning window closes.
                e.preventDefault();
            }
        }));
        windowListeners.add(Event.fromNodeEventEmitter(win, 'closed')(() => {
            this.trace(`Lifecycle#auxWindow.on('closed') - window ID ${auxWindow.id}`);
            windowListeners.dispose();
        }));
    }
    async reload(window, cli) {
        // Only reload when the window has not vetoed this
        const veto = await this.unload(window, 3 /* UnloadReason.RELOAD */);
        if (!veto) {
            window.reload(cli);
        }
    }
    unload(window, reason) {
        // Ensure there is only 1 unload running at the same time
        const pendingUnloadPromise = this.mapWindowIdToPendingUnload.get(window.id);
        if (pendingUnloadPromise) {
            return pendingUnloadPromise;
        }
        // Start unload and remember in map until finished
        const unloadPromise = this.doUnload(window, reason).finally(() => {
            this.mapWindowIdToPendingUnload.delete(window.id);
        });
        this.mapWindowIdToPendingUnload.set(window.id, unloadPromise);
        return unloadPromise;
    }
    async doUnload(window, reason) {
        // Always allow to unload a window that is not yet ready
        if (!window.isReady) {
            return false;
        }
        this.trace(`Lifecycle#unload() - window ID ${window.id}`);
        // first ask the window itself if it vetos the unload
        const windowUnloadReason = this._quitRequested ? 2 /* UnloadReason.QUIT */ : reason;
        const veto = await this.onBeforeUnloadWindowInRenderer(window, windowUnloadReason);
        if (veto) {
            this.trace(`Lifecycle#unload() - veto in renderer (window ID ${window.id})`);
            return this.handleWindowUnloadVeto(veto);
        }
        // finally if there are no vetos, unload the renderer
        await this.onWillUnloadWindowInRenderer(window, windowUnloadReason);
        return false;
    }
    handleWindowUnloadVeto(veto) {
        if (!veto) {
            return false; // no veto
        }
        // a veto resolves any pending quit with veto
        this.resolvePendingQuitPromise(true /* veto */);
        // a veto resets the pending quit request flag
        this._quitRequested = false;
        return true; // veto
    }
    resolvePendingQuitPromise(veto) {
        if (this.pendingQuitPromiseResolve) {
            this.pendingQuitPromiseResolve(veto);
            this.pendingQuitPromiseResolve = undefined;
            this.pendingQuitPromise = undefined;
        }
    }
    onBeforeUnloadWindowInRenderer(window, reason) {
        return new Promise(resolve => {
            const oneTimeEventToken = this.oneTimeListenerTokenGenerator++;
            const okChannel = `vscode:ok${oneTimeEventToken}`;
            const cancelChannel = `vscode:cancel${oneTimeEventToken}`;
            validatedIpcMain.once(okChannel, () => {
                resolve(false); // no veto
            });
            validatedIpcMain.once(cancelChannel, () => {
                resolve(true); // veto
            });
            window.send('vscode:onBeforeUnload', { okChannel, cancelChannel, reason });
        });
    }
    onWillUnloadWindowInRenderer(window, reason) {
        return new Promise(resolve => {
            const oneTimeEventToken = this.oneTimeListenerTokenGenerator++;
            const replyChannel = `vscode:reply${oneTimeEventToken}`;
            validatedIpcMain.once(replyChannel, () => resolve());
            window.send('vscode:onWillUnload', { replyChannel, reason });
        });
    }
    quit(willRestart) {
        return this.doQuit(willRestart).then(veto => {
            if (!veto && willRestart) {
                // Windows: we are about to restart and as such we need to restore the original
                // current working directory we had on startup to get the exact same startup
                // behaviour. As such, we briefly change back to that directory and then when
                // Code starts it will set it back to the installation directory again.
                try {
                    if (isWindows) {
                        const currentWorkingDir = cwd();
                        if (currentWorkingDir !== process.cwd()) {
                            process.chdir(currentWorkingDir);
                        }
                    }
                }
                catch (err) {
                    this.logService.error(err);
                }
            }
            return veto;
        });
    }
    doQuit(willRestart) {
        this.trace(`Lifecycle#quit() - begin (willRestart: ${willRestart})`);
        if (this.pendingQuitPromise) {
            this.trace('Lifecycle#quit() - returning pending quit promise');
            return this.pendingQuitPromise;
        }
        // Remember if we are about to restart
        if (willRestart) {
            this.stateService.setItem(LifecycleMainService_1.QUIT_AND_RESTART_KEY, true);
        }
        this.pendingQuitPromise = new Promise(resolve => {
            // Store as field to access it from a window cancellation
            this.pendingQuitPromiseResolve = resolve;
            // Calling app.quit() will trigger the close handlers of each opened window
            // and only if no window vetoed the shutdown, we will get the will-quit event
            this.trace('Lifecycle#quit() - calling app.quit()');
            electron.app.quit();
        });
        return this.pendingQuitPromise;
    }
    trace(msg) {
        if (this.environmentMainService.args['enable-smoke-test-driver']) {
            this.logService.info(msg); // helps diagnose issues with exiting from smoke tests
        }
        else {
            this.logService.trace(msg);
        }
    }
    setRelaunchHandler(handler) {
        this.relaunchHandler = handler;
    }
    async relaunch(options) {
        this.trace('Lifecycle#relaunch()');
        const args = process.argv.slice(1);
        if (options?.addArgs) {
            args.push(...options.addArgs);
        }
        if (options?.removeArgs) {
            for (const a of options.removeArgs) {
                const idx = args.indexOf(a);
                if (idx >= 0) {
                    args.splice(idx, 1);
                }
            }
        }
        const quitListener = () => {
            if (!this.relaunchHandler?.handleRelaunch(options)) {
                this.trace('Lifecycle#relaunch() - calling app.relaunch()');
                electron.app.relaunch({ args });
            }
        };
        electron.app.once('quit', quitListener);
        // `app.relaunch()` does not quit automatically, so we quit first,
        // check for vetoes and then relaunch from the `app.on('quit')` event
        const veto = await this.quit(true /* will restart */);
        if (veto) {
            electron.app.removeListener('quit', quitListener);
        }
    }
    async kill(code) {
        this.trace('Lifecycle#kill()');
        // Give main process participants a chance to orderly shutdown
        await this.fireOnWillShutdown(2 /* ShutdownReason.KILL */);
        // From extension tests we have seen issues where calling app.exit()
        // with an opened window can lead to native crashes (Linux). As such,
        // we should make sure to destroy any opened window before calling
        // `app.exit()`.
        //
        // Note: Electron implements a similar logic here:
        // https://github.com/electron/electron/blob/fe5318d753637c3903e23fc1ed1b263025887b6a/spec-main/window-helpers.ts#L5
        await Promise.race([
            // Still do not block more than 1s
            timeout(1000),
            // Destroy any opened window: we do not unload windows here because
            // there is a chance that the unload is veto'd or long running due
            // to a participant within the window. this is not wanted when we
            // are asked to kill the application.
            (async () => {
                for (const window of getAllWindowsExcludingOffscreen()) {
                    if (window && !window.isDestroyed()) {
                        let whenWindowClosed;
                        if (window.webContents && !window.webContents.isDestroyed()) {
                            whenWindowClosed = new Promise(resolve => window.once('closed', resolve));
                        }
                        else {
                            whenWindowClosed = Promise.resolve();
                        }
                        window.destroy();
                        await whenWindowClosed;
                    }
                }
            })()
        ]);
        // Now exit either after 1s or all windows destroyed
        electron.app.exit(code);
    }
};
LifecycleMainService = LifecycleMainService_1 = __decorate([
    __param(0, ILogService),
    __param(1, IStateService),
    __param(2, IEnvironmentMainService)
], LifecycleMainService);
export { LifecycleMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlTWFpblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xpZmVjeWNsZS9lbGVjdHJvbi1tYWluL2xpZmVjeWNsZU1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3RELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXJFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRzFELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBRXBHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXpGLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0Isc0JBQXNC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