/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITerminalInstanceService } from '../../browser/terminal.js';
import { TerminalProcessManager } from '../../browser/terminalProcessManager.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
class TestTerminalChildProcess {
    get capabilities() { return []; }
    constructor(shouldPersist) {
        this.shouldPersist = shouldPersist;
        this.id = 0;
        this.onDidChangeProperty = Event.None;
        this.onProcessData = Event.None;
        this.onProcessExit = Event.None;
        this.onProcessReady = Event.None;
        this.onProcessTitleChanged = Event.None;
        this.onProcessShellTypeChanged = Event.None;
    }
    updateProperty(property, value) {
        throw new Error('Method not implemented.');
    }
    async start() { return undefined; }
    shutdown(immediate) { }
    input(data) { }
    sendSignal(signal) { }
    resize(cols, rows) { }
    clearBuffer() { }
    acknowledgeDataEvent(charCount) { }
    async setUnicodeVersion(version) { }
    async getInitialCwd() { return ''; }
    async getCwd() { return ''; }
    async processBinary(data) { }
    refreshProperty(property) { return Promise.resolve(''); }
}
class TestTerminalInstanceService {
    getBackend() {
        return {
            onPtyHostExit: Event.None,
            onPtyHostUnresponsive: Event.None,
            onPtyHostResponsive: Event.None,
            onPtyHostRestart: Event.None,
            onDidMoveWindowInstance: Event.None,
            onDidRequestDetach: Event.None,
            createProcess: (shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, windowsEnableConpty, shouldPersist) => new TestTerminalChildProcess(shouldPersist),
            getLatency: () => Promise.resolve([])
        };
    }
}
suite('Workbench - TerminalProcessManager', () => {
    let manager;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        const instantiationService = workbenchInstantiationService(undefined, store);
        const configurationService = instantiationService.get(IConfigurationService);
        await configurationService.setUserConfiguration('editor', { fontFamily: 'foo' });
        await configurationService.setUserConfiguration('terminal', {
            integrated: {
                fontFamily: 'bar',
                enablePersistentSessions: true,
                shellIntegration: {
                    enabled: false
                }
            }
        });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
        });
        instantiationService.stub(ITerminalInstanceService, new TestTerminalInstanceService());
        manager = store.add(instantiationService.createInstance(TerminalProcessManager, 1, undefined, undefined, undefined));
    });
    suite('process persistence', () => {
        suite('local', () => {
            test('regular terminal should persist', async () => {
                const p = await manager.createProcess({}, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, true);
            });
            test('task terminal should not persist', async () => {
                const p = await manager.createProcess({
                    isFeatureTerminal: true
                }, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, false);
            });
        });
        suite('remote', () => {
            const remoteCwd = URI.from({
                scheme: Schemas.vscodeRemote,
                path: 'test/cwd'
            });
            test('regular terminal should persist', async () => {
                const p = await manager.createProcess({
                    cwd: remoteCwd
                }, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, true);
            });
            test('task terminal should not persist', async () => {
                const p = await manager.createProcess({
                    isFeatureTerminal: true,
                    cwd: remoteCwd
                }, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, false);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvdGVybWluYWxQcm9jZXNzTWFuYWdlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDckMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFHdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFbEcsTUFBTSx3QkFBd0I7SUFFN0IsSUFBSSxZQUFZLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pDLFlBQ1UsYUFBc0I7UUFBdEIsa0JBQWEsR0FBYixhQUFhLENBQVM7UUFIaEMsT0FBRSxHQUFXLENBQUMsQ0FBQztRQWNmLHdCQUFtQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDakMsa0JBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQzNCLGtCQUFhLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztRQUMz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