/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../common/buffer.js';
import { Emitter } from '../../../common/event.js';
import { Disposable, DisposableStore } from '../../../common/lifecycle.js';
import { IPCClient } from './ipc.js';
export var SocketDiagnosticsEventType;
(function (SocketDiagnosticsEventType) {
    SocketDiagnosticsEventType["Created"] = "created";
    SocketDiagnosticsEventType["Read"] = "read";
    SocketDiagnosticsEventType["Write"] = "write";
    SocketDiagnosticsEventType["Open"] = "open";
    SocketDiagnosticsEventType["Error"] = "error";
    SocketDiagnosticsEventType["Close"] = "close";
    SocketDiagnosticsEventType["BrowserWebSocketBlobReceived"] = "browserWebSocketBlobReceived";
    SocketDiagnosticsEventType["NodeEndReceived"] = "nodeEndReceived";
    SocketDiagnosticsEventType["NodeEndSent"] = "nodeEndSent";
    SocketDiagnosticsEventType["NodeDrainBegin"] = "nodeDrainBegin";
    SocketDiagnosticsEventType["NodeDrainEnd"] = "nodeDrainEnd";
    SocketDiagnosticsEventType["zlibInflateError"] = "zlibInflateError";
    SocketDiagnosticsEventType["zlibInflateData"] = "zlibInflateData";
    SocketDiagnosticsEventType["zlibInflateInitialWrite"] = "zlibInflateInitialWrite";
    SocketDiagnosticsEventType["zlibInflateInitialFlushFired"] = "zlibInflateInitialFlushFired";
    SocketDiagnosticsEventType["zlibInflateWrite"] = "zlibInflateWrite";
    SocketDiagnosticsEventType["zlibInflateFlushFired"] = "zlibInflateFlushFired";
    SocketDiagnosticsEventType["zlibDeflateError"] = "zlibDeflateError";
    SocketDiagnosticsEventType["zlibDeflateData"] = "zlibDeflateData";
    SocketDiagnosticsEventType["zlibDeflateWrite"] = "zlibDeflateWrite";
    SocketDiagnosticsEventType["zlibDeflateFlushFired"] = "zlibDeflateFlushFired";
    SocketDiagnosticsEventType["WebSocketNodeSocketWrite"] = "webSocketNodeSocketWrite";
    SocketDiagnosticsEventType["WebSocketNodeSocketPeekedHeader"] = "webSocketNodeSocketPeekedHeader";
    SocketDiagnosticsEventType["WebSocketNodeSocketReadHeader"] = "webSocketNodeSocketReadHeader";
    SocketDiagnosticsEventType["WebSocketNodeSocketReadData"] = "webSocketNodeSocketReadData";
    SocketDiagnosticsEventType["WebSocketNodeSocketUnmaskedData"] = "webSocketNodeSocketUnmaskedData";
    SocketDiagnosticsEventType["WebSocketNodeSocketDrainBegin"] = "webSocketNodeSocketDrainBegin";
    SocketDiagnosticsEventType["WebSocketNodeSocketDrainEnd"] = "webSocketNodeSocketDrainEnd";
    SocketDiagnosticsEventType["ProtocolHeaderRead"] = "protocolHeaderRead";
    SocketDiagnosticsEventType["ProtocolMessageRead"] = "protocolMessageRead";
    SocketDiagnosticsEventType["ProtocolHeaderWrite"] = "protocolHeaderWrite";
    SocketDiagnosticsEventType["ProtocolMessageWrite"] = "protocolMessageWrite";
    SocketDiagnosticsEventType["ProtocolWrite"] = "protocolWrite";
})(SocketDiagnosticsEventType || (SocketDiagnosticsEventType = {}));
export var SocketDiagnostics;
(function (SocketDiagnostics) {
    SocketDiagnostics.enableDiagnostics = false;
    SocketDiagnostics.records = [];
    const socketIds = new WeakMap();
    let lastUsedSocketId = 0;
    function getSocketId(nativeObject, label) {
        if (!socketIds.has(nativeObject)) {
            const id = String(++lastUsedSocketId);
            socketIds.set(nativeObject, id);
        }
        return socketIds.get(nativeObject);
    }
    function traceSocketEvent(nativeObject, socketDebugLabel, type, data) {
        if (!SocketDiagnostics.enableDiagnostics) {
            return;
        }
        const id = getSocketId(nativeObject, socketDebugLabel);
        if (data instanceof VSBuffer || data instanceof Uint8Array || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
            const copiedData = VSBuffer.alloc(data.byteLength);
            copiedData.set(data);
            SocketDiagnostics.records.push({ timestamp: Date.now(), id, label: socketDebugLabel, type, buff: copiedData });
        }
        else {
            // data is a custom object
            SocketDiagnostics.records.push({ timestamp: Date.now(), id, label: socketDebugLabel, type, data: data });
        }
    }
    SocketDiagnostics.traceSocketEvent = traceSocketEvent;
})(SocketDiagnostics || (SocketDiagnostics = {}));
export var SocketCloseEventType;
(function (SocketCloseEventType) {
    SocketCloseEventType[SocketCloseEventType["NodeSocketCloseEvent"] = 0] = "NodeSocketCloseEvent";
    SocketCloseEventType[SocketCloseEventType["WebSocketCloseEvent"] = 1] = "WebSocketCloseEvent";
})(SocketCloseEventType || (SocketCloseEventType = {}));
let emptyBuffer = null;
function getEmptyBuffer() {
    if (!emptyBuffer) {
        emptyBuffer = VSBuffer.alloc(0);
    }
    return emptyBuffer;
}
export class ChunkStream {
    get byteLength() {
        return this._totalLength;
    }
    constructor() {
        this._chunks = [];
        this._totalLength = 0;
    }
    acceptChunk(buff) {
        this._chunks.push(buff);
        this._totalLength += buff.byteLength;
    }
    read(byteCount) {
        return this._read(byteCount, true);
    }
    peek(byteCount) {
        return this._read(byteCount, false);
    }
    _read(byteCount, advance) {
        if (byteCount === 0) {
            return getEmptyBuffer();
        }
        if (byteCount > this._totalLength) {
            throw new Error(`Cannot read so many bytes!`);
        }
        if (this._chunks[0].byteLength === byteCount) {
            // super fast path, precisely first chunk must be returned
            const result = this._chunks[0];
            if (advance) {
                this._chunks.shift();
                this._totalLength -= byteCount;
            }
            return result;
        }
        if (this._chunks[0].byteLength > byteCount) {
            // fast path, the reading is entirely within the first chunk
            const result = this._chunks[0].slice(0, byteCount);
            if (advance) {
                this._chunks[0] = this._chunks[0].slice(byteCount);
                this._totalLength -= byteCount;
            }
            return result;
        }
        const result = VSBuffer.alloc(byteCount);
        let resultOffset = 0;
        let chunkIndex = 0;
        while (byteCount > 0) {
            const chunk = this._chunks[chunkIndex];
            if (chunk.byteLength > byteCount) {
                // this chunk will survive
                const chunkPart = chunk.slice(0, byteCount);
                result.set(chunkPart, resultOffset);
                resultOffset += byteCount;
                if (advance) {
                    this._chunks[chunkIndex] = chunk.slice(byteCount);
                    this._totalLength -= byteCount;
                }
                byteCount -= byteCount;
            }
            else {
                // this chunk will be entirely read
                result.set(chunk, resultOffset);
                resultOffset += chunk.byteLength;
                if (advance) {
                    this._chunks.shift();
                    this._totalLength -= chunk.byteLength;
                }
                else {
                    chunkIndex++;
                }
                byteCount -= chunk.byteLength;
            }
        }
        return result;
    }
}
var ProtocolMessageType;
(function (ProtocolMessageType) {
    ProtocolMessageType[ProtocolMessageType["None"] = 0] = "None";
    ProtocolMessageType[ProtocolMessageType["Regular"] = 1] = "Regular";
    ProtocolMessageType[ProtocolMessageType["Control"] = 2] = "Control";
    ProtocolMessageType[ProtocolMessageType["Ack"] = 3] = "Ack";
    ProtocolMessageType[ProtocolMessageType["Disconnect"] = 5] = "Disconnect";
    ProtocolMessageType[ProtocolMessageType["ReplayRequest"] = 6] = "ReplayRequest";
    ProtocolMessageType[ProtocolMessageType["Pause"] = 7] = "Pause";
    ProtocolMessageType[ProtocolMessageType["Resume"] = 8] = "Resume";
    ProtocolMessageType[ProtocolMessageType["KeepAlive"] = 9] = "KeepAlive";
})(ProtocolMessageType || (ProtocolMessageType = {}));
function protocolMessageTypeToString(messageType) {
    switch (messageType) {
        case 0 /* ProtocolMessageType.None */: return 'None';
        case 1 /* ProtocolMessageType.Regular */: return 'Regular';
        case 2 /* ProtocolMessageType.Control */: return 'Control';
        case 3 /* ProtocolMessageType.Ack */: return 'Ack';
        case 5 /* ProtocolMessageType.Disconnect */: return 'Disconnect';
        case 6 /* ProtocolMessageType.ReplayRequest */: return 'ReplayRequest';
        case 7 /* ProtocolMessageType.Pause */: return 'PauseWriting';
        case 8 /* ProtocolMessageType.Resume */: return 'ResumeWriting';
        case 9 /* ProtocolMessageType.KeepAlive */: return 'KeepAlive';
    }
}
export var ProtocolConstants;
(function (ProtocolConstants) {
    ProtocolConstants[ProtocolConstants["HeaderLength"] = 13] = "HeaderLength";
    /**
     * Send an Acknowledge message at most 2 seconds later...
     */
    ProtocolConstants[ProtocolConstants["AcknowledgeTime"] = 2000] = "AcknowledgeTime";
    /**
     * If there is a sent message that has been unacknowledged for 20 seconds,
     * and we didn't see any incoming server data in the past 20 seconds,
     * then consider the connection has timed out.
     */
    ProtocolConstants[ProtocolConstants["TimeoutTime"] = 20000] = "TimeoutTime";
    /**
     * If there is no reconnection within this time-frame, consider the connection permanently closed...
     */
    ProtocolConstants[ProtocolConstants["ReconnectionGraceTime"] = 10800000] = "ReconnectionGraceTime";
    /**
     * Maximal grace time between the first and the last reconnection...
     */
    ProtocolConstants[ProtocolConstants["ReconnectionShortGraceTime"] = 300000] = "ReconnectionShortGraceTime";
    /**
     * Send a message every 5 seconds to avoid that the connection is closed by the OS.
     */
    ProtocolConstants[ProtocolConstants["KeepAliveSendTime"] = 5000] = "KeepAliveSendTime";
})(ProtocolConstants || (ProtocolConstants = {}));
class ProtocolMessage {
    constructor(type, id, ack, data) {
        this.type = type;
        this.id = id;
        this.ack = ack;
        this.data = data;
        this.writtenTime = 0;
    }
    get size() {
        return this.data.byteLength;
    }
}
class ProtocolReader extends Disposable {
    constructor(socket) {
        super();
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._state = {
            readHead: true,
            readLen: 13 /* ProtocolConstants.HeaderLength */,
            messageType: 0 /* ProtocolMessageType.None */,
            id: 0,
            ack: 0
        };
        this._socket = socket;
        this._isDisposed = false;
        this._incomingData = new ChunkStream();
        this._register(this._socket.onData(data => this.acceptChunk(data)));
        this.lastReadTime = Date.now();
    }
    acceptChunk(data) {
        if (!data || data.byteLength === 0) {
            return;
        }
        this.lastReadTime = Date.now();
        this._incomingData.acceptChunk(data);
        while (this._incomingData.byteLength >= this._state.readLen) {
            const buff = this._incomingData.read(this._state.readLen);
            if (this._state.readHead) {
                // buff is the header
                // save new state => next time will read the body
                this._state.readHead = false;
                this._state.readLen = buff.readUInt32BE(9);
                this._state.messageType = buff.readUInt8(0);
                this._state.id = buff.readUInt32BE(1);
                this._state.ack = buff.readUInt32BE(5);
                this._socket.traceSocketEvent("protocolHeaderRead" /* SocketDiagnosticsEventType.ProtocolHeaderRead */, { messageType: protocolMessageTypeToString(this._state.messageType), id: this._state.id, ack: this._state.ack, messageSize: this._state.readLen });
            }
            else {
                // buff is the body
                const messageType = this._state.messageType;
                const id = this._state.id;
                const ack = this._state.ack;
                // save new state => next time will read the header
                this._state.readHead = true;
                this._state.readLen = 13 /* ProtocolConstants.HeaderLength */;
                this._state.messageType = 0 /* ProtocolMessageType.None */;
                this._state.id = 0;
                this._state.ack = 0;
                this._socket.traceSocketEvent("protocolMessageRead" /* SocketDiagnosticsEventType.ProtocolMessageRead */, buff);
                this._onMessage.fire(new ProtocolMessage(messageType, id, ack, buff));
                if (this._isDisposed) {
                    // check if an event listener lead to our disposal
                    break;
                }
            }
        }
    }
    readEntireBuffer() {
        return this._incomingData.read(this._incomingData.byteLength);
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
    }
}
class ProtocolWriter {
    constructor(socket) {
        this._writeNowTimeout = null;
        this._isDisposed = false;
        this._isPaused = false;
        this._socket = socket;
        this._data = [];
        this._totalLength = 0;
        this.lastWriteTime = 0;
    }
    dispose() {
        try {
            this.flush();
        }
        catch (err) {
            // ignore error, since the socket could be already closed
        }
        this._isDisposed = true;
    }
    drain() {
        this.flush();
        return this._socket.drain();
    }
    flush() {
        // flush
        this._writeNow();
    }
    pause() {
        this._isPaused = true;
    }
    resume() {
        this._isPaused = false;
        this._scheduleWriting();
    }
    write(msg) {
        if (this._isDisposed) {
            // ignore: there could be left-over promises which complete and then
            // decide to write a response, etc...
            return;
        }
        msg.writtenTime = Date.now();
        this.lastWriteTime = Date.now();
        const header = VSBuffer.alloc(13 /* ProtocolConstants.HeaderLength */);
        header.writeUInt8(msg.type, 0);
        header.writeUInt32BE(msg.id, 1);
        header.writeUInt32BE(msg.ack, 5);
        header.writeUInt32BE(msg.data.byteLength, 9);
        this._socket.traceSocketEvent("protocolHeaderWrite" /* SocketDiagnosticsEventType.ProtocolHeaderWrite */, { messageType: protocolMessageTypeToString(msg.type), id: msg.id, ack: msg.ack, messageSize: msg.data.byteLength });
        this._socket.traceSocketEvent("protocolMessageWrite" /* SocketDiagnosticsEventType.ProtocolMessageWrite */, msg.data);
        this._writeSoon(header, msg.data);
    }
    _bufferAdd(head, body) {
        const wasEmpty = this._totalLength === 0;
        this._data.push(head, body);
        this._totalLength += head.byteLength + body.byteLength;
        return wasEmpty;
    }
    _bufferTake() {
        const ret = VSBuffer.concat(this._data, this._totalLength);
        this._data.length = 0;
        this._totalLength = 0;
        return ret;
    }
    _writeSoon(header, data) {
        if (this._bufferAdd(header, data)) {
            this._scheduleWriting();
        }
    }
    _scheduleWriting() {
        if (this._writeNowTimeout) {
            return;
        }
        this._writeNowTimeout = setTimeout(() => {
            this._writeNowTimeout = null;
            this._writeNow();
        });
    }
    _writeNow() {
        if (this._totalLength === 0) {
            return;
        }
        if (this._isPaused) {
            return;
        }
        const data = this._bufferTake();
        this._socket.traceSocketEvent("protocolWrite" /* SocketDiagnosticsEventType.ProtocolWrite */, { byteLength: data.byteLength });
        this._socket.write(data);
    }
}
/**
 * A message has the following format:
 * ```
 *     /-------------------------------|------\
 *     |             HEADER            |      |
 *     |-------------------------------| DATA |
 *     | TYPE | ID | ACK | DATA_LENGTH |      |
 *     \-------------------------------|------/
 * ```
 * The header is 9 bytes and consists of:
 *  - TYPE is 1 byte (ProtocolMessageType) - the message type
 *  - ID is 4 bytes (u32be) - the message id (can be 0 to indicate to be ignored)
 *  - ACK is 4 bytes (u32be) - the acknowledged message id (can be 0 to indicate to be ignored)
 *  - DATA_LENGTH is 4 bytes (u32be) - the length in bytes of DATA
 *
 * Only Regular messages are counted, other messages are not counted, nor acknowledged.
 */
export class Protocol extends Disposable {
    constructor(socket) {
        super();
        this._onMessage = new Emitter();
        this.onMessage = this._onMessage.event;
        this._onDidDispose = new Emitter();
        this.onDidDispose = this._onDidDispose.event;
        this._socket = socket;
        this._socketWriter = this._register(new ProtocolWriter(this._socket));
        this._socketReader = this._register(new ProtocolReader(this._socket));
        this._register(this._socketReader.onMessage((msg) => {
            if (msg.type === 1 /* ProtocolMessageType.Regular */) {
                this._onMessage.fire(msg.data);
            }
        }));
        this._register(this._socket.onClose(() => this._onDidDispose.fire()));
    }
    drain() {
        return this._socketWriter.drain();
    }
    getSocket() {
        return this._socket;
    }
    sendDisconnect() {
        // Nothing to do...
    }
    send(buffer) {
        this._socketWriter.write(new ProtocolMessage(1 /* ProtocolMessageType.Regular */, 0, 0, buffer));
    }
}
export class Client extends IPCClient {
    static fromSocket(socket, id) {
        return new Client(new Protocol(socket), id);
    }
    get onDidDispose() { return this.protocol.onDidDispose; }
    constructor(protocol, id, ipcLogger = null) {
        super(protocol, id, ipcLogger);
        this.protocol = protocol;
    }
    dispose() {
        super.dispose();
        const socket = this.protocol.getSocket();
        // should be sent gracefully with a .flush(), but try to send it out as a
        // last resort here if nothing else:
        this.protocol.sendDisconnect();
        this.protocol.dispose();
        socket.end();
    }
}
/**
 * Will ensure no messages are lost if there are no event listeners.
 */
export class BufferedEmitter {
    constructor() {
        this._hasListeners = false;
        this._isDeliveringMessages = false;
        this._bufferedMessages = [];
        this._emitter = new Emitter({
            onWillAddFirstListener: () => {
                this._hasListeners = true;
                // it is important to deliver these messages after this call, but before
                // other messages have a chance to be received (to guarantee in order delivery)
                // that's why we're using here queueMicrotask and not other types of timeouts
                queueMicrotask(() => this._deliverMessages());
            },
            onDidRemoveLastListener: () => {
                this._hasListeners = false;
            }
        });
        this.event = this._emitter.event;
    }
    _deliverMessages() {
        if (this._isDeliveringMessages) {
            return;
        }
        this._isDeliveringMessages = true;
        while (this._hasListeners && this._bufferedMessages.length > 0) {
            this._emitter.fire(this._bufferedMessages.shift());
        }
        this._isDeliveringMessages = false;
    }
    fire(event) {
        if (this._hasListeners) {
            if (this._bufferedMessages.length > 0) {
                this._bufferedMessages.push(event);
            }
            else {
                this._emitter.fire(event);
            }
        }
        else {
            this._bufferedMessages.push(event);
        }
    }
    flushBuffer() {
        this._bufferedMessages = [];
    }
}
class QueueElement {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}
class Queue {
    constructor() {
        this._first = null;
        this._last = null;
    }
    length() {
        let result = 0;
        let current = this._first;
        while (current) {
            current = current.next;
            result++;
        }
        return result;
    }
    peek() {
        if (!this._first) {
            return null;
        }
        return this._first.data;
    }
    toArray() {
        const result = [];
        let resultLen = 0;
        let it = this._first;
        while (it) {
            result[resultLen++] = it.data;
            it = it.next;
        }
        return result;
    }
    pop() {
        if (!this._first) {
            return;
        }
        if (this._first === this._last) {
            this._first = null;
            this._last = null;
            return;
        }
        this._first = this._first.next;
    }
    push(item) {
        const element = new QueueElement(item);
        if (!this._first) {
            this._first = element;
            this._last = element;
            return;
        }
        this._last.next = element;
        this._last = element;
    }
}
class LoadEstimator {
    static { this._HISTORY_LENGTH = 10; }
    static { this._INSTANCE = null; }
    static getInstance() {
        if (!LoadEstimator._INSTANCE) {
            LoadEstimator._INSTANCE = new LoadEstimator();
        }
        return LoadEstimator._INSTANCE;
    }
    constructor() {
        this.lastRuns = [];
        const now = Date.now();
        for (let i = 0; i < LoadEstimator._HISTORY_LENGTH; i++) {
            this.lastRuns[i] = now - 1000 * i;
        }
        setInterval(() => {
            for (let i = LoadEstimator._HISTORY_LENGTH; i >= 1; i--) {
                this.lastRuns[i] = this.lastRuns[i - 1];
            }
            this.lastRuns[0] = Date.now();
        }, 1000);
    }
    /**
     * returns an estimative number, from 0 (low load) to 1 (high load)
     */
    load() {
        const now = Date.now();
        const historyLimit = (1 + LoadEstimator._HISTORY_LENGTH) * 1000;
        let score = 0;
        for (let i = 0; i < LoadEstimator._HISTORY_LENGTH; i++) {
            if (now - this.lastRuns[i] <= historyLimit) {
                score++;
            }
        }
        return 1 - score / LoadEstimator._HISTORY_LENGTH;
    }
    hasHighLoad() {
        return this.load() >= 0.5;
    }
}
/**
 * Same as Protocol, but will actually track messages and acks.
 * Moreover, it will ensure no messages are lost if there are no event listeners.
 */
export class PersistentProtocol {
    get unacknowledgedCount() {
        return this._outgoingMsgId - this._outgoingAckId;
    }
    constructor(opts) {
        this._onControlMessage = new BufferedEmitter();
        this.onControlMessage = this._onControlMessage.event;
        this._onMessage = new BufferedEmitter();
        this.onMessage = this._onMessage.event;
        this._onDidDispose = new BufferedEmitter();
        this.onDidDispose = this._onDidDispose.event;
        this._onSocketClose = new BufferedEmitter();
        this.onSocketClose = this._onSocketClose.event;
        this._onSocketTimeout = new BufferedEmitter();
        this.onSocketTimeout = this._onSocketTimeout.event;
        this._loadEstimator = opts.loadEstimator ?? LoadEstimator.getInstance();
        this._shouldSendKeepAlive = opts.sendKeepAlive ?? true;
        this._isReconnecting = false;
        this._outgoingUnackMsg = new Queue();
        this._outgoingMsgId = 0;
        this._outgoingAckId = 0;
        this._outgoingAckTimeout = null;
        this._incomingMsgId = 0;
        this._incomingAckId = 0;
        this._incomingMsgLastTime = 0;
        this._incomingAckTimeout = null;
        this._lastReplayRequestTime = 0;
        this._lastSocketTimeoutTime = Date.now();
        this._socketDisposables = new DisposableStore();
        this._socket = opts.socket;
        this._socketWriter = this._socketDisposables.add(new ProtocolWriter(this._socket));
        this._socketReader = this._socketDisposables.add(new ProtocolReader(this._socket));
        this._socketDisposables.add(this._socketReader.onMessage(msg => this._receiveMessage(msg)));
        this._socketDisposables.add(this._socket.onClose(e => this._onSocketClose.fire(e)));
        if (opts.initialChunk) {
            this._socketReader.acceptChunk(opts.initialChunk);
        }
        if (this._shouldSendKeepAlive) {
            this._keepAliveInterval = setInterval(() => {
                this._sendKeepAlive();
            }, 5000 /* ProtocolConstants.KeepAliveSendTime */);
        }
        else {
            this._keepAliveInterval = null;
        }
    }
    dispose() {
        if (this._outgoingAckTimeout) {
            clearTimeout(this._outgoingAckTimeout);
            this._outgoingAckTimeout = null;
        }
        if (this._incomingAckTimeout) {
            clearTimeout(this._incomingAckTimeout);
            this._incomingAckTimeout = null;
        }
        if (this._keepAliveInterval) {
            clearInterval(this._keepAliveInterval);
            this._keepAliveInterval = null;
        }
        this._socketDisposables.dispose();
    }
    drain() {
        return this._socketWriter.drain();
    }
    sendDisconnect() {
        if (!this._didSendDisconnect) {
            this._didSendDisconnect = true;
            const msg = new ProtocolMessage(5 /* ProtocolMessageType.Disconnect */, 0, 0, getEmptyBuffer());
            this._socketWriter.write(msg);
            this._socketWriter.flush();
        }
    }
    sendPause() {
        const msg = new ProtocolMessage(7 /* ProtocolMessageType.Pause */, 0, 0, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
    sendResume() {
        const msg = new ProtocolMessage(8 /* ProtocolMessageType.Resume */, 0, 0, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
    pauseSocketWriting() {
        this._socketWriter.pause();
    }
    getSocket() {
        return this._socket;
    }
    getMillisSinceLastIncomingData() {
        return Date.now() - this._socketReader.lastReadTime;
    }
    beginAcceptReconnection(socket, initialDataChunk) {
        this._isReconnecting = true;
        this._socketDisposables.dispose();
        this._socketDisposables = new DisposableStore();
        this._onControlMessage.flushBuffer();
        this._onSocketClose.flushBuffer();
        this._onSocketTimeout.flushBuffer();
        this._socket.dispose();
        this._lastReplayRequestTime = 0;
        this._lastSocketTimeoutTime = Date.now();
        this._socket = socket;
        this._socketWriter = this._socketDisposables.add(new ProtocolWriter(this._socket));
        this._socketReader = this._socketDisposables.add(new ProtocolReader(this._socket));
        this._socketDisposables.add(this._socketReader.onMessage(msg => this._receiveMessage(msg)));
        this._socketDisposables.add(this._socket.onClose(e => this._onSocketClose.fire(e)));
        this._socketReader.acceptChunk(initialDataChunk);
    }
    endAcceptReconnection() {
        this._isReconnecting = false;
        // After a reconnection, let the other party know (again) which messages have been received.
        // (perhaps the other party didn't receive a previous ACK)
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(3 /* ProtocolMessageType.Ack */, 0, this._incomingAckId, getEmptyBuffer());
        this._socketWriter.write(msg);
        // Send again all unacknowledged messages
        const toSend = this._outgoingUnackMsg.toArray();
        for (let i = 0, len = toSend.length; i < len; i++) {
            this._socketWriter.write(toSend[i]);
        }
        this._recvAckCheck();
    }
    acceptDisconnect() {
        this._onDidDispose.fire();
    }
    _receiveMessage(msg) {
        if (msg.ack > this._outgoingAckId) {
            this._outgoingAckId = msg.ack;
            do {
                const first = this._outgoingUnackMsg.peek();
                if (first && first.id <= msg.ack) {
                    // this message has been confirmed, remove it
                    this._outgoingUnackMsg.pop();
                }
                else {
                    break;
                }
            } while (true);
        }
        switch (msg.type) {
            case 0 /* ProtocolMessageType.None */: {
                // N/A
                break;
            }
            case 1 /* ProtocolMessageType.Regular */: {
                if (msg.id > this._incomingMsgId) {
                    if (msg.id !== this._incomingMsgId + 1) {
                        // in case we missed some messages we ask the other party to resend them
                        const now = Date.now();
                        if (now - this._lastReplayRequestTime > 10000) {
                            // send a replay request at most once every 10s
                            this._lastReplayRequestTime = now;
                            this._socketWriter.write(new ProtocolMessage(6 /* ProtocolMessageType.ReplayRequest */, 0, 0, getEmptyBuffer()));
                        }
                    }
                    else {
                        this._incomingMsgId = msg.id;
                        this._incomingMsgLastTime = Date.now();
                        this._sendAckCheck();
                        this._onMessage.fire(msg.data);
                    }
                }
                break;
            }
            case 2 /* ProtocolMessageType.Control */: {
                this._onControlMessage.fire(msg.data);
                break;
            }
            case 3 /* ProtocolMessageType.Ack */: {
                // nothing to do, .ack is handled above already
                break;
            }
            case 5 /* ProtocolMessageType.Disconnect */: {
                this._onDidDispose.fire();
                break;
            }
            case 6 /* ProtocolMessageType.ReplayRequest */: {
                // Send again all unacknowledged messages
                const toSend = this._outgoingUnackMsg.toArray();
                for (let i = 0, len = toSend.length; i < len; i++) {
                    this._socketWriter.write(toSend[i]);
                }
                this._recvAckCheck();
                break;
            }
            case 7 /* ProtocolMessageType.Pause */: {
                this._socketWriter.pause();
                break;
            }
            case 8 /* ProtocolMessageType.Resume */: {
                this._socketWriter.resume();
                break;
            }
            case 9 /* ProtocolMessageType.KeepAlive */: {
                // nothing to do
                break;
            }
        }
    }
    readEntireBuffer() {
        return this._socketReader.readEntireBuffer();
    }
    flush() {
        this._socketWriter.flush();
    }
    send(buffer) {
        const myId = ++this._outgoingMsgId;
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(1 /* ProtocolMessageType.Regular */, myId, this._incomingAckId, buffer);
        this._outgoingUnackMsg.push(msg);
        if (!this._isReconnecting) {
            this._socketWriter.write(msg);
            this._recvAckCheck();
        }
    }
    /**
     * Send a message which will not be part of the regular acknowledge flow.
     * Use this for early control messages which are repeated in case of reconnection.
     */
    sendControl(buffer) {
        const msg = new ProtocolMessage(2 /* ProtocolMessageType.Control */, 0, 0, buffer);
        this._socketWriter.write(msg);
    }
    _sendAckCheck() {
        if (this._incomingMsgId <= this._incomingAckId) {
            // nothink to acknowledge
            return;
        }
        if (this._incomingAckTimeout) {
            // there will be a check in the near future
            return;
        }
        const timeSinceLastIncomingMsg = Date.now() - this._incomingMsgLastTime;
        if (timeSinceLastIncomingMsg >= 2000 /* ProtocolConstants.AcknowledgeTime */) {
            // sufficient time has passed since this message has been received,
            // and no message from our side needed to be sent in the meantime,
            // so we will send a message containing only an ack.
            this._sendAck();
            return;
        }
        this._incomingAckTimeout = setTimeout(() => {
            this._incomingAckTimeout = null;
            this._sendAckCheck();
        }, 2000 /* ProtocolConstants.AcknowledgeTime */ - timeSinceLastIncomingMsg + 5);
    }
    _recvAckCheck() {
        if (this._outgoingMsgId <= this._outgoingAckId) {
            // everything has been acknowledged
            return;
        }
        if (this._outgoingAckTimeout) {
            // there will be a check in the near future
            return;
        }
        if (this._isReconnecting) {
            // do not cause a timeout during reconnection,
            // because messages will not be actually written until `endAcceptReconnection`
            return;
        }
        const oldestUnacknowledgedMsg = this._outgoingUnackMsg.peek();
        const timeSinceOldestUnacknowledgedMsg = Date.now() - oldestUnacknowledgedMsg.writtenTime;
        const timeSinceLastReceivedSomeData = Date.now() - this._socketReader.lastReadTime;
        const timeSinceLastTimeout = Date.now() - this._lastSocketTimeoutTime;
        if (timeSinceOldestUnacknowledgedMsg >= 20000 /* ProtocolConstants.TimeoutTime */
            && timeSinceLastReceivedSomeData >= 20000 /* ProtocolConstants.TimeoutTime */
            && timeSinceLastTimeout >= 20000 /* ProtocolConstants.TimeoutTime */) {
            // It's been a long time since our sent message was acknowledged
            // and a long time since we received some data
            // But this might be caused by the event loop being busy and failing to read messages
            if (!this._loadEstimator.hasHighLoad()) {
                // Trash the socket
                this._lastSocketTimeoutTime = Date.now();
                this._onSocketTimeout.fire({
                    unacknowledgedMsgCount: this._outgoingUnackMsg.length(),
                    timeSinceOldestUnacknowledgedMsg,
                    timeSinceLastReceivedSomeData
                });
                return;
            }
        }
        const minimumTimeUntilTimeout = Math.max(20000 /* ProtocolConstants.TimeoutTime */ - timeSinceOldestUnacknowledgedMsg, 20000 /* ProtocolConstants.TimeoutTime */ - timeSinceLastReceivedSomeData, 20000 /* ProtocolConstants.TimeoutTime */ - timeSinceLastTimeout, 500);
        this._outgoingAckTimeout = setTimeout(() => {
            this._outgoingAckTimeout = null;
            this._recvAckCheck();
        }, minimumTimeUntilTimeout);
    }
    _sendAck() {
        if (this._incomingMsgId <= this._incomingAckId) {
            // nothink to acknowledge
            return;
        }
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(3 /* ProtocolMessageType.Ack */, 0, this._incomingAckId, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
    _sendKeepAlive() {
        this._incomingAckId = this._incomingMsgId;
        const msg = new ProtocolMessage(9 /* ProtocolMessageType.KeepAlive */, 0, this._incomingAckId, getEmptyBuffer());
        this._socketWriter.write(msg);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm5ldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvY29tbW9uL2lwYy5uZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwwQkFBMEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLDhCQUE4QixDQUFDO0FBQ3hGLE9BQU8sRUFBdUMsU0FBUyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRTFFLE1BQU0sQ0FBTixJQUFrQiwwQkF1Q2pCO0FBdkNELFdBQWtCLDBCQUEwQjtJQUMzQyxpREFBbUIsQ0FBQTtJQUNuQiwyQ0FBYSxDQUFBO0lBQ2IsNkNBQWUsQ0FBQTtJQUNmLDJDQUFhLENBQUE7SUFDYiw2Q0FBZSxDQUFBO0lBQ2YsNkNBQWUsQ0FBQTtJQUVmLDJGQUE2RCxDQUFBO0lBRTdELGlFQUFtQyxDQUFBO0lBQ25DLHlEQUEyQixDQUFBO0lBQzNCLCtEQUFpQyxDQUFBO0lBQ2pDLDJEQUE2QixDQUFBO0lBRTdCLG1FQUFxQyxDQUFBO0lBQ3JDLGlFQUFtQyxDQUFBO0lBQ25DLGlGQUFtRCxDQUFBO0lBQ25ELDJGQUE2RCxDQUFBO0lBQzdELG1FQUFxQyxDQUFBO0lBQ3JDLDZFQUErQyxDQUFBO0lBQy9DLG1FQUFxQyxDQUFBO0lBQ3JDLGlFQUFtQyxDQUFBO0lBQ25DLG1FQUFxQyxDQUFBO0lBQ3JDLDZFQUErQyxDQUFBO0lBRS9DLG1GQUFxRCxDQUFBO0lBQ3JELGlHQUFtRSxDQUFBO0lBQ25FLDZGQUErRCxDQUFBO0lBQy9ELHlGQUEyRCxDQUFBO0lBQzNELGlHQUFtRSxDQUFBO0lBQ25FLDZGQUErRCxD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