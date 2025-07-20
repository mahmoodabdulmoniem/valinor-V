/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { promiseWithResolvers, timeout } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { EmptyExtension, ExtensionActivationTimes, ExtensionsActivator } from '../../common/extHostExtensionActivator.js';
import { ExtensionDescriptionRegistry } from '../../../services/extensions/common/extensionDescriptionRegistry.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
suite('ExtensionsActivator', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const idA = new ExtensionIdentifier(`a`);
    const idB = new ExtensionIdentifier(`b`);
    const idC = new ExtensionIdentifier(`c`);
    test('calls activate only once with sequential activations', async () => {
        const disposables = new DisposableStore();
        const host = new SimpleExtensionsActivatorHost();
        const activator = createActivator(host, [
            desc(idA)
        ], [], disposables);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idA]);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idA]);
        disposables.dispose();
    });
    test('calls activate only once with parallel activations', async () => {
        const disposables = new DisposableStore();
        const extActivation = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivation]
        ]);
        const activator = createActivator(host, [
            desc(idA, [], ['evt1', 'evt2'])
        ], [], disposables);
        const activate1 = activator.activateByEvent('evt1', false);
        const activate2 = activator.activateByEvent('evt2', false);
        extActivation.resolve();
        await activate1;
        await activate2;
        assert.deepStrictEqual(host.activateCalls, [idA]);
        disposables.dispose();
    });
    test('activates dependencies first', async () => {
        const disposables = new DisposableStore();
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB]
        ]);
        const activator = createActivator(host, [
            desc(idA, [idB], ['evt1']),
            desc(idB, [], ['evt1']),
        ], [], disposables);
        const activate = activator.activateByEvent('evt1', false);
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB]);
        extActivationB.resolve();
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
        extActivationA.resolve();
        await timeout(0);
        await activate;
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
        disposables.dispose();
    });
    test('Supports having resolved extensions', async () => {
        const disposables = new DisposableStore();
        const host = new SimpleExtensionsActivatorHost();
        const bExt = desc(idB);
        delete bExt.main;
        delete bExt.browser;
        const activator = createActivator(host, [
            desc(idA, [idB])
        ], [bExt], disposables);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idA]);
        disposables.dispose();
    });
    test('Supports having external extensions', async () => {
        const disposables = new DisposableStore();
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB]
        ]);
        const bExt = desc(idB);
        bExt.api = 'none';
        const activator = createActivator(host, [
            desc(idA, [idB])
        ], [bExt], disposables);
        const activate = activator.activateByEvent('*', false);
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB]);
        extActivationB.resolve();
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
        extActivationA.resolve();
        await activate;
        assert.deepStrictEqual(host.activateCalls, [idB, idA]);
        disposables.dispose();
    });
    test('Error: activateById with missing extension', async () => {
        const disposables = new DisposableStore();
        const host = new SimpleExtensionsActivatorHost();
        const activator = createActivator(host, [
            desc(idA),
            desc(idB),
        ], [], disposables);
        let error = undefined;
        try {
            await activator.activateById(idC, { startup: false, extensionId: idC, activationEvent: 'none' });
        }
        catch (err) {
            error = err;
        }
        assert.strictEqual(typeof error === 'undefined', false);
        disposables.dispose();
    });
    test('Error: dependency missing', async () => {
        const disposables = new DisposableStore();
        const host = new SimpleExtensionsActivatorHost();
        const activator = createActivator(host, [
            desc(idA, [idB]),
        ], [], disposables);
        await activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.errors.length, 1);
        assert.deepStrictEqual(host.errors[0][0], idA);
        disposables.dispose();
    });
    test('Error: dependency activation failed', async () => {
        const disposables = new DisposableStore();
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB]
        ]);
        const activator = createActivator(host, [
            desc(idA, [idB]),
            desc(idB)
        ], [], disposables);
        const activate = activator.activateByEvent('*', false);
        extActivationB.reject(new Error(`b fails!`));
        await activate;
        assert.deepStrictEqual(host.errors.length, 2);
        assert.deepStrictEqual(host.errors[0][0], idB);
        assert.deepStrictEqual(host.errors[1][0], idA);
        disposables.dispose();
    });
    test('issue #144518: Problem with git extension and vscode-icons', async () => {
        const disposables = new DisposableStore();
        const extActivationA = new ExtensionActivationPromiseSource();
        const extActivationB = new ExtensionActivationPromiseSource();
        const extActivationC = new ExtensionActivationPromiseSource();
        const host = new PromiseExtensionsActivatorHost([
            [idA, extActivationA],
            [idB, extActivationB],
            [idC, extActivationC]
        ]);
        const activator = createActivator(host, [
            desc(idA, [idB]),
            desc(idB),
            desc(idC),
        ], [], disposables);
        activator.activateByEvent('*', false);
        assert.deepStrictEqual(host.activateCalls, [idB, idC]);
        extActivationB.resolve();
        await timeout(0);
        assert.deepStrictEqual(host.activateCalls, [idB, idC, idA]);
        extActivationA.resolve();
        disposables.dispose();
    });
    class SimpleExtensionsActivatorHost {
        constructor() {
            this.activateCalls = [];
            this.errors = [];
        }
        onExtensionActivationError(extensionId, error, missingExtensionDependency) {
            this.errors.push([extensionId, error, missingExtensionDependency]);
        }
        actualActivateExtension(extensionId, reason) {
            this.activateCalls.push(extensionId);
            return Promise.resolve(new EmptyExtension(ExtensionActivationTimes.NONE));
        }
    }
    class PromiseExtensionsActivatorHost extends SimpleExtensionsActivatorHost {
        constructor(_promises) {
            super();
            this._promises = _promises;
        }
        actualActivateExtension(extensionId, reason) {
            this.activateCalls.push(extensionId);
            for (const [id, promiseSource] of this._promises) {
                if (id.value === extensionId.value) {
                    return promiseSource.promise;
                }
            }
            throw new Error(`Unexpected!`);
        }
    }
    class ExtensionActivationPromiseSource {
        constructor() {
            ({ promise: this.promise, resolve: this._resolve, reject: this._reject } = promiseWithResolvers());
        }
        resolve() {
            this._resolve(new EmptyExtension(ExtensionActivationTimes.NONE));
        }
        reject(err) {
            this._reject(err);
        }
    }
    const basicActivationEventsReader = {
        readActivationEvents: (extensionDescription) => {
            return extensionDescription.activationEvents ?? [];
        }
    };
    function createActivator(host, extensionDescriptions, otherHostExtensionDescriptions = [], disposables) {
        const registry = disposables.add(new ExtensionDescriptionRegistry(basicActivationEventsReader, extensionDescriptions));
        const globalRegistry = disposables.add(new ExtensionDescriptionRegistry(basicActivationEventsReader, extensionDescriptions.concat(otherHostExtensionDescriptions)));
        return disposables.add(new ExtensionsActivator(registry, globalRegistry, host, new NullLogService()));
    }
    function desc(id, deps = [], activationEvents = ['*']) {
        return {
            name: id.value,
            publisher: 'test',
            version: '0.0.0',
            engines: { vscode: '^1.0.0' },
            identifier: id,
            extensionLocation: URI.parse(`nothing://nowhere`),
            isBuiltin: false,
            isUnderDevelopment: false,
            isUserBuiltin: false,
            activationEvents,
            main: 'index.js',
            targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
            extensionDependencies: deps.map(d => d.value),
            enabledApiProposals: undefined,
            preRelease: false,
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEV4dGVuc2lvbkFjdGl2YXRvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvY29tbW9uL2V4dEhvc3RFeHRlbnNpb25BY3RpdmF0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWpGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQXlDLE1BQU0sc0RBQXNELENBQUM7QUFDbEksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBc0IsY0FBYyxFQUFFLHdCQUF3QixFQUFFLG1CQUFtQixFQUE0QixNQUFNLDJDQUEyQyxDQUFDO0FBQ3hLLE9BQU8sRUFBRSw0QkFBNEIsRUFBMkIsTUFBTSxxRUFBcUUsQ0FBQztBQUU1SSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkUsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUVqQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sR0FBRyxHQUFHLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekMsTUFBTSxHQUFHLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QyxNQUFNLEdBQUcsR0FBRyxJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRXpDLElBQUks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