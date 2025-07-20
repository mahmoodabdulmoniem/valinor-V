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
var RunInTerminalTool_1;
import { timeout } from '../../../../../base/common/async.js';
import { CancellationError } from '../../../../../base/common/errors.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { OS } from '../../../../../base/common/platform.js';
import { count } from '../../../../../base/common/strings.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../../chat/common/languageModelToolsService.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { ITerminalProfileResolverService } from '../../../terminal/common/terminal.js';
import { getRecommendedToolsOverRunInTerminal } from './alternativeRecommendation.js';
import { CommandLineAutoApprover } from './commandLineAutoApprover.js';
import { BasicExecuteStrategy } from './executeStrategy/basicExecuteStrategy.js';
import { NoneExecuteStrategy } from './executeStrategy/noneExecuteStrategy.js';
import { RichExecuteStrategy } from './executeStrategy/richExecuteStrategy.js';
import { isPowerShell } from './runInTerminalHelpers.js';
import { extractInlineSubCommands, splitCommandLineIntoSubCommands } from './subCommands.js';
import { ToolTerminalCreator } from './toolTerminalCreator.js';
const TERMINAL_SESSION_STORAGE_KEY = 'chat.terminalSessions';
export const RunInTerminalToolData = {
    id: 'run_in_terminal2',
    toolReferenceName: 'runInTerminal2',
    canBeReferencedInPrompt: true,
    displayName: localize('runInTerminalTool.displayName', 'Run in Terminal'),
    modelDescription: [
        'This tool allows you to execute shell commands in a persistent terminal session, preserving environment variables, working directory, and other context across multiple commands.',
        '',
        'Command Execution:',
        '- Supports multi-line commands',
        '',
        'Directory Management:',
        '- Must use absolute paths to avoid navigation issues.',
        '',
        'Program Execution:',
        '- Supports Python, Node.js, and other executables.',
        '- Install dependencies via pip, npm, etc.',
        '',
        'Background Processes:',
        '- For long-running tasks (e.g., servers), set isBackground=true.',
        '- Returns a terminal ID for checking status and runtime later.',
        '',
        'Output Management:',
        '- Output is automatically truncated if longer than 60KB to prevent context overflow',
        '- Use filters like \'head\', \'tail\', \'grep\' to limit output size',
        '- For pager commands, disable paging: use \'git --no-pager\' or add \'| cat\'',
        '',
        'Best Practices:',
        '- Be specific with commands to avoid excessive output',
        '- Use targeted queries instead of broad scans',
        '- Consider using \'wc -l\' to count before listing many items'
    ].join('\n'),
    userDescription: localize('runInTerminalTool.userDescription', 'Tool for running commands in the terminal'),
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The command to run in the terminal.'
            },
            explanation: {
                type: 'string',
                description: 'A one-sentence description of what the command does. This will be shown to the user before the command is run.'
            },
            isBackground: {
                type: 'boolean',
                description: 'Whether the command starts a background process. If true, the command will run in the background and you will not see the output. If false, the tool call will block on the command finishing, and then you will get the output. Examples of background processes: building in watch mode, starting a server. You can check the output of a background process later on by using get_terminal_output2.'
            },
        },
        required: [
            'command',
            'explanation',
            'isBackground',
        ]
    }
};
let RunInTerminalTool = class RunInTerminalTool extends Disposable {
    static { RunInTerminalTool_1 = this; }
    static { this._backgroundExecutions = new Map(); }
    static getBackgroundOutput(id) {
        const backgroundExecution = RunInTerminalTool_1._backgroundExecutions.get(id);
        if (!backgroundExecution) {
            throw new Error('Invalid terminal ID');
        }
        return backgroundExecution.getOutput();
    }
    constructor(_instantiationService, _languageModelToolsService, _storageService, _telemetryService, _logService, _terminalProfileResolverService, _terminalService, _remoteAgentService, _workspaceContextService) {
        super();
        this._instantiationService = _instantiationService;
        this._languageModelToolsService = _languageModelToolsService;
        this._storageService = _storageService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._terminalService = _terminalService;
        this._remoteAgentService = _remoteAgentService;
        this._workspaceContextService = _workspaceContextService;
        this._sessionTerminalAssociations = new Map();
        this._commandLineAutoApprover = this._register(_instantiationService.createInstance(CommandLineAutoApprover));
        this._osBackend = this._remoteAgentService.getEnvironment().then(remoteEnv => remoteEnv?.os ?? OS);
        // Restore terminal associations from storage
        this._restoreTerminalAssociations();
    }
    async prepareToolInvocation(context, token) {
        const args = context.parameters;
        this._alternativeRecommendation = getRecommendedToolsOverRunInTerminal(args.command, this._languageModelToolsService);
        const presentation = this._alternativeRecommendation ? 'hidden' : undefined;
        const os = await this._osBackend;
        const shell = await this._terminalProfileResolverService.getDefaultShell({
            os,
            remoteAuthority: this._remoteAgentService.getConnection()?.remoteAuthority
        });
        const language = os === 1 /* OperatingSystem.Windows */ ? 'pwsh' : 'sh';
        let confirmationMessages;
        if (this._alternativeRecommendation) {
            confirmationMessages = undefined;
        }
        else {
            const subCommands = splitCommandLineIntoSubCommands(args.command, shell, os);
            const inlineSubCommands = subCommands.map(e => Array.from(extractInlineSubCommands(e, shell, os))).flat();
            const allSubCommands = [...subCommands, ...inlineSubCommands];
            if (allSubCommands.every(e => this._commandLineAutoApprover.isAutoApproved(e, shell, os))) {
                confirmationMessages = undefined;
            }
            else {
                confirmationMessages = {
                    title: args.isBackground
                        ? localize('runInTerminal.background', "Run command in background terminal")
                        : localize('runInTerminal.foreground', "Run command in terminal"),
                    message: new MarkdownString(args.explanation),
                };
            }
        }
        const instance = context.chatSessionId ? this._sessionTerminalAssociations.get(context.chatSessionId)?.instance : undefined;
        let toolEditedCommand = await this._rewriteCommandIfNeeded(context, args, instance, shell);
        if (toolEditedCommand === args.command) {
            toolEditedCommand = undefined;
        }
        return {
            confirmationMessages,
            presentation,
            toolSpecificData: {
                kind: 'terminal2',
                commandLine: {
                    original: args.command,
                    toolEdited: toolEditedCommand
                },
                language,
            }
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        if (this._alternativeRecommendation) {
            return this._alternativeRecommendation;
        }
        const args = invocation.parameters;
        const toolSpecificData = invocation.toolSpecificData;
        if (toolSpecificData === undefined) {
            throw new Error('Tool specific data must be provided');
        }
        this._logService.debug(`RunInTerminalTool: Invoking with options ${JSON.stringify(args)}`);
        const chatSessionId = invocation.context?.sessionId;
        if (chatSessionId === undefined) {
            throw new Error('A chat session ID is required for this tool');
        }
        let command;
        let didUserEditCommand;
        let didToolEditCommand;
        if (toolSpecificData.kind === 'terminal') {
            command = toolSpecificData.command ?? this._rewrittenCommand ?? args.command;
            didUserEditCommand = typeof toolSpecificData?.command === 'string' && toolSpecificData.command !== args.command;
            didToolEditCommand = !didUserEditCommand && this._rewrittenCommand !== undefined;
        }
        else {
            command = toolSpecificData.commandLine.userEdited ?? toolSpecificData.commandLine.toolEdited ?? toolSpecificData.commandLine.original;
            didUserEditCommand = (toolSpecificData.commandLine.userEdited !== undefined &&
                toolSpecificData.commandLine.userEdited !== toolSpecificData.commandLine.original);
            didToolEditCommand = (!didUserEditCommand &&
                toolSpecificData.commandLine.toolEdited !== undefined &&
                toolSpecificData.commandLine.toolEdited !== toolSpecificData.commandLine.original);
        }
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        let error;
        const timingStart = Date.now();
        const termId = generateUuid();
        if (args.isBackground) {
            this._logService.debug(`RunInTerminalTool: Creating background terminal with ID=${termId}`);
            const toolTerminal = await this._instantiationService.createInstance(ToolTerminalCreator).createTerminal(token);
            this._sessionTerminalAssociations.set(chatSessionId, toolTerminal);
            if (token.isCancellationRequested) {
                toolTerminal.instance.dispose();
                throw new CancellationError();
            }
            await this._setupTerminalAssociation(toolTerminal, chatSessionId, termId, args.isBackground);
            this._terminalService.setActiveInstance(toolTerminal.instance);
            const timingConnectMs = Date.now() - timingStart;
            try {
                this._logService.debug(`RunInTerminalTool: Starting background execution \`${command}\``);
                const xterm = await toolTerminal.instance.xtermReadyPromise;
                if (!xterm) {
                    throw new Error('Instance was disposed before xterm.js was ready');
                }
                const execution = new BackgroundTerminalExecution(toolTerminal.instance, xterm, command);
                RunInTerminalTool_1._backgroundExecutions.set(termId, execution);
                const resultText = (didUserEditCommand
                    ? `Note: The user manually edited the command to \`${command}\`, and that command is now running in terminal with ID=${termId}`
                    : didToolEditCommand
                        ? `Note: The tool simplified the command to \`${command}\`, and that command is now running in terminal with ID=${termId}`
                        : `Command is running in terminal with ID=${termId}`);
                return {
                    content: [{
                            kind: 'text',
                            value: resultText,
                        }]
                };
            }
            catch (e) {
                error = 'threw';
                if (termId) {
                    RunInTerminalTool_1._backgroundExecutions.get(termId)?.dispose();
                    RunInTerminalTool_1._backgroundExecutions.delete(termId);
                }
                throw e;
            }
            finally {
                const timingExecuteMs = Date.now() - timingStart;
                this._sendTelemetry(toolTerminal.instance, {
                    didUserEditCommand,
                    didToolEditCommand,
                    shellIntegrationQuality: toolTerminal.shellIntegrationQuality,
                    isBackground: true,
                    error,
                    outputLineCount: -1,
                    exitCode: undefined,
                    isNewSession: true,
                    timingExecuteMs,
                    timingConnectMs,
                });
            }
        }
        else {
            let toolTerminal = this._sessionTerminalAssociations.get(chatSessionId);
            const isNewSession = !toolTerminal;
            if (toolTerminal) {
                this._logService.debug(`RunInTerminalTool: Using existing terminal with session ID \`${chatSessionId}\``);
            }
            else {
                this._logService.debug(`RunInTerminalTool: Creating terminal with session ID \`${chatSessionId}\``);
                toolTerminal = await this._instantiationService.createInstance(ToolTerminalCreator).createTerminal(token);
                this._sessionTerminalAssociations.set(chatSessionId, toolTerminal);
                if (token.isCancellationRequested) {
                    toolTerminal.instance.dispose();
                    throw new CancellationError();
                }
                await this._setupTerminalAssociation(toolTerminal, chatSessionId, termId, args.isBackground);
            }
            this._terminalService.setActiveInstance(toolTerminal.instance);
            const timingConnectMs = Date.now() - timingStart;
            let terminalResult = '';
            let outputLineCount = -1;
            let exitCode;
            try {
                let strategy;
                const commandDetection = toolTerminal.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
                switch (toolTerminal.shellIntegrationQuality) {
                    case "none" /* ShellIntegrationQuality.None */: {
                        strategy = this._instantiationService.createInstance(NoneExecuteStrategy, toolTerminal.instance);
                        break;
                    }
                    case "basic" /* ShellIntegrationQuality.Basic */: {
                        strategy = this._instantiationService.createInstance(BasicExecuteStrategy, toolTerminal.instance, commandDetection);
                        break;
                    }
                    case "rich" /* ShellIntegrationQuality.Rich */: {
                        strategy = this._instantiationService.createInstance(RichExecuteStrategy, toolTerminal.instance, commandDetection);
                        break;
                    }
                }
                this._logService.debug(`RunInTerminalTool: Using \`${strategy.type}\` execute strategy for command \`${command}\``);
                const executeResult = await strategy.execute(command, token);
                this._logService.debug(`RunInTerminalTool: Finished \`${strategy.type}\` execute strategy with exitCode \`${executeResult.exitCode}\`, result.length \`${executeResult.result.length}\`, error \`${executeResult.error}\``);
                outputLineCount = count(executeResult.result, '\n');
                exitCode = executeResult.exitCode;
                error = executeResult.error;
                if (typeof executeResult.result === 'string') {
                    terminalResult = executeResult.result;
                }
                else {
                    return executeResult.result;
                }
            }
            catch (e) {
                this._logService.debug(`RunInTerminalTool: Threw exception`);
                toolTerminal.instance.dispose();
                error = 'threw';
                throw e;
            }
            finally {
                const timingExecuteMs = Date.now() - timingStart;
                this._sendTelemetry(toolTerminal.instance, {
                    didUserEditCommand,
                    didToolEditCommand,
                    isBackground: false,
                    shellIntegrationQuality: toolTerminal.shellIntegrationQuality,
                    error,
                    isNewSession,
                    outputLineCount,
                    exitCode,
                    timingExecuteMs,
                    timingConnectMs,
                });
            }
            const resultText = [];
            if (didUserEditCommand) {
                resultText.push(`Note: The user manually edited the command to \`${command}\`, and this is the output of running that command instead:\n`);
            }
            else if (didToolEditCommand) {
                resultText.push(`Note: The tool simplified the command to \`${command}\`, and this is the output of running that command instead:\n`);
            }
            resultText.push(terminalResult);
            return {
                content: [{
                        kind: 'text',
                        value: resultText.join(''),
                    }]
            };
        }
    }
    async _rewriteCommandIfNeeded(context, args, instance, shell) {
        const commandLine = args.command;
        const os = await this._osBackend;
        // Re-write the command if it starts with `cd <dir> && <suffix>` or `cd <dir>; <suffix>`
        // to just `<suffix>` if the directory matches the current terminal's cwd. This simplifies
        // the result in the chat by removing redundancies that some models like to add.
        const isPwsh = isPowerShell(shell, os);
        const cdPrefixMatch = commandLine.match(isPwsh
            ? /^(?:cd|Set-Location(?: -Path)?) (?<dir>[^\s]+) ?(?:&&|;)\s+(?<suffix>.+)$/i
            : /^cd (?<dir>[^\s]+) &&\s+(?<suffix>.+)$/);
        const cdDir = cdPrefixMatch?.groups?.dir;
        const cdSuffix = cdPrefixMatch?.groups?.suffix;
        if (cdDir && cdSuffix) {
            let cwd;
            // Get the current session terminal's cwd
            if (instance) {
                cwd = await instance.getCwdResource();
            }
            // If a terminal is not available, use the workspace root
            if (!cwd) {
                const workspaceFolders = this._workspaceContextService.getWorkspace().folders;
                if (workspaceFolders.length === 1) {
                    cwd = workspaceFolders[0].uri;
                }
            }
            // Re-write the command if it matches the cwd
            if (cwd) {
                // Remove any surrounding quotes
                let cdDirPath = cdDir;
                if (cdDirPath.startsWith('"') && cdDirPath.endsWith('"')) {
                    cdDirPath = cdDirPath.slice(1, -1);
                }
                // Normalize trailing slashes
                cdDirPath = cdDirPath.replace(/(?:[\\\/])$/, '');
                let cwdFsPath = cwd.fsPath.replace(/(?:[\\\/])$/, '');
                // Case-insensitive comparison on Windows
                if (os === 1 /* OperatingSystem.Windows */) {
                    cdDirPath = cdDirPath.toLowerCase();
                    cwdFsPath = cwdFsPath.toLowerCase();
                }
                if (cdDirPath === cwdFsPath) {
                    return cdSuffix;
                }
            }
        }
        return commandLine;
    }
    _restoreTerminalAssociations() {
        const storedAssociations = this._storageService.get(TERMINAL_SESSION_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '{}');
        try {
            const associations = JSON.parse(storedAssociations);
            // Find existing terminals and associate them with sessions
            for (const instance of this._terminalService.instances) {
                if (instance.processId) {
                    const association = associations[instance.processId];
                    if (association) {
                        this._logService.debug(`RunInTerminalTool: Restored terminal association for PID ${instance.processId}, session ${association.sessionId}`);
                        const toolTerminal = {
                            instance,
                            shellIntegrationQuality: association.shellIntegrationQuality
                        };
                        this._sessionTerminalAssociations.set(association.sessionId, toolTerminal);
                        // Listen for terminal disposal to clean up storage
                        this._register(instance.onDisposed(() => {
                            this._removeTerminalAssociation(instance.processId);
                        }));
                    }
                }
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to restore terminal associations: ${error}`);
        }
    }
    async _setupTerminalAssociation(toolTerminal, chatSessionId, termId, isBackground) {
        await this._associateTerminalWithSession(toolTerminal.instance, chatSessionId, termId, toolTerminal.shellIntegrationQuality, isBackground);
        this._register(toolTerminal.instance.onDisposed(() => {
            if (toolTerminal.instance.processId) {
                this._removeTerminalAssociation(toolTerminal.instance.processId);
            }
        }));
    }
    async _associateTerminalWithSession(terminal, sessionId, id, shellIntegrationQuality, isBackground) {
        try {
            // Wait for process ID with timeout
            const pid = await Promise.race([
                terminal.processReady.then(() => terminal.processId),
                timeout(5000).then(() => { throw new Error('Timeout'); })
            ]);
            if (typeof pid === 'number') {
                const storedAssociations = this._storageService.get(TERMINAL_SESSION_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '{}');
                const associations = JSON.parse(storedAssociations);
                const existingAssociation = associations[pid] || {};
                associations[pid] = {
                    ...existingAssociation,
                    sessionId,
                    shellIntegrationQuality,
                    id,
                    isBackground
                };
                this._storageService.store(TERMINAL_SESSION_STORAGE_KEY, JSON.stringify(associations), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
                this._logService.debug(`RunInTerminalTool: Associated terminal PID ${pid} with session ${sessionId}`);
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to associate terminal with session: ${error}`);
        }
    }
    async _removeTerminalAssociation(pid) {
        try {
            const storedAssociations = this._storageService.get(TERMINAL_SESSION_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '{}');
            const associations = JSON.parse(storedAssociations);
            if (associations[pid]) {
                delete associations[pid];
                this._storageService.store(TERMINAL_SESSION_STORAGE_KEY, JSON.stringify(associations), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
                this._logService.debug(`RunInTerminalTool: Removed terminal association for PID ${pid}`);
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to remove terminal association: ${error}`);
        }
    }
    _sendTelemetry(instance, state) {
        this._telemetryService.publicLog2('toolUse.runInTerminal', {
            terminalSessionId: instance.sessionId,
            result: state.error ?? 'success',
            strategy: state.shellIntegrationQuality === "rich" /* ShellIntegrationQuality.Rich */ ? 2 : state.shellIntegrationQuality === "basic" /* ShellIntegrationQuality.Basic */ ? 1 : 0,
            userEditedCommand: state.didUserEditCommand ? 1 : 0,
            toolEditedCommand: state.didToolEditCommand ? 1 : 0,
            isBackground: state.isBackground ? 1 : 0,
            isNewSession: state.isNewSession ? 1 : 0,
            outputLineCount: state.outputLineCount,
            nonZeroExitCode: state.exitCode === undefined ? -1 : state.exitCode === 0 ? 0 : 1,
            timingConnectMs: state.timingConnectMs,
            timingExecuteMs: state.timingExecuteMs,
        });
    }
};
RunInTerminalTool = RunInTerminalTool_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILanguageModelToolsService),
    __param(2, IStorageService),
    __param(3, ITelemetryService),
    __param(4, ITerminalLogService),
    __param(5, ITerminalProfileResolverService),
    __param(6, ITerminalService),
    __param(7, IRemoteAgentService),
    __param(8, IWorkspaceContextService)
], RunInTerminalTool);
export { RunInTerminalTool };
class BackgroundTerminalExecution extends Disposable {
    constructor(_instance, _xterm, _commandLine) {
        super();
        this._instance = _instance;
        this._xterm = _xterm;
        this._commandLine = _commandLine;
        this._startMarker = this._register(this._xterm.raw.registerMarker());
        this._instance.runCommand(this._commandLine);
    }
    getOutput() {
        const lines = [];
        for (let y = Math.min(this._startMarker?.line ?? 0, 0); y < this._xterm.raw.buffer.active.length; y++) {
            const line = this._xterm.raw.buffer.active.getLine(y);
            if (!line) {
                continue;
            }
            lines.push(line.translateToString(true));
        }
        return lines.join('\n');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbFRvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL3J1bkluVGVybWluYWxUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQW1CLEVBQUUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sbURBQW1ELENBQUM7QUFDakgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDakcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFL0YsT0FBTyxFQUF1QiwwQkFBMEIsRUFBa0gsY0FBYyxFQUFnRCxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xTLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSx1Q0FBdUMsQ0FBQztBQUVqRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN0RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDekQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLCtCQUErQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDN0YsT0FBTyxFQUEyQixtQkFBbUIsRUFBc0IsTUFBTSwwQkFBMEIsQ0FBQztBQUU1RyxNQUFNLDRCQUE0QixHQUFHLHVCQUF1QixDQUFDO0FBUzdELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFjO0lBQy9DLEVBQUUsRUFBRSxrQkFBa0I7SUFDdEIsaUJBQWlCLEVBQUUsZ0JBQWdCO0lBQ25DLHVCQUF1QixFQUFFLElBQUk7SUFDN0IsV0FBVyxFQUFFLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxpQkFBaUIsQ0FBQztJQUN6RSxnQkFBZ0IsRUFBRTtRQUNqQixtTEFBbUw7UUFDbkwsRUFBRTtRQUNGLG9CQUFvQjtRQUNwQixnQ0FBZ0M7UUFDaEMsRUFBRTtRQUNGLHVCQUF1QjtRQUN2Qix1REFBdUQ7UUFDdkQsRUFBRTtRQUNGLG9CQUFvQjtRQUNwQixvREFBb0Q7UUFDcEQsMkNBQTJDO1FBQzNDLEVBQUU7UUFDRix1QkFBdUI7UUFDdkIsa0VBQWtFO1FBQ2xFLGdFQUFnRTtRQUNoRSxFQUFFO1FBQ0Ysb0JBQW9CO1FBQ3BCLHFGQUFxRjtRQUNyRixzRUFBc0U7UUFDdEUsK0VBQStFO1FBQy9FLEVBQUU7UUFDRixpQkFBaUI7UUFDakIsdURBQXVEO1FBQ3ZELCtDQUErQztRQUMvQywrREFBK0Q7S0FDL0QsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ1osZUFBZSxFQUFFLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSwyQ0FBMkMsQ0FBQztJQUMzRyxNQUFNLEVBQUUsY0FBYyxDQUFDLFFBQVE7SUFDL0IsV0FBVyxFQUFFO1FBQ1osSUFBSSxFQUFFLFFBQVE7UUFDZCxVQUFVLEVBQUU7WUFDWCxPQUFPLEVBQUU7Z0JBQ1IsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLHFDQUFxQzthQUNsRDtZQUNELFdBQVcsRUFBRTtnQkFDWixJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsZ0hBQWdIO2FBQzdIO1lBQ0QsWUFBWSxFQUFFO2dCQUNiLElBQUksRUFBRSxTQUFTO2dCQUNmLFdBQVcsRUFBRSx3WUFBd1k7YUFDclo7U0FDRDtRQUNELFFBQVEsRUFBRTtZQUNULFNBQVM7WUFDVCxhQUFhO1lBQ2IsY0FBYztTQUNkO0tBQ0Q7Q0FDRCxDQUFDO0FBUUssSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxVQUFVOzthQWF4QiwwQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBdUMsQUFBakQsQ0FBa0Q7SUFDeEYsTUFBTSxDQUFDLG1CQUFtQixDQUFDLEVBQVU7UUFDM0MsTUFBTSxtQkFBbUIsR0FBRyxtQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDMUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFDRCxPQUFPLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3hDLENBQUM7SUFFRCxZQUN3QixxQkFBNkQsRUFDeEQsMEJBQXVFLEVBQ2xGLGVBQWlELEVBQy9DLGlCQUFxRCxFQUNuRCxXQUFpRCxFQUNyQywrQkFBaUYsRUFDaEcsZ0JBQW1ELEVBQ2hELG1CQUF5RCxFQUNwRCx3QkFBbUU7UUFFN0YsS0FBSyxFQUFFLENBQUM7UUFWZ0MsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUN2QywrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTRCO1FBQ2pFLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUM5QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ2xDLGdCQUFXLEdBQVgsV0FBVyxDQUFxQjtRQUNwQixvQ0FBK0IsR0FBL0IsK0JBQStCLENBQWlDO1FBQy9FLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDL0Isd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUNuQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBNUI3RSxpQ0FBNEIsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQWdDckYsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztRQUM5RyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRW5HLDZDQUE2QztRQUM3QyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsS0FBSyxDQUFDLHFCQUFxQixDQUFDLE9BQTBDLEVBQUUsS0FBd0I7UUFDL0YsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFVBQXVDLENBQUM7UUFFN0QsSUFBSSxDQUFDLDBCQUEwQixHQUFHLG9DQUFvQyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDdEgsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUU1RSxNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDakMsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsK0JBQStCLENBQUMsZUFBZSxDQUFDO1lBQ3hFLEVBQUU7WUFDRixlQUFlLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGFBQWEsRUFBRSxFQUFFLGVBQWU7U0FDMUUsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLEdBQUcsRUFBRSxvQ0FBNEIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFFaEUsSUFBSSxvQkFBMkQsQ0FBQztRQUNoRSxJQUFJLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3JDLG9CQUFvQixHQUFHLFNBQVMsQ0FBQztRQUNsQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sV0FBVyxHQUFHLCtCQUErQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzdFLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDMUcsTUFBTSxjQUFjLEdBQUcsQ0FBQyxHQUFHLFdBQVcsRUFBRSxHQUFHLGlCQUFpQixDQUFDLENBQUM7WUFDOUQsSUFBSSxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDM0Ysb0JBQW9CLEdBQUcsU0FBUyxDQUFDO1lBQ2xDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxvQkFBb0IsR0FBRztvQkFDdEIsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZO3dCQUN2QixDQUFDLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLG9DQUFvQyxDQUFDO3dCQUM1RSxDQUFDLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLHlCQUF5QixDQUFDO29CQUNsRSxPQUFPLEVBQUUsSUFBSSxjQUFjLENBQzFCLElBQUksQ0FBQyxXQUFXLENBQ2hCO2lCQUNELENBQUM7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQzVILElBQUksaUJBQWlCLEdBQXVCLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9HLElBQUksaUJBQWlCLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3hDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQztRQUMvQixDQUFDO1FBRUQsT0FBTztZQUNOLG9CQUFvQjtZQUNwQixZQUFZO1lBQ1osZ0JBQWdCLEVBQUU7Z0JBQ2pCLElBQUksRUFBRSxXQUFXO2dCQUNqQixXQUFXLEVBQUU7b0JBQ1osUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPO29CQUN0QixVQUFVLEVBQUUsaUJBQWlCO2lCQUM3QjtnQkFDRCxRQUFRO2FBQ1I7U0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBMkIsRUFBRSxZQUFpQyxFQUFFLFNBQXVCLEVBQUUsS0FBd0I7UUFDN0gsSUFBSSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUNyQyxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQztRQUN4QyxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLFVBQXVDLENBQUM7UUFDaEUsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsZ0JBQWtHLENBQUM7UUFDdkksSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUUzRixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQztRQUNwRCxJQUFJLGFBQWEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLDZDQUE2QyxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELElBQUksT0FBMkIsQ0FBQztRQUNoQyxJQUFJLGtCQUEyQixDQUFDO1FBQ2hDLElBQUksa0JBQTJCLENBQUM7UUFDaEMsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDMUMsT0FBTyxHQUFHLGdCQUFnQixDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUM3RSxrQkFBa0IsR0FBRyxPQUFPLGdCQUFnQixFQUFFLE9BQU8sS0FBSyxRQUFRLElBQUksZ0JBQWdCLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDaEgsa0JBQWtCLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssU0FBUyxDQUFDO1FBQ2xGLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxHQUFHLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxVQUFVLElBQUksZ0JBQWdCLENBQUMsV0FBVyxDQUFDLFVBQVUsSUFBSSxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO1lBQ3RJLGtCQUFrQixHQUFHLENBQ3BCLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxVQUFVLEtBQUssU0FBUztnQkFDckQsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLFVBQVUsS0FBSyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUNqRixDQUFDO1lBQ0Ysa0JBQWtCLEdBQUcsQ0FDcEIsQ0FBQyxrQkFBa0I7Z0JBQ25CLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxVQUFVLEtBQUssU0FBUztnQkFDckQsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLFVBQVUsS0FBSyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUNqRixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDbkMsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUM7UUFDL0IsQ0FBQztRQUVELElBQUksS0FBeUIsQ0FBQztRQUU5QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDL0IsTUFBTSxNQUFNLEdBQUcsWUFBWSxFQUFFLENBQUM7UUFFOUIsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsMkRBQTJELE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDNUYsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hILElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ25FLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7Z0JBQ25DLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQy9CLENBQUM7WUFDRCxNQUFNLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFN0YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMvRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsV0FBVyxDQUFDO1lBRWpELElBQUksQ0FBQztnQkFDSixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxzREFBc0QsT0FBTyxJQUFJLENBQUMsQ0FBQztnQkFDMUYsTUFBTSxLQUFLLEdBQUcsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDO2dCQUM1RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO2dCQUNwRSxDQUFDO2dCQUNELE1BQU0sU0FBUyxHQUFHLElBQUksMkJBQTJCLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3pGLG1CQUFpQixDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQy9ELE1BQU0sVUFBVSxHQUFHLENBQ2xCLGtCQUFrQjtvQkFDakIsQ0FBQyxDQUFDLG1EQUFtRCxPQUFPLDJEQUEyRCxNQUFNLEVBQUU7b0JBQy9ILENBQUMsQ0FBQyxrQkFBa0I7d0JBQ25CLENBQUMsQ0FBQyw4Q0FBOEMsT0FBTywyREFBMkQsTUFBTSxFQUFFO3dCQUMxSCxDQUFDLENBQUMsMENBQTBDLE1BQU0sRUFBRSxDQUN0RCxDQUFDO2dCQUNGLE9BQU87b0JBQ04sT0FBTyxFQUFFLENBQUM7NEJBQ1QsSUFBSSxFQUFFLE1BQU07NEJBQ1osS0FBSyxFQUFFLFVBQVU7eUJBQ2pCLENBQUM7aUJBQ0YsQ0FBQztZQUNILENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLEtBQUssR0FBRyxPQUFPLENBQUM7Z0JBQ2hCLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osbUJBQWlCLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDO29CQUMvRCxtQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3hELENBQUM7Z0JBQ0QsTUFBTSxDQUFDLENBQUM7WUFDVCxDQUFDO29CQUFTLENBQUM7Z0JBQ1YsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLFdBQVcsQ0FBQztnQkFDakQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFO29CQUMxQyxrQkFBa0I7b0JBQ2xCLGtCQUFrQjtvQkFDbEIsdUJBQXVCLEVBQUUsWUFBWSxDQUFDLHVCQUF1QjtvQkFDN0QsWUFBWSxFQUFFLElBQUk7b0JBQ2xCLEtBQUs7b0JBQ0wsZUFBZSxFQUFFLENBQUMsQ0FBQztvQkFDbkIsUUFBUSxFQUFFLFNBQVM7b0JBQ25CLFlBQVksRUFBRSxJQUFJO29CQUNsQixlQUFlO29CQUNmLGVBQWU7aUJBQ2YsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxZQUFZLEdBQThCLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDbkcsTUFBTSxZQUFZLEdBQUcsQ0FBQyxZQUFZLENBQUM7WUFDbkMsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDbEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0VBQWdFLGFBQWEsSUFBSSxDQUFDLENBQUM7WUFDM0csQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLDBEQUEwRCxhQUFhLElBQUksQ0FBQyxDQUFDO2dCQUNwRyxZQUFZLEdBQUcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMxRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDbkUsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztvQkFDbkMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDaEMsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUM7Z0JBQy9CLENBQUM7Z0JBQ0QsTUFBTSxJQUFJLENBQUMseUJBQXlCLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzlGLENBQUM7WUFFRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRS9ELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxXQUFXLENBQUM7WUFFakQsSUFBSSxjQUFjLEdBQUcsRUFBRSxDQUFDO1lBQ3hCLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLElBQUksUUFBNEIsQ0FBQztZQUNqQyxJQUFJLENBQUM7Z0JBQ0osSUFBSSxRQUFrQyxDQUFDO2dCQUN2QyxNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsNkNBQXFDLENBQUM7Z0JBQ3JHLFFBQVEsWUFBWSxDQUFDLHVCQUF1QixFQUFFLENBQUM7b0JBQzlDLDhDQUFpQyxDQUFDLENBQUMsQ0FBQzt3QkFDbkMsUUFBUSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUNqRyxNQUFNO29CQUNQLENBQUM7b0JBQ0QsZ0RBQWtDLENBQUMsQ0FBQyxDQUFDO3dCQUNwQyxRQUFRLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLGdCQUFpQixDQUFDLENBQUM7d0JBQ3JILE1BQU07b0JBQ1AsQ0FBQztvQkFDRCw4Q0FBaUMsQ0FBQyxDQUFDLENBQUM7d0JBQ25DLFFBQVEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUUsZ0JBQWlCLENBQUMsQ0FBQzt3QkFDcEgsTUFBTTtvQkFDUCxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsOEJBQThCLFFBQVEsQ0FBQyxJQUFJLHFDQUFxQyxPQUFPLElBQUksQ0FBQyxDQUFDO2dCQUNwSCxNQUFNLGFBQWEsR0FBRyxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUM3RCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsUUFBUSxDQUFDLElBQUksdUNBQXVDLGFBQWEsQ0FBQyxRQUFRLHVCQUF1QixhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sZUFBZSxhQUFhLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztnQkFDNU4sZUFBZSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwRCxRQUFRLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQztnQkFDbEMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUM7Z0JBQzVCLElBQUksT0FBTyxhQUFhLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUM5QyxjQUFjLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQztnQkFDdkMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sYUFBYSxDQUFDLE1BQU0sQ0FBQztnQkFDN0IsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7Z0JBQzdELFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2hDLEtBQUssR0FBRyxPQUFPLENBQUM7Z0JBQ2hCLE1BQU0sQ0FBQyxDQUFDO1lBQ1QsQ0FBQztvQkFBUyxDQUFDO2dCQUNWLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxXQUFXLENBQUM7Z0JBQ2pELElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRTtvQkFDMUMsa0JBQWtCO29CQUNsQixrQkFBa0I7b0JBQ2xCLFlBQVksRUFBRSxLQUFLO29CQUNuQix1QkFBdUIsRUFBRSxZQUFZLENBQUMsdUJBQXVCO29CQUM3RCxLQUFLO29CQUNMLFlBQVk7b0JBQ1osZUFBZTtvQkFDZixRQUFRO29CQUNSLGVBQWU7b0JBQ2YsZUFBZTtpQkFDZixDQUFDLENBQUM7WUFDSixDQUFDO1lBRUQsTUFBTSxVQUFVLEdBQWEsRUFBRSxDQUFDO1lBQ2hDLElBQUksa0JBQWtCLEVBQUUsQ0FBQztnQkFDeEIsVUFBVSxDQUFDLElBQUksQ0FBQyxtREFBbUQsT0FBTywrREFBK0QsQ0FBQyxDQUFDO1lBQzVJLENBQUM7aUJBQU0sSUFBSSxrQkFBa0IsRUFBRSxDQUFDO2dCQUMvQixVQUFVLENBQUMsSUFBSSxDQUFDLDhDQUE4QyxPQUFPLCtEQUErRCxDQUFDLENBQUM7WUFDdkksQ0FBQztZQUNELFVBQVUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFaEMsT0FBTztnQkFDTixPQUFPLEVBQUUsQ0FBQzt3QkFDVCxJQUFJLEVBQUUsTUFBTTt3QkFDWixLQUFLLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7cUJBQzFCLENBQUM7YUFDRixDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFUyxLQUFLLENBQUMsdUJBQXVCLENBQUMsT0FBMEMsRUFBRSxJQUErQixFQUFFLFFBQStELEVBQUUsS0FBYTtRQUNsTSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ2pDLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUVqQyx3RkFBd0Y7UUFDeEYsMEZBQTBGO1FBQzFGLGdGQUFnRjtRQUNoRixNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQ3RDLE1BQU07WUFDTCxDQUFDLENBQUMsNEVBQTRFO1lBQzlFLENBQUMsQ0FBQyx3Q0FBd0MsQ0FDM0MsQ0FBQztRQUNGLE1BQU0sS0FBSyxHQUFHLGFBQWEsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLGFBQWEsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDO1FBQy9DLElBQUksS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ3ZCLElBQUksR0FBb0IsQ0FBQztZQUV6Qix5Q0FBeUM7WUFDekMsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxHQUFHLEdBQUcsTUFBTSxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdkMsQ0FBQztZQUVELHlEQUF5RDtZQUN6RCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ1YsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDO2dCQUM5RSxJQUFJLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDbkMsR0FBRyxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztnQkFDL0IsQ0FBQztZQUNGLENBQUM7WUFFRCw2Q0FBNkM7WUFDN0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDVCxnQ0FBZ0M7Z0JBQ2hDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztnQkFDdEIsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDMUQsU0FBUyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLENBQUM7Z0JBQ0QsNkJBQTZCO2dCQUM3QixTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2pELElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdEQseUNBQXlDO2dCQUN6QyxJQUFJLEVBQUUsb0NBQTRCLEVBQUUsQ0FBQztvQkFDcEMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDcEMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDckMsQ0FBQztnQkFDRCxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDN0IsT0FBTyxRQUFRLENBQUM7Z0JBQ2pCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFFTyw0QkFBNEI7UUFDbkMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsa0NBQTBCLElBQUksQ0FBQyxDQUFDO1FBQ2hILElBQUksQ0FBQztZQUNKLE1BQU0sWUFBWSxHQUErQyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFFaEcsMkRBQTJEO1lBQzNELEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUN4RCxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDeEIsTUFBTSxXQUFXLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDckQsSUFBSSxXQUFXLEVBQUUsQ0FBQzt3QkFDakIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsNERBQTRELFFBQVEsQ0FBQyxTQUFTLGFBQWEsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7d0JBQzNJLE1BQU0sWUFBWSxHQUFrQjs0QkFDbkMsUUFBUTs0QkFDUix1QkFBdUIsRUFBRSxXQUFXLENBQUMsdUJBQXVCO3lCQUM1RCxDQUFDO3dCQUNGLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQzt3QkFFM0UsbURBQW1EO3dCQUNuRCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFOzRCQUN2QyxJQUFJLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLFNBQVUsQ0FBQyxDQUFDO3dCQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNMLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrREFBK0QsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNoRyxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxZQUEyQixFQUFFLGFBQXFCLEVBQUUsTUFBYyxFQUFFLFlBQXFCO1FBQ2hJLE1BQU0sSUFBSSxDQUFDLDZCQUE2QixDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsdUJBQXVCLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDM0ksSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDcEQsSUFBSSxZQUFhLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLENBQUMsMEJBQTBCLENBQUMsWUFBYSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNuRSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsNkJBQTZCLENBQUMsUUFBMkIsRUFBRSxTQUFpQixFQUFFLEVBQVUsRUFBRSx1QkFBZ0QsRUFBRSxZQUFzQjtRQUMvSyxJQUFJLENBQUM7WUFDSixtQ0FBbUM7WUFDbkMsTUFBTSxHQUFHLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUM5QixRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO2dCQUNwRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDekQsQ0FBQyxDQUFDO1lBRUgsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsa0NBQTBCLElBQUksQ0FBQyxDQUFDO2dCQUNoSCxNQUFNLFlBQVksR0FBK0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUVoRyxNQUFNLG1CQUFtQixHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BELFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRztvQkFDbkIsR0FBRyxtQkFBbUI7b0JBQ3RCLFNBQVM7b0JBQ1QsdUJBQXVCO29CQUN2QixFQUFFO29CQUNGLFlBQVk7aUJBQ1osQ0FBQztnQkFFRixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyw2REFBNkMsQ0FBQztnQkFDbkksSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsOENBQThDLEdBQUcsaUJBQWlCLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFDdkcsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGlFQUFpRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ2xHLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLDBCQUEwQixDQUFDLEdBQVc7UUFDbkQsSUFBSSxDQUFDO1lBQ0osTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsa0NBQTBCLElBQUksQ0FBQyxDQUFDO1lBQ2hILE1BQU0sWUFBWSxHQUErQyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFFaEcsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdkIsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLDZEQUE2QyxDQUFDO2dCQUNuSSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywyREFBMkQsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUMxRixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsNkRBQTZELEtBQUssRUFBRSxDQUFDLENBQUM7UUFDOUYsQ0FBQztJQUNGLENBQUM7SUFFTyxjQUFjLENBQUMsUUFBMkIsRUFBRSxLQVduRDtRQWdDQSxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUEwQyx1QkFBdUIsRUFBRTtZQUNuRyxpQkFBaUIsRUFBRSxRQUFRLENBQUMsU0FBUztZQUNyQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEtBQUssSUFBSSxTQUFTO1lBQ2hDLFFBQVEsRUFBRSxLQUFLLENBQUMsdUJBQXVCLDhDQUFpQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsZ0RBQWtDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0SixpQkFBaUIsRUFBRSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRCxpQkFBaUIsRUFBRSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuRCxZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLFlBQVksRUFBRSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsZUFBZSxFQUFFLEtBQUssQ0FBQyxlQUFlO1lBQ3RDLGVBQWUsRUFBRSxLQUFLLENBQUMsUUFBUSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakYsZUFBZSxFQUFFLEtBQUssQ0FBQyxlQUFlO1lBQ3RDLGVBQWUsRUFBRSxLQUFLLENBQUMsZUFBZTtTQUN0QyxDQUFDLENBQUM7SUFDSixDQUFDOztBQWplVyxpQkFBaUI7SUF1QjNCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSwwQkFBMEIsQ0FBQTtJQUMxQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLCtCQUErQixDQUFBO0lBQy9CLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHdCQUF3QixDQUFBO0dBL0JkLGlCQUFpQixDQWtlN0I7O0FBRUQsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBR25ELFlBQ2tCLFNBQTRCLEVBQzVCLE1BQXFCLEVBQ3JCLFlBQW9CO1FBRXJDLEtBQUssRUFBRSxDQUFDO1FBSlMsY0FBUyxHQUFULFNBQVMsQ0FBbUI7UUFDNUIsV0FBTSxHQUFOLE1BQU0sQ0FBZTtRQUNyQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUlyQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELFNBQVM7UUFDUixNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7UUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0RCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsU0FBUztZQUNWLENBQUM7WUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekIsQ0FBQztDQUNEIn0=