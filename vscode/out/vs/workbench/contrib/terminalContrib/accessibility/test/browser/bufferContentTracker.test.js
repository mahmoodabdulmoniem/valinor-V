/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { ContextMenuService } from '../../../../../../platform/contextview/browser/contextMenuService.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILayoutService } from '../../../../../../platform/layout/browser/layoutService.js';
import { ILoggerService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../../platform/theme/test/common/testThemeService.js';
import { writeP } from '../../../../terminal/browser/terminalTestHelpers.js';
import { XtermTerminal } from '../../../../terminal/browser/xterm/xtermTerminal.js';
import { BufferContentTracker } from '../../browser/bufferContentTracker.js';
import { ILifecycleService } from '../../../../../services/lifecycle/common/lifecycle.js';
import { TestLayoutService, TestLifecycleService } from '../../../../../test/browser/workbenchTestServices.js';
import { TestLoggerService } from '../../../../../test/common/workbenchTestServices.js';
import { IAccessibilitySignalService } from '../../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ITerminalConfigurationService } from '../../../../terminal/browser/terminal.js';
import { TerminalConfigurationService } from '../../../../terminal/browser/terminalConfigurationService.js';
const defaultTerminalConfig = {
    fontFamily: 'monospace',
    fontWeight: 'normal',
    fontWeightBold: 'normal',
    gpuAcceleration: 'off',
    scrollback: 1000,
    fastScrollSensitivity: 2,
    mouseWheelScrollSensitivity: 1,
    unicodeVersion: '6'
};
suite('Buffer Content Tracker', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let themeService;
    let xterm;
    let capabilities;
    let bufferTracker;
    const prompt = 'vscode-git:(prompt/more-tests)';
    const promptPlusData = 'vscode-git:(prompt/more-tests) ' + 'some data';
    setup(async () => {
        configurationService = new TestConfigurationService({ terminal: { integrated: defaultTerminalConfig } });
        instantiationService = store.add(new TestInstantiationService());
        themeService = new TestThemeService();
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(ITerminalConfigurationService, store.add(instantiationService.createInstance(TerminalConfigurationService)));
        instantiationService.stub(IThemeService, themeService);
        instantiationService.stub(ITerminalLogService, new NullLogService());
        instantiationService.stub(ILoggerService, store.add(new TestLoggerService()));
        instantiationService.stub(IContextMenuService, store.add(instantiationService.createInstance(ContextMenuService)));
        instantiationService.stub(ILifecycleService, store.add(new TestLifecycleService()));
        instantiationService.stub(IContextKeyService, store.add(new MockContextKeyService()));
        instantiationService.stub(IAccessibilitySignalService, {
            playSignal: async () => { },
            isSoundEnabled(signal) { return false; },
        });
        instantiationService.stub(ILayoutService, new TestLayoutService());
        capabilities = store.add(new TerminalCapabilityStore());
        if (!isWindows) {
            capabilities.add(1 /* TerminalCapability.NaiveCwdDetection */, null);
        }
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(instantiationService.createInstance(XtermTerminal, TerminalCtor, {
            cols: 80,
            rows: 30,
            xtermColorProvider: { getBackgroundColor: () => undefined },
            capabilities,
            disableShellIntegrationReporting: true
        }, undefined));
        const container = document.createElement('div');
        xterm.raw.open(container);
        configurationService = new TestConfigurationService({ terminal: { integrated: { tabs: { separator: ' - ', title: '${cwd}', description: '${cwd}' } } } });
        bufferTracker = store.add(instantiationService.createInstance(BufferContentTracker, xterm));
    });
    test('should not clear the prompt line', async () => {
        assert.strictEqual(bufferTracker.lines.length, 0);
        await writeP(xterm.raw, prompt);
        xterm.clearBuffer();
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
    });
    test('repeated updates should not change the content', async () => {
        assert.strictEqual(bufferTracker.lines.length, 0);
        await writeP(xterm.raw, prompt);
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [prompt]);
    });
    test('should add lines in the viewport and scrollback', async () => {
        await writeAndAssertBufferState(promptPlusData, 38, xterm.raw, bufferTracker);
    });
    test('should add lines in the viewport and full scrollback', async () => {
        await writeAndAssertBufferState(promptPlusData, 1030, xterm.raw, bufferTracker);
    });
    test('should refresh viewport', async () => {
        await writeAndAssertBufferState(promptPlusData, 6, xterm.raw, bufferTracker);
        await writeP(xterm.raw, '\x1b[3Ainserteddata');
        bufferTracker.update();
        assert.deepStrictEqual(bufferTracker.lines, [promptPlusData, promptPlusData, `${promptPlusData}inserteddata`, promptPlusData, promptPlusData, promptPlusData]);
    });
    test('should refresh viewport with full scrollback', async () => {
        const content = `${prompt}\r\n`.repeat(1030).trimEnd();
        await writeP(xterm.raw, content);
        bufferTracker.update();
        await writeP(xterm.raw, '\x1b[4Ainsertion');
        bufferTracker.update();
        const expected = content.split('\r\n');
        expected[1025] = `${prompt}insertion`;
        assert.deepStrictEqual(bufferTracker.lines[1025], `${prompt}insertion`);
    });
    test('should cap the size of the cached lines, removing old lines in favor of new lines', async () => {
        const content = `${prompt}\r\n`.repeat(1036).trimEnd();
        await writeP(xterm.raw, content);
        bufferTracker.update();
        const expected = content.split('\r\n');
        // delete the 6 lines that should be trimmed
        for (let i = 0; i < 6; i++) {
            expected.pop();
        }
        // insert a new character
        await writeP(xterm.raw, '\x1b[2Ainsertion');
        bufferTracker.update();
        expected[1027] = `${prompt}insertion`;
        assert.strictEqual(bufferTracker.lines.length, expected.length);
        assert.deepStrictEqual(bufferTracker.lines, expected);
    });
});
async function writeAndAssertBufferState(data, rows, terminal, bufferTracker) {
    const content = `${data}\r\n`.repeat(rows).trimEnd();
    await writeP(terminal, content);
    bufferTracker.update();
    assert.strictEqual(bufferTracker.lines.length, rows);
    assert.deepStrictEqual(bufferTracker.lines, content.split('\r\n'));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyQ29udGVudFRyYWNrZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2FjY2Vzc2liaWxpdHkvdGVzdC9icm93c2VyL2J1ZmZlckNvbnRlbnRUcmFja2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNwRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUNuSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUU5RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQztBQUM3SCxP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