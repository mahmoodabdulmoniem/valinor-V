/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import minimist from 'minimist';
import * as net from 'net';
import { ProcessTimeRunOnceScheduler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { PendingMigrationError, isCancellationError, isSigPipeError, onUnexpectedError, onUnexpectedExternalError } from '../../../base/common/errors.js';
import * as performance from '../../../base/common/performance.js';
import { Promises } from '../../../base/node/pfs.js';
import { BufferedEmitter, PersistentProtocol } from '../../../base/parts/ipc/common/ipc.net.js';
import { NodeSocket, WebSocketNodeSocket } from '../../../base/parts/ipc/node/ipc.net.js';
import { boolean } from '../../../editor/common/config/editorOptions.js';
import product from '../../../platform/product/common/product.js';
import { ExtensionHostMain } from '../common/extensionHostMain.js';
import { createURITransformer } from './uriTransformer.js';
import { readExtHostConnection } from '../../services/extensions/common/extensionHostEnv.js';
import { createMessageOfType, isMessageOfType } from '../../services/extensions/common/extensionHostProtocol.js';
import '../common/extHost.common.services.js';
import './extHost.node.services.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// workaround for https://github.com/microsoft/vscode/issues/85490
// remove --inspect-port=0 after start so that it doesn't trigger LSP debugging
(function removeInspectPort() {
    for (let i = 0; i < process.execArgv.length; i++) {
        if (process.execArgv[i] === '--inspect-port=0') {
            process.execArgv.splice(i, 1);
            i--;
        }
    }
})();
const args = minimist(process.argv.slice(2), {
    boolean: [
        'transformURIs',
        'skipWorkspaceStorageLock',
        'supportGlobalNavigator',
    ],
    string: [
        'useHostProxy' // 'true' | 'false' | undefined
    ]
});
// With Electron 2.x and node.js 8.x the "natives" module
// can cause a native crash (see https://github.com/nodejs/node/issues/19891 and
// https://github.com/electron/electron/issues/10905). To prevent this from
// happening we essentially blocklist this module from getting loaded in any
// extension by patching the node require() function.
(function () {
    const Module = require('module');
    const originalLoad = Module._load;
    Module._load = function (request) {
        if (request === 'natives') {
            throw new Error('Either the extension or an NPM dependency is using the [unsupported "natives" node module](https://go.microsoft.com/fwlink/?linkid=871887).');
        }
        return originalLoad.apply(this, arguments);
    };
})();
// custom process.exit logic...
const nativeExit = process.exit.bind(process);
const nativeOn = process.on.bind(process);
function patchProcess(allowExit) {
    process.exit = function (code) {
        if (allowExit) {
            nativeExit(code);
        }
        else {
            const err = new Error('An extension called process.exit() and this was prevented.');
            console.warn(err.stack);
        }
    };
    // override Electron's process.crash() method
    process /* bypass layer checker */.crash = function () {
        const err = new Error('An extension called process.crash() and this was prevented.');
        console.warn(err.stack);
    };
    // Set ELECTRON_RUN_AS_NODE environment variable for extensions that use
    // child_process.spawn with process.execPath and expect to run as node process
    // on the desktop.
    // Refs https://github.com/microsoft/vscode/issues/151012#issuecomment-1156593228
    process.env['ELECTRON_RUN_AS_NODE'] = '1';
    process.on = function (event, listener) {
        if (event === 'uncaughtException') {
            const actualListener = listener;
            listener = function (...args) {
                try {
                    return actualListener.apply(undefined, args);
                }
                catch {
                    // DO NOT HANDLE NOR PRINT the error here because this can and will lead to
                    // more errors which will cause error handling to be reentrant and eventually
                    // overflowing the stack. Do not be sad, we do handle and annotate uncaught
                    // errors properly in 'extensionHostMain'
                }
            };
        }
        nativeOn(event, listener);
    };
}
// NodeJS since v21 defines navigator as a global object. This will likely surprise many extensions and potentially break them
// because `navigator` has historically often been used to check if running in a browser (vs running inside NodeJS)
if (!args.supportGlobalNavigator) {
    Object.defineProperty(globalThis, 'navigator', {
        get: () => {
            onUnexpectedExternalError(new PendingMigrationError('navigator is now a global in nodejs, please see https://aka.ms/vscode-extensions/navigator for additional info on this error.'));
            return undefined;
        }
    });
}
// This calls exit directly in case the initialization is not finished and we need to exit
// Otherwise, if initialization completed we go to extensionHostMain.terminate()
let onTerminate = function (reason) {
    nativeExit();
};
function _createExtHostProtocol() {
    const extHostConnection = readExtHostConnection(process.env);
    if (extHostConnection.type === 3 /* ExtHostConnectionType.MessagePort */) {
        return new Promise((resolve, reject) => {
            const withPorts = (ports) => {
                const port = ports[0];
                const onMessage = new BufferedEmitter();
                port.on('message', (e) => onMessage.fire(VSBuffer.wrap(e.data)));
                port.on('close', () => {
                    onTerminate('renderer closed the MessagePort');
                });
                port.start();
                resolve({
                    onMessage: onMessage.event,
                    send: message => port.postMessage(message.buffer)
                });
            };
            process.parentPort.on('message', (e) => withPorts(e.ports));
        });
    }
    else if (extHostConnection.type === 2 /* ExtHostConnectionType.Socket */) {
        return new Promise((resolve, reject) => {
            let protocol = null;
            const timer = setTimeout(() => {
                onTerminate('VSCODE_EXTHOST_IPC_SOCKET timeout');
            }, 60000);
            const reconnectionGraceTime = 10800000 /* ProtocolConstants.ReconnectionGraceTime */;
            const reconnectionShortGraceTime = 300000 /* ProtocolConstants.ReconnectionShortGraceTime */;
            const disconnectRunner1 = new ProcessTimeRunOnceScheduler(() => onTerminate('renderer disconnected for too long (1)'), reconnectionGraceTime);
            const disconnectRunner2 = new ProcessTimeRunOnceScheduler(() => onTerminate('renderer disconnected for too long (2)'), reconnectionShortGraceTime);
            process.on('message', (msg, handle) => {
                if (msg && msg.type === 'VSCODE_EXTHOST_IPC_SOCKET') {
                    // Disable Nagle's algorithm. We also do this on the server process,
                    // but nodejs doesn't document if this option is transferred with the socket
                    handle.setNoDelay(true);
                    const initialDataChunk = VSBuffer.wrap(Buffer.from(msg.initialDataChunk, 'base64'));
                    let socket;
                    if (msg.skipWebSocketFrames) {
                        socket = new NodeSocket(handle, 'extHost-socket');
                    }
                    else {
                        const inflateBytes = VSBuffer.wrap(Buffer.from(msg.inflateBytes, 'base64'));
                        socket = new WebSocketNodeSocket(new NodeSocket(handle, 'extHost-socket'), msg.permessageDeflate, inflateBytes, false);
                    }
                    if (protocol) {
                        // reconnection case
                        disconnectRunner1.cancel();
                        disconnectRunner2.cancel();
                        protocol.beginAcceptReconnection(socket, initialDataChunk);
                        protocol.endAcceptReconnection();
                        protocol.sendResume();
                    }
                    else {
                        clearTimeout(timer);
                        protocol = new PersistentProtocol({ socket, initialChunk: initialDataChunk });
                        protocol.sendResume();
                        protocol.onDidDispose(() => onTerminate('renderer disconnected'));
                        resolve(protocol);
                        // Wait for rich client to reconnect
                        protocol.onSocketClose(() => {
                            // The socket has closed, let's give the renderer a certain amount of time to reconnect
                            disconnectRunner1.schedule();
                        });
                    }
                }
                if (msg && msg.type === 'VSCODE_EXTHOST_IPC_REDUCE_GRACE_TIME') {
                    if (disconnectRunner2.isScheduled()) {
                        // we are disconnected and already running the short reconnection timer
                        return;
                    }
                    if (disconnectRunner1.isScheduled()) {
                        // we are disconnected and running the long reconnection timer
                        disconnectRunner2.schedule();
                    }
                }
            });
            // Now that we have managed to install a message listener, ask the other side to send us the socket
            const req = { type: 'VSCODE_EXTHOST_IPC_READY' };
            process.send?.(req);
        });
    }
    else {
        const pipeName = extHostConnection.pipeName;
        return new Promise((resolve, reject) => {
            const socket = net.createConnection(pipeName, () => {
                socket.removeListener('error', reject);
                const protocol = new PersistentProtocol({ socket: new NodeSocket(socket, 'extHost-renderer') });
                protocol.sendResume();
                resolve(protocol);
            });
            socket.once('error', reject);
            socket.on('close', () => {
                onTerminate('renderer closed the socket');
            });
        });
    }
}
async function createExtHostProtocol() {
    const protocol = await _createExtHostProtocol();
    return new class {
        constructor() {
            this._onMessage = new BufferedEmitter();
            this.onMessage = this._onMessage.event;
            this._terminating = false;
            this._protocolListener = protocol.onMessage((msg) => {
                if (isMessageOfType(msg, 2 /* MessageType.Terminate */)) {
                    this._terminating = true;
                    this._protocolListener.dispose();
                    onTerminate('received terminate message from renderer');
                }
                else {
                    this._onMessage.fire(msg);
                }
            });
        }
        send(msg) {
            if (!this._terminating) {
                protocol.send(msg);
            }
        }
        async drain() {
            if (protocol.drain) {
                return protocol.drain();
            }
        }
    };
}
function connectToRenderer(protocol) {
    return new Promise((c) => {
        // Listen init data message
        const first = protocol.onMessage(raw => {
            first.dispose();
            const initData = JSON.parse(raw.toString());
            const rendererCommit = initData.commit;
            const myCommit = product.commit;
            if (rendererCommit && myCommit) {
                // Running in the built version where commits are defined
                if (rendererCommit !== myCommit) {
                    nativeExit(55 /* ExtensionHostExitCode.VersionMismatch */);
                }
            }
            if (initData.parentPid) {
                // Kill oneself if one's parent dies. Much drama.
                let epermErrors = 0;
                setInterval(function () {
                    try {
                        process.kill(initData.parentPid, 0); // throws an exception if the main process doesn't exist anymore.
                        epermErrors = 0;
                    }
                    catch (e) {
                        if (e && e.code === 'EPERM') {
                            // Even if the parent process is still alive,
                            // some antivirus software can lead to an EPERM error to be thrown here.
                            // Let's terminate only if we get 3 consecutive EPERM errors.
                            epermErrors++;
                            if (epermErrors >= 3) {
                                onTerminate(`parent process ${initData.parentPid} does not exist anymore (3 x EPERM): ${e.message} (code: ${e.code}) (errno: ${e.errno})`);
                            }
                        }
                        else {
                            onTerminate(`parent process ${initData.parentPid} does not exist anymore: ${e.message} (code: ${e.code}) (errno: ${e.errno})`);
                        }
                    }
                }, 1000);
                // In certain cases, the event loop can become busy and never yield
                // e.g. while-true or process.nextTick endless loops
                // So also use the native node module to do it from a separate thread
                let watchdog;
                try {
                    watchdog = require('native-watchdog');
                    watchdog.start(initData.parentPid);
                }
                catch (err) {
                    // no problem...
                    onUnexpectedError(err);
                }
            }
            // Tell the outside that we are initialized
            protocol.send(createMessageOfType(0 /* MessageType.Initialized */));
            c({ protocol, initData });
        });
        // Tell the outside that we are ready to receive messages
        protocol.send(createMessageOfType(1 /* MessageType.Ready */));
    });
}
async function startExtensionHostProcess() {
    // Print a console message when rejection isn't handled within N seconds. For details:
    // see https://nodejs.org/api/process.html#process_event_unhandledrejection
    // and https://nodejs.org/api/process.html#process_event_rejectionhandled
    const unhandledPromises = [];
    process.on('unhandledRejection', (reason, promise) => {
        unhandledPromises.push(promise);
        setTimeout(() => {
            const idx = unhandledPromises.indexOf(promise);
            if (idx >= 0) {
                promise.catch(e => {
                    unhandledPromises.splice(idx, 1);
                    if (!isCancellationError(e)) {
                        console.warn(`rejected promise not handled within 1 second: ${e}`);
                        if (e && e.stack) {
                            console.warn(`stack trace: ${e.stack}`);
                        }
                        if (reason) {
                            onUnexpectedError(reason);
                        }
                    }
                });
            }
        }, 1000);
    });
    process.on('rejectionHandled', (promise) => {
        const idx = unhandledPromises.indexOf(promise);
        if (idx >= 0) {
            unhandledPromises.splice(idx, 1);
        }
    });
    // Print a console message when an exception isn't handled.
    process.on('uncaughtException', function (err) {
        if (!isSigPipeError(err)) {
            onUnexpectedError(err);
        }
    });
    performance.mark(`code/extHost/willConnectToRenderer`);
    const protocol = await createExtHostProtocol();
    performance.mark(`code/extHost/didConnectToRenderer`);
    const renderer = await connectToRenderer(protocol);
    performance.mark(`code/extHost/didWaitForInitData`);
    const { initData } = renderer;
    // setup things
    patchProcess(!!initData.environment.extensionTestsLocationURI); // to support other test frameworks like Jasmin that use process.exit (https://github.com/microsoft/vscode/issues/37708)
    initData.environment.useHostProxy = args.useHostProxy !== undefined ? args.useHostProxy !== 'false' : undefined;
    initData.environment.skipWorkspaceStorageLock = boolean(args.skipWorkspaceStorageLock, false);
    // host abstraction
    const hostUtils = new class NodeHost {
        constructor() {
            this.pid = process.pid;
        }
        exit(code) { nativeExit(code); }
        fsExists(path) { return Promises.exists(path); }
        fsRealpath(path) { return Promises.realpath(path); }
    };
    // Attempt to load uri transformer
    let uriTransformer = null;
    if (initData.remote.authority && args.transformURIs) {
        uriTransformer = createURITransformer(initData.remote.authority);
    }
    const extensionHostMain = new ExtensionHostMain(renderer.protocol, initData, hostUtils, uriTransformer);
    // rewrite onTerminate-function to be a proper shutdown
    onTerminate = (reason) => extensionHostMain.terminate(reason);
}
startExtensionHostProcess().catch((err) => console.log(err));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRlbnNpb25Ib3N0UHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUM7QUFFaEMsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUM7QUFDM0IsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUxSixPQUFPLEtBQUssV0FBVyxNQUFNLHFDQUFxQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFxQixNQUFNLDJDQUEyQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekUsT0FBTyxPQUFPLE1BQU0sNkNBQTZDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFXLE1BQU0sZ0NBQWdDLENBQUM7QUFFNUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDM0QsT0FBTyxFQUF5QixxQkFBcUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3BILE9BQU8sRUFBMkksbUJBQW1CLEVBQUUs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