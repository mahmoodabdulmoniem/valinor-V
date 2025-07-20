/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { SocketDiagnostics } from '../../../base/parts/ipc/common/ipc.net.js';
import { RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode } from '../common/remoteAuthorityResolver.js';
import { mainWindow } from '../../../base/browser/window.js';
class BrowserWebSocket extends Disposable {
    traceSocketEvent(type, data) {
        SocketDiagnostics.traceSocketEvent(this._socket, this._debugLabel, type, data);
    }
    constructor(url, debugLabel) {
        super();
        this._onData = new Emitter();
        this.onData = this._onData.event;
        this._onOpen = this._register(new Emitter());
        this.onOpen = this._onOpen.event;
        this._onClose = this._register(new Emitter());
        this.onClose = this._onClose.event;
        this._onError = this._register(new Emitter());
        this.onError = this._onError.event;
        this._debugLabel = debugLabel;
        this._socket = new WebSocket(url);
        this.traceSocketEvent("created" /* SocketDiagnosticsEventType.Created */, { type: 'BrowserWebSocket', url });
        this._fileReader = new FileReader();
        this._queue = [];
        this._isReading = false;
        this._isClosed = false;
        this._fileReader.onload = (event) => {
            this._isReading = false;
            const buff = event.target.result;
            this.traceSocketEvent("read" /* SocketDiagnosticsEventType.Read */, buff);
            this._onData.fire(buff);
            if (this._queue.length > 0) {
                enqueue(this._queue.shift());
            }
        };
        const enqueue = (blob) => {
            if (this._isReading) {
                this._queue.push(blob);
                return;
            }
            this._isReading = true;
            this._fileReader.readAsArrayBuffer(blob);
        };
        this._socketMessageListener = (ev) => {
            const blob = ev.data;
            this.traceSocketEvent("browserWebSocketBlobReceived" /* SocketDiagnosticsEventType.BrowserWebSocketBlobReceived */, { type: blob.type, size: blob.size });
            enqueue(blob);
        };
        this._socket.addEventListener('message', this._socketMessageListener);
        this._register(dom.addDisposableListener(this._socket, 'open', (e) => {
            this.traceSocketEvent("open" /* SocketDiagnosticsEventType.Open */);
            this._onOpen.fire();
        }));
        // WebSockets emit error events that do not contain any real information
        // Our only chance of getting to the root cause of an error is to
        // listen to the close event which gives out some real information:
        // - https://www.w3.org/TR/websockets/#closeevent
        // - https://tools.ietf.org/html/rfc6455#section-11.7
        //
        // But the error event is emitted before the close event, so we therefore
        // delay the error event processing in the hope of receiving a close event
        // with more information
        let pendingErrorEvent = null;
        const sendPendingErrorNow = () => {
            const err = pendingErrorEvent;
            pendingErrorEvent = null;
            this._onError.fire(err);
        };
        const errorRunner = this._register(new RunOnceScheduler(sendPendingErrorNow, 0));
        const sendErrorSoon = (err) => {
            errorRunner.cancel();
            pendingErrorEvent = err;
            errorRunner.schedule();
        };
        const sendErrorNow = (err) => {
            errorRunner.cancel();
            pendingErrorEvent = err;
            sendPendingErrorNow();
        };
        this._register(dom.addDisposableListener(this._socket, 'close', (e) => {
            this.traceSocketEvent("close" /* SocketDiagnosticsEventType.Close */, { code: e.code, reason: e.reason, wasClean: e.wasClean });
            this._isClosed = true;
            if (pendingErrorEvent) {
                if (!navigator.onLine) {
                    // The browser is offline => this is a temporary error which might resolve itself
                    sendErrorNow(new RemoteAuthorityResolverError('Browser is offline', RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable, e));
                }
                else {
                    // An error event is pending
                    // The browser appears to be online...
                    if (!e.wasClean) {
                        // Let's be optimistic and hope that perhaps the server could not be reached or something
                        sendErrorNow(new RemoteAuthorityResolverError(e.reason || `WebSocket close with status code ${e.code}`, RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable, e));
                    }
                    else {
                        // this was a clean close => send existing error
                        errorRunner.cancel();
                        sendPendingErrorNow();
                    }
                }
            }
            this._onClose.fire({ code: e.code, reason: e.reason, wasClean: e.wasClean, event: e });
        }));
        this._register(dom.addDisposableListener(this._socket, 'error', (err) => {
            this.traceSocketEvent("error" /* SocketDiagnosticsEventType.Error */, { message: err?.message });
            sendErrorSoon(err);
        }));
    }
    send(data) {
        if (this._isClosed) {
            // Refuse to write data to closed WebSocket...
            return;
        }
        this.traceSocketEvent("write" /* SocketDiagnosticsEventType.Write */, data);
        this._socket.send(data);
    }
    close() {
        this._isClosed = true;
        this.traceSocketEvent("close" /* SocketDiagnosticsEventType.Close */);
        this._socket.close();
        this._socket.removeEventListener('message', this._socketMessageListener);
        this.dispose();
    }
}
const defaultWebSocketFactory = new class {
    create(url, debugLabel) {
        return new BrowserWebSocket(url, debugLabel);
    }
};
class BrowserSocket {
    traceSocketEvent(type, data) {
        if (typeof this.socket.traceSocketEvent === 'function') {
            this.socket.traceSocketEvent(type, data);
        }
        else {
            SocketDiagnostics.traceSocketEvent(this.socket, this.debugLabel, type, data);
        }
    }
    constructor(socket, debugLabel) {
        this.socket = socket;
        this.debugLabel = debugLabel;
    }
    dispose() {
        this.socket.close();
    }
    onData(listener) {
        return this.socket.onData((data) => listener(VSBuffer.wrap(new Uint8Array(data))));
    }
    onClose(listener) {
        const adapter = (e) => {
            if (typeof e === 'undefined') {
                listener(e);
            }
            else {
                listener({
                    type: 1 /* SocketCloseEventType.WebSocketCloseEvent */,
                    code: e.code,
                    reason: e.reason,
                    wasClean: e.wasClean,
                    event: e.event
                });
            }
        };
        return this.socket.onClose(adapter);
    }
    onEnd(listener) {
        return Disposable.None;
    }
    write(buffer) {
        this.socket.send(buffer.buffer);
    }
    end() {
        this.socket.close();
    }
    drain() {
        return Promise.resolve();
    }
}
export class BrowserSocketFactory {
    constructor(webSocketFactory) {
        this._webSocketFactory = webSocketFactory || defaultWebSocketFactory;
    }
    supports(connectTo) {
        return true;
    }
    connect({ host, port }, path, query, debugLabel) {
        return new Promise((resolve, reject) => {
            const webSocketSchema = (/^https:/.test(mainWindow.location.href) ? 'wss' : 'ws');
            const socket = this._webSocketFactory.create(`${webSocketSchema}://${(/:/.test(host) && !/\[/.test(host)) ? `[${host}]` : host}:${port}${path}?${query}&skipWebSocketFrames=false`, debugLabel);
            const errorListener = socket.onError(reject);
            socket.onOpen(() => {
                errorListener.dispose();
                resolve(new BrowserSocket(socket, debugLabel));
            });
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlclNvY2tldEZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlbW90ZS9icm93c2VyL2Jyb3dzZXJTb2NrZXRGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDNUUsT0FBTyxFQUFtRCxpQkFBaUIsRUFBOEIsTUFBTSwyQ0FBMkMsQ0FBQztBQUUzSixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsZ0NBQWdDLEVBQW1ELE1BQU0sc0NBQXNDLENBQUM7QUFDdkssT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBb0M3RCxNQUFNLGdCQUFpQixTQUFRLFVBQVU7SUF1QmpDLGdCQUFnQixDQUFDLElBQWdDLEVBQUUsSUFBa0U7UUFDM0gsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBRUQsWUFBWSxHQUFXLEVBQUUsVUFBa0I7UUFDMUMsS0FBSyxFQUFFLENBQUM7UUExQlEsWUFBTyxHQUFHLElBQUksT0FBTyxFQUFlLENBQUM7UUFDdEMsV0FBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBRTNCLFlBQU8sR0FB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