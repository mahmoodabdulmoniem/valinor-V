/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { flakySuite } from '../../../../base/test/common/testUtils.js';
function testErrorMessage(module) {
    return `Unable to load "${module}" dependency. It was probably not compiled for the right operating system architecture or had missing build tools.`;
}
flakySuite('Native Modules (all platforms)', () => {
    (isMacintosh ? test.skip : test)('kerberos', async () => {
        const { default: kerberos } = await import('kerberos');
        assert.ok(typeof kerberos.initializeClient === 'function', testErrorMessage('kerberos'));
    });
    test('yauzl', async () => {
        const { default: yauzl } = await import('yauzl');
        assert.ok(typeof yauzl.ZipFile === 'function', testErrorMessage('yauzl'));
    });
    test('yazl', async () => {
        const { default: yazl } = await import('yazl');
        assert.ok(typeof yazl.ZipFile === 'function', testErrorMessage('yazl'));
    });
    test('v8-inspect-profiler', async () => {
        const { default: profiler } = await import('v8-inspect-profiler');
        assert.ok(typeof profiler.startProfiling === 'function', testErrorMessage('v8-inspect-profiler'));
    });
    test('native-is-elevated', async () => {
        const { default: isElevated } = await import('native-is-elevated');
        assert.ok(typeof isElevated === 'function', testErrorMessage('native-is-elevated '));
        const result = isElevated();
        assert.ok(typeof result === 'boolean', testErrorMessage('native-is-elevated'));
    });
    test('native-keymap', async () => {
        const keyMap = await import('native-keymap');
        assert.ok(typeof keyMap.onDidChangeKeyboardLayout === 'function', testErrorMessage('native-keymap'));
        assert.ok(typeof keyMap.getCurrentKeyboardLayout === 'function', testErrorMessage('native-keymap'));
        const result = keyMap.getCurrentKeyboardLayout();
        assert.ok(result, testErrorMessage('native-keymap'));
    });
    test('native-watchdog', async () => {
        const watchDog = await import('native-watchdog');
        assert.ok(typeof watchDog.start === 'function', testErrorMessage('native-watchdog'));
    });
    test('@vscode/sudo-prompt', async () => {
        const prompt = await import('@vscode/sudo-prompt');
        assert.ok(typeof prompt.exec === 'function', testErrorMessage('@vscode/sudo-prompt'));
    });
    test('@vscode/policy-watcher', async () => {
        const watcher = await import('@vscode/policy-watcher');
        assert.ok(typeof watcher.createWatcher === 'function', testErrorMessage('@vscode/policy-watcher'));
    });
    test('node-pty', async () => {
        const nodePty = await import('node-pty');
        assert.ok(typeof nodePty.spawn === 'function', testErrorMessage('node-pty'));
    });
    test('@vscode/spdlog', async () => {
        const spdlog = await import('@vscode/spdlog');
        assert.ok(typeof spdlog.createRotatingLogger === 'function', testErrorMessage('@vscode/spdlog'));
        assert.ok(typeof spdlog.version === 'number', testErrorMessage('@vscode/spdlog'));
    });
    test('@parcel/watcher', async () => {
        const parcelWatcher = await import('@parcel/watcher');
        assert.ok(typeof parcelWatcher.subscribe === 'function', testErrorMessage('@parcel/watcher'));
    });
    test('@vscode/deviceid', async () => {
        const deviceIdPackage = await import('@vscode/deviceid');
        assert.ok(typeof deviceIdPackage.getDeviceId === 'function', testErrorMessage('@vscode/deviceid'));
    });
    test('@vscode/ripgrep', async () => {
        const ripgrep = await import('@vscode/ripgrep');
        assert.ok(typeof ripgrep.rgPath === 'string', testErrorMessage('@vscode/ripgrep'));
    });
    test('vscode-regexpp', async () => {
        const regexpp = await import('vscode-regexpp');
        assert.ok(typeof regexpp.RegExpParser === 'function', testErrorMessage('vscode-regexpp'));
    });
    test('@vscode/sqlite3', async () => {
        const { default: sqlite3 } = await import('@vscode/sqlite3');
        assert.ok(typeof sqlite3.Database === 'function', testErrorMessage('@vscode/sqlite3'));
    });
    test('http-proxy-agent', async () => {
        const { default: mod } = await import('http-proxy-agent');
        assert.ok(typeof mod.HttpProxyAgent === 'function', testErrorMessage('http-proxy-agent'));
    });
    test('https-proxy-agent', async () => {
        const { default: mod } = await import('https-proxy-agent');
        assert.ok(typeof mod.HttpsProxyAgent === 'function', testErrorMessage('https-proxy-agent'));
    });
    test('@vscode/proxy-agent', async () => {
        const proxyAgent = await import('@vscode/proxy-agent');
        // This call will load `@vscode/proxy-agent` which is a native module that we want to test on Windows
        const windowsCerts = await proxyAgent.loadSystemCertificates({
            log: {
                trace: () => { },
                debug: () => { },
                info: () => { },
                warn: () => { },
                error: () => { }
            }
        });
        assert.ok(windowsCerts.length > 0, testErrorMessage('@vscode/proxy-agent'));
    });
});
(!isWindows ? suite.skip : suite)('Native Modules (Windows)', () => {
    test('@vscode/windows-mutex', async () => {
        const mutex = await import('@vscode/windows-mutex');
        assert.ok(mutex && typeof mutex.isActive === 'function', testErrorMessage('@vscode/windows-mutex'));
        assert.ok(typeof mutex.isActive === 'function', testErrorMessage('@vscode/windows-mutex'));
        assert.ok(typeof mutex.Mutex === 'function', testErrorMessage('@vscode/windows-mutex'));
    });
    test('windows-foreground-love', async () => {
        const foregroundLove = await import('windows-foreground-love');
        assert.ok(typeof foregroundLove.allowSetForegroundWindow === 'function', testErrorMessage('windows-foreground-love'));
        const result = foregroundLove.allowSetForegroundWindow(process.pid);
        assert.ok(typeof result === 'boolean', testErrorMessage('windows-foreground-love'));
    });
    test('@vscode/windows-process-tree', async () => {
        const processTree = await import('@vscode/windows-process-tree');
        assert.ok(typeof processTree.getProcessTree === 'function', testErrorMessage('@vscode/windows-process-tree'));
        return new Promise((resolve, reject) => {
            processTree.getProcessTree(process.pid, tree => {
                if (tree) {
                    resolve();
                }
                else {
                    reject(new Error(testErrorMessage('@vscode/windows-process-tree')));
                }
            });
        });
    });
    test('@vscode/windows-registry', async () => {
        const windowsRegistry = await import('@vscode/windows-registry');
        assert.ok(typeof windowsRegistry.GetStringRegKey === 'function', testErrorMessage('@vscode/windows-registry'));
        const result = windowsRegistry.GetStringRegKey('HKEY_LOCAL_MACHINE', 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', 'EditionID');
        assert.ok(typeof result === 'string' || typeof result === 'undefined', testErrorMessage('@vscode/windows-registry'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTW9kdWxlcy5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L3Rlc3Qvbm9kZS9uYXRpdmVNb2R1bGVzLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFdkUsU0FBUyxnQkFBZ0IsQ0FBQyxNQUFjO0lBQ3ZDLE9BQU8sbUJBQW1CLE1BQU0sb0hBQW9ILENBQUM7QUFDdEosQ0FBQztBQUVELFVBQVUsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7SUFFakQsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2RCxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxRQUFRLENBQUMsZ0JBQWdCLEtBQUssVUFBVSxFQUFFLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hCLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakQsTUFBTSxD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