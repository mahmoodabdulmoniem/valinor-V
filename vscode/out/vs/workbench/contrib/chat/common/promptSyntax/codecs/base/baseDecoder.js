/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../../../base/common/event.js';
import { DeferredPromise } from '../../../../../../../base/common/async.js';
import { AsyncDecoder } from './asyncDecoder.js';
import { assert, assertNever } from '../../../../../../../base/common/assert.js';
import { DisposableMap } from '../../../../../../../base/common/lifecycle.js';
import { ObservableDisposable } from '../../utils/observableDisposable.js';
/**
 * Base decoder class that can be used to convert stream messages data type
 * from one type to another. For instance, a stream of binary data can be
 * "decoded" into a stream of well defined objects.
 * Intended to be a part of "codec" implementation rather than used directly.
 */
export class BaseDecoder extends ObservableDisposable {
    /**
     * @param stream The input stream to decode.
     */
    constructor(stream) {
        super();
        this.stream = stream;
        /**
         * Private attribute to track if the stream has ended.
         */
        this._ended = false;
        this._onData = this._register(new Emitter());
        this._onEnd = this._register(new Emitter());
        this._onError = this._register(new Emitter());
        /**
         * A store of currently registered event listeners.
         */
        this._listeners = this._register(new DisposableMap());
        /**
         * Private attribute to track if the stream has started.
         */
        this.started = false;
        /**
         * Promise that resolves when the stream has ended, either by
         * receiving the `end` event or by a disposal, but not when
         * the `error` event is received alone.
         * The promise is true if the stream has ended, and false
         * if the stream has been disposed without ending.
         */
        this.settledPromise = new DeferredPromise();
    }
    /**
     * Promise that resolves when the stream has ended, either by
     * receiving the `end` event or by a disposal, but not when
     * the `error` event is received alone.
     * The promise is true if the stream has ended, and false
     * if the stream has been disposed without ending.
     *
     * @throws If the stream was not yet started to prevent this
     * 		   promise to block the consumer calls indefinitely.
     */
    get settled() {
        // if the stream has not started yet, the promise might
        // block the consumer calls indefinitely if they forget
        // to call the `start()` method, or if the call happens
        // after await on the `settled` promise; to forbid this
        // confusion, we require the stream to be started first
        assert(this.started, [
            'Cannot get `settled` promise of a stream that has not been started.',
            'Please call `start()` first.',
        ].join(' '));
        return this.settledPromise.p;
    }
    /**
     * Start receiving data from the stream.
     * @throws if the decoder stream has already ended.
     */
    start() {
        assert(this._ended === false, 'Cannot start stream that has already ended.');
        assert(this.isDisposed === false, 'Cannot start stream that has already disposed.');
        // if already started, nothing to do
        if (this.started) {
            return this;
        }
        this.started = true;
        /**
         * !NOTE! The order of event subscriptions is critical here because
         *        the `data` event is also starts the stream, hence changing
         *        the order of event subscriptions can lead to race conditions.
         *        See {@link ReadableStreamEvents} for more info.
         */
        this.stream.on('end', this.onStreamEnd.bind(this));
        this.stream.on('error', this.onStreamError.bind(this));
        this.stream.on('data', this.tryOnStreamData.bind(this));
        // this allows to compose decoders together, - if a decoder
        // instance is passed as a readable stream to this decoder,
        // then we need to call `start` on it too
        if (this.stream instanceof BaseDecoder) {
            this.stream.start();
        }
        return this;
    }
    /**
     * Check if the decoder has been ended hence has
     * no more data to produce.
     */
    get ended() {
        return this._ended;
    }
    /**
     * Automatically catch and dispatch errors thrown inside `onStreamData`.
     */
    tryOnStreamData(data) {
        try {
            this.onStreamData(data);
        }
        catch (error) {
            this.onStreamError(error);
        }
    }
    on(event, callback) {
        if (event === 'data') {
            return this.onData(callback);
        }
        if (event === 'error') {
            return this.onError(callback);
        }
        if (event === 'end') {
            return this.onEnd(callback);
        }
        assertNever(event, `Invalid event name '${event}'`);
    }
    /**
     * Add listener for the `data` event.
     * @throws if the decoder stream has already ended.
     */
    onData(callback) {
        assert(!this.ended, 'Cannot subscribe to the `data` event because the decoder stream has already ended.');
        let currentListeners = this._listeners.get('data');
        if (!currentListeners) {
            currentListeners = new DisposableMap();
            this._listeners.set('data', currentListeners);
        }
        currentListeners.set(callback, this._onData.event(callback));
    }
    /**
     * Add listener for the `error` event.
     * @throws if the decoder stream has already ended.
     */
    onError(callback) {
        assert(!this.ended, 'Cannot subscribe to the `error` event because the decoder stream has already ended.');
        let currentListeners = this._listeners.get('error');
        if (!currentListeners) {
            currentListeners = new DisposableMap();
            this._listeners.set('error', currentListeners);
        }
        currentListeners.set(callback, this._onError.event(callback));
    }
    /**
     * Add listener for the `end` event.
     * @throws if the decoder stream has already ended.
     */
    onEnd(callback) {
        assert(!this.ended, 'Cannot subscribe to the `end` event because the decoder stream has already ended.');
        let currentListeners = this._listeners.get('end');
        if (!currentListeners) {
            currentListeners = new DisposableMap();
            this._listeners.set('end', currentListeners);
        }
        currentListeners.set(callback, this._onEnd.event(callback));
    }
    /**
     * Pauses the stream.
     */
    pause() {
        this.stream.pause();
    }
    /**
     * Resumes the stream if it has been paused.
     * @throws if the decoder stream has already ended.
     */
    resume() {
        assert(this.ended === false, 'Cannot resume the stream because it has already ended.');
        this.stream.resume();
    }
    /**
     * Destroys(disposes) the stream.
     */
    destroy() {
        this.dispose();
    }
    /**
     * Removes a previously-registered event listener for a specified event.
     *
     * Note!
     *  - the callback function must be the same as the one that was used when
     * 	  registering the event listener as it is used as an identifier to
     *    remove the listener
     *  - this method is idempotent and results in no-op if the listener is
     *    not found, therefore passing incorrect `callback` function may
     *    result in silent unexpected behavior
     */
    removeListener(eventName, callback) {
        const listeners = this._listeners.get(eventName);
        if (listeners === undefined) {
            return;
        }
        for (const [listener] of listeners) {
            if (listener !== callback) {
                continue;
            }
            listeners.deleteAndDispose(listener);
        }
    }
    /**
     * This method is called when the input stream ends.
     */
    onStreamEnd() {
        if (this._ended) {
            return;
        }
        this._ended = true;
        this._onEnd.fire();
        this.settledPromise.complete(this._ended);
    }
    /**
     * This method is called when the input stream emits an error.
     * We re-emit the error here by default, but subclasses can
     * override this method to handle the error differently.
     */
    onStreamError(error) {
        this._onError.fire(error);
    }
    /**
     * Consume all messages from the stream, blocking until the stream finishes.
     * @throws if the decoder stream has already ended.
     */
    async consumeAll() {
        assert(!this._ended, 'Cannot consume all messages of the stream that has already ended.');
        const messages = [];
        for await (const maybeMessage of this) {
            if (maybeMessage === null) {
                break;
            }
            messages.push(maybeMessage);
        }
        return messages;
    }
    /**
     * Async iterator interface for the decoder.
     * @throws if the decoder stream has already ended.
     */
    [Symbol.asyncIterator]() {
        assert(!this._ended, 'Cannot iterate on messages of the stream that has already ended.');
        const asyncDecoder = this._register(new AsyncDecoder(this));
        return asyncDecoder[Symbol.asyncIterator]();
    }
    dispose() {
        this.settledPromise.complete(this.ended);
        this._listeners.clearAndDisposeAll();
        this.stream.destroy();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZURlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9iYXNlRGVjb2Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQWUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMzRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQU8zRTs7Ozs7R0FLRztBQUNILE1BQU0sT0FBZ0IsV0FHcEIsU0FBUSxvQkFBb0I7SUF3QjdCOztPQUVHO0lBQ0gsWUFDb0IsTUFBeUI7UUFFNUMsS0FBSyxFQUFFLENBQUM7UUFGVyxXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQTNCN0M7O1dBRUc7UUFDSyxXQUFNLEdBQUcsS0FBSyxDQUFDO1FBRUosWUFBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQUssQ0FBQyxDQUFDO1FBQzdDLFdBQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUM3QyxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUyxDQUFDLENBQUM7UUFFakU7O1dBRUc7UUFDYyxlQUFVLEdBR3ZCLElBQUksQ0FBQyxTQUFTLENB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