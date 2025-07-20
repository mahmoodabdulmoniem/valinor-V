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
import { equals as arraysEqual } from '../../../../base/common/arrays.js';
import { assertNever } from '../../../../base/common/assert.js';
import { Throttler } from '../../../../base/common/async.js';
import * as glob from '../../../../base/common/glob.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { equals as objectsEqual } from '../../../../base/common/objects.js';
import { autorun, autorunDelta, derivedOpts } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IDebugService } from '../../debug/common/debug.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
let McpDevModeServerAttache = class McpDevModeServerAttache extends Disposable {
    constructor(server, fwdRef, registry, fileService, workspaceContextService) {
        super();
        this.active = false;
        const workspaceFolder = server.readDefinitions().map(({ collection }) => collection?.presentation?.origin &&
            workspaceContextService.getWorkspaceFolder(collection.presentation?.origin)?.uri);
        const restart = async () => {
            const lastDebugged = fwdRef.lastModeDebugged;
            await server.stop();
            await server.start({ isFromInteraction: false, debug: lastDebugged });
        };
        // 1. Auto-start the server, restart if entering debug mode
        let didAutoStart = false;
        this._register(autorun(reader => {
            const defs = server.readDefinitions().read(reader);
            if (!defs.collection || !defs.server || !defs.server.devMode) {
                didAutoStart = false;
                return;
            }
            // don't keep trying to start the server unless it's a new server or devmode is newly turned on
            if (didAutoStart) {
                return;
            }
            const delegates = registry.delegates.read(reader);
            if (!delegates.some(d => d.canStart(defs.collection, defs.server))) {
                return;
            }
            server.start();
            didAutoStart = true;
        }));
        const debugMode = server.readDefinitions().map(d => !!d.server?.devMode?.debug);
        this._register(autorunDelta(debugMode, ({ lastValue, newValue }) => {
            if (!!newValue && !objectsEqual(lastValue, newValue)) {
                restart();
            }
        }));
        // 2. Watch for file changes
        const watchObs = derivedOpts({ equalsFn: arraysEqual }, reader => {
            const def = server.readDefinitions().read(reader);
            const watch = def.server?.devMode?.watch;
            return typeof watch === 'string' ? [watch] : watch;
        });
        const restartScheduler = this._register(new Throttler());
        this._register(autorun(reader => {
            const pattern = watchObs.read(reader);
            const wf = workspaceFolder.read(reader);
            if (!pattern || !wf) {
                return;
            }
            const includes = pattern.filter(p => !p.startsWith('!'));
            const excludes = pattern.filter(p => p.startsWith('!')).map(p => p.slice(1));
            reader.store.add(fileService.watch(wf, { includes, excludes, recursive: true }));
            const includeParse = includes.map(p => glob.parse({ base: wf.fsPath, pattern: p }));
            const excludeParse = excludes.map(p => glob.parse({ base: wf.fsPath, pattern: p }));
            reader.store.add(fileService.onDidFilesChange(e => {
                for (const change of [e.rawAdded, e.rawDeleted, e.rawUpdated]) {
                    for (const uri of change) {
                        if (includeParse.some(i => i(uri.fsPath)) && !excludeParse.some(e => e(uri.fsPath))) {
                            restartScheduler.queue(restart);
                            break;
                        }
                    }
                }
            }));
        }));
    }
};
McpDevModeServerAttache = __decorate([
    __param(2, IMcpRegistry),
    __param(3, IFileService),
    __param(4, IWorkspaceContextService)
], McpDevModeServerAttache);
export { McpDevModeServerAttache };
export const IMcpDevModeDebugging = createDecorator('mcpDevModeDebugging');
const DEBUG_HOST = '127.0.0.1';
let McpDevModeDebugging = class McpDevModeDebugging {
    constructor(_debugService, _commandService) {
        this._debugService = _debugService;
        this._commandService = _commandService;
    }
    async transform(definition, launch) {
        if (!definition.devMode?.debug || launch.type !== 1 /* McpServerTransportType.Stdio */) {
            return launch;
        }
        const port = await this.getDebugPort();
        const name = `MCP: ${definition.label}`; // for debugging
        const options = { startedByUser: false, suppressDebugView: true };
        const commonConfig = {
            internalConsoleOptions: 'neverOpen',
            suppressMultipleSessionWarning: true,
        };
        switch (definition.devMode.debug.type) {
            case 'node': {
                if (!/node[0-9]*$/.test(launch.command)) {
                    throw new Error(localize('mcp.debug.nodeBinReq', 'MCP server must be launched with the "node" executable to enable debugging, but was launched with "{0}"', launch.command));
                }
                // We intentionally assert types as the DA has additional properties beyong IConfig
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                this._debugService.startDebugging(undefined, {
                    type: 'pwa-node',
                    request: 'attach',
                    name,
                    port,
                    host: DEBUG_HOST,
                    timeout: 30_000,
                    continueOnAttach: true,
                    ...commonConfig,
                }, options);
                return { ...launch, args: [`--inspect-brk=${DEBUG_HOST}:${port}`, ...launch.args] };
            }
            case 'debugpy': {
                if (!/python[0-9.]*$/.test(launch.command)) {
                    throw new Error(localize('mcp.debug.pythonBinReq', 'MCP server must be launched with the "python" executable to enable debugging, but was launched with "{0}"', launch.command));
                }
                let command;
                let args = ['--wait-for-client', '--connect', `${DEBUG_HOST}:${port}`, ...launch.args];
                if (definition.devMode.debug.debugpyPath) {
                    command = definition.devMode.debug.debugpyPath;
                }
                else {
                    try {
                        // The Python debugger exposes a command to get its bundle debugpy module path.  Use that if it's available.
                        const debugPyPath = await this._commandService.executeCommand('python.getDebugpyPackagePath');
                        if (debugPyPath) {
                            command = launch.command;
                            args = [debugPyPath, ...args];
                        }
                    }
                    catch {
                        // ignored, no Python debugger extension installed or an error therein
                    }
                }
                if (!command) {
                    command = 'debugpy';
                }
                await Promise.race([
                    // eslint-disable-next-line local/code-no-dangerous-type-assertions
                    this._debugService.startDebugging(undefined, {
                        type: 'debugpy',
                        name,
                        request: 'attach',
                        listen: {
                            host: DEBUG_HOST,
                            port
                        },
                        ...commonConfig,
                    }, options),
                    this.ensureListeningOnPort(port)
                ]);
                return { ...launch, command, args };
            }
            default:
                assertNever(definition.devMode.debug, `Unknown debug type ${JSON.stringify(definition.devMode.debug)}`);
        }
    }
    ensureListeningOnPort(port) {
        return Promise.resolve();
    }
    getDebugPort() {
        return Promise.resolve(9230);
    }
};
McpDevModeDebugging = __decorate([
    __param(0, IDebugService),
    __param(1, ICommandService)
], McpDevModeDebugging);
export { McpDevModeDebugging };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwRGV2TW9kZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BEZXZNb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLElBQUksV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsTUFBTSxJQUFJLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQVcsYUFBYSxFQUF3QixNQUFNLDZCQUE2QixDQUFDO0FBQzNGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUc5QyxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFR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