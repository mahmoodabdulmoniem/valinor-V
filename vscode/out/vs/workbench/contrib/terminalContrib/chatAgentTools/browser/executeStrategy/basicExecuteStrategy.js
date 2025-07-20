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
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Event } from '../../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { trackIdleOnPrompt, waitForIdle } from './executeStrategy.js';
/**
 * This strategy is used when shell integration is enabled, but rich command detection was not
 * declared by the shell script. This is the large spectrum between rich command detection and no
 * shell integration, here are some problems that are expected:
 *
 * - `133;C` command executed may not happen.
 * - `633;E` comamnd line reporting will likely not happen, so the command line contained in the
 *   execution start and end events will be of low confidence and chances are it will be wrong.
 * - Execution tracking may be incorrect, particularly when `executeCommand` calls are overlapped,
 *   such as Python activating the environment at the same time as Copilot executing a command. So
 *   the end event for the execution may actually correspond to a different command.
 *
 * This strategy focuses on trying to get the most accurate output given these limitations and
 * unknowns. Basically we cannot fully trust the extension APIs in this case, so polling of the data
 * stream is used to detect idling, and we listen to the terminal's data stream instead of the
 * execution's data stream.
 *
 * This is best effort with the goal being the output is accurate, though it may contain some
 * content above and below the command output, such as prompts or even possibly other command
 * output. We lean on the LLM to be able to differentiate the actual output from prompts and bad
 * output when it's not ideal.
 */
let BasicExecuteStrategy = class BasicExecuteStrategy {
    constructor(_instance, _commandDetection, _logService) {
        this._instance = _instance;
        this._commandDetection = _commandDetection;
        this._logService = _logService;
        this.type = 'basic';
    }
    async execute(commandLine, token) {
        const store = new DisposableStore();
        try {
            const idlePromptPromise = trackIdleOnPrompt(this._instance, 1000, store);
            const onDone = Promise.race([
                Event.toPromise(this._commandDetection.onCommandFinished, store).then(e => {
                    // When shell integration is basic, it means that the end execution event is
                    // often misfired since we don't have command line verification. Because of this
                    // we make sure the prompt is idle after the end execution event happens.
                    this._logService.debug('RunInTerminalTool#Basic: onDone 1 of 2 via end event, waiting for short idle prompt');
                    return idlePromptPromise.then(() => {
                        this._logService.debug('RunInTerminalTool#Basic: onDone 2 of 2 via short idle prompt');
                        return e;
                    });
                }),
                Event.toPromise(token.onCancellationRequested, store).then(() => {
                    this._logService.debug('RunInTerminalTool#Basic: onDone via cancellation');
                }),
                // A longer idle prompt event is used here as a catch all for unexpected cases where
                // the end event doesn't fire for some reason.
                trackIdleOnPrompt(this._instance, 3000, store).then(() => {
                    this._logService.debug('RunInTerminalTool#Basic: onDone long idle prompt');
                }),
            ]);
            // Ensure xterm is available
            this._logService.debug('RunInTerminalTool#None: Waiting for xterm');
            const xterm = await this._instance.xtermReadyPromise;
            if (!xterm) {
                throw new Error('Xterm is not available');
            }
            // Wait for the terminal to idle before executing the command
            this._logService.debug('RunInTerminalTool#Basic: Waiting for idle');
            await waitForIdle(this._instance.onData, 1000);
            // Execute the command
            const startMarker = store.add(xterm.raw.registerMarker());
            this._logService.debug(`RunInTerminalTool#Basic: Executing command line \`${commandLine}\``);
            this._instance.runCommand(commandLine, true);
            // Wait for the next end execution event - note that this may not correspond to the actual
            // execution requested
            const doneData = await onDone;
            // Wait for the terminal to idle
            this._logService.debug('RunInTerminalTool#Basic: Waiting for idle');
            await waitForIdle(this._instance.onData, 1000);
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            const endMarker = store.add(xterm.raw.registerMarker());
            // Assemble final result
            let result = xterm.getContentsAsText(startMarker, endMarker);
            if (doneData && typeof doneData.exitCode === 'number' && doneData.exitCode > 0) {
                result += `\n\nCommand exited with code ${doneData.exitCode}`;
            }
            return {
                result,
                exitCode: doneData?.exitCode,
            };
        }
        finally {
            store.dispose();
        }
    }
};
BasicExecuteStrategy = __decorate([
    __param(2, ITerminalLogService)
], BasicExecuteStrategy);
export { BasicExecuteStrategy };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzaWNFeGVjdXRlU3RyYXRlZ3kuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL2V4ZWN1dGVTdHJhdGVneS9iYXNpY0V4ZWN1dGVTdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQWlDLE1BQU0sc0JBQXNCLENBQUM7QUFFckc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXFCRztBQUNJLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQW9CO0lBR2hDLFlBQ2tCLFNBQTRCLEVBQzVCLGlCQUE4QyxFQUMxQyxXQUFpRDtRQUZyRCxjQUFTLEdBQVQsU0FBUyxDQUFtQjtRQUM1QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQTZCO1FBQ3pCLGdCQUFXLEdBQVgsV0FBVyxDQUFxQjtRQUw5RCxTQUFJLEdBQUcsT0FBTyxDQUFDO0lBT3hCLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQW1CLEVBQUUsS0FBd0I7UUFDMUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNwQyxJQUFJLENBQUM7WUFDSixNQUFNLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxTQUFTLEVB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