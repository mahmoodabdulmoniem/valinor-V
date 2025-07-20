/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextKeyService } from '../../../../../platform/contextkey/browser/contextKeyService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { LanguageModelToolsService } from '../../browser/languageModelToolsService.js';
import { IChatService } from '../../common/chatService.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../common/languageModelToolsService.js';
import { MockChatService } from '../common/mockChatService.js';
import { ChatSelectedTools } from '../../browser/chatSelectedTools.js';
import { constObservable } from '../../../../../base/common/observable.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { timeout } from '../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { URI } from '../../../../../base/common/uri.js';
import { ChatMode } from '../../common/chatModes.js';
suite('ChatSelectedTools', () => {
    let store;
    let toolsService;
    let selectedTools;
    setup(() => {
        store = new DisposableStore();
        const instaService = workbenchInstantiationService({
            contextKeyService: () => store.add(new ContextKeyService(new TestConfigurationService)),
        }, store);
        instaService.stub(IChatService, new MockChatService());
        instaService.stub(ILanguageModelToolsService, instaService.createInstance(LanguageModelToolsService));
        store.add(instaService);
        toolsService = instaService.get(ILanguageModelToolsService);
        selectedTools = store.add(instaService.createInstance(ChatSelectedTools, constObservable(ChatMode.Agent)));
    });
    teardown(function () {
        store.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    const mcpSource = { type: 'mcp', label: 'MCP', collectionId: '', definitionId: '', instructions: '', serverLabel: '' };
    test('Can\'t enable/disable MCP tools directly #18161', () => {
        return runWithFakedTimers({}, async () => {
            const toolData1 = {
                id: 'testTool1',
                modelDescription: 'Test Tool 1',
                displayName: 'Test Tool 1',
                canBeReferencedInPrompt: true,
                toolReferenceName: 't1',
                source: mcpSource,
            };
            const toolData2 = {
                id: 'testTool2',
                modelDescription: 'Test Tool 2',
                displayName: 'Test Tool 2',
                source: mcpSource,
                canBeReferencedInPrompt: true,
                toolReferenceName: 't2',
            };
            const toolData3 = {
                id: 'testTool3',
                modelDescription: 'Test Tool 3',
                displayName: 'Test Tool 3',
                source: mcpSource,
                canBeReferencedInPrompt: true,
                toolReferenceName: 't3',
            };
            const toolset = toolsService.createToolSet(mcpSource, 'mcp', 'mcp');
            store.add(toolsService.registerToolData(toolData1));
            store.add(toolsService.registerToolData(toolData2));
            store.add(toolsService.registerToolData(toolData3));
            store.add(toolset);
            store.add(toolset.addTool(toolData1));
            store.add(toolset.addTool(toolData2));
            store.add(toolset.addTool(toolData3));
            assert.strictEqual(Iterable.length(toolsService.getTools()), 3);
            const size = Iterable.length(toolset.getTools());
            assert.strictEqual(size, 3);
            await timeout(1000); // UGLY the tools service updates its state sync but emits the event async (750ms) delay. This affects the observable that depends on the event
            assert.strictEqual(selectedTools.entriesMap.get().size, 4); // 1 toolset, 3 tools
            const toSet = new Map([[toolData1, true], [toolData2, false], [toolData3, false], [toolset, true]]);
            selectedTools.set(toSet, false);
            const map = selectedTools.enablementMap.get();
            assert.strictEqual(map.size, 3); // 3 tools
            assert.strictEqual(map.get(toolData1), true);
            assert.strictEqual(map.get(toolData2), false);
            assert.strictEqual(map.get(toolData3), false);
        });
    });
    test('Can still enable/disable user toolsets #251640', () => {
        return runWithFakedTimers({}, async () => {
            const toolData1 = {
                id: 'testTool1',
                modelDescription: 'Test Tool 1',
                displayName: 'Test Tool 1',
                canBeReferencedInPrompt: true,
                toolReferenceName: 't1',
                source: ToolDataSource.Internal,
            };
            const toolData2 = {
                id: 'testTool2',
                modelDescription: 'Test Tool 2',
                displayName: 'Test Tool 2',
                source: mcpSource,
                canBeReferencedInPrompt: true,
                toolReferenceName: 't2',
            };
            const toolData3 = {
                id: 'testTool3',
                modelDescription: 'Test Tool 3',
                displayName: 'Test Tool 3',
                source: ToolDataSource.Internal,
                canBeReferencedInPrompt: true,
                toolReferenceName: 't3',
            };
            const toolset = toolsService.createToolSet({ type: 'user', label: 'User Toolset', file: URI.file('/userToolset.json') }, 'userToolset', 'userToolset');
            store.add(toolsService.registerToolData(toolData1));
            store.add(toolsService.registerToolData(toolData2));
            store.add(toolsService.registerToolData(toolData3));
            store.add(toolset);
            store.add(toolset.addTool(toolData1));
            store.add(toolset.addTool(toolData2));
            store.add(toolset.addTool(toolData3));
            assert.strictEqual(Iterable.length(toolsService.getTools()), 3);
            const size = Iterable.length(toolset.getTools());
            assert.strictEqual(size, 3);
            await timeout(1000); // UGLY the tools service updates its state sync but emits the event async (750ms) delay. This affects the observable that depends on the event
            assert.strictEqual(selectedTools.entriesMap.get().size, 4); // 1 toolset, 3 tools
            // Toolset is checked, tools 2 and 3 are unchecked
            const toSet = new Map([[toolData1, true], [toolData2, false], [toolData3, false], [toolset, true]]);
            selectedTools.set(toSet, false);
            const map = selectedTools.enablementMap.get();
            assert.strictEqual(map.size, 3); // 3 tools
            // User toolset is enabled - all tools are enabled
            assert.strictEqual(map.get(toolData1), true);
            assert.strictEqual(map.get(toolData2), true);
            assert.strictEqual(map.get(toolData3), true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlbGVjdGVkVG9vbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2Jyb3dzZXIvY2hhdFNlbGVjdGVkVG9vbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBRSwwQkFBMEIsRUFBYSxjQUFjLEVBQVcsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFD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