/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { InstantiationService } from '../../../../../platform/instantiation/common/instantiationService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { NullExtensionService } from '../../../extensions/common/extensions.js';
import { CommandService } from '../../common/commandService.js';
suite('CommandService', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        store.add(CommandsRegistry.registerCommand('foo', function () { }));
    });
    test('activateOnCommand', () => {
        let lastEvent;
        const service = store.add(new CommandService(new InstantiationService(), new class extends NullExtensionService {
            activateByEvent(activationEvent) {
                lastEvent = activationEvent;
                return super.activateByEvent(activationEvent);
            }
        }, new NullLogService()));
        return service.executeCommand('foo').then(() => {
            assert.ok(lastEvent, 'onCommand:foo');
            return service.executeCommand('unknownCommandId');
        }).then(() => {
            assert.ok(false);
        }, () => {
            assert.ok(lastEvent, 'onCommand:unknownCommandId');
        });
    });
    test('fwd activation error', async function () {
        const extensionService = new class extends NullExtensionService {
            activateByEvent(activationEvent) {
                return Promise.reject(new Error('bad_activate'));
            }
        };
        const service = store.add(new CommandService(new InstantiationService(), extensionService, new NullLogService()));
        await extensionService.whenInstalledExtensionsRegistered();
        return service.executeCommand('foo').then(() => assert.ok(false), err => {
            assert.strictEqual(err.message, 'bad_activate');
        });
    });
    test('!onReady, but executeCommand', function () {
        let callCounter = 0;
        const reg = CommandsRegistry.registerCommand('bar', () => callCounter += 1);
        const service = store.add(new CommandService(new InstantiationService(), new class extends NullExtensionService {
            whenInstalledExtensionsRegistered() {
                return new Promise(_resolve => { });
            }
        }, new NullLogService()));
        service.executeCommand('bar');
        assert.strictEqual(callCounter, 1);
        reg.dispose();
    });
    test('issue #34913: !onReady, unknown command', function () {
        let callCounter = 0;
        let resolveFunc;
        const whenInstalledExtensionsRegistered = new Promise(_resolve => { resolveFunc = _resolve; });
        const service = store.add(new CommandService(new InstantiationService(), new class extends NullExtensionService {
            whenInstalledExtensionsRegistered() {
                return whenInstalledExtensionsRegistered;
            }
        }, new NullLogService()));
        const r = service.executeCommand('bar');
        assert.strictEqual(callCounter, 0);
        const reg = CommandsRegistry.registerCommand('bar', () => callCounter += 1);
        resolveFunc(true);
        return r.then(() => {
            reg.dispose();
            assert.strictEqual(callCounter, 1);
        });
    });
    test('Stop waiting for * extensions to activate when trigger is satisfied #62457', function () {
        let callCounter = 0;
        const disposable = new DisposableStore();
        const events = [];
        const service = store.add(new CommandService(new InstantiationService(), new class extends NullExtensionService {
            activateByEvent(event) {
                events.push(event);
                if (event === '*') {
                    return new Promise(() => { }); //forever promise...
                }
                if (event.indexOf('onCommand:') === 0) {
                    return new Promise(resolve => {
                        setTimeout(() => {
                            const reg = CommandsRegistry.registerCommand(event.substr('onCommand:'.length), () => {
                                callCounter += 1;
                            });
                            disposable.add(reg);
                            resolve();
                        }, 0);
                    });
                }
                return Promise.resolve();
            }
        }, new NullLogService()));
        return service.executeCommand('farboo').then(() => {
            assert.strictEqual(callCounter, 1);
            assert.deepStrictEqual(events.sort(), ['*', 'onCommand:farboo'].sort());
        }).finally(() => {
            disposable.dispose();
        });
    });
    test('issue #71471: wait for onCommand activation even if a command is registered', () => {
        const expectedOrder = ['registering command', 'resolving activation event', 'executing command'];
        const actualOrder = [];
        const disposables = new DisposableStore();
        const service = store.add(new CommandService(new InstantiationService(), new class extends NullExtensionService {
            activateByEvent(event) {
                if (event === '*') {
                    return new Promise(() => { }); //forever promise...
                }
                if (event.indexOf('onCommand:') === 0) {
                    return new Promise(resolve => {
                        setTimeout(() => {
                            // Register the command after some time
                            actualOrder.push('registering command');
                            const reg = CommandsRegistry.registerCommand(event.substr('onCommand:'.length), () => {
                                actualOrder.push('executing command');
                            });
                            disposables.add(reg);
                            setTimeout(() => {
                                // Resolve the activation event after some more time
                                actualOrder.push('resolving activation event');
                                resolve();
                            }, 10);
                        }, 10);
                    });
                }
                return Promise.resolve();
            }
        }, new NullLogService()));
        return service.executeCommand('farboo2').then(() => {
            assert.deepStrictEqual(actualOrder, expectedOrder);
        }).finally(() => {
            disposables.dispose();
        });
    });
    test('issue #142155: execute commands synchronously if possible', async () => {
        const actualOrder = [];
        const disposables = new DisposableStore();
        disposables.add(CommandsRegistry.registerCommand(`bizBaz`, () => {
            actualOrder.push('executing command');
        }));
        const extensionService = new class extends NullExtensionService {
            activationEventIsDone(_activationEvent) {
                return true;
            }
        };
        const service = store.add(new CommandService(new InstantiationService(), extensionService, new NullLogService()));
        await extensionService.whenInstalledExtensionsRegistered();
        try {
            actualOrder.push(`before call`);
            const promise = service.executeCommand('bizBaz');
            actualOrder.push(`after call`);
            await promise;
            actualOrder.push(`resolved`);
            assert.deepStrictEqual(actualOrder, [
                'before call',
                'executing command',
                'after call',
                'resolved'
            ]);
        }
        finally {
            disposables.dispose();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbW1hbmRzL3Rlc3QvY29tbW9uL2NvbW1hbmRTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUM1RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRWhFLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRTtJQUV2QixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELEtBQUssQ0FBQztRQUNMLEtBQUssQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckUsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBRTlCLElBQUksU0FBaUIsQ0FBQztRQUV0QixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksY0FBYyxDQUFDLElBQUksb0JBQW9CLEVBQUUsRUFB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