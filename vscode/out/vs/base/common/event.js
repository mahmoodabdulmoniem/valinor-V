/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { diffSets } from './collections.js';
import { onUnexpectedError } from './errors.js';
import { createSingleCallFunction } from './functional.js';
import { combinedDisposable, Disposable, DisposableMap, DisposableStore, toDisposable } from './lifecycle.js';
import { LinkedList } from './linkedList.js';
import { StopWatch } from './stopwatch.js';
// -----------------------------------------------------------------------------------------------------------------------
// Uncomment the next line to print warnings whenever an emitter with listeners is disposed. That is a sign of code smell.
// -----------------------------------------------------------------------------------------------------------------------
const _enableDisposeWithListenerWarning = false;
// -----------------------------------------------------------------------------------------------------------------------
// Uncomment the next line to print warnings whenever a snapshotted event is used repeatedly without cleanup.
// See https://github.com/microsoft/vscode/issues/142851
// -----------------------------------------------------------------------------------------------------------------------
const _enableSnapshotPotentialLeakWarning = false;
export var Event;
(function (Event) {
    Event.None = () => Disposable.None;
    function _addLeakageTraceLogic(options) {
        if (_enableSnapshotPotentialLeakWarning) {
            const { onDidAddListener: origListenerDidAdd } = options;
            const stack = Stacktrace.create();
            let count = 0;
            options.onDidAddListener = () => {
                if (++count === 2) {
                    console.warn('snapshotted emitter LIKELY used public and SHOULD HAVE BEEN created with DisposableStore. snapshotted here');
                    stack.print();
                }
                origListenerDidAdd?.();
            };
        }
    }
    /**
     * Given an event, returns another event which debounces calls and defers the listeners to a later task via a shared
     * `setTimeout`. The event is converted into a signal (`Event<void>`) to avoid additional object creation as a
     * result of merging events and to try prevent race conditions that could arise when using related deferred and
     * non-deferred events.
     *
     * This is useful for deferring non-critical work (eg. general UI updates) to ensure it does not block critical work
     * (eg. latency of keypress to text rendered).
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @param event The event source for the new event.
     * @param disposable A disposable store to add the new EventEmitter to.
     */
    function defer(event, disposable) {
        return debounce(event, () => void 0, 0, undefined, true, undefined, disposable);
    }
    Event.defer = defer;
    /**
     * Given an event, returns another event which only fires once.
     *
     * @param event The event source for the new event.
     */
    function once(event) {
        return (listener, thisArgs = null, disposables) => {
            // we need this, in case the event fires during the listener call
            let didFire = false;
            let result = undefined;
            result = event(e => {
                if (didFire) {
                    return;
                }
                else if (result) {
                    result.dispose();
                }
                else {
                    didFire = true;
                }
                return listener.call(thisArgs, e);
            }, null, disposables);
            if (didFire) {
                result.dispose();
            }
            return result;
        };
    }
    Event.once = once;
    /**
     * Given an event, returns another event which only fires once, and only when the condition is met.
     *
     * @param event The event source for the new event.
     */
    function onceIf(event, condition) {
        return Event.once(Event.filter(event, condition));
    }
    Event.onceIf = onceIf;
    /**
     * Maps an event of one type into an event of another type using a mapping function, similar to how
     * `Array.prototype.map` works.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @param event The event source for the new event.
     * @param map The mapping function.
     * @param disposable A disposable store to add the new EventEmitter to.
     */
    function map(event, map, disposable) {
        return snapshot((listener, thisArgs = null, disposables) => event(i => listener.call(thisArgs, map(i)), null, disposables), disposable);
    }
    Event.map = map;
    /**
     * Wraps an event in another event that performs some function on the event object before firing.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @param event The event source for the new event.
     * @param each The function to perform on the event object.
     * @param disposable A disposable store to add the new EventEmitter to.
     */
    function forEach(event, each, disposable) {
        return snapshot((listener, thisArgs = null, disposables) => event(i => { each(i); listener.call(thisArgs, i); }, null, disposables), disposable);
    }
    Event.forEach = forEach;
    function filter(event, filter, disposable) {
        return snapshot((listener, thisArgs = null, disposables) => event(e => filter(e) && listener.call(thisArgs, e), null, disposables), disposable);
    }
    Event.filter = filter;
    /**
     * Given an event, returns the same event but typed as `Event<void>`.
     */
    function signal(event) {
        return event;
    }
    Event.signal = signal;
    function any(...events) {
        return (listener, thisArgs = null, disposables) => {
            const disposable = combinedDisposable(...events.map(event => event(e => listener.call(thisArgs, e))));
            return addAndReturnDisposable(disposable, disposables);
        };
    }
    Event.any = any;
    /**
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     */
    function reduce(event, merge, initial, disposable) {
        let output = initial;
        return map(event, e => {
            output = merge(output, e);
            return output;
        }, disposable);
    }
    Event.reduce = reduce;
    function snapshot(event, disposable) {
        let listener;
        const options = {
            onWillAddFirstListener() {
                listener = event(emitter.fire, emitter);
            },
            onDidRemoveLastListener() {
                listener?.dispose();
            }
        };
        if (!disposable) {
            _addLeakageTraceLogic(options);
        }
        const emitter = new Emitter(options);
        disposable?.add(emitter);
        return emitter.event;
    }
    /**
     * Adds the IDisposable to the store if it's set, and returns it. Useful to
     * Event function implementation.
     */
    function addAndReturnDisposable(d, store) {
        if (store instanceof Array) {
            store.push(d);
        }
        else if (store) {
            store.add(d);
        }
        return d;
    }
    function debounce(event, merge, delay = 100, leading = false, flushOnListenerRemove = false, leakWarningThreshold, disposable) {
        let subscription;
        let output = undefined;
        let handle = undefined;
        let numDebouncedCalls = 0;
        let doFire;
        const options = {
            leakWarningThreshold,
            onWillAddFirstListener() {
                subscription = event(cur => {
                    numDebouncedCalls++;
                    output = merge(output, cur);
                    if (leading && !handle) {
                        emitter.fire(output);
                        output = undefined;
                    }
                    doFire = () => {
                        const _output = output;
                        output = undefined;
                        handle = undefined;
                        if (!leading || numDebouncedCalls > 1) {
                            emitter.fire(_output);
                        }
                        numDebouncedCalls = 0;
                    };
                    if (typeof delay === 'number') {
                        if (handle) {
                            clearTimeout(handle);
                        }
                        handle = setTimeout(doFire, delay);
                    }
                    else {
                        if (handle === undefined) {
                            handle = null;
                            queueMicrotask(doFire);
                        }
                    }
                });
            },
            onWillRemoveListener() {
                if (flushOnListenerRemove && numDebouncedCalls > 0) {
                    doFire?.();
                }
            },
            onDidRemoveLastListener() {
                doFire = undefined;
                subscription.dispose();
            }
        };
        if (!disposable) {
            _addLeakageTraceLogic(options);
        }
        const emitter = new Emitter(options);
        disposable?.add(emitter);
        return emitter.event;
    }
    Event.debounce = debounce;
    /**
     * Debounces an event, firing after some delay (default=0) with an array of all event original objects.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     */
    function accumulate(event, delay = 0, disposable) {
        return Event.debounce(event, (last, e) => {
            if (!last) {
                return [e];
            }
            last.push(e);
            return last;
        }, delay, undefined, true, undefined, disposable);
    }
    Event.accumulate = accumulate;
    /**
     * Filters an event such that some condition is _not_ met more than once in a row, effectively ensuring duplicate
     * event objects from different sources do not fire the same event object.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @param event The event source for the new event.
     * @param equals The equality condition.
     * @param disposable A disposable store to add the new EventEmitter to.
     *
     * @example
     * ```
     * // Fire only one time when a single window is opened or focused
     * Event.latch(Event.any(onDidOpenWindow, onDidFocusWindow))
     * ```
     */
    function latch(event, equals = (a, b) => a === b, disposable) {
        let firstCall = true;
        let cache;
        return filter(event, value => {
            const shouldEmit = firstCall || !equals(value, cache);
            firstCall = false;
            cache = value;
            return shouldEmit;
        }, disposable);
    }
    Event.latch = latch;
    /**
     * Splits an event whose parameter is a union type into 2 separate events for each type in the union.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @example
     * ```
     * const event = new EventEmitter<number | undefined>().event;
     * const [numberEvent, undefinedEvent] = Event.split(event, isUndefined);
     * ```
     *
     * @param event The event source for the new event.
     * @param isT A function that determines what event is of the first type.
     * @param disposable A disposable store to add the new EventEmitter to.
     */
    function split(event, isT, disposable) {
        return [
            Event.filter(event, isT, disposable),
            Event.filter(event, e => !isT(e), disposable),
        ];
    }
    Event.split = split;
    /**
     * Buffers an event until it has a listener attached.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @param event The event source for the new event.
     * @param flushAfterTimeout Determines whether to flush the buffer after a timeout immediately or after a
     * `setTimeout` when the first event listener is added.
     * @param _buffer Internal: A source event array used for tests.
     *
     * @example
     * ```
     * // Start accumulating events, when the first listener is attached, flush
     * // the event after a timeout such that multiple listeners attached before
     * // the timeout would receive the event
     * this.onInstallExtension = Event.buffer(service.onInstallExtension, true);
     * ```
     */
    function buffer(event, flushAfterTimeout = false, _buffer = [], disposable) {
        let buffer = _buffer.slice();
        let listener = event(e => {
            if (buffer) {
                buffer.push(e);
            }
            else {
                emitter.fire(e);
            }
        });
        if (disposable) {
            disposable.add(listener);
        }
        const flush = () => {
            buffer?.forEach(e => emitter.fire(e));
            buffer = null;
        };
        const emitter = new Emitter({
            onWillAddFirstListener() {
                if (!listener) {
                    listener = event(e => emitter.fire(e));
                    if (disposable) {
                        disposable.add(listener);
                    }
                }
            },
            onDidAddFirstListener() {
                if (buffer) {
                    if (flushAfterTimeout) {
                        setTimeout(flush);
                    }
                    else {
                        flush();
                    }
                }
            },
            onDidRemoveLastListener() {
                if (listener) {
                    listener.dispose();
                }
                listener = null;
            }
        });
        if (disposable) {
            disposable.add(emitter);
        }
        return emitter.event;
    }
    Event.buffer = buffer;
    /**
     * Wraps the event in an {@link IChainableEvent}, allowing a more functional programming style.
     *
     * @example
     * ```
     * // Normal
     * const onEnterPressNormal = Event.filter(
     *   Event.map(onKeyPress.event, e => new StandardKeyboardEvent(e)),
     *   e.keyCode === KeyCode.Enter
     * ).event;
     *
     * // Using chain
     * const onEnterPressChain = Event.chain(onKeyPress.event, $ => $
     *   .map(e => new StandardKeyboardEvent(e))
     *   .filter(e => e.keyCode === KeyCode.Enter)
     * );
     * ```
     */
    function chain(event, sythensize) {
        const fn = (listener, thisArgs, disposables) => {
            const cs = sythensize(new ChainableSynthesis());
            return event(function (value) {
                const result = cs.evaluate(value);
                if (result !== HaltChainable) {
                    listener.call(thisArgs, result);
                }
            }, undefined, disposables);
        };
        return fn;
    }
    Event.chain = chain;
    const HaltChainable = Symbol('HaltChainable');
    class ChainableSynthesis {
        constructor() {
            this.steps = [];
        }
        map(fn) {
            this.steps.push(fn);
            return this;
        }
        forEach(fn) {
            this.steps.push(v => {
                fn(v);
                return v;
            });
            return this;
        }
        filter(fn) {
            this.steps.push(v => fn(v) ? v : HaltChainable);
            return this;
        }
        reduce(merge, initial) {
            let last = initial;
            this.steps.push(v => {
                last = merge(last, v);
                return last;
            });
            return this;
        }
        latch(equals = (a, b) => a === b) {
            let firstCall = true;
            let cache;
            this.steps.push(value => {
                const shouldEmit = firstCall || !equals(value, cache);
                firstCall = false;
                cache = value;
                return shouldEmit ? value : HaltChainable;
            });
            return this;
        }
        evaluate(value) {
            for (const step of this.steps) {
                value = step(value);
                if (value === HaltChainable) {
                    break;
                }
            }
            return value;
        }
    }
    /**
     * Creates an {@link Event} from a node event emitter.
     */
    function fromNodeEventEmitter(emitter, eventName, map = id => id) {
        const fn = (...args) => result.fire(map(...args));
        const onFirstListenerAdd = () => emitter.on(eventName, fn);
        const onLastListenerRemove = () => emitter.removeListener(eventName, fn);
        const result = new Emitter({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
        return result.event;
    }
    Event.fromNodeEventEmitter = fromNodeEventEmitter;
    /**
     * Creates an {@link Event} from a DOM event emitter.
     */
    function fromDOMEventEmitter(emitter, eventName, map = id => id) {
        const fn = (...args) => result.fire(map(...args));
        const onFirstListenerAdd = () => emitter.addEventListener(eventName, fn);
        const onLastListenerRemove = () => emitter.removeEventListener(eventName, fn);
        const result = new Emitter({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
        return result.event;
    }
    Event.fromDOMEventEmitter = fromDOMEventEmitter;
    /**
     * Creates a promise out of an event, using the {@link Event.once} helper.
     */
    function toPromise(event, disposables) {
        let cancelRef;
        const promise = new Promise((resolve, reject) => {
            const listener = once(event)(resolve, null, disposables);
            // not resolved, matching the behavior of a normal disposal
            cancelRef = () => listener.dispose();
        });
        promise.cancel = cancelRef;
        return promise;
    }
    Event.toPromise = toPromise;
    /**
     * Creates an event out of a promise that fires once when the promise is
     * resolved with the result of the promise or `undefined`.
     */
    function fromPromise(promise) {
        const result = new Emitter();
        promise.then(res => {
            result.fire(res);
        }, () => {
            result.fire(undefined);
        }).finally(() => {
            result.dispose();
        });
        return result.event;
    }
    Event.fromPromise = fromPromise;
    /**
     * A convenience function for forwarding an event to another emitter which
     * improves readability.
     *
     * This is similar to {@link Relay} but allows instantiating and forwarding
     * on a single line and also allows for multiple source events.
     * @param from The event to forward.
     * @param to The emitter to forward the event to.
     * @example
     * Event.forward(event, emitter);
     * // equivalent to
     * event(e => emitter.fire(e));
     * // equivalent to
     * event(emitter.fire, emitter);
     */
    function forward(from, to) {
        return from(e => to.fire(e));
    }
    Event.forward = forward;
    function runAndSubscribe(event, handler, initial) {
        handler(initial);
        return event(e => handler(e));
    }
    Event.runAndSubscribe = runAndSubscribe;
    class EmitterObserver {
        constructor(_observable, store) {
            this._observable = _observable;
            this._counter = 0;
            this._hasChanged = false;
            const options = {
                onWillAddFirstListener: () => {
                    _observable.addObserver(this);
                    // Communicate to the observable that we received its current value and would like to be notified about future changes.
                    this._observable.reportChanges();
                },
                onDidRemoveLastListener: () => {
                    _observable.removeObserver(this);
                }
            };
            if (!store) {
                _addLeakageTraceLogic(options);
            }
            this.emitter = new Emitter(options);
            if (store) {
                store.add(this.emitter);
            }
        }
        beginUpdate(_observable) {
            // assert(_observable === this.obs);
            this._counter++;
        }
        handlePossibleChange(_observable) {
            // assert(_observable === this.obs);
        }
        handleChange(_observable, _change) {
            // assert(_observable === this.obs);
            this._hasChanged = true;
        }
        endUpdate(_observable) {
            // assert(_observable === this.obs);
            this._counter--;
            if (this._counter === 0) {
                this._observable.reportChanges();
                if (this._hasChanged) {
                    this._hasChanged = false;
                    this.emitter.fire(this._observable.get());
                }
            }
        }
    }
    /**
     * Creates an event emitter that is fired when the observable changes.
     * Each listeners subscribes to the emitter.
     */
    function fromObservable(obs, store) {
        const observer = new EmitterObserver(obs, store);
        return observer.emitter.event;
    }
    Event.fromObservable = fromObservable;
    /**
     * Each listener is attached to the observable directly.
     */
    function fromObservableLight(observable) {
        return (listener, thisArgs, disposables) => {
            let count = 0;
            let didChange = false;
            const observer = {
                beginUpdate() {
                    count++;
                },
                endUpdate() {
                    count--;
                    if (count === 0) {
                        observable.reportChanges();
                        if (didChange) {
                            didChange = false;
                            listener.call(thisArgs);
                        }
                    }
                },
                handlePossibleChange() {
                    // noop
                },
                handleChange() {
                    didChange = true;
                }
            };
            observable.addObserver(observer);
            observable.reportChanges();
            const disposable = {
                dispose() {
                    observable.removeObserver(observer);
                }
            };
            if (disposables instanceof DisposableStore) {
                disposables.add(disposable);
            }
            else if (Array.isArray(disposables)) {
                disposables.push(disposable);
            }
            return disposable;
        };
    }
    Event.fromObservableLight = fromObservableLight;
})(Event || (Event = {}));
export class EventProfiling {
    static { this.all = new Set(); }
    static { this._idPool = 0; }
    constructor(name) {
        this.listenerCount = 0;
        this.invocationCount = 0;
        this.elapsedOverall = 0;
        this.durations = [];
        this.name = `${name}_${EventProfiling._idPool++}`;
        EventProfiling.all.add(this);
    }
    start(listenerCount) {
        this._stopWatch = new StopWatch();
        this.listenerCount = listenerCount;
    }
    stop() {
        if (this._stopWatch) {
            const elapsed = this._stopWatch.elapsed();
            this.durations.push(elapsed);
            this.elapsedOverall += elapsed;
            this.invocationCount += 1;
            this._stopWatch = undefined;
        }
    }
}
let _globalLeakWarningThreshold = -1;
export function setGlobalLeakWarningThreshold(n) {
    const oldValue = _globalLeakWarningThreshold;
    _globalLeakWarningThreshold = n;
    return {
        dispose() {
            _globalLeakWarningThreshold = oldValue;
        }
    };
}
class LeakageMonitor {
    static { this._idPool = 1; }
    constructor(_errorHandler, threshold, name = (LeakageMonitor._idPool++).toString(16).padStart(3, '0')) {
        this._errorHandler = _errorHandler;
        this.threshold = threshold;
        this.name = name;
        this._warnCountdown = 0;
    }
    dispose() {
        this._stacks?.clear();
    }
    check(stack, listenerCount) {
        const threshold = this.threshold;
        if (threshold <= 0 || listenerCount < threshold) {
            return undefined;
        }
        if (!this._stacks) {
            this._stacks = new Map();
        }
        const count = (this._stacks.get(stack.value) || 0);
        this._stacks.set(stack.value, count + 1);
        this._warnCountdown -= 1;
        if (this._warnCountdown <= 0) {
            // only warn on first exceed and then every time the limit
            // is exceeded by 50% again
            this._warnCountdown = threshold * 0.5;
            const [topStack, topCount] = this.getMostFrequentStack();
            const message = `[${this.name}] potential listener LEAK detected, having ${listenerCount} listeners already. MOST frequent listener (${topCount}):`;
            console.warn(message);
            console.warn(topStack);
            const error = new ListenerLeakError(message, topStack);
            this._errorHandler(error);
        }
        return () => {
            const count = (this._stacks.get(stack.value) || 0);
            this._stacks.set(stack.value, count - 1);
        };
    }
    getMostFrequentStack() {
        if (!this._stacks) {
            return undefined;
        }
        let topStack;
        let topCount = 0;
        for (const [stack, count] of this._stacks) {
            if (!topStack || topCount < count) {
                topStack = [stack, count];
                topCount = count;
            }
        }
        return topStack;
    }
}
class Stacktrace {
    static create() {
        const err = new Error();
        return new Stacktrace(err.stack ?? '');
    }
    constructor(value) {
        this.value = value;
    }
    print() {
        console.warn(this.value.split('\n').slice(2).join('\n'));
    }
}
// error that is logged when going over the configured listener threshold
export class ListenerLeakError extends Error {
    constructor(message, stack) {
        super(message);
        this.name = 'ListenerLeakError';
        this.stack = stack;
    }
}
// SEVERE error that is logged when having gone way over the configured listener
// threshold so that the emitter refuses to accept more listeners
export class ListenerRefusalError extends Error {
    constructor(message, stack) {
        super(message);
        this.name = 'ListenerRefusalError';
        this.stack = stack;
    }
}
let id = 0;
class UniqueContainer {
    constructor(value) {
        this.value = value;
        this.id = id++;
    }
}
const compactionThreshold = 2;
const forEachListener = (listeners, fn) => {
    if (listeners instanceof UniqueContainer) {
        fn(listeners);
    }
    else {
        for (let i = 0; i < listeners.length; i++) {
            const l = listeners[i];
            if (l) {
                fn(l);
            }
        }
    }
};
/**
 * The Emitter can be used to expose an Event to the public
 * to fire it from the insides.
 * Sample:
    class Document {

        private readonly _onDidChange = new Emitter<(value:string)=>any>();

        public onDidChange = this._onDidChange.event;

        // getter-style
        // get onDidChange(): Event<(value:string)=>any> {
        // 	return this._onDidChange.event;
        // }

        private _doIt() {
            //...
            this._onDidChange.fire(value);
        }
    }
 */
export class Emitter {
    constructor(options) {
        this._size = 0;
        this._options = options;
        this._leakageMon = (_globalLeakWarningThreshold > 0 || this._options?.leakWarningThreshold)
            ? new LeakageMonitor(options?.onListenerError ?? onUnexpectedError, this._options?.leakWarningThreshold ?? _globalLeakWarningThreshold) :
            undefined;
        this._perfMon = this._options?._profName ? new EventProfiling(this._options._profName) : undefined;
        this._deliveryQueue = this._options?.deliveryQueue;
    }
    dispose() {
        if (!this._disposed) {
            this._disposed = true;
            // It is bad to have listeners at the time of disposing an emitter, it is worst to have listeners keep the emitter
            // alive via the reference that's embedded in their disposables. Therefore we loop over all remaining listeners and
            // unset their subscriptions/disposables. Looping and blaming remaining listeners is done on next tick because the
            // the following programming pattern is very popular:
            //
            // const someModel = this._disposables.add(new ModelObject()); // (1) create and register model
            // this._disposables.add(someModel.onDidChange(() => { ... }); // (2) subscribe and register model-event listener
            // ...later...
            // this._disposables.dispose(); disposes (1) then (2): don't warn after (1) but after the "overall dispose" is done
            if (this._deliveryQueue?.current === this) {
                this._deliveryQueue.reset();
            }
            if (this._listeners) {
                if (_enableDisposeWithListenerWarning) {
                    const listeners = this._listeners;
                    queueMicrotask(() => {
                        forEachListener(listeners, l => l.stack?.print());
                    });
                }
                this._listeners = undefined;
                this._size = 0;
            }
            this._options?.onDidRemoveLastListener?.();
            this._leakageMon?.dispose();
        }
    }
    /**
     * For the public to allow to subscribe
     * to events from this Emitter
     */
    get event() {
        this._event ??= (callback, thisArgs, disposables) => {
            if (this._leakageMon && this._size > this._leakageMon.threshold ** 2) {
                const message = `[${this._leakageMon.name}] REFUSES to accept new listeners because it exceeded its threshold by far (${this._size} vs ${this._leakageMon.threshold})`;
                console.warn(message);
                const tuple = this._leakageMon.getMostFrequentStack() ?? ['UNKNOWN stack', -1];
                const error = new ListenerRefusalError(`${message}. HINT: Stack shows most frequent listener (${tuple[1]}-times)`, tuple[0]);
                const errorHandler = this._options?.onListenerError || onUnexpectedError;
                errorHandler(error);
                return Disposable.None;
            }
            if (this._disposed) {
                // todo: should we warn if a listener is added to a disposed emitter? This happens often
                return Disposable.None;
            }
            if (thisArgs) {
                callback = callback.bind(thisArgs);
            }
            const contained = new UniqueContainer(callback);
            let removeMonitor;
            let stack;
            if (this._leakageMon && this._size >= Math.ceil(this._leakageMon.threshold * 0.2)) {
                // check and record this emitter for potential leakage
                contained.stack = Stacktrace.create();
                removeMonitor = this._leakageMon.check(contained.stack, this._size + 1);
            }
            if (_enableDisposeWithListenerWarning) {
                contained.stack = stack ?? Stacktrace.create();
            }
            if (!this._listeners) {
                this._options?.onWillAddFirstListener?.(this);
                this._listeners = contained;
                this._options?.onDidAddFirstListener?.(this);
            }
            else if (this._listeners instanceof UniqueContainer) {
                this._deliveryQueue ??= new EventDeliveryQueuePrivate();
                this._listeners = [this._listeners, contained];
            }
            else {
                this._listeners.push(contained);
            }
            this._options?.onDidAddListener?.(this);
            this._size++;
            const result = toDisposable(() => {
                removeMonitor?.();
                this._removeListener(contained);
            });
            if (disposables instanceof DisposableStore) {
                disposables.add(result);
            }
            else if (Array.isArray(disposables)) {
                disposables.push(result);
            }
            return result;
        };
        return this._event;
    }
    _removeListener(listener) {
        this._options?.onWillRemoveListener?.(this);
        if (!this._listeners) {
            return; // expected if a listener gets disposed
        }
        if (this._size === 1) {
            this._listeners = undefined;
            this._options?.onDidRemoveLastListener?.(this);
            this._size = 0;
            return;
        }
        // size > 1 which requires that listeners be a list:
        const listeners = this._listeners;
        const index = listeners.indexOf(listener);
        if (index === -1) {
            console.log('disposed?', this._disposed);
            console.log('size?', this._size);
            console.log('arr?', JSON.stringify(this._listeners));
            throw new Error('Attempted to dispose unknown listener');
        }
        this._size--;
        listeners[index] = undefined;
        const adjustDeliveryQueue = this._deliveryQueue.current === this;
        if (this._size * compactionThreshold <= listeners.length) {
            let n = 0;
            for (let i = 0; i < listeners.length; i++) {
                if (listeners[i]) {
                    listeners[n++] = listeners[i];
                }
                else if (adjustDeliveryQueue && n < this._deliveryQueue.end) {
                    this._deliveryQueue.end--;
                    if (n < this._deliveryQueue.i) {
                        this._deliveryQueue.i--;
                    }
                }
            }
            listeners.length = n;
        }
    }
    _deliver(listener, value) {
        if (!listener) {
            return;
        }
        const errorHandler = this._options?.onListenerError || onUnexpectedError;
        if (!errorHandler) {
            listener.value(value);
            return;
        }
        try {
            listener.value(value);
        }
        catch (e) {
            errorHandler(e);
        }
    }
    /** Delivers items in the queue. Assumes the queue is ready to go. */
    _deliverQueue(dq) {
        const listeners = dq.current._listeners;
        while (dq.i < dq.end) {
            // important: dq.i is incremented before calling deliver() because it might reenter deliverQueue()
            this._deliver(listeners[dq.i++], dq.value);
        }
        dq.reset();
    }
    /**
     * To be kept private to fire an event to
     * subscribers
     */
    fire(event) {
        if (this._deliveryQueue?.current) {
            this._deliverQueue(this._deliveryQueue);
            this._perfMon?.stop(); // last fire() will have starting perfmon, stop it before starting the next dispatch
        }
        this._perfMon?.start(this._size);
        if (!this._listeners) {
            // no-op
        }
        else if (this._listeners instanceof UniqueContainer) {
            this._deliver(this._listeners, event);
        }
        else {
            const dq = this._deliveryQueue;
            dq.enqueue(this, event, this._listeners.length);
            this._deliverQueue(dq);
        }
        this._perfMon?.stop();
    }
    hasListeners() {
        return this._size > 0;
    }
}
export const createEventDeliveryQueue = () => new EventDeliveryQueuePrivate();
class EventDeliveryQueuePrivate {
    constructor() {
        /**
         * Index in current's listener list.
         */
        this.i = -1;
        /**
         * The last index in the listener's list to deliver.
         */
        this.end = 0;
    }
    enqueue(emitter, value, end) {
        this.i = 0;
        this.end = end;
        this.current = emitter;
        this.value = value;
    }
    reset() {
        this.i = this.end; // force any current emission loop to stop, mainly for during dispose
        this.current = undefined;
        this.value = undefined;
    }
}
export class AsyncEmitter extends Emitter {
    async fireAsync(data, token, promiseJoin) {
        if (!this._listeners) {
            return;
        }
        if (!this._asyncDeliveryQueue) {
            this._asyncDeliveryQueue = new LinkedList();
        }
        forEachListener(this._listeners, listener => this._asyncDeliveryQueue.push([listener.value, data]));
        while (this._asyncDeliveryQueue.size > 0 && !token.isCancellationRequested) {
            const [listener, data] = this._asyncDeliveryQueue.shift();
            const thenables = [];
            // eslint-disable-next-line local/code-no-dangerous-type-assertions
            const event = {
                ...data,
                token,
                waitUntil: (p) => {
                    if (Object.isFrozen(thenables)) {
                        throw new Error('waitUntil can NOT be called asynchronous');
                    }
                    if (promiseJoin) {
                        p = promiseJoin(p, listener);
                    }
                    thenables.push(p);
                }
            };
            try {
                listener(event);
            }
            catch (e) {
                onUnexpectedError(e);
                continue;
            }
            // freeze thenables-collection to enforce sync-calls to
            // wait until and then wait for all thenables to resolve
            Object.freeze(thenables);
            await Promise.allSettled(thenables).then(values => {
                for (const value of values) {
                    if (value.status === 'rejected') {
                        onUnexpectedError(value.reason);
                    }
                }
            });
        }
    }
}
export class PauseableEmitter extends Emitter {
    get isPaused() {
        return this._isPaused !== 0;
    }
    constructor(options) {
        super(options);
        this._isPaused = 0;
        this._eventQueue = new LinkedList();
        this._mergeFn = options?.merge;
    }
    pause() {
        this._isPaused++;
    }
    resume() {
        if (this._isPaused !== 0 && --this._isPaused === 0) {
            if (this._mergeFn) {
                // use the merge function to create a single composite
                // event. make a copy in case firing pauses this emitter
                if (this._eventQueue.size > 0) {
                    const events = Array.from(this._eventQueue);
                    this._eventQueue.clear();
                    super.fire(this._mergeFn(events));
                }
            }
            else {
                // no merging, fire each event individually and test
                // that this emitter isn't paused halfway through
                while (!this._isPaused && this._eventQueue.size !== 0) {
                    super.fire(this._eventQueue.shift());
                }
            }
        }
    }
    fire(event) {
        if (this._size) {
            if (this._isPaused !== 0) {
                this._eventQueue.push(event);
            }
            else {
                super.fire(event);
            }
        }
    }
}
export class DebounceEmitter extends PauseableEmitter {
    constructor(options) {
        super(options);
        this._delay = options.delay ?? 100;
    }
    fire(event) {
        if (!this._handle) {
            this.pause();
            this._handle = setTimeout(() => {
                this._handle = undefined;
                this.resume();
            }, this._delay);
        }
        super.fire(event);
    }
}
/**
 * An emitter which queue all events and then process them at the
 * end of the event loop.
 */
export class MicrotaskEmitter extends Emitter {
    constructor(options) {
        super(options);
        this._queuedEvents = [];
        this._mergeFn = options?.merge;
    }
    fire(event) {
        if (!this.hasListeners()) {
            return;
        }
        this._queuedEvents.push(event);
        if (this._queuedEvents.length === 1) {
            queueMicrotask(() => {
                if (this._mergeFn) {
                    super.fire(this._mergeFn(this._queuedEvents));
                }
                else {
                    this._queuedEvents.forEach(e => super.fire(e));
                }
                this._queuedEvents = [];
            });
        }
    }
}
/**
 * An event emitter that multiplexes many events into a single event.
 *
 * @example Listen to the `onData` event of all `Thing`s, dynamically adding and removing `Thing`s
 * to the multiplexer as needed.
 *
 * ```typescript
 * const anythingDataMultiplexer = new EventMultiplexer<{ data: string }>();
 *
 * const thingListeners = DisposableMap<Thing, IDisposable>();
 *
 * thingService.onDidAddThing(thing => {
 *   thingListeners.set(thing, anythingDataMultiplexer.add(thing.onData);
 * });
 * thingService.onDidRemoveThing(thing => {
 *   thingListeners.deleteAndDispose(thing);
 * });
 *
 * anythingDataMultiplexer.event(e => {
 *   console.log('Something fired data ' + e.data)
 * });
 * ```
 */
export class EventMultiplexer {
    constructor() {
        this.hasListeners = false;
        this.events = [];
        this.emitter = new Emitter({
            onWillAddFirstListener: () => this.onFirstListenerAdd(),
            onDidRemoveLastListener: () => this.onLastListenerRemove()
        });
    }
    get event() {
        return this.emitter.event;
    }
    add(event) {
        const e = { event: event, listener: null };
        this.events.push(e);
        if (this.hasListeners) {
            this.hook(e);
        }
        const dispose = () => {
            if (this.hasListeners) {
                this.unhook(e);
            }
            const idx = this.events.indexOf(e);
            this.events.splice(idx, 1);
        };
        return toDisposable(createSingleCallFunction(dispose));
    }
    onFirstListenerAdd() {
        this.hasListeners = true;
        this.events.forEach(e => this.hook(e));
    }
    onLastListenerRemove() {
        this.hasListeners = false;
        this.events.forEach(e => this.unhook(e));
    }
    hook(e) {
        e.listener = e.event(r => this.emitter.fire(r));
    }
    unhook(e) {
        e.listener?.dispose();
        e.listener = null;
    }
    dispose() {
        this.emitter.dispose();
        for (const e of this.events) {
            e.listener?.dispose();
        }
        this.events = [];
    }
}
export class DynamicListEventMultiplexer {
    constructor(items, onAddItem, onRemoveItem, getEvent) {
        this._store = new DisposableStore();
        const multiplexer = this._store.add(new EventMultiplexer());
        const itemListeners = this._store.add(new DisposableMap());
        function addItem(instance) {
            itemListeners.set(instance, multiplexer.add(getEvent(instance)));
        }
        // Existing items
        for (const instance of items) {
            addItem(instance);
        }
        // Added items
        this._store.add(onAddItem(instance => {
            addItem(instance);
        }));
        // Removed items
        this._store.add(onRemoveItem(instance => {
            itemListeners.deleteAndDispose(instance);
        }));
        this.event = multiplexer.event;
    }
    dispose() {
        this._store.dispose();
    }
}
/**
 * The EventBufferer is useful in situations in which you want
 * to delay firing your events during some code.
 * You can wrap that code and be sure that the event will not
 * be fired during that wrap.
 *
 * ```
 * const emitter: Emitter;
 * const delayer = new EventDelayer();
 * const delayedEvent = delayer.wrapEvent(emitter.event);
 *
 * delayedEvent(console.log);
 *
 * delayer.bufferEvents(() => {
 *   emitter.fire(); // event will not be fired yet
 * });
 *
 * // event will only be fired at this point
 * ```
 */
export class EventBufferer {
    constructor() {
        this.data = [];
    }
    wrapEvent(event, reduce, initial) {
        return (listener, thisArgs, disposables) => {
            return event(i => {
                const data = this.data[this.data.length - 1];
                // Non-reduce scenario
                if (!reduce) {
                    // Buffering case
                    if (data) {
                        data.buffers.push(() => listener.call(thisArgs, i));
                    }
                    else {
                        // Not buffering case
                        listener.call(thisArgs, i);
                    }
                    return;
                }
                // Reduce scenario
                const reduceData = data;
                // Not buffering case
                if (!reduceData) {
                    // TODO: Is there a way to cache this reduce call for all listeners?
                    listener.call(thisArgs, reduce(initial, i));
                    return;
                }
                // Buffering case
                reduceData.items ??= [];
                reduceData.items.push(i);
                if (reduceData.buffers.length === 0) {
                    // Include a single buffered function that will reduce all events when we're done buffering events
                    data.buffers.push(() => {
                        // cache the reduced result so that the value can be shared across all listeners
                        reduceData.reducedResult ??= initial
                            ? reduceData.items.reduce(reduce, initial)
                            : reduceData.items.reduce(reduce);
                        listener.call(thisArgs, reduceData.reducedResult);
                    });
                }
            }, undefined, disposables);
        };
    }
    bufferEvents(fn) {
        const data = { buffers: new Array() };
        this.data.push(data);
        const r = fn();
        this.data.pop();
        data.buffers.forEach(flush => flush());
        return r;
    }
}
/**
 * A Relay is an event forwarder which functions as a replugabble event pipe.
 * Once created, you can connect an input event to it and it will simply forward
 * events from that input event through its own `event` property. The `input`
 * can be changed at any point in time.
 */
export class Relay {
    constructor() {
        this.listening = false;
        this.inputEvent = Event.None;
        this.inputEventListener = Disposable.None;
        this.emitter = new Emitter({
            onDidAddFirstListener: () => {
                this.listening = true;
                this.inputEventListener = this.inputEvent(this.emitter.fire, this.emitter);
            },
            onDidRemoveLastListener: () => {
                this.listening = false;
                this.inputEventListener.dispose();
            }
        });
        this.event = this.emitter.event;
    }
    set input(event) {
        this.inputEvent = event;
        if (this.listening) {
            this.inputEventListener.dispose();
            this.inputEventListener = event(this.emitter.fire, this.emitter);
        }
    }
    dispose() {
        this.inputEventListener.dispose();
        this.emitter.dispose();
    }
}
export class ValueWithChangeEvent {
    static const(value) {
        return new ConstValueWithChangeEvent(value);
    }
    constructor(_value) {
        this._value = _value;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    get value() {
        return this._value;
    }
    set value(value) {
        if (value !== this._value) {
            this._value = value;
            this._onDidChange.fire(undefined);
        }
    }
}
class ConstValueWithChangeEvent {
    constructor(value) {
        this.value = value;
        this.onDidChange = Event.None;
    }
}
/**
 * @param handleItem Is called for each item in the set (but only the first time the item is seen in the set).
 * 	The returned disposable is disposed if the item is no longer in the set.
 */
export function trackSetChanges(getData, onDidChangeData, handleItem) {
    const map = new DisposableMap();
    let oldData = new Set(getData());
    for (const d of oldData) {
        map.set(d, handleItem(d));
    }
    const store = new DisposableStore();
    store.add(onDidChangeData(() => {
        const newData = getData();
        const diff = diffSets(oldData, newData);
        for (const r of diff.removed) {
            map.deleteAndDispose(r);
        }
        for (const a of diff.added) {
            map.set(a, handleItem(a));
        }
        oldData = new Set(newData);
    }));
    store.add(map);
    return store;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2V2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUM1QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDaEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQzNILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUU3QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFJM0MsMEhBQTBIO0FBQzFILDBIQUEwSDtBQUMxSCwwSEFBMEg7QUFDMUgsTUFBTSxpQ0FBaUMsR0FBRyxLQUFLLENBRTdDO0FBR0YsMEhBQTBIO0FBQzFILDZHQUE2RztBQUM3Ryx3REFBd0Q7QUFDeEQsMEhBQTBIO0FBQzFILE1BQU0sbUNBQW1DLEdBQUcsS0FBSyxDQUUvQztBQVNGLE1BQU0sS0FBVyxLQUFLLENBK3RCckI7QUEvdEJELFdBQWlCLEtBQUs7SUFDUixVQUFJLEdBQWUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztJQUV0RCxTQUFTLHFCQUFxQixDQUFDLE9BQXVCO1FBQ3JELElBQUksbUNBQW1DLEVBQUUsQ0FBQztZQUN6QyxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxPQUFPLENBQUM7WUFDekQsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lB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