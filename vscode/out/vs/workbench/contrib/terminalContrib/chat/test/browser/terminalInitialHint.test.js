/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ShellIntegrationAddon } from '../../../../../../platform/terminal/common/xterm/shellIntegrationAddon.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { InitialHintAddon } from '../../browser/terminal.initialHint.contribution.js';
import { getActiveDocument } from '../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { strictEqual } from 'assert';
import { ExtensionIdentifier } from '../../../../../../platform/extensions/common/extensions.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ChatAgentLocation, ChatModeKind } from '../../../../chat/common/constants.js';
suite('Terminal Initial Hint Addon', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let eventCount = 0;
    let xterm;
    let initialHintAddon;
    const onDidChangeAgentsEmitter = new Emitter();
    const onDidChangeAgents = onDidChangeAgentsEmitter.event;
    const agent = {
        id: 'termminal',
        name: 'terminal',
        extensionId: new ExtensionIdentifier('test'),
        extensionPublisherId: 'test',
        extensionDisplayName: 'test',
        metadata: {},
        slashCommands: [{ name: 'test', description: 'test' }],
        disambiguation: [],
        locations: [ChatAgentLocation.fromRaw('terminal')],
        modes: [ChatModeKind.Ask],
        invoke: async () => { return {}; }
    };
    const editorAgent = {
        id: 'editor',
        name: 'editor',
        extensionId: new ExtensionIdentifier('test-editor'),
        extensionPublisherId: 'test-editor',
        extensionDisplayName: 'test-editor',
        metadata: {},
        slashCommands: [{ name: 'test', description: 'test' }],
        locations: [ChatAgentLocation.fromRaw('editor')],
        modes: [ChatModeKind.Ask],
        disambiguation: [],
        invoke: async () => { return {}; }
    };
    setup(async () => {
        const instantiationService = workbenchInstantiationService({}, store);
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor());
        const shellIntegrationAddon = store.add(new ShellIntegrationAddon('', true, undefined, undefined, new NullLogService));
        initialHintAddon = store.add(instantiationService.createInstance(InitialHintAddon, shellIntegrationAddon.capabilities, onDidChangeAgents));
        store.add(initialHintAddon.onDidRequestCreateHint(() => eventCount++));
        const testContainer = document.createElement('div');
        getActiveDocument().body.append(testContainer);
        xterm.open(testContainer);
        xterm.loadAddon(shellIntegrationAddon);
        xterm.loadAddon(initialHintAddon);
    });
    suite('Chat providers', () => {
        test('hint is not shown when there are no chat providers', () => {
            eventCount = 0;
            xterm.focus();
            strictEqual(eventCount, 0);
        });
        test('hint is not shown when there is just an editor agent', () => {
            eventCount = 0;
            onDidChangeAgentsEmitter.fire(editorAgent);
            xterm.focus();
            strictEqual(eventCount, 0);
        });
        test('hint is shown when there is a terminal chat agent', () => {
            eventCount = 0;
            onDidChangeAgentsEmitter.fire(editorAgent);
            xterm.focus();
            strictEqual(eventCount, 0);
            onDidChangeAgentsEmitter.fire(agent);
            strictEqual(eventCount, 1);
        });
        test('hint is not shown again when another terminal chat agent is added if it has already shown', () => {
            eventCount = 0;
            onDidChangeAgentsEmitter.fire(agent);
            xterm.focus();
            strictEqual(eventCount, 1);
            onDidChangeAgentsEmitter.fire(agent);
            strictEqual(eventCount, 1);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbml0aWFsSGludC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdC90ZXN0L2Jyb3dzZXIvdGVybWluYWxJbml0aWFsSGludC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ2xILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNyQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVqRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkYsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6QyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBQ3hELElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztJQUNuQixJQUFJLEtBQWUsQ0FBQztJQUNwQixJQUFJLGdC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