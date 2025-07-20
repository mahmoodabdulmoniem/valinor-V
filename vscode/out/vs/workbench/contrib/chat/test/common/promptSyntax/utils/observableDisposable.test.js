/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { spy } from 'sinon';
import { timeout } from '../../../../../../../base/common/async.js';
import { randomInt } from '../../../../../../../base/common/numbers.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { assertNotDisposed, ObservableDisposable } from '../../../../common/promptSyntax/utils/observableDisposable.js';
suite('ObservableDisposable', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('tracks `disposed` state', () => {
        // this is an abstract class, so we have to create
        // an anonymous class that extends it
        const object = new class extends ObservableDisposable {
        }();
        disposables.add(object);
        assert(object instanceof ObservableDisposable, 'Object must be instance of ObservableDisposable.');
        assert(object instanceof Disposable, 'Object must be instance of Disposable.');
        assert(object.isDisposed === false, 'Object must not be disposed yet.');
        object.dispose();
        assert(object.isDisposed, 'Object must be disposed.');
    });
    suite('onDispose()', () => {
        test('fires the event on dispose', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert(object.isDisposed === false, 'Object must not be disposed yet.');
            const onDisposeSpy = spy();
            disposables.add(object.onDispose(onDisposeSpy));
            assert(onDisposeSpy.notCalled, '`onDispose` callback must not be called yet.');
            await timeout(10);
            assert(onDisposeSpy.notCalled, '`onDispose` callback must not be called yet.');
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await timeout(1);
            /**
             * Validate that the callback was called.
             */
            assert(object.isDisposed, 'Object must be disposed.');
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must be called.');
            /**
             * Validate that the callback is not called again.
             */
            object.dispose();
            object.dispose();
            await timeout(10);
            object.dispose();
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must not be called again.');
            assert(object.isDisposed, 'Object must be disposed.');
        });
        test('executes callback immediately if already disposed', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await timeout(10);
            const onDisposeSpy = spy();
            disposables.add(object.onDispose(onDisposeSpy));
            await timeout(10);
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must be called immediately.');
            await timeout(10);
            disposables.add(object.onDispose(onDisposeSpy));
            await timeout(10);
            assert(onDisposeSpy.calledTwice, '`onDispose` callback must be called immediately the second time.');
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await timeout(10);
            assert(onDisposeSpy.calledTwice, '`onDispose` callback must not be called again on dispose.');
        });
    });
    suite('addDisposable()', () => {
        test('disposes provided object with itself', async () => {
            class TestDisposable {
                constructor() {
                    this._disposed = false;
                }
                get disposed() {
                    return this._disposed;
                }
                dispose() {
                    this._disposed = true;
                }
            }
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert(object.isDisposed === false, 'Object must not be disposed yet.');
            const disposableObjects = [];
            for (let i = 0; i < randomInt(20, 10); i++) {
                disposableObjects.push(new TestDisposable());
            }
            // a sanity check for the initial state of the objects
            for (const disposable of disposableObjects) {
                assert(disposable.disposed === false, 'Disposable object must not be disposed yet.');
            }
            object.addDisposables(...disposableObjects);
            // a sanity check after the 'addDisposable' call
            for (const disposable of disposableObjects) {
                assert(disposable.disposed === false, 'Disposable object must not be disposed yet.');
            }
            object.dispose();
            // finally validate that all objects are disposed
            const allDisposed = disposableObjects.reduce((acc, disposable) => {
                return acc && disposable.disposed;
            }, true);
            assert(allDisposed === true, 'Disposable object must be disposed now.');
        });
        test('disposes the entire tree of disposables', async () => {
            class TestDisposable extends ObservableDisposable {
            }
            /**
             * Generate a tree of disposable objects.
             */
            const disposableObjects = (count = randomInt(20, 10), parent = null) => {
                assert(count > 0, 'Count must be greater than 0.');
                const allDisposables = [];
                for (let i = 0; i < count; i++) {
                    const disposableObject = new TestDisposable();
                    allDisposables.push(disposableObject);
                    if (parent !== null) {
                        parent.addDisposables(disposableObject);
                    }
                    // generate child disposable objects recursively
                    // to create a tree structure
                    const countMax = count / 2;
                    const countMin = count / 5;
                    if (countMin < 1) {
                        return allDisposables;
                    }
                    const childDisposables = disposableObjects(randomInt(countMax, countMin), disposableObject);
                    allDisposables.push(...childDisposables);
                }
                return allDisposables;
            };
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert(object.isDisposed === false, 'Object must not be disposed yet.');
            const disposablesCount = randomInt(20, 10);
            const allDisposableObjects = disposableObjects(disposablesCount, object);
            assert(allDisposableObjects.length > disposablesCount, 'Must have some of the nested disposable objects for this test to be valid.');
            // a sanity check for the initial state of the objects
            for (const disposable of allDisposableObjects) {
                assert(disposable.isDisposed === false, 'Disposable object must not be disposed yet.');
            }
            object.dispose();
            // finally validate that all objects are disposed
            const allDisposed = allDisposableObjects.reduce((acc, disposable) => {
                return acc && disposable.isDisposed;
            }, true);
            assert(allDisposed === true, 'Disposable object must be disposed now.');
        });
    });
    suite('asserts', () => {
        test('not disposed (method)', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert.doesNotThrow(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            await timeout(10);
            assert.doesNotThrow(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await timeout(1);
            assert.throws(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            await timeout(10);
            assert.throws(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
        });
        test('not disposed (function)', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert.doesNotThrow(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            await timeout(10);
            assert.doesNotThrow(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await timeout(1);
            assert.throws(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            await timeout(10);
            assert.throws(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZURpc3Bvc2FibGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvdXRpbHMvb2JzZXJ2YWJsZURpc3Bvc2FibGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV4SCxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFOUQsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUNwQyxrREFBa0Q7UUFDbEQscUNBQXFDO1FBQ3JDLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBTSxTQUFRLG9CQUFvQjtTQUFJLEVBQUUsQ0FBQztRQUM1RCxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXhCLE1BQU0sQ0FDTCxNQUFNLFlBQVksb0JBQW9CLEVBQ3RDLGtEQUFrRCxDQUNsRCxDQUFDO1FBRUYsTUFBTSxDQUNMLE1BQU0sWUFBWSxVQUFVLEVBQzVC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