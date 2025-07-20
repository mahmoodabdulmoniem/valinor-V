/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { AsyncIterableSource, DeferredPromise, timeout } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { languageModelExtensionPoint, LanguageModelsService } from '../../common/languageModels.js';
import { nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../../services/extensions/common/extensionsRegistry.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { DEFAULT_MODEL_PICKER_CATEGORY } from '../../common/modelPicker/modelPickerWidget.js';
suite('LanguageModels', function () {
    let languageModels;
    const store = new DisposableStore();
    const activationEvents = new Set();
    setup(function () {
        languageModels = new LanguageModelsService(new class extends mock() {
            activateByEvent(name) {
                activationEvents.add(name);
                return Promise.resolve();
            }
        }, new NullLogService(), new MockContextKeyService());
        const ext = ExtensionsRegistry.getExtensionPoints().find(e => e.name === languageModelExtensionPoint.name);
        ext.acceptUsers([{
                description: { ...nullExtensionDescription, enabledApiProposals: ['chatProvider'] },
                value: { vendor: 'test-vendor' },
                collector: null
            }]);
        store.add(languageModels.registerLanguageModelChat('1', {
            metadata: {
                extension: nullExtensionDescription.identifier,
                name: 'Pretty Name',
                vendor: 'test-vendor',
                family: 'test-family',
                version: 'test-version',
                modelPickerCategory: undefined,
                id: 'test-id',
                maxInputTokens: 100,
                maxOutputTokens: 100,
            },
            sendChatRequest: async () => {
                throw new Error();
            },
            provideTokenCount: async () => {
                throw new Error();
            }
        }));
        store.add(languageModels.registerLanguageModelChat('12', {
            metadata: {
                extension: nullExtensionDescription.identifier,
                name: 'Pretty Name',
                vendor: 'test-vendor',
                family: 'test2-family',
                version: 'test2-version',
                modelPickerCategory: undefined,
                id: 'test-id',
                maxInputTokens: 100,
                maxOutputTokens: 100,
            },
            sendChatRequest: async () => {
                throw new Error();
            },
            provideTokenCount: async () => {
                throw new Error();
            }
        }));
    });
    teardown(function () {
        languageModels.dispose();
        activationEvents.clear();
        store.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty selector returns all', async function () {
        const result1 = await languageModels.selectLanguageModels({});
        assert.deepStrictEqual(result1.length, 2);
        assert.deepStrictEqual(result1[0], '1');
        assert.deepStrictEqual(result1[1], '12');
    });
    test('no warning that a matching model was not found #213716', async function () {
        const result1 = await languageModels.selectLanguageModels({ vendor: 'test-vendor' });
        assert.deepStrictEqual(result1.length, 2);
        const result2 = await languageModels.selectLanguageModels({ vendor: 'test-vendor', family: 'FAKE' });
        assert.deepStrictEqual(result2.length, 0);
    });
    test('sendChatRequest returns a response-stream', async function () {
        store.add(languageModels.registerLanguageModelChat('actual', {
            metadata: {
                extension: nullExtensionDescription.identifier,
                name: 'Pretty Name',
                vendor: 'test-vendor',
                family: 'actual-family',
                version: 'actual-version',
                id: 'actual-lm',
                maxInputTokens: 100,
                maxOutputTokens: 100,
                modelPickerCategory: DEFAULT_MODEL_PICKER_CATEGORY,
            },
            sendChatRequest: async (messages, _from, _options, token) => {
                // const message = messages.at(-1);
                const defer = new DeferredPromise();
                const stream = new AsyncIterableSource();
                (async () => {
                    while (!token.isCancellationRequested) {
                        stream.emitOne({ index: 0, part: { type: 'text', value: Date.now().toString() } });
                        await timeout(10);
                    }
                    defer.complete(undefined);
                })();
                return {
                    stream: stream.asyncIterable,
                    result: defer.p
                };
            },
            provideTokenCount: async () => {
                throw new Error();
            }
        }));
        const models = await languageModels.selectLanguageModels({ id: 'actual-lm' });
        assert.ok(models.length === 1);
        const first = models[0];
        const cts = new CancellationTokenSource();
        const request = await languageModels.sendChatRequest(first, nullExtensionDescription.identifier, [{ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: 'hello' }] }], {}, cts.token);
        assert.ok(request);
        cts.dispose(true);
        await request.result;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9sYW5ndWFnZU1vZGVscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3BHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBMEMsMkJBQTJCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM1SSxPQUFPLEVBQXFCLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbkgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDaEgsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFOUYsS0FBSyxDQUFDLGdCQUFnQixFQUFFO0lBRXZCLElBQUksY0FBcUMsQ0FBQztJQUUxQyxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQ3BDLE1BQU0sZ0JBQWdCLEdB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