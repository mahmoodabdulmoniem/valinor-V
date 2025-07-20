/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mockObject } from '../../../../../base/test/common/mock.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IExtensionService, nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { TestExtensionService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { ChatAgentService, IChatAgentService } from '../../common/chatAgents.js';
import { ChatRequestParser } from '../../common/chatRequestParser.js';
import { IChatService } from '../../common/chatService.js';
import { IChatSlashCommandService } from '../../common/chatSlashCommands.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { ChatModeKind, ChatAgentLocation } from '../../common/constants.js';
import { ToolDataSource } from '../../common/languageModelToolsService.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { MockChatService } from './mockChatService.js';
import { MockPromptsService } from './mockPromptsService.js';
suite('ChatRequestParser', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let parser;
    let variableService;
    setup(async () => {
        instantiationService = testDisposables.add(new TestInstantiationService());
        instantiationService.stub(IStorageService, testDisposables.add(new TestStorageService()));
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IExtensionService, new TestExtensionService());
        instantiationService.stub(IChatService, new MockChatService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IChatAgentService, testDisposables.add(instantiationService.createInstance(ChatAgentService)));
        instantiationService.stub(IPromptsService, testDisposables.add(new MockPromptsService()));
        variableService = mockObject()();
        variableService.getDynamicVariables.returns([]);
        variableService.getSelectedTools.returns([]);
        variableService.getSelectedToolSets.returns([]);
        instantiationService.stub(IChatVariablesService, variableService);
    });
    test('plain text', async () => {
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', 'test');
        await assertSnapshot(result);
    });
    test('plain text with newlines', async () => {
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = 'line 1\nline 2\r\nline 3';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('slash in text', async () => {
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = 'can we add a new file for an Express router to handle the / route';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('slash command', async () => {
        const slashCommandService = mockObject()({});
        slashCommandService.getCommands.returns([{ command: 'fix' }]);
        instantiationService.stub(IChatSlashCommandService, slashCommandService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = '/fix this';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('invalid slash command', async () => {
        const slashCommandService = mockObject()({});
        slashCommandService.getCommands.returns([{ command: 'fix' }]);
        instantiationService.stub(IChatSlashCommandService, slashCommandService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = '/explain this';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('multiple slash commands', async () => {
        const slashCommandService = mockObject()({});
        slashCommandService.getCommands.returns([{ command: 'fix' }]);
        instantiationService.stub(IChatSlashCommandService, slashCommandService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = '/fix /fix';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('slash command not first', async () => {
        const slashCommandService = mockObject()({});
        slashCommandService.getCommands.returns([{ command: 'fix' }]);
        instantiationService.stub(IChatSlashCommandService, slashCommandService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = 'Hello /fix';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('slash command after whitespace', async () => {
        const slashCommandService = mockObject()({});
        slashCommandService.getCommands.returns([{ command: 'fix' }]);
        instantiationService.stub(IChatSlashCommandService, slashCommandService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = '    /fix';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('prompt slash command', async () => {
        const slashCommandService = mockObject()({});
        slashCommandService.getCommands.returns([{ command: 'fix' }]);
        instantiationService.stub(IChatSlashCommandService, slashCommandService);
        const promptSlashCommandService = mockObject()({});
        promptSlashCommandService.asPromptSlashCommand.callsFake((command) => {
            if (command.match(/^[\w_\-\.]+$/)) {
                return { command };
            }
            return undefined;
        });
        instantiationService.stub(IPromptsService, promptSlashCommandService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = '    /prompt';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('prompt slash command after text', async () => {
        const slashCommandService = mockObject()({});
        slashCommandService.getCommands.returns([{ command: 'fix' }]);
        instantiationService.stub(IChatSlashCommandService, slashCommandService);
        const promptSlashCommandService = mockObject()({});
        promptSlashCommandService.asPromptSlashCommand.callsFake((command) => {
            if (command.match(/^[\w_\-\.]+$/)) {
                return { command };
            }
            return undefined;
        });
        instantiationService.stub(IPromptsService, promptSlashCommandService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = 'handle the / route and the request of /search-option';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    test('prompt slash command after slash', async () => {
        const slashCommandService = mockObject()({});
        slashCommandService.getCommands.returns([{ command: 'fix' }]);
        instantiationService.stub(IChatSlashCommandService, slashCommandService);
        const promptSlashCommandService = mockObject()({});
        promptSlashCommandService.asPromptSlashCommand.callsFake((command) => {
            if (command.match(/^[\w_\-\.]+$/)) {
                return { command };
            }
            return undefined;
        });
        instantiationService.stub(IPromptsService, promptSlashCommandService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const text = '/ route and the request of /search-option';
        const result = parser.parseChatRequest('1', text);
        await assertSnapshot(result);
    });
    // test('variables', async () => {
    // 	varService.hasVariable.returns(true);
    // 	varService.getVariable.returns({ id: 'copilot.selection' });
    // 	parser = instantiationService.createInstance(ChatRequestParser);
    // 	const text = 'What does #selection mean?';
    // 	const result = parser.parseChatRequest('1', text);
    // 	await assertSnapshot(result);
    // });
    // test('variable with question mark', async () => {
    // 	varService.hasVariable.returns(true);
    // 	varService.getVariable.returns({ id: 'copilot.selection' });
    // 	parser = instantiationService.createInstance(ChatRequestParser);
    // 	const text = 'What is #selection?';
    // 	const result = parser.parseChatRequest('1', text);
    // 	await assertSnapshot(result);
    // });
    // test('invalid variables', async () => {
    // 	varService.hasVariable.returns(false);
    // 	parser = instantiationService.createInstance(ChatRequestParser);
    // 	const text = 'What does #selection mean?';
    // 	const result = parser.parseChatRequest('1', text);
    // 	await assertSnapshot(result);
    // });
    const getAgentWithSlashCommands = (slashCommands) => {
        return { id: 'agent', name: 'agent', extensionId: nullExtensionDescription.identifier, publisherDisplayName: '', extensionDisplayName: '', extensionPublisherId: '', locations: [ChatAgentLocation.Panel], modes: [ChatModeKind.Ask], metadata: {}, slashCommands, disambiguation: [] };
    };
    test('agent with subcommand after text', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([getAgentWithSlashCommands([{ name: 'subCommand', description: '' }])]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent Please do /subCommand thanks');
        await assertSnapshot(result);
    });
    test('agents, subCommand', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([getAgentWithSlashCommands([{ name: 'subCommand', description: '' }])]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent /subCommand Please do thanks');
        await assertSnapshot(result);
    });
    test('agent but edit mode', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([getAgentWithSlashCommands([])]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent hello', undefined, { mode: ChatModeKind.Edit });
        await assertSnapshot(result);
    });
    test('agent with question mark', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([getAgentWithSlashCommands([{ name: 'subCommand', description: '' }])]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent? Are you there');
        await assertSnapshot(result);
    });
    test('agent and subcommand with leading whitespace', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([getAgentWithSlashCommands([{ name: 'subCommand', description: '' }])]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '    \r\n\t   @agent \r\n\t   /subCommand Thanks');
        await assertSnapshot(result);
    });
    test('agent and subcommand after newline', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([getAgentWithSlashCommands([{ name: 'subCommand', description: '' }])]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '    \n@agent\n/subCommand Thanks');
        await assertSnapshot(result);
    });
    test('agent not first', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([getAgentWithSlashCommands([{ name: 'subCommand', description: '' }])]);
        instantiationService.stub(IChatAgentService, agentsService);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', 'Hello Mr. @agent');
        await assertSnapshot(result);
    });
    test('agents and tools and multiline', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([getAgentWithSlashCommands([{ name: 'subCommand', description: '' }])]);
        instantiationService.stub(IChatAgentService, agentsService);
        variableService.getSelectedTools.returns([
            { id: 'get_selection', toolReferenceName: 'selection', canBeReferencedInPrompt: true, displayName: '', modelDescription: '', source: ToolDataSource.Internal },
            { id: 'get_debugConsole', toolReferenceName: 'debugConsole', canBeReferencedInPrompt: true, displayName: '', modelDescription: '', source: ToolDataSource.Internal }
        ]);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent /subCommand \nPlease do with #selection\nand #debugConsole');
        await assertSnapshot(result);
    });
    test('agents and tools and multiline, part2', async () => {
        const agentsService = mockObject()({});
        agentsService.getAgentsByName.returns([getAgentWithSlashCommands([{ name: 'subCommand', description: '' }])]);
        instantiationService.stub(IChatAgentService, agentsService);
        variableService.getSelectedTools.returns([
            { id: 'get_selection', toolReferenceName: 'selection', canBeReferencedInPrompt: true, displayName: '', modelDescription: '', source: ToolDataSource.Internal },
            { id: 'get_debugConsole', toolReferenceName: 'debugConsole', canBeReferencedInPrompt: true, displayName: '', modelDescription: '', source: ToolDataSource.Internal }
        ]);
        parser = instantiationService.createInstance(ChatRequestParser);
        const result = parser.parseChatRequest('1', '@agent Please \ndo /subCommand with #selection\nand #debugConsole');
        await assertSnapshot(result);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlcXVlc3RQYXJzZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9jaGF0UmVxdWVzdFBhcnNlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBYyxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDaEgsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbkgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUcsT0FBTyxFQUFFLGdCQUFnQixFQUFxQyxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3BILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FB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