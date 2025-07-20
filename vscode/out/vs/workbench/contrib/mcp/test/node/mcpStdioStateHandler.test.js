/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { spawn } from 'child_process';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import * as assert from 'assert';
import { McpStdioStateHandler } from '../../node/mcpStdioStateHandler.js';
import { isWindows } from '../../../../../base/common/platform.js';
const GRACE_TIME = 100;
suite('McpStdioStateHandler', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    function run(code) {
        const child = spawn('node', ['-e', code], {
            stdio: 'pipe',
            env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        });
        return {
            child,
            handler: store.add(new McpStdioStateHandler(child, GRACE_TIME)),
            processId: new Promise((resolve) => {
                child.on('spawn', () => resolve(child.pid));
            }),
            output: new Promise((resolve) => {
                let output = '';
                child.stderr.setEncoding('utf-8').on('data', (data) => {
                    output += data.toString();
                });
                child.stdout.setEncoding('utf-8').on('data', (data) => {
                    output += data.toString();
                });
                child.on('close', () => resolve(output));
            }),
        };
    }
    test('stdin ends process', async () => {
        const { child, handler, output } = run(`
			const data = require('fs').readFileSync(0, 'utf-8');
			process.stdout.write('Data received: ' + data);
			process.on('SIGTERM', () => process.stdout.write('SIGTERM received'));
		`);
        child.stdin.write('Hello MCP!');
        handler.stop();
        const result = await output;
        assert.strictEqual(result.trim(), 'Data received: Hello MCP!');
    });
    if (!isWindows) {
        test('sigterm after grace', async () => {
            const { handler, output } = run(`
			setInterval(() => {}, 1000);
			process.stdin.on('end', () => process.stdout.write('stdin ended\\n'));
			process.stdin.resume();
			process.on('SIGTERM', () => {
				process.stdout.write('SIGTERM received', () => process.exit(0));
			});
		`);
            const before = Date.now();
            handler.stop();
            const result = await output;
            const delay = Date.now() - before;
            assert.strictEqual(result.trim(), 'stdin ended\nSIGTERM received');
            assert.ok(delay >= GRACE_TIME, `Expected at least ${GRACE_TIME}ms delay, got ${delay}ms`);
        });
    }
    test('sigkill after grace', async () => {
        const { handler, output } = run(`
			setInterval(() => {}, 1000);
			process.stdin.on('end', () => process.stdout.write('stdin ended\\n'));
			process.stdin.resume();
			process.on('SIGTERM', () => {
				process.stdout.write('SIGTERM received');
			});
		`);
        const before = Date.now();
        handler.stop();
        const result = await output;
        const delay = Date.now() - before;
        if (!isWindows) {
            assert.strictEqual(result.trim(), 'stdin ended\nSIGTERM received');
        }
        else {
            assert.strictEqual(result.trim(), 'stdin ended');
        }
        assert.ok(delay >= GRACE_TIME * 2, `Expected at least ${GRACE_TIME * 2}ms delay, got ${delay}ms`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU3RkaW9TdGF0ZUhhbmRsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL3Rlc3Qvbm9kZS9tY3BTdGRpb1N0YXRlSGFuZGxlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDdEMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRW5FLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQztBQUV2QixLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsU0FBUyxHQUFHLENBQUMsSUFBWTtRQUN4QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ3pDLEtBQUssRUFBRSxNQUFNO1lBQ2IsR0FBRyxFQUFFLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtTQUNsRCxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ04sS0FBSztZQUNMLE9BQU8sRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksb0JBQW9CLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQy9ELFNBQVMsRUFBRSxJQUFJLE9BQU8sQ0FBUyxDQUFDLE9BQU8s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