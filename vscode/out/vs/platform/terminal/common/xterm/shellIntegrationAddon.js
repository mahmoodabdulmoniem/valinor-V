/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { TerminalCapabilityStore } from '../capabilities/terminalCapabilityStore.js';
import { CommandDetectionCapability } from '../capabilities/commandDetectionCapability.js';
import { CwdDetectionCapability } from '../capabilities/cwdDetectionCapability.js';
import { PartialCommandDetectionCapability } from '../capabilities/partialCommandDetectionCapability.js';
import { Emitter } from '../../../../base/common/event.js';
import { BufferMarkCapability } from '../capabilities/bufferMarkCapability.js';
import { URI } from '../../../../base/common/uri.js';
import { sanitizeCwd } from '../terminalEnvironment.js';
import { removeAnsiEscapeCodesFromPrompt } from '../../../../base/common/strings.js';
import { ShellEnvDetectionCapability } from '../capabilities/shellEnvDetectionCapability.js';
/**
 * Shell integration is a feature that enhances the terminal's understanding of what's happening
 * in the shell by injecting special sequences into the shell's prompt using the "Set Text
 * Parameters" sequence (`OSC Ps ; Pt ST`).
 *
 * Definitions:
 * - OSC: `\x1b]`
 * - Ps:  A single (usually optional) numeric parameter, composed of one or more digits.
 * - Pt:  A text parameter composed of printable characters.
 * - ST: `\x7`
 *
 * This is inspired by a feature of the same name in the FinalTerm, iTerm2 and kitty terminals.
 */
/**
 * The identifier for the first numeric parameter (`Ps`) for OSC commands used by shell integration.
 */
export var ShellIntegrationOscPs;
(function (ShellIntegrationOscPs) {
    /**
     * Sequences pioneered by FinalTerm.
     */
    ShellIntegrationOscPs[ShellIntegrationOscPs["FinalTerm"] = 133] = "FinalTerm";
    /**
     * Sequences pioneered by VS Code. The number is derived from the least significant digit of
     * "VSC" when encoded in hex ("VSC" = 0x56, 0x53, 0x43).
     */
    ShellIntegrationOscPs[ShellIntegrationOscPs["VSCode"] = 633] = "VSCode";
    /**
     * Sequences pioneered by iTerm.
     */
    ShellIntegrationOscPs[ShellIntegrationOscPs["ITerm"] = 1337] = "ITerm";
    ShellIntegrationOscPs[ShellIntegrationOscPs["SetCwd"] = 7] = "SetCwd";
    ShellIntegrationOscPs[ShellIntegrationOscPs["SetWindowsFriendlyCwd"] = 9] = "SetWindowsFriendlyCwd";
})(ShellIntegrationOscPs || (ShellIntegrationOscPs = {}));
/**
 * Sequences pioneered by FinalTerm.
 */
var FinalTermOscPt;
(function (FinalTermOscPt) {
    /**
     * The start of the prompt, this is expected to always appear at the start of a line.
     *
     * Format: `OSC 133 ; A ST`
     */
    FinalTermOscPt["PromptStart"] = "A";
    /**
     * The start of a command, ie. where the user inputs their command.
     *
     * Format: `OSC 133 ; B ST`
     */
    FinalTermOscPt["CommandStart"] = "B";
    /**
     * Sent just before the command output begins.
     *
     * Format: `OSC 133 ; C ST`
     */
    FinalTermOscPt["CommandExecuted"] = "C";
    /**
     * Sent just after a command has finished. The exit code is optional, when not specified it
     * means no command was run (ie. enter on empty prompt or ctrl+c).
     *
     * Format: `OSC 133 ; D [; <ExitCode>] ST`
     */
    FinalTermOscPt["CommandFinished"] = "D";
})(FinalTermOscPt || (FinalTermOscPt = {}));
/**
 * VS Code-specific shell integration sequences. Some of these are based on more common alternatives
 * like those pioneered in {@link FinalTermOscPt FinalTerm}. The decision to move to entirely custom
 * sequences was to try to improve reliability and prevent the possibility of applications confusing
 * the terminal. If multiple shell integration scripts run, VS Code will prioritize the VS
 * Code-specific ones.
 *
 * It's recommended that authors of shell integration scripts use the common sequences (`133`)
 * when building general purpose scripts and the VS Code-specific (`633`) when targeting only VS
 * Code or when there are no other alternatives (eg. {@link CommandLine `633 ; E`}). These sequences
 * support mix-and-matching.
 */
var VSCodeOscPt;
(function (VSCodeOscPt) {
    /**
     * The start of the prompt, this is expected to always appear at the start of a line.
     *
     * Format: `OSC 633 ; A ST`
     *
     * Based on {@link FinalTermOscPt.PromptStart}.
     */
    VSCodeOscPt["PromptStart"] = "A";
    /**
     * The start of a command, ie. where the user inputs their command.
     *
     * Format: `OSC 633 ; B ST`
     *
     * Based on  {@link FinalTermOscPt.CommandStart}.
     */
    VSCodeOscPt["CommandStart"] = "B";
    /**
     * Sent just before the command output begins.
     *
     * Format: `OSC 633 ; C ST`
     *
     * Based on {@link FinalTermOscPt.CommandExecuted}.
     */
    VSCodeOscPt["CommandExecuted"] = "C";
    /**
     * Sent just after a command has finished. This should generally be used on the new line
     * following the end of a command's output, just before {@link PromptStart}. The exit code is
     * optional, when not specified it means no command was run (ie. enter on empty prompt or
     * ctrl+c).
     *
     * Format: `OSC 633 ; D [; <ExitCode>] ST`
     *
     * Based on {@link FinalTermOscPt.CommandFinished}.
     */
    VSCodeOscPt["CommandFinished"] = "D";
    /**
     * Explicitly set the command line. This helps workaround performance and reliability problems
     * with parsing out the command, such as conpty not guaranteeing the position of the sequence or
     * the shell not guaranteeing that the entire command is even visible. Ideally this is called
     * immediately before {@link CommandExecuted}, immediately before {@link CommandFinished} will
     * also work but that means terminal will only know the accurate command line when the command is
     * finished.
     *
     * The command line can escape ascii characters using the `\xAB` format, where AB are the
     * hexadecimal representation of the character code (case insensitive), and escape the `\`
     * character using `\\`. It's required to escape semi-colon (`0x3b`) and characters 0x20 and
     * below, this is particularly important for new line and semi-colon.
     *
     * Some examples:
     *
     * ```
     * "\"  -> "\\"
     * "\n" -> "\x0a"
     * ";"  -> "\x3b"
     * ```
     *
     * An optional nonce can be provided which is may be required by the terminal in order enable
     * some features. This helps ensure no malicious command injection has occurred.
     *
     * Format: `OSC 633 ; E [; <CommandLine> [; <Nonce>]] ST`
     */
    VSCodeOscPt["CommandLine"] = "E";
    /**
     * Similar to prompt start but for line continuations.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["ContinuationStart"] = "F";
    /**
     * Similar to command start but for line continuations.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["ContinuationEnd"] = "G";
    /**
     * The start of the right prompt.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["RightPromptStart"] = "H";
    /**
     * The end of the right prompt.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["RightPromptEnd"] = "I";
    /**
     * Set the value of an arbitrary property, only known properties will be handled by VS Code.
     *
     * Format: `OSC 633 ; P ; <Property>=<Value> ST`
     *
     * Known properties:
     *
     * - `Cwd` - Reports the current working directory to the terminal.
     * - `IsWindows` - Reports whether the shell is using a Windows backend like winpty or conpty.
     *   This may be used to enable additional heuristics as the positioning of the shell
     *   integration sequences are not guaranteed to be correct. Valid values: `True`, `False`.
     * - `ContinuationPrompt` - Reports the continuation prompt that is printed at the start of
     *   multi-line inputs.
     * - `HasRichCommandDetection` - Reports whether the shell has rich command line detection,
     *   meaning that sequences A, B, C, D and E are exactly where they're meant to be. In
     *   particular, {@link CommandLine} must happen immediately before {@link CommandExecuted} so
     *   VS Code knows the command line when the execution begins.
     *
     * WARNING: Any other properties may be changed and are not guaranteed to work in the future.
     */
    VSCodeOscPt["Property"] = "P";
    /**
     * Sets a mark/point-of-interest in the buffer.
     *
     * Format: `OSC 633 ; SetMark [; Id=<string>] [; Hidden]`
     *
     * `Id` - The identifier of the mark that can be used to reference it
     * `Hidden` - When set, the mark will be available to reference internally but will not visible
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["SetMark"] = "SetMark";
    /**
     * Sends the shell's complete environment in JSON format.
     *
     * Format: `OSC 633 ; EnvJson ; <Environment> ; <Nonce>`
     *
     * - `Environment` - A stringified JSON object containing the shell's complete environment. The
     *    variables and values use the same encoding rules as the {@link CommandLine} sequence.
     * - `Nonce` - An _mandatory_ nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvJson"] = "EnvJson";
    /**
     * Delete a single environment variable from cached environment.
     *
     * Format: `OSC 633 ; EnvSingleDelete ; <EnvironmentKey> ; <EnvironmentValue> [; <Nonce>]`
     *
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleDelete"] = "EnvSingleDelete";
    /**
     * The start of the collecting user's environment variables individually.
     *
     * Format: `OSC 633 ; EnvSingleStart ; <Clear> [; <Nonce>]`
     *
     * - `Clear` - An _mandatory_ flag indicating any cached environment variables will be cleared.
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleStart"] = "EnvSingleStart";
    /**
     * Sets an entry of single environment variable to transactional pending map of environment variables.
     *
     * Format: `OSC 633 ; EnvSingleEntry ; <EnvironmentKey> ; <EnvironmentValue> [; <Nonce>]`
     *
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleEntry"] = "EnvSingleEntry";
    /**
     * The end of the collecting user's environment variables individually.
     * Clears any pending environment variables and fires an event that contains user's environment.
     *
     * Format: `OSC 633 ; EnvSingleEnd [; <Nonce>]`
     *
     * - `Nonce` - An optional nonce can be provided which may be required by the terminal in order
     *   to enable some features. This helps ensure no malicious command injection has occurred.
     *
     * WARNING: This sequence is unfinalized, DO NOT use this in your shell integration script.
     */
    VSCodeOscPt["EnvSingleEnd"] = "EnvSingleEnd";
})(VSCodeOscPt || (VSCodeOscPt = {}));
/**
 * ITerm sequences
 */
var ITermOscPt;
(function (ITermOscPt) {
    /**
     * Sets a mark/point-of-interest in the buffer.
     *
     * Format: `OSC 1337 ; SetMark`
     */
    ITermOscPt["SetMark"] = "SetMark";
    /**
     * Reports current working directory (CWD).
     *
     * Format: `OSC 1337 ; CurrentDir=<Cwd> ST`
     */
    ITermOscPt["CurrentDir"] = "CurrentDir";
})(ITermOscPt || (ITermOscPt = {}));
/**
 * The shell integration addon extends xterm by reading shell integration sequences and creating
 * capabilities and passing along relevant sequences to the capabilities. This is meant to
 * encapsulate all handling/parsing of sequences so the capabilities don't need to.
 */
export class ShellIntegrationAddon extends Disposable {
    get seenSequences() { return this._seenSequences; }
    get status() { return this._status; }
    constructor(_nonce, _disableTelemetry, _onDidExecuteText, _telemetryService, _logService) {
        super();
        this._nonce = _nonce;
        this._disableTelemetry = _disableTelemetry;
        this._onDidExecuteText = _onDidExecuteText;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this.capabilities = this._register(new TerminalCapabilityStore());
        this._hasUpdatedTelemetry = false;
        this._commonProtocolDisposables = [];
        this._seenSequences = new Set();
        this._status = 0 /* ShellIntegrationStatus.Off */;
        this._onDidChangeStatus = new Emitter();
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this._onDidChangeSeenSequences = new Emitter();
        this.onDidChangeSeenSequences = this._onDidChangeSeenSequences.event;
        this._register(toDisposable(() => {
            this._clearActivationTimeout();
            this._disposeCommonProtocol();
        }));
    }
    _disposeCommonProtocol() {
        dispose(this._commonProtocolDisposables);
        this._commonProtocolDisposables.length = 0;
    }
    activate(xterm) {
        this._terminal = xterm;
        this.capabilities.add(3 /* TerminalCapability.PartialCommandDetection */, this._register(new PartialCommandDetectionCapability(this._terminal, this._onDidExecuteText)));
        this._register(xterm.parser.registerOscHandler(633 /* ShellIntegrationOscPs.VSCode */, data => this._handleVSCodeSequence(data)));
        this._register(xterm.parser.registerOscHandler(1337 /* ShellIntegrationOscPs.ITerm */, data => this._doHandleITermSequence(data)));
        this._commonProtocolDisposables.push(xterm.parser.registerOscHandler(133 /* ShellIntegrationOscPs.FinalTerm */, data => this._handleFinalTermSequence(data)));
        this._register(xterm.parser.registerOscHandler(7 /* ShellIntegrationOscPs.SetCwd */, data => this._doHandleSetCwd(data)));
        this._register(xterm.parser.registerOscHandler(9 /* ShellIntegrationOscPs.SetWindowsFriendlyCwd */, data => this._doHandleSetWindowsFriendlyCwd(data)));
        this._ensureCapabilitiesOrAddFailureTelemetry();
    }
    getMarkerId(terminal, vscodeMarkerId) {
        this._createOrGetBufferMarkDetection(terminal).getMark(vscodeMarkerId);
    }
    _markSequenceSeen(sequence) {
        if (!this._seenSequences.has(sequence)) {
            this._seenSequences.add(sequence);
            this._onDidChangeSeenSequences.fire(this._seenSequences);
        }
    }
    _handleFinalTermSequence(data) {
        const didHandle = this._doHandleFinalTermSequence(data);
        if (this._status === 0 /* ShellIntegrationStatus.Off */) {
            this._status = 1 /* ShellIntegrationStatus.FinalTerm */;
            this._onDidChangeStatus.fire(this._status);
        }
        return didHandle;
    }
    _doHandleFinalTermSequence(data) {
        if (!this._terminal) {
            return false;
        }
        // Pass the sequence along to the capability
        // It was considered to disable the common protocol in order to not confuse the VS Code
        // shell integration if both happen for some reason. This doesn't work for powerlevel10k
        // when instant prompt is enabled though. If this does end up being a problem we could pass
        // a type flag through the capability calls
        const [command, ...args] = data.split(';');
        this._markSequenceSeen(command);
        switch (command) {
            case "A" /* FinalTermOscPt.PromptStart */:
                this._createOrGetCommandDetection(this._terminal).handlePromptStart();
                return true;
            case "B" /* FinalTermOscPt.CommandStart */:
                // Ignore the command line for these sequences as it's unreliable for example in powerlevel10k
                this._createOrGetCommandDetection(this._terminal).handleCommandStart({ ignoreCommandLine: true });
                return true;
            case "C" /* FinalTermOscPt.CommandExecuted */:
                this._createOrGetCommandDetection(this._terminal).handleCommandExecuted();
                return true;
            case "D" /* FinalTermOscPt.CommandFinished */: {
                const exitCode = args.length === 1 ? parseInt(args[0]) : undefined;
                this._createOrGetCommandDetection(this._terminal).handleCommandFinished(exitCode);
                return true;
            }
        }
        return false;
    }
    _handleVSCodeSequence(data) {
        const didHandle = this._doHandleVSCodeSequence(data);
        if (!this._hasUpdatedTelemetry && didHandle) {
            this._telemetryService?.publicLog2('terminal/shellIntegrationActivationSucceeded');
            this._hasUpdatedTelemetry = true;
            this._clearActivationTimeout();
        }
        if (this._status !== 2 /* ShellIntegrationStatus.VSCode */) {
            this._status = 2 /* ShellIntegrationStatus.VSCode */;
            this._onDidChangeStatus.fire(this._status);
        }
        return didHandle;
    }
    async _ensureCapabilitiesOrAddFailureTelemetry() {
        if (!this._telemetryService || this._disableTelemetry) {
            return;
        }
        this._activationTimeout = setTimeout(() => {
            if (!this.capabilities.get(2 /* TerminalCapability.CommandDetection */) && !this.capabilities.get(0 /* TerminalCapability.CwdDetection */)) {
                this._telemetryService?.publicLog2('terminal/shellIntegrationActivationTimeout');
                this._logService.warn('Shell integration failed to add capabilities within 10 seconds');
            }
            this._hasUpdatedTelemetry = true;
        }, 10000);
    }
    _clearActivationTimeout() {
        if (this._activationTimeout !== undefined) {
            clearTimeout(this._activationTimeout);
            this._activationTimeout = undefined;
        }
    }
    _doHandleVSCodeSequence(data) {
        if (!this._terminal) {
            return false;
        }
        // Pass the sequence along to the capability
        const argsIndex = data.indexOf(';');
        const command = argsIndex === -1 ? data : data.substring(0, argsIndex);
        this._markSequenceSeen(command);
        // Cast to strict checked index access
        const args = argsIndex === -1 ? [] : data.substring(argsIndex + 1).split(';');
        switch (command) {
            case "A" /* VSCodeOscPt.PromptStart */:
                this._createOrGetCommandDetection(this._terminal).handlePromptStart();
                return true;
            case "B" /* VSCodeOscPt.CommandStart */:
                this._createOrGetCommandDetection(this._terminal).handleCommandStart();
                return true;
            case "C" /* VSCodeOscPt.CommandExecuted */:
                this._createOrGetCommandDetection(this._terminal).handleCommandExecuted();
                return true;
            case "D" /* VSCodeOscPt.CommandFinished */: {
                const arg0 = args[0];
                const exitCode = arg0 !== undefined ? parseInt(arg0) : undefined;
                this._createOrGetCommandDetection(this._terminal).handleCommandFinished(exitCode);
                return true;
            }
            case "E" /* VSCodeOscPt.CommandLine */: {
                const arg0 = args[0];
                const arg1 = args[1];
                let commandLine;
                if (arg0 !== undefined) {
                    commandLine = deserializeMessage(arg0);
                }
                else {
                    commandLine = '';
                }
                this._createOrGetCommandDetection(this._terminal).setCommandLine(commandLine, arg1 === this._nonce);
                return true;
            }
            case "F" /* VSCodeOscPt.ContinuationStart */: {
                this._createOrGetCommandDetection(this._terminal).handleContinuationStart();
                return true;
            }
            case "G" /* VSCodeOscPt.ContinuationEnd */: {
                this._createOrGetCommandDetection(this._terminal).handleContinuationEnd();
                return true;
            }
            case "EnvJson" /* VSCodeOscPt.EnvJson */: {
                const arg0 = args[0];
                const arg1 = args[1];
                if (arg0 !== undefined) {
                    try {
                        const env = JSON.parse(deserializeMessage(arg0));
                        this._createOrGetShellEnvDetection().setEnvironment(env, arg1 === this._nonce);
                    }
                    catch (e) {
                        this._logService.warn('Failed to parse environment from shell integration sequence', arg0);
                    }
                }
                return true;
            }
            case "EnvSingleStart" /* VSCodeOscPt.EnvSingleStart */: {
                this._createOrGetShellEnvDetection().startEnvironmentSingleVar(args[0] === '1', args[1] === this._nonce);
                return true;
            }
            case "EnvSingleDelete" /* VSCodeOscPt.EnvSingleDelete */: {
                const arg0 = args[0];
                const arg1 = args[1];
                const arg2 = args[2];
                if (arg0 !== undefined && arg1 !== undefined) {
                    const env = deserializeMessage(arg1);
                    this._createOrGetShellEnvDetection().deleteEnvironmentSingleVar(arg0, env, arg2 === this._nonce);
                }
                return true;
            }
            case "EnvSingleEntry" /* VSCodeOscPt.EnvSingleEntry */: {
                const arg0 = args[0];
                const arg1 = args[1];
                const arg2 = args[2];
                if (arg0 !== undefined && arg1 !== undefined) {
                    const env = deserializeMessage(arg1);
                    this._createOrGetShellEnvDetection().setEnvironmentSingleVar(arg0, env, arg2 === this._nonce);
                }
                return true;
            }
            case "EnvSingleEnd" /* VSCodeOscPt.EnvSingleEnd */: {
                this._createOrGetShellEnvDetection().endEnvironmentSingleVar(args[0] === this._nonce);
                return true;
            }
            case "H" /* VSCodeOscPt.RightPromptStart */: {
                this._createOrGetCommandDetection(this._terminal).handleRightPromptStart();
                return true;
            }
            case "I" /* VSCodeOscPt.RightPromptEnd */: {
                this._createOrGetCommandDetection(this._terminal).handleRightPromptEnd();
                return true;
            }
            case "P" /* VSCodeOscPt.Property */: {
                const arg0 = args[0];
                const deserialized = arg0 !== undefined ? deserializeMessage(arg0) : '';
                const { key, value } = parseKeyValueAssignment(deserialized);
                if (value === undefined) {
                    return true;
                }
                switch (key) {
                    case 'ContinuationPrompt': {
                        this._updateContinuationPrompt(removeAnsiEscapeCodesFromPrompt(value));
                        return true;
                    }
                    case 'Cwd': {
                        this._updateCwd(value);
                        return true;
                    }
                    case 'IsWindows': {
                        this._createOrGetCommandDetection(this._terminal).setIsWindowsPty(value === 'True' ? true : false);
                        return true;
                    }
                    case 'HasRichCommandDetection': {
                        this._createOrGetCommandDetection(this._terminal).setHasRichCommandDetection(value === 'True' ? true : false);
                        return true;
                    }
                    case 'Prompt': {
                        // Remove escape sequences from the user's prompt
                        const sanitizedValue = value.replace(/\x1b\[[0-9;]*m/g, '');
                        this._updatePromptTerminator(sanitizedValue);
                        return true;
                    }
                    case 'PromptType': {
                        this._createOrGetCommandDetection(this._terminal).setPromptType(value);
                        return true;
                    }
                    case 'Task': {
                        this._createOrGetBufferMarkDetection(this._terminal);
                        this.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.setIsCommandStorageDisabled();
                        return true;
                    }
                }
            }
            case "SetMark" /* VSCodeOscPt.SetMark */: {
                this._createOrGetBufferMarkDetection(this._terminal).addMark(parseMarkSequence(args));
                return true;
            }
        }
        // Unrecognized sequence
        return false;
    }
    _updateContinuationPrompt(value) {
        if (!this._terminal) {
            return;
        }
        this._createOrGetCommandDetection(this._terminal).setContinuationPrompt(value);
    }
    _updatePromptTerminator(prompt) {
        if (!this._terminal) {
            return;
        }
        const lastPromptLine = prompt.substring(prompt.lastIndexOf('\n') + 1);
        const promptTerminator = lastPromptLine.substring(lastPromptLine.lastIndexOf(' '));
        if (promptTerminator) {
            this._createOrGetCommandDetection(this._terminal).setPromptTerminator(promptTerminator, lastPromptLine);
        }
    }
    _updateCwd(value) {
        value = sanitizeCwd(value);
        this._createOrGetCwdDetection().updateCwd(value);
        const commandDetection = this.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        commandDetection?.setCwd(value);
    }
    _doHandleITermSequence(data) {
        if (!this._terminal) {
            return false;
        }
        const [command] = data.split(';');
        this._markSequenceSeen(`${1337 /* ShellIntegrationOscPs.ITerm */};${command}`);
        switch (command) {
            case "SetMark" /* ITermOscPt.SetMark */: {
                this._createOrGetBufferMarkDetection(this._terminal).addMark();
            }
            default: {
                // Checking for known `<key>=<value>` pairs.
                // Note that unlike `VSCodeOscPt.Property`, iTerm2 does not interpret backslash or hex-escape sequences.
                // See: https://github.com/gnachman/iTerm2/blob/bb0882332cec5196e4de4a4225978d746e935279/sources/VT100Terminal.m#L2089-L2105
                const { key, value } = parseKeyValueAssignment(command);
                if (value === undefined) {
                    // No '=' was found, so it's not a property assignment.
                    return true;
                }
                switch (key) {
                    case "CurrentDir" /* ITermOscPt.CurrentDir */:
                        // Encountered: `OSC 1337 ; CurrentDir=<Cwd> ST`
                        this._updateCwd(value);
                        return true;
                }
            }
        }
        // Unrecognized sequence
        return false;
    }
    _doHandleSetWindowsFriendlyCwd(data) {
        if (!this._terminal) {
            return false;
        }
        const [command, ...args] = data.split(';');
        this._markSequenceSeen(`${9 /* ShellIntegrationOscPs.SetWindowsFriendlyCwd */};${command}`);
        switch (command) {
            case '9':
                // Encountered `OSC 9 ; 9 ; <cwd> ST`
                if (args.length) {
                    this._updateCwd(args[0]);
                }
                return true;
        }
        // Unrecognized sequence
        return false;
    }
    /**
     * Handles the sequence: `OSC 7 ; scheme://cwd ST`
     */
    _doHandleSetCwd(data) {
        if (!this._terminal) {
            return false;
        }
        const [command] = data.split(';');
        this._markSequenceSeen(`${7 /* ShellIntegrationOscPs.SetCwd */};${command}`);
        if (command.match(/^file:\/\/.*\//)) {
            const uri = URI.parse(command);
            if (uri.path && uri.path.length > 0) {
                this._updateCwd(uri.path);
                return true;
            }
        }
        // Unrecognized sequence
        return false;
    }
    serialize() {
        if (!this._terminal || !this.capabilities.has(2 /* TerminalCapability.CommandDetection */)) {
            return {
                isWindowsPty: false,
                hasRichCommandDetection: false,
                commands: [],
                promptInputModel: undefined,
            };
        }
        const result = this._createOrGetCommandDetection(this._terminal).serialize();
        return result;
    }
    deserialize(serialized) {
        if (!this._terminal) {
            throw new Error('Cannot restore commands before addon is activated');
        }
        const commandDetection = this._createOrGetCommandDetection(this._terminal);
        commandDetection.deserialize(serialized);
        if (commandDetection.cwd) {
            // Cwd gets set when the command is deserialized, so we need to update it here
            this._updateCwd(commandDetection.cwd);
        }
    }
    _createOrGetCwdDetection() {
        let cwdDetection = this.capabilities.get(0 /* TerminalCapability.CwdDetection */);
        if (!cwdDetection) {
            cwdDetection = this._register(new CwdDetectionCapability());
            this.capabilities.add(0 /* TerminalCapability.CwdDetection */, cwdDetection);
        }
        return cwdDetection;
    }
    _createOrGetCommandDetection(terminal) {
        let commandDetection = this.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (!commandDetection) {
            commandDetection = this._register(new CommandDetectionCapability(terminal, this._logService));
            this.capabilities.add(2 /* TerminalCapability.CommandDetection */, commandDetection);
        }
        return commandDetection;
    }
    _createOrGetBufferMarkDetection(terminal) {
        let bufferMarkDetection = this.capabilities.get(4 /* TerminalCapability.BufferMarkDetection */);
        if (!bufferMarkDetection) {
            bufferMarkDetection = this._register(new BufferMarkCapability(terminal));
            this.capabilities.add(4 /* TerminalCapability.BufferMarkDetection */, bufferMarkDetection);
        }
        return bufferMarkDetection;
    }
    _createOrGetShellEnvDetection() {
        let shellEnvDetection = this.capabilities.get(5 /* TerminalCapability.ShellEnvDetection */);
        if (!shellEnvDetection) {
            shellEnvDetection = this._register(new ShellEnvDetectionCapability());
            this.capabilities.add(5 /* TerminalCapability.ShellEnvDetection */, shellEnvDetection);
        }
        return shellEnvDetection;
    }
}
export function deserializeMessage(message) {
    return message.replaceAll(
    // Backslash ('\') followed by an escape operator: either another '\', or 'x' and two hex chars.
    /\\(\\|x([0-9a-f]{2}))/gi, 
    // If it's a hex value, parse it to a character.
    // Otherwise the operator is '\', which we return literally, now unescaped.
    (_match, op, hex) => hex ? String.fromCharCode(parseInt(hex, 16)) : op);
}
export function parseKeyValueAssignment(message) {
    const separatorIndex = message.indexOf('=');
    if (separatorIndex === -1) {
        return { key: message, value: undefined }; // No '=' was found.
    }
    return {
        key: message.substring(0, separatorIndex),
        value: message.substring(1 + separatorIndex)
    };
}
export function parseMarkSequence(sequence) {
    let id = undefined;
    let hidden = false;
    for (const property of sequence) {
        // Sanity check, this shouldn't happen in practice
        if (property === undefined) {
            continue;
        }
        if (property === 'Hidden') {
            hidden = true;
        }
        if (property.startsWith('Id=')) {
            id = property.substring(3);
        }
    }
    return { id, hidden };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxJbnRlZ3JhdGlvbkFkZG9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24veHRlcm0vc2hlbGxJbnRlZ3JhdGlvbkFkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBR3pHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUUvRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3hELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRzdGOzs7Ozs7Ozs7Ozs7R0FZRztBQUVIOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLHFCQWdCakI7QUFoQkQsV0FBa0IscUJBQXFCO0lBQ3RDOztPQUVHO0lBQ0gsNkVBQWUsQ0FBQTtJQUNmOzs7T0FHRztJQUNILHVFQUFZLENBQUE7SUFDWjs7T0FFRztJQUNILHNFQUFZ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