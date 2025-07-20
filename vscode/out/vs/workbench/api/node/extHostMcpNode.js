/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { parseEnvFile } from '../../../base/common/envfile.js';
import { untildify } from '../../../base/common/labels.js';
import { DisposableMap } from '../../../base/common/lifecycle.js';
import * as path from '../../../base/common/path.js';
import { StreamSplitter } from '../../../base/node/nodeStreams.js';
import { findExecutable } from '../../../base/node/processes.js';
import { ILogService, LogLevel } from '../../../platform/log/common/log.js';
import { McpStdioStateHandler } from '../../contrib/mcp/node/mcpStdioStateHandler.js';
import { IExtHostInitDataService } from '../common/extHostInitDataService.js';
import { ExtHostMcpService } from '../common/extHostMcp.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
let NodeExtHostMpcService = class NodeExtHostMpcService extends ExtHostMcpService {
    constructor(extHostRpc, initDataService, logService) {
        super(extHostRpc, logService, initDataService);
        this.nodeServers = this._register(new DisposableMap());
    }
    _startMcp(id, launch) {
        if (launch.type === 1 /* McpServerTransportType.Stdio */) {
            this.startNodeMpc(id, launch);
        }
        else {
            super._startMcp(id, launch);
        }
    }
    $stopMcp(id) {
        const nodeServer = this.nodeServers.get(id);
        if (nodeServer) {
            nodeServer.stop(); // will get removed from map when process is fully stopped
        }
        else {
            super.$stopMcp(id);
        }
    }
    $sendMessage(id, message) {
        const nodeServer = this.nodeServers.get(id);
        if (nodeServer) {
            nodeServer.write(message);
        }
        else {
            super.$sendMessage(id, message);
        }
    }
    async startNodeMpc(id, launch) {
        const onError = (err) => this._proxy.$onDidChangeState(id, {
            state: 3 /* McpConnectionState.Kind.Error */,
            code: err.hasOwnProperty('code') ? String(err.code) : undefined,
            message: typeof err === 'string' ? err : err.message,
        });
        // MCP servers are run on the same authority where they are defined, so
        // reading the envfile based on its path off the filesystem here is fine.
        const env = { ...process.env };
        if (launch.envFile) {
            try {
                for (const [key, value] of parseEnvFile(await readFile(launch.envFile, 'utf-8'))) {
                    env[key] = value;
                }
            }
            catch (e) {
                onError(`Failed to read envFile '${launch.envFile}': ${e.message}`);
                return;
            }
        }
        for (const [key, value] of Object.entries(launch.env)) {
            env[key] = value === null ? undefined : String(value);
        }
        let child;
        try {
            const home = homedir();
            let cwd = launch.cwd ? untildify(launch.cwd, home) : home;
            if (!path.isAbsolute(cwd)) {
                cwd = path.join(home, cwd);
            }
            const { executable, args, shell } = await formatSubprocessArguments(untildify(launch.command, home), launch.args.map(a => untildify(a, home)), cwd, env);
            this._proxy.$onDidPublishLog(id, LogLevel.Debug, `Server command line: ${executable} ${args.join(' ')}`);
            child = spawn(executable, args, {
                stdio: 'pipe',
                cwd,
                env,
                shell,
            });
        }
        catch (e) {
            onError(e);
            return;
        }
        // Create the connection manager for graceful shutdown
        const connectionManager = new McpStdioStateHandler(child);
        this._proxy.$onDidChangeState(id, { state: 1 /* McpConnectionState.Kind.Starting */ });
        child.stdout.pipe(new StreamSplitter('\n')).on('data', line => this._proxy.$onDidReceiveMessage(id, line.toString()));
        child.stdin.on('error', onError);
        child.stdout.on('error', onError);
        // Stderr handling is not currently specified https://github.com/modelcontextprotocol/specification/issues/177
        // Just treat it as generic log data for now
        child.stderr.pipe(new StreamSplitter('\n')).on('data', line => this._proxy.$onDidPublishLog(id, LogLevel.Warning, `[server stderr] ${line.toString().trimEnd()}`));
        child.on('spawn', () => this._proxy.$onDidChangeState(id, { state: 2 /* McpConnectionState.Kind.Running */ }));
        child.on('error', e => {
            onError(e);
        });
        child.on('exit', code => {
            this.nodeServers.deleteAndDispose(id);
            if (code === 0 || connectionManager.stopped) {
                this._proxy.$onDidChangeState(id, { state: 0 /* McpConnectionState.Kind.Stopped */ });
            }
            else {
                this._proxy.$onDidChangeState(id, {
                    state: 3 /* McpConnectionState.Kind.Error */,
                    message: `Process exited with code ${code}`,
                });
            }
        });
        this.nodeServers.set(id, connectionManager);
    }
};
NodeExtHostMpcService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, ILogService)
], NodeExtHostMpcService);
export { NodeExtHostMpcService };
const windowsShellScriptRe = /\.(bat|cmd)$/i;
/**
 * Formats arguments to avoid issues on Windows for CVE-2024-27980.
 */
export const formatSubprocessArguments = async (executable, args, cwd, env) => {
    if (process.platform !== 'win32') {
        return { executable, args, shell: false };
    }
    const found = await findExecutable(executable, cwd, undefined, env);
    if (found && windowsShellScriptRe.test(found)) {
        const quote = (s) => s.includes(' ') ? `"${s}"` : s;
        return {
            executable: quote(found),
            args: args.map(quote),
            shell: true,
        };
    }
    return { executable, args, shell: false };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1jcE5vZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0TWNwTm9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWtDLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDN0IsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbEUsT0FBTyxLQUFLLElBQUksTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFNUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFN0QsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxpQkFBaUI7SUFDM0QsWUFDcUIsVUFBOEIsRUFDekIs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