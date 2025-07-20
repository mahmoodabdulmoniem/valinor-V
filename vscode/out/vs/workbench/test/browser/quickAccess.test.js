/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { Registry } from '../../../platform/registry/common/platform.js';
import { Extensions } from '../../../platform/quickinput/common/quickAccess.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { TestServiceAccessor, workbenchInstantiationService, createEditorPart } from './workbenchTestServices.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { timeout } from '../../../base/common/async.js';
import { PickerQuickAccessProvider } from '../../../platform/quickinput/browser/pickerQuickAccess.js';
import { URI } from '../../../base/common/uri.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { EditorService } from '../../services/editor/browser/editorService.js';
import { PickerEditorState } from '../../browser/quickaccess.js';
import { Range } from '../../../editor/common/core/range.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
suite('QuickAccess', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let accessor;
    let providerDefaultCalled = false;
    let providerDefaultCanceled = false;
    let providerDefaultDisposed = false;
    let provider1Called = false;
    let provider1Canceled = false;
    let provider1Disposed = false;
    let provider2Called = false;
    let provider2Canceled = false;
    let provider2Disposed = false;
    let provider3Called = false;
    let provider3Canceled = false;
    let provider3Disposed = false;
    let TestProviderDefault = class TestProviderDefault {
        constructor(quickInputService, disposables) {
            this.quickInputService = quickInputService;
        }
        provide(picker, token) {
            assert.ok(picker);
            providerDefaultCalled = true;
            const store = new DisposableStore();
            store.add(toDisposable(() => providerDefaultDisposed = true));
            store.add(token.onCancellationRequested(() => providerDefaultCanceled = true));
            // bring up provider #3
            setTimeout(() => this.quickInputService.quickAccess.show(providerDescriptor3.prefix));
            return store;
        }
    };
    TestProviderDefault = __decorate([
        __param(0, IQuickInputService)
    ], TestProviderDefault);
    class TestProvider1 {
        provide(picker, token) {
            assert.ok(picker);
            provider1Called = true;
            const store = new DisposableStore();
            store.add(token.onCancellationRequested(() => provider1Canceled = true));
            store.add(toDisposable(() => provider1Disposed = true));
            return store;
        }
    }
    class TestProvider2 {
        provide(picker, token) {
            assert.ok(picker);
            provider2Called = true;
            const store = new DisposableStore();
            store.add(token.onCancellationRequested(() => provider2Canceled = true));
            store.add(toDisposable(() => provider2Disposed = true));
            return store;
        }
    }
    class TestProvider3 {
        provide(picker, token) {
            assert.ok(picker);
            provider3Called = true;
            const store = new DisposableStore();
            store.add(token.onCancellationRequested(() => provider3Canceled = true));
            // hide without picking
            setTimeout(() => picker.hide());
            store.add(toDisposable(() => provider3Disposed = true));
            return store;
        }
    }
    const providerDescriptorDefault = { ctor: TestProviderDefault, prefix: '', helpEntries: [] };
    const providerDescriptor1 = { ctor: TestProvider1, prefix: 'test', helpEntries: [] };
    const providerDescriptor2 = { ctor: TestProvider2, prefix: 'test something', helpEntries: [] };
    const providerDescriptor3 = { ctor: TestProvider3, prefix: 'changed', helpEntries: [] };
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
    });
    test('registry', () => {
        const registry = (Registry.as(Extensions.Quickaccess));
        const restore = registry.clear();
        assert.ok(!registry.getQuickAccessProvider('test'));
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(providerDescriptorDefault));
        assert(registry.getQuickAccessProvider('') === providerDescriptorDefault);
        assert(registry.getQuickAccessProvider('test') === providerDescriptorDefault);
        const disposable = disposables.add(registry.registerQuickAccessProvider(providerDescriptor1));
        assert(registry.getQuickAccessProvider('test') === providerDescriptor1);
        const providers = registry.getQuickAccessProviders();
        assert(providers.some(provider => provider.prefix === 'test'));
        disposable.dispose();
        assert(registry.getQuickAccessProvider('test') === providerDescriptorDefault);
        disposables.dispose();
        assert.ok(!registry.getQuickAccessProvider('test'));
        restore();
    });
    test('provider', async () => {
        const registry = (Registry.as(Extensions.Quickaccess));
        const restore = registry.clear();
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(providerDescriptorDefault));
        disposables.add(registry.registerQuickAccessProvider(providerDescriptor1));
        disposables.add(registry.registerQuickAccessProvider(providerDescriptor2));
        disposables.add(registry.registerQuickAccessProvider(providerDescriptor3));
        accessor.quickInputService.quickAccess.show('test');
        assert.strictEqual(providerDefaultCalled, false);
        assert.strictEqual(provider1Called, true);
        assert.strictEqual(provider2Called, false);
        assert.strictEqual(provider3Called, false);
        assert.strictEqual(providerDefaultCanceled, false);
        assert.strictEqual(provider1Canceled, false);
        assert.strictEqual(provider2Canceled, false);
        assert.strictEqual(provider3Canceled, false);
        assert.strictEqual(providerDefaultDisposed, false);
        assert.strictEqual(provider1Disposed, false);
        assert.strictEqual(provider2Disposed, false);
        assert.strictEqual(provider3Disposed, false);
        provider1Called = false;
        accessor.quickInputService.quickAccess.show('test something');
        assert.strictEqual(providerDefaultCalled, false);
        assert.strictEqual(provider1Called, false);
        assert.strictEqual(provider2Called, true);
        assert.strictEqual(provider3Called, false);
        assert.strictEqual(providerDefaultCanceled, false);
        assert.strictEqual(provider1Canceled, true);
        assert.strictEqual(provider2Canceled, false);
        assert.strictEqual(provider3Canceled, false);
        assert.strictEqual(providerDefaultDisposed, false);
        assert.strictEqual(provider1Disposed, true);
        assert.strictEqual(provider2Disposed, false);
        assert.strictEqual(provider3Disposed, false);
        provider2Called = false;
        provider1Canceled = false;
        provider1Disposed = false;
        accessor.quickInputService.quickAccess.show('usedefault');
        assert.strictEqual(providerDefaultCalled, true);
        assert.strictEqual(provider1Called, false);
        assert.strictEqual(provider2Called, false);
        assert.strictEqual(provider3Called, false);
        assert.strictEqual(providerDefaultCanceled, false);
        assert.strictEqual(provider1Canceled, false);
        assert.strictEqual(provider2Canceled, true);
        assert.strictEqual(provider3Canceled, false);
        assert.strictEqual(providerDefaultDisposed, false);
        assert.strictEqual(provider1Disposed, false);
        assert.strictEqual(provider2Disposed, true);
        assert.strictEqual(provider3Disposed, false);
        await timeout(1);
        assert.strictEqual(providerDefaultCanceled, true);
        assert.strictEqual(providerDefaultDisposed, true);
        assert.strictEqual(provider3Called, true);
        await timeout(1);
        assert.strictEqual(provider3Canceled, true);
        assert.strictEqual(provider3Disposed, true);
        disposables.dispose();
        restore();
    });
    let fastProviderCalled = false;
    let slowProviderCalled = false;
    let fastAndSlowProviderCalled = false;
    let slowProviderCanceled = false;
    let fastAndSlowProviderCanceled = false;
    class FastTestQuickPickProvider extends PickerQuickAccessProvider {
        constructor() {
            super('fast');
        }
        _getPicks(filter, disposables, token) {
            fastProviderCalled = true;
            return [{ label: 'Fast Pick' }];
        }
    }
    class SlowTestQuickPickProvider extends PickerQuickAccessProvider {
        constructor() {
            super('slow');
        }
        async _getPicks(filter, disposables, token) {
            slowProviderCalled = true;
            await timeout(1);
            if (token.isCancellationRequested) {
                slowProviderCanceled = true;
            }
            return [{ label: 'Slow Pick' }];
        }
    }
    class FastAndSlowTestQuickPickProvider extends PickerQuickAccessProvider {
        constructor() {
            super('bothFastAndSlow');
        }
        _getPicks(filter, disposables, token) {
            fastAndSlowProviderCalled = true;
            return {
                picks: [{ label: 'Fast Pick' }],
                additionalPicks: (async () => {
                    await timeout(1);
                    if (token.isCancellationRequested) {
                        fastAndSlowProviderCanceled = true;
                    }
                    return [{ label: 'Slow Pick' }];
                })()
            };
        }
    }
    const fastProviderDescriptor = { ctor: FastTestQuickPickProvider, prefix: 'fast', helpEntries: [] };
    const slowProviderDescriptor = { ctor: SlowTestQuickPickProvider, prefix: 'slow', helpEntries: [] };
    const fastAndSlowProviderDescriptor = { ctor: FastAndSlowTestQuickPickProvider, prefix: 'bothFastAndSlow', helpEntries: [] };
    test('quick pick access - show()', async () => {
        const registry = (Registry.as(Extensions.Quickaccess));
        const restore = registry.clear();
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(fastProviderDescriptor));
        disposables.add(registry.registerQuickAccessProvider(slowProviderDescriptor));
        disposables.add(registry.registerQuickAccessProvider(fastAndSlowProviderDescriptor));
        accessor.quickInputService.quickAccess.show('fast');
        assert.strictEqual(fastProviderCalled, true);
        assert.strictEqual(slowProviderCalled, false);
        assert.strictEqual(fastAndSlowProviderCalled, false);
        fastProviderCalled = false;
        accessor.quickInputService.quickAccess.show('slow');
        await timeout(2);
        assert.strictEqual(fastProviderCalled, false);
        assert.strictEqual(slowProviderCalled, true);
        assert.strictEqual(slowProviderCanceled, false);
        assert.strictEqual(fastAndSlowProviderCalled, false);
        slowProviderCalled = false;
        accessor.quickInputService.quickAccess.show('bothFastAndSlow');
        await timeout(2);
        assert.strictEqual(fastProviderCalled, false);
        assert.strictEqual(slowProviderCalled, false);
        assert.strictEqual(fastAndSlowProviderCalled, true);
        assert.strictEqual(fastAndSlowProviderCanceled, false);
        fastAndSlowProviderCalled = false;
        accessor.quickInputService.quickAccess.show('slow');
        accessor.quickInputService.quickAccess.show('bothFastAndSlow');
        accessor.quickInputService.quickAccess.show('fast');
        assert.strictEqual(fastProviderCalled, true);
        assert.strictEqual(slowProviderCalled, true);
        assert.strictEqual(fastAndSlowProviderCalled, true);
        await timeout(2);
        assert.strictEqual(slowProviderCanceled, true);
        assert.strictEqual(fastAndSlowProviderCanceled, true);
        disposables.dispose();
        restore();
    });
    test('quick pick access - pick()', async () => {
        const registry = (Registry.as(Extensions.Quickaccess));
        const restore = registry.clear();
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(fastProviderDescriptor));
        const result = accessor.quickInputService.quickAccess.pick('fast');
        assert.strictEqual(fastProviderCalled, true);
        assert.ok(result instanceof Promise);
        disposables.dispose();
        restore();
    });
    test('PickerEditorState can properly restore editors', async () => {
        const part = await createEditorPart(instantiationService, disposables.add(new DisposableStore()));
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        const editorViewState = disposables.add(instantiationService.createInstance(PickerEditorState));
        disposables.add(part);
        disposables.add(editorService);
        const input1 = {
            resource: URI.parse('foo://bar1'),
            options: {
                pinned: true, preserveFocus: true, selection: new Range(1, 0, 1, 3)
            }
        };
        const input2 = {
            resource: URI.parse('foo://bar2'),
            options: {
                pinned: true, selection: new Range(1, 0, 1, 3)
            }
        };
        const input3 = {
            resource: URI.parse('foo://bar3')
        };
        const input4 = {
            resource: URI.parse('foo://bar4')
        };
        const editor = await editorService.openEditor(input1);
        assert.strictEqual(editor, editorService.activeEditorPane);
        editorViewState.set();
        await editorService.openEditor(input2);
        await editorViewState.openTransientEditor(input3);
        await editorViewState.openTransientEditor(input4);
        await editorViewState.restore();
        assert.strictEqual(part.activeGroup.activeEditor?.resource, input1.resource);
        assert.deepStrictEqual(part.activeGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).map(e => e.resource), [input1.resource, input2.resource]);
        if (part.activeGroup.activeEditorPane?.getSelection) {
            assert.deepStrictEqual(part.activeGroup.activeEditorPane?.getSelection(), input1.options.selection);
        }
        await part.activeGroup.closeAllEditors();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9xdWlja0FjY2Vzcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUF3QixVQUFVLEVBQTZDLE1BQU0sb0RBQW9ELENBQUM7QUFDakosT0FBTyxFQUE4QixrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRW5ILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSw2QkFBNkIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2xILE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSx5QkFBeUIsRUFBb0IsTUFBTSwyREFBMkQsQ0FBQztBQUN4SCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDM0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NB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