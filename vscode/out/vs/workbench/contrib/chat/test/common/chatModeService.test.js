/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { Emitter } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatMode, ChatModeService } from '../../common/chatModes.js';
import { ChatModeKind } from '../../common/constants.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { MockPromptsService } from './mockPromptsService.js';
class TestChatAgentService {
    constructor() {
        this._hasToolsAgent = true;
        this._onDidChangeAgents = new Emitter();
        this.onDidChangeAgents = this._onDidChangeAgents.event;
    }
    get hasToolsAgent() {
        return this._hasToolsAgent;
    }
    setHasToolsAgent(value) {
        this._hasToolsAgent = value;
        this._onDidChangeAgents.fire(undefined);
    }
}
suite('ChatModeService', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let promptsService;
    let chatAgentService;
    let storageService;
    let chatModeService;
    setup(async () => {
        instantiationService = testDisposables.add(new TestInstantiationService());
        promptsService = new MockPromptsService();
        chatAgentService = new TestChatAgentService();
        storageService = testDisposables.add(new TestStorageService());
        instantiationService.stub(IPromptsService, promptsService);
        instantiationService.stub(IChatAgentService, chatAgentService);
        instantiationService.stub(IStorageService, storageService);
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        chatModeService = testDisposables.add(instantiationService.createInstance(ChatModeService));
    });
    test('should return builtin modes', () => {
        const modes = chatModeService.getModes();
        assert.strictEqual(modes.builtin.length, 3);
        assert.strictEqual(modes.custom.length, 0);
        // Check that Ask mode is always present
        const askMode = modes.builtin.find(mode => mode.id === ChatModeKind.Ask);
        assert.ok(askMode);
        assert.strictEqual(askMode.name, 'Ask');
        assert.strictEqual(askMode.kind, ChatModeKind.Ask);
    });
    test('should adjust builtin modes based on tools agent availability', () => {
        // With tools agent
        chatAgentService.setHasToolsAgent(true);
        let modes = chatModeService.getModes();
        assert.ok(modes.builtin.find(mode => mode.id === ChatModeKind.Agent));
        // Without tools agent - Agent mode should not be present
        chatAgentService.setHasToolsAgent(false);
        modes = chatModeService.getModes();
        assert.strictEqual(modes.builtin.find(mode => mode.id === ChatModeKind.Agent), undefined);
        // But Ask and Edit modes should always be present
        assert.ok(modes.builtin.find(mode => mode.id === ChatModeKind.Ask));
        assert.ok(modes.builtin.find(mode => mode.id === ChatModeKind.Edit));
    });
    test('should find builtin modes by id', () => {
        const agentMode = chatModeService.findModeById(ChatModeKind.Agent);
        assert.ok(agentMode);
        assert.strictEqual(agentMode.id, ChatMode.Agent.id);
        assert.strictEqual(agentMode.kind, ChatModeKind.Agent);
    });
    test('should return undefined for non-existent mode', () => {
        const mode = chatModeService.findModeById('non-existent-mode');
        assert.strictEqual(mode, undefined);
    });
    test('should handle custom modes from prompts service', async () => {
        const customMode = {
            uri: URI.parse('file:///test/custom-mode.md'),
            name: 'Test Mode',
            description: 'A test custom mode',
            tools: ['tool1', 'tool2'],
            body: 'Custom mode body'
        };
        promptsService.setCustomModes([customMode]);
        // Wait for the service to refresh
        await timeout(0);
        const modes = chatModeService.getModes();
        assert.strictEqual(modes.custom.length, 1);
        const testMode = modes.custom[0];
        assert.strictEqual(testMode.id, customMode.uri.toString());
        assert.strictEqual(testMode.name, customMode.name);
        assert.strictEqual(testMode.description.get(), customMode.description);
        assert.strictEqual(testMode.kind, ChatModeKind.Agent);
        assert.deepStrictEqual(testMode.customTools?.get(), customMode.tools);
        assert.strictEqual(testMode.body?.get(), customMode.body);
        assert.strictEqual(testMode.uri?.get().toString(), customMode.uri.toString());
    });
    test('should fire change event when custom modes are updated', async () => {
        let eventFired = false;
        testDisposables.add(chatModeService.onDidChangeChatModes(() => {
            eventFired = true;
        }));
        const customMode = {
            uri: URI.parse('file:///test/custom-mode.md'),
            name: 'Test Mode',
            description: 'A test custom mode',
            tools: [],
            body: 'Custom mode body'
        };
        promptsService.setCustomModes([customMode]);
        // Wait for the event to fire
        await timeout(0);
        assert.ok(eventFired);
    });
    test('should find custom modes by id', async () => {
        const customMode = {
            uri: URI.parse('file:///test/findable-mode.md'),
            name: 'Findable Mode',
            description: 'A findable custom mode',
            tools: [],
            body: 'Findable mode body'
        };
        promptsService.setCustomModes([customMode]);
        // Wait for the service to refresh
        await timeout(0);
        const foundMode = chatModeService.findModeById(customMode.uri.toString());
        assert.ok(foundMode);
        assert.strictEqual(foundMode.id, customMode.uri.toString());
        assert.strictEqual(foundMode.name, customMode.name);
    });
    test('should update existing custom mode instances when data changes', async () => {
        const uri = URI.parse('file:///test/updateable-mode.md');
        const initialMode = {
            uri,
            name: 'Initial Mode',
            description: 'Initial description',
            tools: ['tool1'],
            body: 'Initial body',
            model: 'gpt-4'
        };
        promptsService.setCustomModes([initialMode]);
        await timeout(0);
        const initialModes = chatModeService.getModes();
        const initialCustomMode = initialModes.custom[0];
        assert.strictEqual(initialCustomMode.description.get(), 'Initial description');
        // Update the mode data
        const updatedMode = {
            ...initialMode,
            description: 'Updated description',
            tools: ['tool1', 'tool2'],
            body: 'Updated body',
            model: 'Updated model'
        };
        promptsService.setCustomModes([updatedMode]);
        await timeout(0);
        const updatedModes = chatModeService.getModes();
        const updatedCustomMode = updatedModes.custom[0];
        // The instance should be the same (reused)
        assert.strictEqual(initialCustomMode, updatedCustomMode);
        // But the observable properties should be updated
        assert.strictEqual(updatedCustomMode.description.get(), 'Updated description');
        assert.deepStrictEqual(updatedCustomMode.customTools?.get(), ['tool1', 'tool2']);
        assert.strictEqual(updatedCustomMode.body?.get(), 'Updated body');
        assert.strictEqual(updatedCustomMode.model?.get(), 'Updated model');
    });
    test('should remove custom modes that no longer exist', async () => {
        const mode1 = {
            uri: URI.parse('file:///test/mode1.md'),
            name: 'Mode 1',
            description: 'First mode',
            tools: [],
            body: 'Mode 1 body'
        };
        const mode2 = {
            uri: URI.parse('file:///test/mode2.md'),
            name: 'Mode 2',
            description: 'Second mode',
            tools: [],
            body: 'Mode 2 body'
        };
        // Add both modes
        promptsService.setCustomModes([mode1, mode2]);
        await timeout(0);
        let modes = chatModeService.getModes();
        assert.strictEqual(modes.custom.length, 2);
        // Remove one mode
        promptsService.setCustomModes([mode1]);
        await timeout(0);
        modes = chatModeService.getModes();
        assert.strictEqual(modes.custom.length, 1);
        assert.strictEqual(modes.custom[0].id, mode1.uri.toString());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vY2hhdE1vZGVTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ2hILE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3pELE9BQU8sRUFBbUIsZUFBZSxFQUFFLE1BQU0scURBQXFELENB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