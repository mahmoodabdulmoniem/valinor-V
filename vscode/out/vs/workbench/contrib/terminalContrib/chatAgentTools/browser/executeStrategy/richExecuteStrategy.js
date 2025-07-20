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
import { isNumber } from '../../../../../../base/common/types.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { trackIdleOnPrompt } from './executeStrategy.js';
/**
 * This strategy is used when the terminal has rich shell integration/command detection is
 * available, meaning every sequence we rely upon should be exactly where we expect it to be. In
 * particular (`633;`) `A, B, E, C, D` all happen in exactly that order. While things still could go
 * wrong in this state, minimal verification is done in this mode since rich command detection is a
 * strong signal that it's behaving correctly.
 */
let RichExecuteStrategy = class RichExecuteStrategy {
    constructor(_instance, _commandDetection, _logService) {
        this._instance = _instance;
        this._commandDetection = _commandDetection;
        this._logService = _logService;
        this.type = 'rich';
    }
    async execute(commandLine, token) {
        const store = new DisposableStore();
        try {
            // Ensure xterm is available
            this._logService.debug('RunInTerminalTool#None: Waiting for xterm');
            const xterm = await this._instance.xtermReadyPromise;
            if (!xterm) {
                throw new Error('Xterm is not available');
            }
            const onDone = Promise.race([
                Event.toPromise(this._commandDetection.onCommandFinished, store).then(e => {
                    this._logService.debug('RunInTerminalTool#Rich: onDone via end event');
                    return e;
                }),
                Event.toPromise(token.onCancellationRequested, store).then(() => {
                    this._logService.debug('RunInTerminalTool#Rich: onDone via cancellation');
                }),
                trackIdleOnPrompt(this._instance, 1000, store).then(() => {
                    this._logService.debug('RunInTerminalTool#Rich: onDone via idle prompt');
                }),
            ]);
            // Execute the command
            this._logService.debug(`RunInTerminalTool#Rich: Executing command line \`${commandLine}\``);
            const startMarker = store.add(xterm.raw.registerMarker());
            this._instance.runCommand(commandLine, true);
            this._logService.debug(`RunInTerminalTool#Rich: Waiting for done event`);
            const finishedCommand = await onDone;
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            const endMarker = store.add(xterm.raw.registerMarker());
            let result;
            if (finishedCommand) {
                const commandOutput = finishedCommand?.getOutput();
                if (commandOutput !== undefined) {
                    this._logService.debug('RunInTerminalTool#Rich: Fetched output via finished command');
                    result = commandOutput;
                }
            }
            if (result === undefined) {
                this._logService.debug('RunInTerminalTool#Rich: Fetched output via markers');
                result = xterm.getContentsAsText(startMarker, endMarker);
            }
            if (result.trim().length === 0) {
                result = 'Command produced no output';
            }
            const exitCode = finishedCommand?.exitCode;
            if (isNumber(exitCode) && exitCode > 0) {
                result += `\n\nCommand exited with code ${exitCode}`;
            }
            return {
                result,
                exitCode,
            };
        }
        finally {
            store.dispose();
        }
    }
};
RichExecuteStrategy = __decorate([
    __param(2, ITerminalLogService)
], RichExecuteStrategy);
export { RichExecuteStrategy };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmljaEV4ZWN1dGVTdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvZXhlY3V0ZVN0cmF0ZWd5L3JpY2hFeGVjdXRlU3RyYXRlZ3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFpQyxNQUFNLHNCQUFzQixDQUFDO0FBRXhGOzs7Ozs7R0FNRztBQUNJLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1CO0lBRy9CLFlBQ2tCLFNBQTRCLEVBQzVCLGlCQUE4QyxFQUMxQyxXQUFpRDtRQUZyRCxjQUFTLEdBQVQsU0FBUyxDQUFtQjtRQUM1QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQTZCO1FBQ3pCLGdCQUFXLEdBQVgsV0FBVyxDQUFxQjtRQUw5RCxTQUFJLEdBQUcsTUFBTSxDQUFDO0lBT3ZCLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQW1CLEVBQUUsS0FBd0I7UUFDMUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNwQyxJQUFJLENBQUM7WUFDSiw0QkFBNEI7WUFDNUIsSUFBSSxDQUFDLFdBQVcsQ0FB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