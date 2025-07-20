/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextKeyService } from '../../../../../platform/contextkey/browser/contextKeyService.js';
import { ContextKeyEqualsExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { LanguageModelToolsService } from '../../browser/languageModelToolsService.js';
import { IChatService } from '../../common/chatService.js';
import { ToolDataSource } from '../../common/languageModelToolsService.js';
import { MockChatService } from '../common/mockChatService.js';
import { CancellationError, isCancellationError } from '../../../../../base/common/errors.js';
import { Barrier } from '../../../../../base/common/async.js';
suite('LanguageModelToolsService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let contextKeyService;
    let service;
    let chatService;
    setup(() => {
        const instaService = workbenchInstantiationService({
            contextKeyService: () => store.add(new ContextKeyService(new TestConfigurationService)),
        }, store);
        contextKeyService = instaService.get(IContextKeyService);
        chatService = new MockChatService();
        instaService.stub(IChatService, chatService);
        service = store.add(instaService.createInstance(LanguageModelToolsService));
    });
    test('registerToolData', () => {
        const toolData = {
            id: 'testTool',
            modelDescription: 'Test Tool',
            displayName: 'Test Tool',
            source: ToolDataSource.Internal,
        };
        const disposable = service.registerToolData(toolData);
        assert.strictEqual(service.getTool('testTool')?.id, 'testTool');
        disposable.dispose();
        assert.strictEqual(service.getTool('testTool'), undefined);
    });
    test('registerToolImplementation', () => {
        const toolData = {
            id: 'testTool',
            modelDescription: 'Test Tool',
            displayName: 'Test Tool',
            source: ToolDataSource.Internal,
        };
        store.add(service.registerToolData(toolData));
        const toolImpl = {
            invoke: async () => ({ content: [{ kind: 'text', value: 'result' }] }),
        };
        store.add(service.registerToolImplementation('testTool', toolImpl));
        assert.strictEqual(service.getTool('testTool')?.id, 'testTool');
    });
    test('getTools', () => {
        contextKeyService.createKey('testKey', true);
        const toolData1 = {
            id: 'testTool1',
            modelDescription: 'Test Tool 1',
            when: ContextKeyEqualsExpr.create('testKey', false),
            displayName: 'Test Tool',
            source: ToolDataSource.Internal,
        };
        const toolData2 = {
            id: 'testTool2',
            modelDescription: 'Test Tool 2',
            when: ContextKeyEqualsExpr.create('testKey', true),
            displayName: 'Test Tool',
            source: ToolDataSource.Internal,
        };
        const toolData3 = {
            id: 'testTool3',
            modelDescription: 'Test Tool 3',
            displayName: 'Test Tool',
            source: ToolDataSource.Internal,
        };
        store.add(service.registerToolData(toolData1));
        store.add(service.registerToolData(toolData2));
        store.add(service.registerToolData(toolData3));
        const tools = Array.from(service.getTools());
        assert.strictEqual(tools.length, 2);
        assert.strictEqual(tools[0].id, 'testTool2');
        assert.strictEqual(tools[1].id, 'testTool3');
    });
    test('getToolByName', () => {
        contextKeyService.createKey('testKey', true);
        const toolData1 = {
            id: 'testTool1',
            toolReferenceName: 'testTool1',
            modelDescription: 'Test Tool 1',
            when: ContextKeyEqualsExpr.create('testKey', false),
            displayName: 'Test Tool',
            source: ToolDataSource.Internal,
        };
        const toolData2 = {
            id: 'testTool2',
            toolReferenceName: 'testTool2',
            modelDescription: 'Test Tool 2',
            when: ContextKeyEqualsExpr.create('testKey', true),
            displayName: 'Test Tool',
            source: ToolDataSource.Internal,
        };
        const toolData3 = {
            id: 'testTool3',
            toolReferenceName: 'testTool3',
            modelDescription: 'Test Tool 3',
            displayName: 'Test Tool',
            source: ToolDataSource.Internal,
        };
        store.add(service.registerToolData(toolData1));
        store.add(service.registerToolData(toolData2));
        store.add(service.registerToolData(toolData3));
        assert.strictEqual(service.getToolByName('testTool1'), undefined);
        assert.strictEqual(service.getToolByName('testTool1', true)?.id, 'testTool1');
        assert.strictEqual(service.getToolByName('testTool2')?.id, 'testTool2');
        assert.strictEqual(service.getToolByName('testTool3')?.id, 'testTool3');
    });
    test('invokeTool', async () => {
        const toolData = {
            id: 'testTool',
            modelDescription: 'Test Tool',
            displayName: 'Test Tool',
            source: ToolDataSource.Internal,
        };
        store.add(service.registerToolData(toolData));
        const toolImpl = {
            invoke: async (invocation) => {
                assert.strictEqual(invocation.callId, '1');
                assert.strictEqual(invocation.toolId, 'testTool');
                assert.deepStrictEqual(invocation.parameters, { a: 1 });
                return { content: [{ kind: 'text', value: 'result' }] };
            }
        };
        store.add(service.registerToolImplementation('testTool', toolImpl));
        const dto = {
            callId: '1',
            toolId: 'testTool',
            tokenBudget: 100,
            parameters: {
                a: 1
            },
            context: undefined,
        };
        const result = await service.invokeTool(dto, async () => 0, CancellationToken.None);
        assert.strictEqual(result.content[0].value, 'result');
    });
    test('cancel tool call', async () => {
        const toolData = {
            id: 'testTool',
            modelDescription: 'Test Tool',
            displayName: 'Test Tool',
            source: ToolDataSource.Internal,
        };
        store.add(service.registerToolData(toolData));
        const toolBarrier = new Barrier();
        const toolImpl = {
            invoke: async (invocation, countTokens, progress, cancelToken) => {
                assert.strictEqual(invocation.callId, '1');
                assert.strictEqual(invocation.toolId, 'testTool');
                assert.deepStrictEqual(invocation.parameters, { a: 1 });
                await toolBarrier.wait();
                if (cancelToken.isCancellationRequested) {
                    throw new CancellationError();
                }
                else {
                    throw new Error('Tool call should be cancelled');
                }
            }
        };
        store.add(service.registerToolImplementation('testTool', toolImpl));
        const sessionId = 'sessionId';
        const requestId = 'requestId';
        const dto = {
            callId: '1',
            toolId: 'testTool',
            tokenBudget: 100,
            parameters: {
                a: 1
            },
            context: {
                sessionId
            },
        };
        chatService.addSession({
            sessionId: sessionId,
            getRequests: () => {
                return [{
                        id: requestId
                    }];
            },
            acceptResponseProgress: () => { }
        });
        const toolPromise = service.invokeTool(dto, async () => 0, CancellationToken.None);
        service.cancelToolCallsForRequest(requestId);
        toolBarrier.open();
        await assert.rejects(toolPromise, err => {
            return isCancellationError(err);
        }, 'Expected tool call to be cancelled');
    });
    test('toToolEnablementMap', () => {
        const toolData1 = {
            id: 'tool1',
            toolReferenceName: 'refTool1',
            modelDescription: 'Test Tool 1',
            displayName: 'Test Tool 1',
            source: ToolDataSource.Internal,
        };
        const toolData2 = {
            id: 'tool2',
            toolReferenceName: 'refTool2',
            modelDescription: 'Test Tool 2',
            displayName: 'Test Tool 2',
            source: ToolDataSource.Internal,
        };
        const toolData3 = {
            id: 'tool3',
            // No toolReferenceName
            modelDescription: 'Test Tool 3',
            displayName: 'Test Tool 3',
            source: ToolDataSource.Internal,
        };
        store.add(service.registerToolData(toolData1));
        store.add(service.registerToolData(toolData2));
        store.add(service.registerToolData(toolData3));
        // Test with enabled tools
        const enabledToolNames = new Set(['refTool1']);
        const result1 = service.toToolEnablementMap(enabledToolNames);
        assert.strictEqual(result1['tool1'], true, 'tool1 should be enabled');
        assert.strictEqual(result1['tool2'], false, 'tool2 should be disabled');
        assert.strictEqual(result1['tool3'], false, 'tool3 should be disabled (no reference name)');
        // Test with multiple enabled tools
        const multipleEnabledToolNames = new Set(['refTool1', 'refTool2']);
        const result2 = service.toToolEnablementMap(multipleEnabledToolNames);
        assert.strictEqual(result2['tool1'], true, 'tool1 should be enabled');
        assert.strictEqual(result2['tool2'], true, 'tool2 should be enabled');
        assert.strictEqual(result2['tool3'], false, 'tool3 should be disabled');
        // Test with no enabled tools
        const noEnabledToolNames = new Set();
        const result3 = service.toToolEnablementMap(noEnabledToolNames);
        assert.strictEqual(result3['tool1'], false, 'tool1 should be disabled');
        assert.strictEqual(result3['tool2'], false, 'tool2 should be disabled');
        assert.strictEqual(result3['tool3'], false, 'tool3 should be disabled');
    });
    test('toToolEnablementMap with tool sets', () => {
        // Register individual tools
        const toolData1 = {
            id: 'tool1',
            toolReferenceName: 'refTool1',
            modelDescription: 'Test Tool 1',
            displayName: 'Test Tool 1',
            source: ToolDataSource.Internal,
        };
        const toolData2 = {
            id: 'tool2',
            modelDescription: 'Test Tool 2',
            displayName: 'Test Tool 2',
            source: ToolDataSource.Internal,
        };
        store.add(service.registerToolData(toolData1));
        store.add(service.registerToolData(toolData2));
        // Create a tool set
        const toolSet = store.add(service.createToolSet(ToolDataSource.Internal, 'testToolSet', 'refToolSet', { description: 'Test Tool Set' }));
        // Add tools to the tool set
        const toolSetTool1 = {
            id: 'toolSetTool1',
            modelDescription: 'Tool Set Tool 1',
            displayName: 'Tool Set Tool 1',
            source: ToolDataSource.Internal,
        };
        const toolSetTool2 = {
            id: 'toolSetTool2',
            modelDescription: 'Tool Set Tool 2',
            displayName: 'Tool Set Tool 2',
            source: ToolDataSource.Internal,
        };
        store.add(service.registerToolData(toolSetTool1));
        store.add(service.registerToolData(toolSetTool2));
        store.add(toolSet.addTool(toolSetTool1));
        store.add(toolSet.addTool(toolSetTool2));
        // Test enabling the tool set
        const enabledNames = new Set(['refToolSet', 'refTool1']);
        const result = service.toToolEnablementMap(enabledNames);
        assert.strictEqual(result['tool1'], true, 'individual tool should be enabled');
        assert.strictEqual(result['tool2'], false);
        assert.strictEqual(result['toolSetTool1'], true, 'tool set tool 1 should be enabled');
        assert.strictEqual(result['toolSetTool2'], true, 'tool set tool 2 should be enabled');
    });
    test('toToolEnablementMap with non-existent tool names', () => {
        const toolData = {
            id: 'tool1',
            toolReferenceName: 'refTool1',
            modelDescription: 'Test Tool 1',
            displayName: 'Test Tool 1',
            source: ToolDataSource.Internal,
        };
        store.add(service.registerToolData(toolData));
        // Test with non-existent tool names
        const enabledNames = new Set(['nonExistentTool', 'refTool1']);
        const result = service.toToolEnablementMap(enabledNames);
        assert.strictEqual(result['tool1'], true, 'existing tool should be enabled');
        // Non-existent tools should not appear in the result map
        assert.strictEqual(result['nonExistentTool'], undefined, 'non-existent tool should not be in result');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvYnJvd3Nlci9sYW5ndWFnZU1vZGVsVG9vbHNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDbkgsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFdkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBeUMsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxLQUFLLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBQ3ZDLE1BQU0s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