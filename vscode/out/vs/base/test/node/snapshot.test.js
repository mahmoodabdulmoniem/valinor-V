/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { tmpdir } from 'os';
import { getRandomTestPath } from './testUtils.js';
import { Promises } from '../../node/pfs.js';
import { SnapshotContext, assertSnapshot } from '../common/snapshot.js';
import { URI } from '../../common/uri.js';
import { join } from '../../common/path.js';
import { assertThrowsAsync, ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
// tests for snapshot are in Node so that we can use native FS operations to
// set up and validate things.
//
// Uses snapshots for testing snapshots. It's snapception!
suite('snapshot', () => {
    let testDir;
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(function () {
        testDir = getRandomTestPath(tmpdir(), 'vsctests', 'snapshot');
        return fs.promises.mkdir(testDir, { recursive: true });
    });
    teardown(function () {
        return Promises.rm(testDir);
    });
    const makeContext = (test) => {
        return new class extends SnapshotContext {
            constructor() {
                super(test);
                this.snapshotsDir = URI.file(testDir);
            }
        };
    };
    const snapshotFileTree = async () => {
        let str = '';
        const printDir = async (dir, indent) => {
            const children = await Promises.readdir(dir);
            for (const child of children) {
                const p = join(dir, child);
                if ((await fs.promises.stat(p)).isFile()) {
                    const content = await fs.promises.readFile(p, 'utf-8');
                    str += `${' '.repeat(indent)}${child}:\n`;
                    for (const line of content.split('\n')) {
                        str += `${' '.repeat(indent + 2)}${line}\n`;
                    }
                }
                else {
                    str += `${' '.repeat(indent)}${child}/\n`;
                    await printDir(p, indent + 2);
                }
            }
        };
        await printDir(testDir, 0);
        await assertSnapshot(str);
    };
    test('creates a snapshot', async () => {
        const ctx = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        await ctx.assert({ cool: true });
        await snapshotFileTree();
    });
    test('validates a snapshot', async () => {
        const ctx1 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        await ctx1.assert({ cool: true });
        const ctx2 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        // should pass:
        await ctx2.assert({ cool: true });
        const ctx3 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        // should fail:
        await assertThrowsAsync(() => ctx3.assert({ cool: false }));
    });
    test('cleans up old snapshots', async () => {
        const ctx1 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        await ctx1.assert({ cool: true });
        await ctx1.assert({ nifty: true });
        await ctx1.assert({ customName: 1 }, { name: 'thirdTest', extension: 'txt' });
        await ctx1.assert({ customName: 2 }, { name: 'fourthTest' });
        await snapshotFileTree();
        const ctx2 = makeContext({
            file: 'foo/bar',
            fullTitle: () => 'hello world!'
        });
        await ctx2.assert({ cool: true });
        await ctx2.assert({ customName: 1 }, { name: 'thirdTest' });
        await ctx2.removeOldSnapshots();
        await snapshotFileTree();
    });
    test('formats object nicely', async () => {
        const circular = {};
        circular.a = circular;
        await assertSnapshot([
            1,
            true,
            undefined,
            null,
            123n,
            Symbol('heyo'),
            'hello',
            { hello: 'world' },
            circular,
            new Map([['hello', 1], ['goodbye', 2]]),
            new Set([1, 2, 3]),
            function helloWorld() { },
            /hello/g,
            new Array(10).fill('long string'.repeat(10)),
            { [Symbol.for('debug.description')]() { return `Range [1 -> 5]`; } },
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25hcHNob3QudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L25vZGUvc25hcHNob3QudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDNUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFaEcsNEVBQTRFO0FBQzVFLDhCQUE4QjtBQUM5QixFQUFFO0FBQ0YsMERBQTBEO0FBRTFELEtBQUssQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO0lBQ3RCLElBQUksT0FBZSxDQUFDO0lBRXBCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDO1FBQ0wsT0FBTyxHQUFHLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM5RCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3hELENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDO1FB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