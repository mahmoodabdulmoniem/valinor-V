/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { setUnexpectedErrorHandler } from '../../common/errors.js';
import { Emitter, Event } from '../../common/event.js';
import { DisposableStore, toDisposable } from '../../common/lifecycle.js';
import { autorun, autorunHandleChanges, autorunWithStoreHandleChanges, derived, derivedDisposable, keepObserved, observableFromEvent, observableSignal, observableValue, recordChanges, transaction, waitForState, derivedHandleChanges, runOnChange } from '../../common/observable.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
// eslint-disable-next-line local/code-no-deep-import-of-internal
import { observableReducer } from '../../common/observableInternal/experimental/reducer.js';
// eslint-disable-next-line local/code-no-deep-import-of-internal
import { BaseObservable } from '../../common/observableInternal/observables/baseObservable.js';
suite('observables', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Reads these tests to understand how to use observables.
     */
    suite('tutorial', () => {
        test('observable + autorun', () => {
            const log = new Log();
            // This creates a variable that stores a value and whose value changes can be observed.
            // The name is only used for debugging purposes.
            // The second arg is the initial value.
            const myObservable = observableValue('myObservable', 0);
            // This creates an autorun: It runs immediately and then again whenever any of the
            // dependencies change. Dependencies are tracked by reading observables with the `reader` parameter.
            //
            // The @description is only used for debugging purposes.
            // The autorun has to be disposed! This is very important.
            ds.add(autorun(reader => {
                /** @description myAutorun */
                // This code is run immediately.
                // Use the `reader` to read observable values and track the dependency to them.
                // If you use `observable.get()` instead of `observable.read(reader)`, you will just
                // get the value and not subscribe to it.
                log.log(`myAutorun.run(myObservable: ${myObservable.read(reader)})`);
                // Now that all dependencies are tracked, the autorun is re-run whenever any of the
                // dependencies change.
            }));
            // The autorun runs immediately
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 0)']);
            // We set the observable.
            myObservable.set(1, undefined);
            // -> The autorun runs again when any read observable changed
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 1)']);
            // We set the observable again.
            myObservable.set(1, undefined);
            // -> The autorun does not run again, because the observable didn't change.
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            // Transactions batch autorun runs
            transaction((tx) => {
                myObservable.set(2, tx);
                // No auto-run ran yet, even though the value changed!
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myObservable.set(3, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // Only at the end of the transaction the autorun re-runs
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 3)']);
            // Note that the autorun did not see the intermediate value `2`!
        });
        test('derived + autorun', () => {
            const log = new Log();
            const observable1 = observableValue('myObservable1', 0);
            const observable2 = observableValue('myObservable2', 0);
            // A derived value is an observable that is derived from other observables.
            const myDerived = derived(reader => {
                /** @description myDerived */
                const value1 = observable1.read(reader); // Use the reader to track dependencies.
                const value2 = observable2.read(reader);
                const sum = value1 + value2;
                log.log(`myDerived.recompute: ${value1} + ${value2} = ${sum}`);
                return sum;
            });
            // We create an autorun that reacts on changes to our derived value.
            ds.add(autorun(reader => {
                /** @description myAutorun */
                // Autoruns work with observable values and deriveds - in short, they work with any observable.
                log.log(`myAutorun(myDerived: ${myDerived.read(reader)})`);
            }));
            // autorun runs immediately
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: 0 + 0 = 0",
                "myAutorun(myDerived: 0)",
            ]);
            observable1.set(1, undefined);
            // and on changes...
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: 1 + 0 = 1",
                "myAutorun(myDerived: 1)",
            ]);
            observable2.set(1, undefined);
            // ... of any dependency.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: 1 + 1 = 2",
                "myAutorun(myDerived: 2)",
            ]);
            // Now we change multiple observables in a transaction to batch process the effects.
            transaction((tx) => {
                observable1.set(5, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                observable2.set(5, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // When changing multiple observables in a transaction,
            // deriveds are only recomputed on demand.
            // (Note that you cannot see the intermediate value when `obs1 == 5` and `obs2 == 1`)
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: 5 + 5 = 10",
                "myAutorun(myDerived: 10)",
            ]);
            transaction((tx) => {
                observable1.set(6, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                observable2.set(4, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // Now the autorun didn't run again, because its dependency changed from 10 to 10 (= no change).
            assert.deepStrictEqual(log.getAndClearEntries(), (["myDerived.recompute: 6 + 4 = 10"]));
        });
        test('read during transaction', () => {
            const log = new Log();
            const observable1 = observableValue('myObservable1', 0);
            const observable2 = observableValue('myObservable2', 0);
            const myDerived = derived((reader) => {
                /** @description myDerived */
                const value1 = observable1.read(reader);
                const value2 = observable2.read(reader);
                const sum = value1 + value2;
                log.log(`myDerived.recompute: ${value1} + ${value2} = ${sum}`);
                return sum;
            });
            ds.add(autorun(reader => {
                /** @description myAutorun */
                log.log(`myAutorun(myDerived: ${myDerived.read(reader)})`);
            }));
            // autorun runs immediately
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: 0 + 0 = 0",
                "myAutorun(myDerived: 0)",
            ]);
            transaction((tx) => {
                observable1.set(-10, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myDerived.get(); // This forces a (sync) recomputation of the current value!
                assert.deepStrictEqual(log.getAndClearEntries(), (["myDerived.recompute: -10 + 0 = -10"]));
                // This means, that even in transactions you can assume that all values you can read with `get` and `read` are up-to-date.
                // Read these values just might cause additional (potentially unneeded) recomputations.
                observable2.set(10, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // This autorun runs again, because its dependency changed from 0 to -10 and then back to 0.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.recompute: -10 + 10 = 0",
                "myAutorun(myDerived: 0)",
            ]);
        });
        test('get without observers', () => {
            const log = new Log();
            const observable1 = observableValue('myObservableValue1', 0);
            // We set up some computeds.
            const computed1 = derived((reader) => {
                /** @description computed */
                const value1 = observable1.read(reader);
                const result = value1 % 3;
                log.log(`recompute1: ${value1} % 3 = ${result}`);
                return result;
            });
            const computed2 = derived((reader) => {
                /** @description computed */
                const value1 = computed1.read(reader);
                const result = value1 * 2;
                log.log(`recompute2: ${value1} * 2 = ${result}`);
                return result;
            });
            const computed3 = derived((reader) => {
                /** @description computed */
                const value1 = computed1.read(reader);
                const result = value1 * 3;
                log.log(`recompute3: ${value1} * 3 = ${result}`);
                return result;
            });
            const computedSum = derived((reader) => {
                /** @description computed */
                const value1 = computed2.read(reader);
                const value2 = computed3.read(reader);
                const result = value1 + value2;
                log.log(`recompute4: ${value1} + ${value2} = ${result}`);
                return result;
            });
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            observable1.set(1, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            // And now read the computed that dependens on all the others.
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 1 % 3 = 1',
                'recompute2: 1 * 2 = 2',
                'recompute3: 1 * 3 = 3',
                'recompute4: 2 + 3 = 5',
                'value: 5',
            ]);
            log.log(`value: ${computedSum.get()}`);
            // Because there are no observers, the derived values are not cached (!), but computed from scratch.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 1 % 3 = 1',
                'recompute2: 1 * 2 = 2',
                'recompute3: 1 * 3 = 3',
                'recompute4: 2 + 3 = 5',
                'value: 5',
            ]);
            const disposable = keepObserved(computedSum); // Use keepObserved to keep the cache.
            // You can also use `computedSum.keepObserved(store)` for an inline experience.
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 1 % 3 = 1',
                'recompute2: 1 * 2 = 2',
                'recompute3: 1 * 3 = 3',
                'recompute4: 2 + 3 = 5',
                'value: 5',
            ]);
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'value: 5',
            ]);
            // Tada, no recomputations!
            observable1.set(2, undefined);
            // The keepObserved does not force deriveds to be recomputed! They are still lazy.
            assert.deepStrictEqual(log.getAndClearEntries(), ([]));
            log.log(`value: ${computedSum.get()}`);
            // Those deriveds are recomputed on demand, i.e. when someone reads them.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "recompute1: 2 % 3 = 2",
                "recompute2: 2 * 2 = 4",
                "recompute3: 2 * 3 = 6",
                "recompute4: 4 + 6 = 10",
                "value: 10",
            ]);
            log.log(`value: ${computedSum.get()}`);
            // ... and then cached again
            assert.deepStrictEqual(log.getAndClearEntries(), (["value: 10"]));
            disposable.dispose(); // Don't forget to dispose the keepAlive to prevent memory leaks!
            log.log(`value: ${computedSum.get()}`);
            // Which disables the cache again
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "recompute1: 2 % 3 = 2",
                "recompute2: 2 * 2 = 4",
                "recompute3: 2 * 3 = 6",
                "recompute4: 4 + 6 = 10",
                "value: 10",
            ]);
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "recompute1: 2 % 3 = 2",
                "recompute2: 2 * 2 = 4",
                "recompute3: 2 * 3 = 6",
                "recompute4: 4 + 6 = 10",
                "value: 10",
            ]);
            // Why don't we just always keep the cache alive?
            // This is because in order to keep the cache alive, we have to keep our subscriptions to our dependencies alive,
            // which could cause memory-leaks.
            // So instead, when the last observer of a derived is disposed, we dispose our subscriptions to our dependencies.
            // `keepObserved` just prevents this from happening.
        });
        test('autorun that receives deltas of signals', () => {
            const log = new Log();
            // A signal is an observable without a value.
            // However, it can ship change information when it is triggered.
            // Readers can process/aggregate this change information.
            const signal = observableSignal('signal');
            const disposable = autorunHandleChanges({
                changeTracker: {
                    // The change summary is used to collect the changes
                    createChangeSummary: () => ({ msgs: [] }),
                    handleChange(context, changeSummary) {
                        if (context.didChange(signal)) {
                            // We just push the changes into an array
                            changeSummary.msgs.push(context.change.msg);
                        }
                        return true; // We want to handle the change
                    },
                }
            }, (reader, changeSummary) => {
                // When handling the change, make sure to read the signal!
                signal.read(reader);
                log.log('msgs: ' + changeSummary.msgs.join(', '));
            });
            signal.trigger(undefined, { msg: 'foobar' });
            transaction(tx => {
                // You can batch triggering signals.
                // No delta information is lost!
                signal.trigger(tx, { msg: 'hello' });
                signal.trigger(tx, { msg: 'world' });
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'msgs: ',
                'msgs: foobar',
                'msgs: hello, world'
            ]);
            disposable.dispose();
        });
        // That is the end of the tutorial.
        // There are lots of utilities you can explore now, like `observableFromEvent`, `Event.fromObservableLight`,
        // autorunWithStore, observableWithStore and so on.
    });
    test('topological order', () => {
        const log = new Log();
        const myObservable1 = observableValue('myObservable1', 0);
        const myObservable2 = observableValue('myObservable2', 0);
        const myComputed1 = derived(reader => {
            /** @description myComputed1 */
            const value1 = myObservable1.read(reader);
            const value2 = myObservable2.read(reader);
            const sum = value1 + value2;
            log.log(`myComputed1.recompute(myObservable1: ${value1} + myObservable2: ${value2} = ${sum})`);
            return sum;
        });
        const myComputed2 = derived(reader => {
            /** @description myComputed2 */
            const value1 = myComputed1.read(reader);
            const value2 = myObservable1.read(reader);
            const value3 = myObservable2.read(reader);
            const sum = value1 + value2 + value3;
            log.log(`myComputed2.recompute(myComputed1: ${value1} + myObservable1: ${value2} + myObservable2: ${value3} = ${sum})`);
            return sum;
        });
        const myComputed3 = derived(reader => {
            /** @description myComputed3 */
            const value1 = myComputed2.read(reader);
            const value2 = myObservable1.read(reader);
            const value3 = myObservable2.read(reader);
            const sum = value1 + value2 + value3;
            log.log(`myComputed3.recompute(myComputed2: ${value1} + myObservable1: ${value2} + myObservable2: ${value3} = ${sum})`);
            return sum;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            log.log(`myAutorun.run(myComputed3: ${myComputed3.read(reader)})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myComputed1.recompute(myObservable1: 0 + myObservable2: 0 = 0)",
            "myComputed2.recompute(myComputed1: 0 + myObservable1: 0 + myObservable2: 0 = 0)",
            "myComputed3.recompute(myComputed2: 0 + myObservable1: 0 + myObservable2: 0 = 0)",
            "myAutorun.run(myComputed3: 0)",
        ]);
        myObservable1.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myComputed1.recompute(myObservable1: 1 + myObservable2: 0 = 1)",
            "myComputed2.recompute(myComputed1: 1 + myObservable1: 1 + myObservable2: 0 = 2)",
            "myComputed3.recompute(myComputed2: 2 + myObservable1: 1 + myObservable2: 0 = 3)",
            "myAutorun.run(myComputed3: 3)",
        ]);
        transaction((tx) => {
            myObservable1.set(2, tx);
            myComputed2.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myComputed1.recompute(myObservable1: 2 + myObservable2: 0 = 2)",
                "myComputed2.recompute(myComputed1: 2 + myObservable1: 2 + myObservable2: 0 = 4)",
            ]);
            myObservable1.set(3, tx);
            myComputed2.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myComputed1.recompute(myObservable1: 3 + myObservable2: 0 = 3)",
                "myComputed2.recompute(myComputed1: 3 + myObservable1: 3 + myObservable2: 0 = 6)",
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myComputed3.recompute(myComputed2: 6 + myObservable1: 3 + myObservable2: 0 = 9)",
            "myAutorun.run(myComputed3: 9)",
        ]);
    });
    suite('from event', () => {
        function init() {
            const log = new Log();
            let value = 0;
            const eventEmitter = new Emitter();
            let id = 0;
            const observable = observableFromEvent((handler) => {
                const curId = id++;
                log.log(`subscribed handler ${curId}`);
                const disposable = eventEmitter.event(handler);
                return {
                    dispose: () => {
                        log.log(`unsubscribed handler ${curId}`);
                        disposable.dispose();
                    },
                };
            }, () => {
                log.log(`compute value ${value}`);
                return value;
            });
            return {
                log,
                setValue: (newValue) => {
                    value = newValue;
                    eventEmitter.fire();
                },
                observable,
            };
        }
        test('Handle undefined', () => {
            const { log, setValue, observable } = init();
            setValue(undefined);
            const autorunDisposable = autorun(reader => {
                /** @description MyAutorun */
                observable.read(reader);
                log.log(`autorun, value: ${observable.read(reader)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "subscribed handler 0",
                "compute value undefined",
                "autorun, value: undefined",
            ]);
            setValue(1);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "compute value 1",
                "autorun, value: 1"
            ]);
            autorunDisposable.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "unsubscribed handler 0"
            ]);
        });
        test('basic', () => {
            const { log, setValue, observable } = init();
            const shouldReadObservable = observableValue('shouldReadObservable', true);
            const autorunDisposable = autorun(reader => {
                /** @description MyAutorun */
                if (shouldReadObservable.read(reader)) {
                    observable.read(reader);
                    log.log(`autorun, should read: true, value: ${observable.read(reader)}`);
                }
                else {
                    log.log(`autorun, should read: false`);
                }
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'subscribed handler 0',
                'compute value 0',
                'autorun, should read: true, value: 0',
            ]);
            // Cached get
            log.log(`get value: ${observable.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), ['get value: 0']);
            setValue(1);
            // Trigger autorun, no unsub/sub
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'compute value 1',
                'autorun, should read: true, value: 1',
            ]);
            // Unsubscribe when not read
            shouldReadObservable.set(false, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'autorun, should read: false',
                'unsubscribed handler 0',
            ]);
            shouldReadObservable.set(true, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'subscribed handler 1',
                'compute value 1',
                'autorun, should read: true, value: 1',
            ]);
            autorunDisposable.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'unsubscribed handler 1',
            ]);
        });
        test('get without observers', () => {
            const { log, observable } = init();
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            log.log(`get value: ${observable.get()}`);
            // Not cached or subscribed
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'compute value 0',
                'get value: 0',
            ]);
            log.log(`get value: ${observable.get()}`);
            // Still not cached or subscribed
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'compute value 0',
                'get value: 0',
            ]);
        });
    });
    test('reading derived in transaction unsubscribes unnecessary observables', () => {
        const log = new Log();
        const shouldReadObservable = observableValue('shouldReadMyObs1', true);
        const myObs1 = new LoggingObservableValue('myObs1', 0, log);
        const myComputed = derived(reader => {
            /** @description myComputed */
            log.log('myComputed.recompute');
            if (shouldReadObservable.read(reader)) {
                return myObs1.read(reader);
            }
            return 1;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const value = myComputed.read(reader);
            log.log(`myAutorun: ${value}`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myComputed.recompute",
            "myObs1.firstObserverAdded",
            "myObs1.get",
            "myAutorun: 0",
        ]);
        transaction(tx => {
            myObs1.set(1, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), (["myObs1.set (value 1)"]));
            shouldReadObservable.set(false, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), ([]));
            myComputed.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myComputed.recompute",
                "myObs1.lastObserverRemoved",
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), (["myAutorun: 1"]));
    });
    test('avoid recomputation of deriveds that are no longer read', () => {
        const log = new Log();
        const myObsShouldRead = new LoggingObservableValue('myObsShouldRead', true, log);
        const myObs1 = new LoggingObservableValue('myObs1', 0, log);
        const myComputed1 = derived(reader => {
            /** @description myComputed1 */
            const myObs1Val = myObs1.read(reader);
            const result = myObs1Val % 10;
            log.log(`myComputed1(myObs1: ${myObs1Val}): Computed ${result}`);
            return myObs1Val;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const shouldRead = myObsShouldRead.read(reader);
            if (shouldRead) {
                const v = myComputed1.read(reader);
                log.log(`myAutorun(shouldRead: true, myComputed1: ${v}): run`);
            }
            else {
                log.log(`myAutorun(shouldRead: false): run`);
            }
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObsShouldRead.firstObserverAdded",
            "myObsShouldRead.get",
            "myObs1.firstObserverAdded",
            "myObs1.get",
            "myComputed1(myObs1: 0): Computed 0",
            "myAutorun(shouldRead: true, myComputed1: 0): run",
        ]);
        transaction(tx => {
            myObsShouldRead.set(false, tx);
            myObs1.set(1, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObsShouldRead.set (value false)",
                "myObs1.set (value 1)",
            ]);
        });
        // myComputed1 should not be recomputed here, even though its dependency myObs1 changed!
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObsShouldRead.get",
            "myAutorun(shouldRead: false): run",
            "myObs1.lastObserverRemoved",
        ]);
        transaction(tx => {
            myObsShouldRead.set(true, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObsShouldRead.set (value true)",
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObsShouldRead.get",
            "myObs1.firstObserverAdded",
            "myObs1.get",
            "myComputed1(myObs1: 1): Computed 1",
            "myAutorun(shouldRead: true, myComputed1: 1): run",
        ]);
    });
    suite('autorun rerun on neutral change', () => {
        test('autorun reruns on neutral observable double change', () => {
            const log = new Log();
            const myObservable = observableValue('myObservable', 0);
            ds.add(autorun(reader => {
                /** @description myAutorun */
                log.log(`myAutorun.run(myObservable: ${myObservable.read(reader)})`);
            }));
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 0)']);
            transaction((tx) => {
                myObservable.set(2, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myObservable.set(0, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 0)']);
        });
        test('autorun does not rerun on indirect neutral observable double change', () => {
            const log = new Log();
            const myObservable = observableValue('myObservable', 0);
            const myDerived = derived(reader => {
                /** @description myDerived */
                const val = myObservable.read(reader);
                log.log(`myDerived.read(myObservable: ${val})`);
                return val;
            });
            ds.add(autorun(reader => {
                /** @description myAutorun */
                log.log(`myAutorun.run(myDerived: ${myDerived.read(reader)})`);
            }));
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.read(myObservable: 0)",
                "myAutorun.run(myDerived: 0)"
            ]);
            transaction((tx) => {
                myObservable.set(2, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myObservable.set(0, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.read(myObservable: 0)"
            ]);
        });
        test('autorun reruns on indirect neutral observable double change when changes propagate', () => {
            const log = new Log();
            const myObservable = observableValue('myObservable', 0);
            const myDerived = derived(reader => {
                /** @description myDerived */
                const val = myObservable.read(reader);
                log.log(`myDerived.read(myObservable: ${val})`);
                return val;
            });
            ds.add(autorun(reader => {
                /** @description myAutorun */
                log.log(`myAutorun.run(myDerived: ${myDerived.read(reader)})`);
            }));
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.read(myObservable: 0)",
                "myAutorun.run(myDerived: 0)"
            ]);
            transaction((tx) => {
                myObservable.set(2, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myDerived.get(); // This marks the auto-run as changed
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    "myDerived.read(myObservable: 2)"
                ]);
                myObservable.set(0, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myDerived.read(myObservable: 0)",
                "myAutorun.run(myDerived: 0)"
            ]);
        });
    });
    test('self-disposing autorun', () => {
        const log = new Log();
        const observable1 = new LoggingObservableValue('myObservable1', 0, log);
        const myObservable2 = new LoggingObservableValue('myObservable2', 0, log);
        const myObservable3 = new LoggingObservableValue('myObservable3', 0, log);
        const d = autorun(reader => {
            /** @description autorun */
            if (observable1.read(reader) >= 2) {
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    "myObservable1.set (value 2)",
                    "myObservable1.get",
                ]);
                myObservable2.read(reader);
                // First time this observable is read
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    "myObservable2.firstObserverAdded",
                    "myObservable2.get",
                ]);
                d.dispose();
                // Disposing removes all observers
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    "myObservable1.lastObserverRemoved",
                    "myObservable2.lastObserverRemoved",
                ]);
                myObservable3.read(reader);
                // This does not subscribe the observable, because the autorun is disposed
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    "myObservable3.get",
                ]);
            }
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable1.firstObserverAdded',
            'myObservable1.get',
        ]);
        observable1.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable1.set (value 1)',
            'myObservable1.get',
        ]);
        observable1.set(2, undefined);
        // See asserts in the autorun
        assert.deepStrictEqual(log.getAndClearEntries(), ([]));
    });
    test('changing observables in endUpdate', () => {
        const log = new Log();
        const myObservable1 = new LoggingObservableValue('myObservable1', 0, log);
        const myObservable2 = new LoggingObservableValue('myObservable2', 0, log);
        const myDerived1 = derived(reader => {
            /** @description myDerived1 */
            const val = myObservable1.read(reader);
            log.log(`myDerived1.read(myObservable: ${val})`);
            return val;
        });
        const myDerived2 = derived(reader => {
            /** @description myDerived2 */
            const val = myObservable2.read(reader);
            if (val === 1) {
                myDerived1.read(reader);
            }
            log.log(`myDerived2.read(myObservable: ${val})`);
            return val;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const myDerived1Val = myDerived1.read(reader);
            const myDerived2Val = myDerived2.read(reader);
            log.log(`myAutorun.run(myDerived1: ${myDerived1Val}, myDerived2: ${myDerived2Val})`);
        }));
        transaction(tx => {
            myObservable2.set(1, tx);
            // end update of this observable will trigger endUpdate of myDerived1 and
            // the autorun and the autorun will add myDerived2 as observer to myDerived1
            myObservable1.set(1, tx);
        });
    });
    test('set dependency in derived', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const myComputed = derived(reader => {
            /** @description myComputed */
            let value = myObservable.read(reader);
            const origValue = value;
            log.log(`myComputed(myObservable: ${origValue}): start computing`);
            if (value % 3 !== 0) {
                value++;
                myObservable.set(value, undefined);
            }
            log.log(`myComputed(myObservable: ${origValue}): finished computing`);
            return value;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const value = myComputed.read(reader);
            log.log(`myAutorun(myComputed: ${value})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.firstObserverAdded",
            "myObservable.get",
            "myComputed(myObservable: 0): start computing",
            "myComputed(myObservable: 0): finished computing",
            "myAutorun(myComputed: 0)"
        ]);
        myObservable.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.set (value 1)",
            "myObservable.get",
            "myComputed(myObservable: 1): start computing",
            "myObservable.set (value 2)",
            "myComputed(myObservable: 1): finished computing",
            "myObservable.get",
            "myComputed(myObservable: 2): start computing",
            "myObservable.set (value 3)",
            "myComputed(myObservable: 2): finished computing",
            "myObservable.get",
            "myComputed(myObservable: 3): start computing",
            "myComputed(myObservable: 3): finished computing",
            "myAutorun(myComputed: 3)",
        ]);
    });
    test('set dependency in autorun', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const value = myObservable.read(reader);
            log.log(`myAutorun(myObservable: ${value}): start`);
            if (value !== 0 && value < 4) {
                myObservable.set(value + 1, undefined);
            }
            log.log(`myAutorun(myObservable: ${value}): end`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.firstObserverAdded",
            "myObservable.get",
            "myAutorun(myObservable: 0): start",
            "myAutorun(myObservable: 0): end",
        ]);
        myObservable.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.set (value 1)",
            "myObservable.get",
            "myAutorun(myObservable: 1): start",
            "myObservable.set (value 2)",
            "myAutorun(myObservable: 1): end",
            "myObservable.get",
            "myAutorun(myObservable: 2): start",
            "myObservable.set (value 3)",
            "myAutorun(myObservable: 2): end",
            "myObservable.get",
            "myAutorun(myObservable: 3): start",
            "myObservable.set (value 4)",
            "myAutorun(myObservable: 3): end",
            "myObservable.get",
            "myAutorun(myObservable: 4): start",
            "myAutorun(myObservable: 4): end",
        ]);
    });
    test('get in transaction between sets', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const myDerived1 = derived(reader => {
            /** @description myDerived1 */
            const value = myObservable.read(reader);
            log.log(`myDerived1(myObservable: ${value}): start computing`);
            return value;
        });
        const myDerived2 = derived(reader => {
            /** @description myDerived2 */
            const value = myDerived1.read(reader);
            log.log(`myDerived2(myDerived1: ${value}): start computing`);
            return value;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const value = myDerived2.read(reader);
            log.log(`myAutorun(myDerived2: ${value})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.firstObserverAdded",
            "myObservable.get",
            "myDerived1(myObservable: 0): start computing",
            "myDerived2(myDerived1: 0): start computing",
            "myAutorun(myDerived2: 0)",
        ]);
        transaction(tx => {
            myObservable.set(1, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.set (value 1)",
            ]);
            myDerived2.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.get",
                "myDerived1(myObservable: 1): start computing",
                "myDerived2(myDerived1: 1): start computing",
            ]);
            myObservable.set(2, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.set (value 2)",
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable.get",
            "myDerived1(myObservable: 2): start computing",
            "myDerived2(myDerived1: 2): start computing",
            "myAutorun(myDerived2: 2)",
        ]);
    });
    test('bug: Dont reset states', () => {
        const log = new Log();
        const myObservable1 = new LoggingObservableValue('myObservable1', 0, log);
        const myObservable2 = new LoggingObservableValue('myObservable2', 0, log);
        const myDerived2 = derived(reader => {
            /** @description myDerived2 */
            const val = myObservable2.read(reader);
            log.log(`myDerived2.computed(myObservable2: ${val})`);
            return val % 10;
        });
        const myDerived3 = derived(reader => {
            /** @description myDerived3 */
            const val1 = myObservable1.read(reader);
            const val2 = myDerived2.read(reader);
            log.log(`myDerived3.computed(myDerived1: ${val1}, myDerived2: ${val2})`);
            return `${val1} + ${val2}`;
        });
        ds.add(autorun(reader => {
            /** @description myAutorun */
            const val = myDerived3.read(reader);
            log.log(`myAutorun(myDerived3: ${val})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable1.firstObserverAdded",
            "myObservable1.get",
            "myObservable2.firstObserverAdded",
            "myObservable2.get",
            "myDerived2.computed(myObservable2: 0)",
            "myDerived3.computed(myDerived1: 0, myDerived2: 0)",
            "myAutorun(myDerived3: 0 + 0)",
        ]);
        transaction(tx => {
            myObservable1.set(1, tx); // Mark myDerived 3 as stale
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable1.set (value 1)",
            ]);
            myObservable2.set(10, tx); // This is a non-change. myDerived3 should not be marked as possibly-depedency-changed!
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable2.set (value 10)",
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myObservable1.get",
            "myObservable2.get",
            "myDerived2.computed(myObservable2: 10)",
            'myDerived3.computed(myDerived1: 1, myDerived2: 0)',
            'myAutorun(myDerived3: 1 + 0)',
        ]);
    });
    test('bug: Add observable in endUpdate', () => {
        const myObservable1 = observableValue('myObservable1', 0);
        const myObservable2 = observableValue('myObservable2', 0);
        const myDerived1 = derived(reader => {
            /** @description myDerived1 */
            return myObservable1.read(reader);
        });
        const myDerived2 = derived(reader => {
            /** @description myDerived2 */
            return myObservable2.read(reader);
        });
        const myDerivedA1 = derived(reader => /** @description myDerivedA1 */ {
            const d1 = myDerived1.read(reader);
            if (d1 === 1) {
                // This adds an observer while myDerived is still in update mode.
                // When myDerived exits update mode, the observer shouldn't receive
                // more endUpdate than beginUpdate calls.
                myDerived2.read(reader);
            }
        });
        ds.add(autorun(reader => {
            /** @description myAutorun1 */
            myDerivedA1.read(reader);
        }));
        ds.add(autorun(reader => {
            /** @description myAutorun2 */
            myDerived2.read(reader);
        }));
        transaction(tx => {
            myObservable1.set(1, tx);
            myObservable2.set(1, tx);
        });
    });
    test('bug: fromObservableLight doesnt subscribe', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const myDerived = derived(reader => /** @description myDerived */ {
            const val = myObservable.read(reader);
            log.log(`myDerived.computed(myObservable2: ${val})`);
            return val % 10;
        });
        const e = Event.fromObservableLight(myDerived);
        log.log('event created');
        e(() => {
            log.log('event fired');
        });
        myObservable.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'event created',
            'myObservable.firstObserverAdded',
            'myObservable.get',
            'myDerived.computed(myObservable2: 0)',
            'myObservable.set (value 1)',
            'myObservable.get',
            'myDerived.computed(myObservable2: 1)',
            'event fired',
        ]);
    });
    test('bug: Event.fromObservable always should get events', () => {
        const emitter = new Emitter();
        const log = new Log();
        let i = 0;
        const obs = observableFromEvent(emitter.event, () => i);
        i++;
        emitter.fire(1);
        const evt2 = Event.fromObservable(obs);
        const d = evt2(e => {
            log.log(`event fired ${e}`);
        });
        i++;
        emitter.fire(2);
        assert.deepStrictEqual(log.getAndClearEntries(), ["event fired 2"]);
        i++;
        emitter.fire(3);
        assert.deepStrictEqual(log.getAndClearEntries(), ["event fired 3"]);
        d.dispose();
    });
    test('dont run autorun after dispose', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const d = autorun(reader => {
            /** @description update */
            const v = myObservable.read(reader);
            log.log('autorun, myObservable:' + v);
        });
        transaction(tx => {
            myObservable.set(1, tx);
            d.dispose();
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable.firstObserverAdded',
            'myObservable.get',
            'autorun, myObservable:0',
            'myObservable.set (value 1)',
            'myObservable.lastObserverRemoved',
        ]);
    });
    suite('waitForState', () => {
        test('resolve', async () => {
            const log = new Log();
            const myObservable = new LoggingObservableValue('myObservable', { state: 'initializing' }, log);
            const p = waitForState(myObservable, p => p.state === 'ready', p => p.state === 'error').then(r => {
                log.log(`resolved ${JSON.stringify(r)}`);
            }, (err) => {
                log.log(`rejected ${JSON.stringify(err)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.firstObserverAdded',
                'myObservable.get',
            ]);
            myObservable.set({ state: 'ready' }, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.set (value [object Object])',
                'myObservable.get',
                'myObservable.lastObserverRemoved',
            ]);
            await p;
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'resolved {\"state\":\"ready\"}',
            ]);
        });
        test('resolveImmediate', async () => {
            const log = new Log();
            const myObservable = new LoggingObservableValue('myObservable', { state: 'ready' }, log);
            const p = waitForState(myObservable, p => p.state === 'ready', p => p.state === 'error').then(r => {
                log.log(`resolved ${JSON.stringify(r)}`);
            }, (err) => {
                log.log(`rejected ${JSON.stringify(err)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.firstObserverAdded',
                'myObservable.get',
                'myObservable.lastObserverRemoved',
            ]);
            myObservable.set({ state: 'error' }, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.set (value [object Object])',
            ]);
            await p;
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'resolved {\"state\":\"ready\"}',
            ]);
        });
        test('reject', async () => {
            const log = new Log();
            const myObservable = new LoggingObservableValue('myObservable', { state: 'initializing' }, log);
            const p = waitForState(myObservable, p => p.state === 'ready', p => p.state === 'error').then(r => {
                log.log(`resolved ${JSON.stringify(r)}`);
            }, (err) => {
                log.log(`rejected ${JSON.stringify(err)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.firstObserverAdded',
                'myObservable.get',
            ]);
            myObservable.set({ state: 'error' }, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.set (value [object Object])',
                'myObservable.get',
                'myObservable.lastObserverRemoved',
            ]);
            await p;
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'rejected {\"state\":\"error\"}'
            ]);
        });
        test('derived as lazy', () => {
            const store = new DisposableStore();
            const log = new Log();
            let i = 0;
            const d = derivedDisposable(() => {
                const id = i++;
                log.log('myDerived ' + id);
                return {
                    dispose: () => log.log(`disposed ${id}`)
                };
            });
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived 0', 'disposed 0']);
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived 1', 'disposed 1']);
            d.keepObserved(store);
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived 2']);
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            store.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), ['disposed 2']);
        });
    });
    test('observableValue', () => {
        const log = new Log();
        const myObservable1 = observableValue('myObservable1', 0);
        const myObservable2 = observableValue('myObservable2', 0);
        const d = autorun(reader => {
            /** @description update */
            const v1 = myObservable1.read(reader);
            const v2 = myObservable2.read(reader);
            log.log('autorun, myObservable1:' + v1 + ', myObservable2:' + v2);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'autorun, myObservable1:0, myObservable2:0'
        ]);
        // Doesn't trigger the autorun, because no delta was provided and the value did not change
        myObservable1.set(0, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), []);
        // Triggers the autorun. The value did not change, but a delta value was provided
        myObservable2.set(0, undefined, { message: 'change1' });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'autorun, myObservable1:0, myObservable2:0'
        ]);
        d.dispose();
    });
    suite('autorun error handling', () => {
        test('immediate throw', () => {
            const log = new Log();
            setUnexpectedErrorHandler(e => {
                log.log(`error: ${e.message}`);
            });
            const myObservable = new LoggingObservableValue('myObservable', 0, log);
            const d = autorun(reader => {
                myObservable.read(reader);
                throw new Error('foobar');
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.firstObserverAdded",
                "myObservable.get",
                "error: foobar"
            ]);
            myObservable.set(1, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.set (value 1)",
                "myObservable.get",
                "error: foobar",
            ]);
            d.dispose();
        });
        test('late throw', () => {
            const log = new Log();
            setUnexpectedErrorHandler(e => {
                log.log(`error: ${e.message}`);
            });
            const myObservable = new LoggingObservableValue('myObservable', 0, log);
            const d = autorun(reader => {
                const value = myObservable.read(reader);
                if (value >= 1) {
                    throw new Error('foobar');
                }
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.firstObserverAdded",
                "myObservable.get",
            ]);
            myObservable.set(1, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.set (value 1)",
                "myObservable.get",
                "error: foobar",
            ]);
            myObservable.set(2, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "myObservable.set (value 2)",
                "myObservable.get",
                "error: foobar",
            ]);
            d.dispose();
        });
    });
    test('recomputeInitiallyAndOnChange should work when a dependency sets an observable', () => {
        const store = new DisposableStore();
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        let shouldUpdate = true;
        const myDerived = derived(reader => {
            /** @description myDerived */
            log.log('myDerived.computed start');
            const val = myObservable.read(reader);
            if (shouldUpdate) {
                shouldUpdate = false;
                myObservable.set(1, undefined);
            }
            log.log('myDerived.computed end');
            return val;
        });
        assert.deepStrictEqual(log.getAndClearEntries(), ([]));
        myDerived.recomputeInitiallyAndOnChange(store, val => {
            log.log(`recomputeInitiallyAndOnChange, myDerived: ${val}`);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            "myDerived.computed start",
            "myObservable.firstObserverAdded",
            "myObservable.get",
            "myObservable.set (value 1)",
            "myDerived.computed end",
            "myDerived.computed start",
            "myObservable.get",
            "myDerived.computed end",
            "recomputeInitiallyAndOnChange, myDerived: 1",
        ]);
        myDerived.get();
        assert.deepStrictEqual(log.getAndClearEntries(), ([]));
        store.dispose();
    });
    suite('prevent invalid usage', () => {
        suite('reading outside of compute function', () => {
            test('derived', () => {
                let fn = () => { };
                const obs = observableValue('obs', 0);
                const d = derived(reader => {
                    fn = () => { obs.read(reader); };
                    return obs.read(reader);
                });
                const disp = autorun(reader => {
                    d.read(reader);
                });
                assert.throws(() => {
                    fn();
                });
                disp.dispose();
            });
            test('autorun', () => {
                let fn = () => { };
                const obs = observableValue('obs', 0);
                const disp = autorun(reader => {
                    fn = () => { obs.read(reader); };
                    obs.read(reader);
                });
                assert.throws(() => {
                    fn();
                });
                disp.dispose();
            });
        });
        test.skip('catches cyclic dependencies', () => {
            const log = new Log();
            setUnexpectedErrorHandler((e) => {
                log.log(e.toString());
            });
            const obs = observableValue('obs', 0);
            const d1 = derived(reader => {
                log.log('d1.computed start');
                const x = obs.read(reader) + d2.read(reader);
                log.log('d1.computed end');
                return x;
            });
            const d2 = derived(reader => {
                log.log('d2.computed start');
                d1.read(reader);
                log.log('d2.computed end');
                return 0;
            });
            const disp = autorun(reader => {
                log.log('autorun start');
                d1.read(reader);
                log.log('autorun end');
                return 0;
            });
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                "autorun start",
                "d1.computed start",
                "d2.computed start",
                "Error: Cyclic deriveds are not supported yet!",
                "d1.computed end",
                "autorun end"
            ]));
            disp.dispose();
        });
    });
    suite('observableReducer', () => {
        test('main', () => {
            const store = new DisposableStore();
            const log = new Log();
            const myObservable1 = observableValue('myObservable1', 5);
            const myObservable2 = observableValue('myObservable2', 9);
            const sum = observableReducer(this, {
                initial: () => {
                    log.log('createInitial');
                    return myObservable1.get() + myObservable2.get();
                },
                disposeFinal: (values) => {
                    log.log(`disposeFinal ${values}`);
                },
                changeTracker: recordChanges({ myObservable1, myObservable2 }),
                update: (reader, previousValue, changes) => {
                    log.log(`update ${JSON.stringify(changes)}`);
                    let delta = 0;
                    for (const change of changes.changes) {
                        delta += change.change;
                    }
                    reader.reportChange(delta);
                    const resultValue = previousValue + delta;
                    log.log(`update -> ${resultValue}`);
                    return resultValue;
                }
            });
            assert.deepStrictEqual(log.getAndClearEntries(), ([]));
            store.add(autorunWithStoreHandleChanges({
                changeTracker: recordChanges({ sum })
            }, (_reader, changes) => {
                log.log(`autorun ${JSON.stringify(changes)}`);
            }));
            assert.deepStrictEqual(log.getAndClearEntries(), [
                "createInitial",
                'update {"changes":[],"myObservable1":5,"myObservable2":9}',
                "update -> 14",
                'autorun {"changes":[],"sum":14}',
            ]);
            transaction(tx => {
                myObservable1.set(myObservable1.get() + 1, tx, 1);
                myObservable2.set(myObservable2.get() + 3, tx, 3);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                "update {\"changes\":[{\"key\":\"myObservable1\",\"change\":1},{\"key\":\"myObservable2\",\"change\":3}],\"myObservable1\":6,\"myObservable2\":12}",
                "update -> 18",
                "autorun {\"changes\":[{\"key\":\"sum\",\"change\":4}],\"sum\":18}"
            ]));
            transaction(tx => {
                myObservable1.set(myObservable1.get() + 1, tx, 1);
                const s = sum.get();
                log.log(`sum.get() ${s}`);
                myObservable2.set(myObservable2.get() + 3, tx, 3);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                "update {\"changes\":[{\"key\":\"myObservable1\",\"change\":1}],\"myObservable1\":7,\"myObservable2\":12}",
                "update -> 19",
                "sum.get() 19",
                "update {\"changes\":[{\"key\":\"myObservable2\",\"change\":3}],\"myObservable1\":7,\"myObservable2\":15}",
                "update -> 22",
                "autorun {\"changes\":[{\"key\":\"sum\",\"change\":1}],\"sum\":22}"
            ]));
            store.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                "disposeFinal 22"
            ]));
        });
    });
    suite('disposableStores', () => {
        test('derived with store', () => {
            const log = new Log();
            const observable1 = observableValue('myObservableValue1', 0);
            const computed1 = derived((reader) => {
                const value = observable1.read(reader);
                log.log(`computed ${value}`);
                reader.store.add(toDisposable(() => {
                    log.log(`computed1: ${value} disposed`);
                }));
                return value;
            });
            const a = autorun(reader => {
                log.log(`a: ${computed1.read(reader)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                "computed 0",
                "a: 0"
            ]));
            observable1.set(1, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                "computed1: 0 disposed",
                "computed 1",
                "a: 1"
            ]));
            a.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                "computed1: 1 disposed"
            ]));
        });
        test('derived with delayedStore', () => {
            const log = new Log();
            const observable1 = observableValue('myObservableValue1', 0);
            const computed1 = derived((reader) => {
                const value = observable1.read(reader);
                log.log(`computed ${value}`);
                reader.delayedStore.add(toDisposable(() => {
                    log.log(`computed1: ${value} disposed`);
                }));
                return value;
            });
            const a = autorun(reader => {
                log.log(`a: ${computed1.read(reader)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                "computed 0",
                "a: 0"
            ]));
            observable1.set(1, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                "computed 1",
                "computed1: 0 disposed",
                "a: 1"
            ]));
            a.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), ([
                "computed1: 1 disposed"
            ]));
        });
    });
    test('derivedHandleChanges with reportChanges', () => {
        const log = new Log();
        const signal1 = observableSignal('signal1');
        const signal2 = observableSignal('signal2');
        const signal2Derived = derivedHandleChanges({ changeTracker: recordChanges({ signal2 }) }, (reader, changeSummary) => {
            for (const c of changeSummary.changes) {
                reader.reportChange({ message: c.change.message + ' (derived)' });
            }
        });
        const d = derivedHandleChanges({
            changeTracker: recordChanges({ signal1, signal2Derived }),
        }, (r, changes) => {
            const log = changes.changes.map(c => `${c.key}: ${c.change.message}`).join(', ');
            r.reportChange(log);
        });
        const disp = runOnChange(d, (_val, _prev, changes) => {
            log.log(`runOnChange ${JSON.stringify(changes)}`);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), ([]));
        transaction(tx => {
            signal1.trigger(tx, { message: 'foo' });
            signal2.trigger(tx, { message: 'bar' });
        });
        assert.deepStrictEqual(log.getAndClearEntries(), ([
            "runOnChange [\"signal1: foo, signal2Derived: bar (derived)\"]"
        ]));
        transaction(tx => {
            signal2.trigger(tx, { message: 'baz' });
        });
        assert.deepStrictEqual(log.getAndClearEntries(), ([
            "runOnChange [\"signal2Derived: baz (derived)\"]"
        ]));
        disp.dispose();
    });
});
export class LoggingObserver {
    constructor(debugName, log) {
        this.debugName = debugName;
        this.log = log;
        this.count = 0;
    }
    beginUpdate(observable) {
        this.count++;
        this.log.log(`${this.debugName}.beginUpdate (count ${this.count})`);
    }
    endUpdate(observable) {
        this.log.log(`${this.debugName}.endUpdate (count ${this.count})`);
        this.count--;
    }
    handleChange(observable, change) {
        this.log.log(`${this.debugName}.handleChange (count ${this.count})`);
    }
    handlePossibleChange(observable) {
        this.log.log(`${this.debugName}.handlePossibleChange`);
    }
}
export class LoggingObservableValue extends BaseObservable {
    constructor(debugName, initialValue, logger) {
        super();
        this.debugName = debugName;
        this.logger = logger;
        this.value = initialValue;
    }
    onFirstObserverAdded() {
        this.logger.log(`${this.debugName}.firstObserverAdded`);
    }
    onLastObserverRemoved() {
        this.logger.log(`${this.debugName}.lastObserverRemoved`);
    }
    get() {
        this.logger.log(`${this.debugName}.get`);
        return this.value;
    }
    set(value, tx, change) {
        if (this.value === value) {
            return;
        }
        if (!tx) {
            transaction((tx) => {
                this.set(value, tx, change);
            }, () => `Setting ${this.debugName}`);
            return;
        }
        this.logger.log(`${this.debugName}.set (value ${value})`);
        this.value = value;
        for (const observer of this._observers) {
            tx.updateObserver(observer, this);
            observer.handleChange(this, change);
        }
    }
    toString() {
        return `${this.debugName}: ${this.value}`;
    }
}
class Log {
    constructor() {
        this.entries = [];
    }
    log(message) {
        this.entries.push(message);
    }
    getAndClearEntries() {
        const entries = [...this.entries];
        this.entries.length = 0;
        return entries;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL29ic2VydmFibGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzFFLE9BQU8sRUFBeUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLDZCQUE2QixFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBNkQsWUFBWSxFQUFFLG1CQUFtQixFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMzWCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDckUsaUVBQWlFO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzVGLGlFQUFpRTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFL0YsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFDekIsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUVyRDs7T0FFRztJQUNILEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3RCLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7WUFDakMs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