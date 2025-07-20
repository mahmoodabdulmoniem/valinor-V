/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError, transformErrorForSerialization } from '../errors.js';
import { Emitter } from '../event.js';
import { Disposable } from '../lifecycle.js';
import { isWeb } from '../platform.js';
import * as strings from '../strings.js';
const DEFAULT_CHANNEL = 'default';
const INITIALIZE = '$initialize';
let webWorkerWarningLogged = false;
export function logOnceWebWorkerWarning(err) {
    if (!isWeb) {
        // running tests
        return;
    }
    if (!webWorkerWarningLogged) {
        webWorkerWarningLogged = true;
        console.warn('Could not create web worker(s). Falling back to loading web worker code in main thread, which might cause UI freezes. Please see https://github.com/microsoft/monaco-editor#faq');
    }
    console.warn(err.message);
}
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Request"] = 0] = "Request";
    MessageType[MessageType["Reply"] = 1] = "Reply";
    MessageType[MessageType["SubscribeEvent"] = 2] = "SubscribeEvent";
    MessageType[MessageType["Event"] = 3] = "Event";
    MessageType[MessageType["UnsubscribeEvent"] = 4] = "UnsubscribeEvent";
})(MessageType || (MessageType = {}));
class RequestMessage {
    constructor(vsWorker, req, channel, method, args) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.channel = channel;
        this.method = method;
        this.args = args;
        this.type = 0 /* MessageType.Request */;
    }
}
class ReplyMessage {
    constructor(vsWorker, seq, res, err) {
        this.vsWorker = vsWorker;
        this.seq = seq;
        this.res = res;
        this.err = err;
        this.type = 1 /* MessageType.Reply */;
    }
}
class SubscribeEventMessage {
    constructor(vsWorker, req, channel, eventName, arg) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.channel = channel;
        this.eventName = eventName;
        this.arg = arg;
        this.type = 2 /* MessageType.SubscribeEvent */;
    }
}
class EventMessage {
    constructor(vsWorker, req, event) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.event = event;
        this.type = 3 /* MessageType.Event */;
    }
}
class UnsubscribeEventMessage {
    constructor(vsWorker, req) {
        this.vsWorker = vsWorker;
        this.req = req;
        this.type = 4 /* MessageType.UnsubscribeEvent */;
    }
}
class WebWorkerProtocol {
    constructor(handler) {
        this._workerId = -1;
        this._handler = handler;
        this._lastSentReq = 0;
        this._pendingReplies = Object.create(null);
        this._pendingEmitters = new Map();
        this._pendingEvents = new Map();
    }
    setWorkerId(workerId) {
        this._workerId = workerId;
    }
    sendMessage(channel, method, args) {
        const req = String(++this._lastSentReq);
        return new Promise((resolve, reject) => {
            this._pendingReplies[req] = {
                resolve: resolve,
                reject: reject
            };
            this._send(new RequestMessage(this._workerId, req, channel, method, args));
        });
    }
    listen(channel, eventName, arg) {
        let req = null;
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                req = String(++this._lastSentReq);
                this._pendingEmitters.set(req, emitter);
                this._send(new SubscribeEventMessage(this._workerId, req, channel, eventName, arg));
            },
            onDidRemoveLastListener: () => {
                this._pendingEmitters.delete(req);
                this._send(new UnsubscribeEventMessage(this._workerId, req));
                req = null;
            }
        });
        return emitter.event;
    }
    handleMessage(message) {
        if (!message || !message.vsWorker) {
            return;
        }
        if (this._workerId !== -1 && message.vsWorker !== this._workerId) {
            return;
        }
        this._handleMessage(message);
    }
    createProxyToRemoteChannel(channel, sendMessageBarrier) {
        const handler = {
            get: (target, name) => {
                if (typeof name === 'string' && !target[name]) {
                    if (propertyIsDynamicEvent(name)) { // onDynamic...
                        target[name] = (arg) => {
                            return this.listen(channel, name, arg);
                        };
                    }
                    else if (propertyIsEvent(name)) { // on...
                        target[name] = this.listen(channel, name, undefined);
                    }
                    else if (name.charCodeAt(0) === 36 /* CharCode.DollarSign */) { // $...
                        target[name] = async (...myArgs) => {
                            await sendMessageBarrier?.();
                            return this.sendMessage(channel, name, myArgs);
                        };
                    }
                }
                return target[name];
            }
        };
        return new Proxy(Object.create(null), handler);
    }
    _handleMessage(msg) {
        switch (msg.type) {
            case 1 /* MessageType.Reply */:
                return this._handleReplyMessage(msg);
            case 0 /* MessageType.Request */:
                return this._handleRequestMessage(msg);
            case 2 /* MessageType.SubscribeEvent */:
                return this._handleSubscribeEventMessage(msg);
            case 3 /* MessageType.Event */:
                return this._handleEventMessage(msg);
            case 4 /* MessageType.UnsubscribeEvent */:
                return this._handleUnsubscribeEventMessage(msg);
        }
    }
    _handleReplyMessage(replyMessage) {
        if (!this._pendingReplies[replyMessage.seq]) {
            console.warn('Got reply to unknown seq');
            return;
        }
        const reply = this._pendingReplies[replyMessage.seq];
        delete this._pendingReplies[replyMessage.seq];
        if (replyMessage.err) {
            let err = replyMessage.err;
            if (replyMessage.err.$isError) {
                err = new Error();
                err.name = replyMessage.err.name;
                err.message = replyMessage.err.message;
                err.stack = replyMessage.err.stack;
            }
            reply.reject(err);
            return;
        }
        reply.resolve(replyMessage.res);
    }
    _handleRequestMessage(requestMessage) {
        const req = requestMessage.req;
        const result = this._handler.handleMessage(requestMessage.channel, requestMessage.method, requestMessage.args);
        result.then((r) => {
            this._send(new ReplyMessage(this._workerId, req, r, undefined));
        }, (e) => {
            if (e.detail instanceof Error) {
                // Loading errors have a detail property that points to the actual error
                e.detail = transformErrorForSerialization(e.detail);
            }
            this._send(new ReplyMessage(this._workerId, req, undefined, transformErrorForSerialization(e)));
        });
    }
    _handleSubscribeEventMessage(msg) {
        const req = msg.req;
        const disposable = this._handler.handleEvent(msg.channel, msg.eventName, msg.arg)((event) => {
            this._send(new EventMessage(this._workerId, req, event));
        });
        this._pendingEvents.set(req, disposable);
    }
    _handleEventMessage(msg) {
        if (!this._pendingEmitters.has(msg.req)) {
            console.warn('Got event for unknown req');
            return;
        }
        this._pendingEmitters.get(msg.req).fire(msg.event);
    }
    _handleUnsubscribeEventMessage(msg) {
        if (!this._pendingEvents.has(msg.req)) {
            console.warn('Got unsubscribe for unknown req');
            return;
        }
        this._pendingEvents.get(msg.req).dispose();
        this._pendingEvents.delete(msg.req);
    }
    _send(msg) {
        const transfer = [];
        if (msg.type === 0 /* MessageType.Request */) {
            for (let i = 0; i < msg.args.length; i++) {
                if (msg.args[i] instanceof ArrayBuffer) {
                    transfer.push(msg.args[i]);
                }
            }
        }
        else if (msg.type === 1 /* MessageType.Reply */) {
            if (msg.res instanceof ArrayBuffer) {
                transfer.push(msg.res);
            }
        }
        this._handler.sendMessage(msg, transfer);
    }
}
/**
 * Main thread side
 */
export class WebWorkerClient extends Disposable {
    constructor(worker) {
        super();
        this._localChannels = new Map();
        this._remoteChannels = new Map();
        this._worker = this._register(worker);
        this._register(this._worker.onMessage((msg) => {
            this._protocol.handleMessage(msg);
        }));
        this._register(this._worker.onError((err) => {
            logOnceWebWorkerWarning(err);
            onUnexpectedError(err);
        }));
        this._protocol = new WebWorkerProtocol({
            sendMessage: (msg, transfer) => {
                this._worker.postMessage(msg, transfer);
            },
            handleMessage: (channel, method, args) => {
                return this._handleMessage(channel, method, args);
            },
            handleEvent: (channel, eventName, arg) => {
                return this._handleEvent(channel, eventName, arg);
            }
        });
        this._protocol.setWorkerId(this._worker.getId());
        // Send initialize message
        this._onModuleLoaded = this._protocol.sendMessage(DEFAULT_CHANNEL, INITIALIZE, [
            this._worker.getId(),
        ]);
        this.proxy = this._protocol.createProxyToRemoteChannel(DEFAULT_CHANNEL, async () => { await this._onModuleLoaded; });
        this._onModuleLoaded.catch((e) => {
            this._onError('Worker failed to load ', e);
        });
    }
    _handleMessage(channelName, method, args) {
        const channel = this._localChannels.get(channelName);
        if (!channel) {
            return Promise.reject(new Error(`Missing channel ${channelName} on main thread`));
        }
        if (typeof channel[method] !== 'function') {
            return Promise.reject(new Error(`Missing method ${method} on main thread channel ${channelName}`));
        }
        try {
            return Promise.resolve(channel[method].apply(channel, args));
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    _handleEvent(channelName, eventName, arg) {
        const channel = this._localChannels.get(channelName);
        if (!channel) {
            throw new Error(`Missing channel ${channelName} on main thread`);
        }
        if (propertyIsDynamicEvent(eventName)) {
            const event = channel[eventName].call(channel, arg);
            if (typeof event !== 'function') {
                throw new Error(`Missing dynamic event ${eventName} on main thread channel ${channelName}.`);
            }
            return event;
        }
        if (propertyIsEvent(eventName)) {
            const event = channel[eventName];
            if (typeof event !== 'function') {
                throw new Error(`Missing event ${eventName} on main thread channel ${channelName}.`);
            }
            return event;
        }
        throw new Error(`Malformed event name ${eventName}`);
    }
    setChannel(channel, handler) {
        this._localChannels.set(channel, handler);
    }
    getChannel(channel) {
        if (!this._remoteChannels.has(channel)) {
            const inst = this._protocol.createProxyToRemoteChannel(channel, async () => { await this._onModuleLoaded; });
            this._remoteChannels.set(channel, inst);
        }
        return this._remoteChannels.get(channel);
    }
    _onError(message, error) {
        console.error(message);
        console.info(error);
    }
}
function propertyIsEvent(name) {
    // Assume a property is an event if it has a form of "onSomething"
    return name[0] === 'o' && name[1] === 'n' && strings.isUpperAsciiLetter(name.charCodeAt(2));
}
function propertyIsDynamicEvent(name) {
    // Assume a property is a dynamic event (a method that returns an event) if it has a form of "onDynamicSomething"
    return /^onDynamic/.test(name) && strings.isUpperAsciiLetter(name.charCodeAt(9));
}
/**
 * Worker side
 */
export class WebWorkerServer {
    constructor(postMessage, requestHandlerFactory) {
        this._localChannels = new Map();
        this._remoteChannels = new Map();
        this._protocol = new WebWorkerProtocol({
            sendMessage: (msg, transfer) => {
                postMessage(msg, transfer);
            },
            handleMessage: (channel, method, args) => this._handleMessage(channel, method, args),
            handleEvent: (channel, eventName, arg) => this._handleEvent(channel, eventName, arg)
        });
        this.requestHandler = requestHandlerFactory(this);
    }
    onmessage(msg) {
        this._protocol.handleMessage(msg);
    }
    _handleMessage(channel, method, args) {
        if (channel === DEFAULT_CHANNEL && method === INITIALIZE) {
            return this.initialize(args[0]);
        }
        const requestHandler = (channel === DEFAULT_CHANNEL ? this.requestHandler : this._localChannels.get(channel));
        if (!requestHandler) {
            return Promise.reject(new Error(`Missing channel ${channel} on worker thread`));
        }
        if (typeof requestHandler[method] !== 'function') {
            return Promise.reject(new Error(`Missing method ${method} on worker thread channel ${channel}`));
        }
        try {
            return Promise.resolve(requestHandler[method].apply(requestHandler, args));
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    _handleEvent(channel, eventName, arg) {
        const requestHandler = (channel === DEFAULT_CHANNEL ? this.requestHandler : this._localChannels.get(channel));
        if (!requestHandler) {
            throw new Error(`Missing channel ${channel} on worker thread`);
        }
        if (propertyIsDynamicEvent(eventName)) {
            const event = requestHandler[eventName].call(requestHandler, arg);
            if (typeof event !== 'function') {
                throw new Error(`Missing dynamic event ${eventName} on request handler.`);
            }
            return event;
        }
        if (propertyIsEvent(eventName)) {
            const event = requestHandler[eventName];
            if (typeof event !== 'function') {
                throw new Error(`Missing event ${eventName} on request handler.`);
            }
            return event;
        }
        throw new Error(`Malformed event name ${eventName}`);
    }
    setChannel(channel, handler) {
        this._localChannels.set(channel, handler);
    }
    getChannel(channel) {
        if (!this._remoteChannels.has(channel)) {
            const inst = this._protocol.createProxyToRemoteChannel(channel);
            this._remoteChannels.set(channel, inst);
        }
        return this._remoteChannels.get(channel);
    }
    async initialize(workerId) {
        this._protocol.setWorkerId(workerId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViV29ya2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi93b3JrZXIvd2ViV29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sYUFBYSxDQUFDO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxpQkFBaUIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDdkMsT0FBTyxLQUFLLE9BQU8sTUFBTSxlQUFlLENBQUM7QUFFekMsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDO0FBQ2xDLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQztBQVNqQyxJQUFJLHNCQUFzQixHQUFHLEtBQUssQ0FBQztBQUNuQyxNQUFNLFVBQVUsdUJBQXVCLENBQUMsR0FBUTtJQUMvQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixnQkFBZ0I7UUFDaEIsT0FBTztJQUNSLENBQUM7SUFDRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM3QixzQkFBc0IsR0FBRyxJQUFJLENBQUM7UUFDOUIsT0FBTyxDQUFDLElBQUksQ0FBQyxpTEFBaUwsQ0FBQyxDQUFDO0lBQ2pNLENBQUM7SUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMzQixDQUFDO0FBRUQsSUFBVyxXQU1WO0FBTkQsV0FBVyxXQUFXO0lBQ3JCLG1EQUFPLENBQUE7SUFDUCwrQ0FBSyxDQUFBO0lBQ0wsaUVBQWMsQ0FBQTtJQUNkLCtDQUFLLENBQUE7SUFDTCxxRUFBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBTlUsV0FBVyxLQUFYLFdBQVcsUUFNckI7QUFDRCxNQUFNLGNBQWM7SUFFbkIsWUFDaUIsUUFBZ0IsRUFDaEIsR0FBVyxFQUNYLE9BQWUsRUFDZixNQUFjLEVBQ2QsSUFBVztRQUpYLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNYLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QsU0FBSSxHQUFKLElBQUksQ0FBTztRQU5aLFNBQUksK0JBQXVCO0lBT3ZDLENBQUM7Q0FDTDtBQUNELE1BQU0sWUFBWTtJQUVqQixZQUNpQixRQUFnQixFQUNoQixHQUFXLEVBQ1gsR0FBUSxFQUNSLEdBQVE7UUFIUixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUxULFNBQUksNkJBQXFCO0lBTXJDLENBQUM7Q0FDTDtBQUNELE1BQU0scUJBQXFCO0lBRTFCLFlBQ2lCLFFBQWdCLEVBQ2hCLEdBQVcsRUFDWCxPQUFlLEVBQ2YsU0FBaUIsRUFDakIsR0FBUTtRQUpSLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNYLFlBQU8sR0FBUCxPQUFPLENBQVE7UUFDZixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFOVCxTQUFJLHNDQUE4QjtJQU85QyxDQUFDO0NBQ0w7QUFDRCxNQUFNLFlBQVk7SUFFakIsWUFDaUIsUUFBZ0IsRUFDaEIsR0FBVyxFQUNYLEtBQVU7UUFGVixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxVQUFLLEdBQUwsS0FBSyxDQUFLO1FBSlgsU0FBSSw2QkFBcUI7SUFLckMsQ0FBQztDQUNMO0FBQ0QsTUFBTSx1QkFBdUI7SUFFNUIsWUFDaUIsUUFBZ0IsRUFDaEIsR0FBVztRQURYLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUhaLFNBQUksd0NBQWdDO0lBSWhELENBQUM7Q0FDTDtBQWNELE1BQU0saUJBQWlCO0lBU3RCLFlBQVksT0FBd0I7UUFDbkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUN4QixJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQztRQUN0QixJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO1FBQ3hELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7SUFDdEQsQ0FBQztJQUVNLFdBQVcsQ0FBQyxRQUFnQjtRQUNsQyxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztJQUMzQixDQUFDO0lBRU0sV0FBVyxDQUFDLE9BQWUsRUFBRSxNQUFjLEVBQUUsSUFBVztRQUM5RCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDeEMsT0FBTyxJQUFJLE9BQU8sQ0FBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUMzQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHO2dCQUMzQixPQUFPLEVBQUUsT0FBTztnQkFDaEIsTUFBTSxFQUFFLE1BQU07YUFDZCxDQUFDO1lBQ0YsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDNUUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU0sTUFBTSxDQUFDLE9BQWUsRUFBRSxTQUFpQixFQUFFLEdBQVE7UUFDekQsSUFBSSxHQUFHLEdBQWtCLElBQUksQ0FBQztRQUM5QixNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBTTtZQUNoQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7Z0JBQzVCLEdBQUcsR0FBRyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN4QyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUkscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JGLENBQUM7WUFDRCx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsR0FBSSxDQUFDLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQzlELEdBQUcsR0FBRyxJQUFJLENBQUM7WUFDWixDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQ3RCLENBQUM7SUFFTSxhQUFhLENBQUMsT0FBZ0I7UUFDcEMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNsRSxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVNLDBCQUEwQixDQUFtQixPQUFlLEVBQUUsa0JBQXdDO1FBQzVHLE1BQU0sT0FBTyxHQUFHO1lBQ2YsR0FBRyxFQUFFLENBQUMsTUFBVyxFQUFFLElBQWlCLEVBQUUsRUFBRTtnQkFDdkMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDL0MsSUFBSSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBZTt3QkFDbEQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBUSxFQUFjLEVBQUU7NEJBQ3ZDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO3dCQUN4QyxDQUFDLENBQUM7b0JBQ0gsQ0FBQzt5QkFBTSxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUTt3QkFDM0MsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDdEQsQ0FBQzt5QkFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGlDQUF3QixFQUFFLENBQUMsQ0FBQyxPQUFPO3dCQUMvRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxFQUFFLEdBQUcsTUFBYSxFQUFFLEVBQUU7NEJBQ3pDLE1BQU0sa0JBQWtCLEVBQUUsRUFBRSxDQUFDOzRCQUM3QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQzt3QkFDaEQsQ0FBQyxDQUFDO29CQUNILENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNyQixDQUFDO1NBQ0QsQ0FBQztRQUNGLE9BQU8sSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRU8sY0FBYyxDQUFDLEdBQVk7UUFDbEMsUUFBUSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbEI7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEM7Z0JBQ0MsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDeEM7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0M7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEM7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsOEJBQThCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEQsQ0FBQztJQUNGLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxZQUEwQjtRQUNyRCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxPQUFPLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDekMsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTlDLElBQUksWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3RCLElBQUksR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUM7WUFDM0IsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUMvQixHQUFHLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDbEIsR0FBRyxDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDakMsR0FBRyxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQztnQkFDdkMsR0FBRyxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztZQUNwQyxDQUFDO1lBQ0QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNsQixPQUFPO1FBQ1IsQ0FBQztRQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxjQUE4QjtRQUMzRCxNQUFNLEdBQUcsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDO1FBQy9CLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0csTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2pCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDakUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDUixJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksS0FBSyxFQUFFLENBQUM7Z0JBQy9CLHdFQUF3RTtnQkFDeEUsQ0FBQyxDQUFDLE1BQU0sR0FBRyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckQsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyw0QkFBNEIsQ0FBQyxHQUEwQjtRQUM5RCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO1FBQ3BCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMzRixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVPLG1CQUFtQixDQUFDLEdBQWlCO1FBQzVDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUMxQyxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVPLDhCQUE4QixDQUFDLEdBQTRCO1FBQ2xFLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN2QyxPQUFPLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7WUFDaEQsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFTyxLQUFLLENBQUMsR0FBWTtRQUN6QixNQUFNLFFBQVEsR0FBa0IsRUFBRSxDQUFDO1FBQ25DLElBQUksR0FBRyxDQUFDLElBQUksZ0NBQXdCLEVBQUUsQ0FBQztZQUN0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLFdBQVcsRUFBRSxDQUFDO29CQUN4QyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxHQUFHLENBQUMsSUFBSSw4QkFBc0IsRUFBRSxDQUFDO1lBQzNDLElBQUksR0FBRyxDQUFDLEdBQUcsWUFBWSxXQUFXLEVBQUUsQ0FBQztnQkFDcEMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDeEIsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUMsQ0FBQztDQUNEO0FBeUJEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGVBQWtDLFNBQVEsVUFBVTtJQVNoRSxZQUNDLE1BQWtCO1FBRWxCLEtBQUssRUFBRSxDQUFDO1FBTlEsbUJBQWMsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNoRCxvQkFBZSxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBT2pFLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDN0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMzQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3QixpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLGlCQUFpQixDQUFDO1lBQ3RDLFdBQVcsRUFBRSxDQUFDLEdBQVEsRUFBRSxRQUF1QixFQUFRLEVBQUU7Z0JBQ3hELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN6QyxDQUFDO1lBQ0QsYUFBYSxFQUFFLENBQUMsT0FBZSxFQUFFLE1BQWMsRUFBRSxJQUFXLEVBQWdCLEVBQUU7Z0JBQzdFLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ25ELENBQUM7WUFDRCxXQUFXLEVBQUUsQ0FBQyxPQUFlLEVBQUUsU0FBaUIsRUFBRSxHQUFRLEVBQWMsRUFBRTtnQkFDekUsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbkQsQ0FBQztTQUNELENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUVqRCwwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsVUFBVSxFQUFFO1lBQzlFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO1NBQ3BCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQyxlQUFlLEVBQUUsS0FBSyxJQUFJLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNySCxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sY0FBYyxDQUFDLFdBQW1CLEVBQUUsTUFBYyxFQUFFLElBQVc7UUFDdEUsTUFBTSxPQUFPLEdBQXVCLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsV0FBVyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDbkYsQ0FBQztRQUNELElBQUksT0FBUSxPQUFlLENBQUMsTUFBTSxDQUFDLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDcEQsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGtCQUFrQixNQUFNLDJCQUEyQixXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEcsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBRSxPQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRU8sWUFBWSxDQUFDLFdBQW1CLEVBQUUsU0FBaUIsRUFBRSxHQUFRO1FBQ3BFLE1BQU0sT0FBTyxHQUF1QixJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN6RSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixXQUFXLGlCQUFpQixDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUNELElBQUksc0JBQXNCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUN2QyxNQUFNLEtBQUssR0FBSSxPQUFlLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM3RCxJQUFJLE9BQU8sS0FBSyxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixTQUFTLDJCQUEyQixXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQzlGLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sS0FBSyxHQUFJLE9BQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMxQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixTQUFTLDJCQUEyQixXQUFXLEdBQUcsQ0FBQyxDQUFDO1lBQ3RGLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixTQUFTLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFTSxVQUFVLENBQW1CLE9BQWUsRUFBRSxPQUFVO1FBQzlELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRU0sVUFBVSxDQUFtQixPQUFlO1FBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsT0FBTyxFQUFFLEtBQUssSUFBSSxFQUFFLEdBQUcsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0csSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBZSxDQUFDO0lBQ3hELENBQUM7SUFFTyxRQUFRLENBQUMsT0FBZSxFQUFFLEtBQVc7UUFDNUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JCLENBQUM7Q0FDRDtBQUVELFNBQVMsZUFBZSxDQUFDLElBQVk7SUFDcEMsa0VBQWtFO0lBQ2xFLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0YsQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUMsSUFBWTtJQUMzQyxpSEFBaUg7SUFDakgsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQztBQVdEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGVBQWU7SUFPM0IsWUFBWSxXQUE2RCxFQUFFLHFCQUErRDtRQUh6SCxtQkFBYyxHQUF3QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2hELG9CQUFlLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFHakUsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLGlCQUFpQixDQUFDO1lBQ3RDLFdBQVcsRUFBRSxDQUFDLEdBQVEsRUFBRSxRQUF1QixFQUFRLEVBQUU7Z0JBQ3hELFdBQVcsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDNUIsQ0FBQztZQUNELGFBQWEsRUFBRSxDQUFDLE9BQWUsRUFBRSxNQUFjLEVBQUUsSUFBVyxFQUFnQixFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQztZQUN6SCxXQUFXLEVBQUUsQ0FBQyxPQUFlLEVBQUUsU0FBaUIsRUFBRSxHQUFRLEVBQWMsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUM7U0FDckgsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRU0sU0FBUyxDQUFDLEdBQVE7UUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVPLGNBQWMsQ0FBQyxPQUFlLEVBQUUsTUFBYyxFQUFFLElBQVc7UUFDbEUsSUFBSSxPQUFPLEtBQUssZUFBZSxJQUFJLE1BQU0sS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUMxRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUE4QixDQUFDLE9BQU8sS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDekksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsT0FBTyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDakYsQ0FBQztRQUNELElBQUksT0FBUSxjQUFzQixDQUFDLE1BQU0sQ0FBQyxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzNELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsTUFBTSw2QkFBNkIsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2xHLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUUsY0FBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckYsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFTyxZQUFZLENBQUMsT0FBZSxFQUFFLFNBQWlCLEVBQUUsR0FBUTtRQUNoRSxNQUFNLGNBQWMsR0FBOEIsQ0FBQyxPQUFPLEtBQUssZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3pJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixPQUFPLG1CQUFtQixDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUNELElBQUksc0JBQXNCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUN2QyxNQUFNLEtBQUssR0FBSSxjQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDM0UsSUFBSSxPQUFPLEtBQUssS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsU0FBUyxzQkFBc0IsQ0FBQyxDQUFDO1lBQzNFLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxJQUFJLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sS0FBSyxHQUFJLGNBQXNCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDakQsSUFBSSxPQUFPLEtBQUssS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsU0FBUyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ25FLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixTQUFTLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFTSxVQUFVLENBQW1CLE9BQWUsRUFBRSxPQUFVO1FBQzlELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMzQyxDQUFDO0lBRU0sVUFBVSxDQUFtQixPQUFlO1FBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBZSxDQUFDO0lBQ3hELENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVSxDQUFDLFFBQWdCO1FBQ3hDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7Q0FDRCJ9