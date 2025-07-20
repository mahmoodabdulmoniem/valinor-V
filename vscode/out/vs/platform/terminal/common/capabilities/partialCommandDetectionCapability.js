/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
var Constants;
(function (Constants) {
    /**
     * The minimum size of the prompt in which to assume the line is a command.
     */
    Constants[Constants["MinimumPromptLength"] = 2] = "MinimumPromptLength";
})(Constants || (Constants = {}));
/**
 * This capability guesses where commands are based on where the cursor was when enter was pressed.
 * It's very hit or miss but it's often correct and better than nothing.
 */
export class PartialCommandDetectionCapability extends DisposableStore {
    get commands() { return this._commands; }
    constructor(_terminal, _onDidExecuteText) {
        super();
        this._terminal = _terminal;
        this._onDidExecuteText = _onDidExecuteText;
        this.type = 3 /* TerminalCapability.PartialCommandDetection */;
        this._commands = [];
        this._onCommandFinished = this.add(new Emitter());
        this.onCommandFinished = this._onCommandFinished.event;
        this.add(this._terminal.onData(e => this._onData(e)));
        this.add(this._terminal.parser.registerCsiHandler({ final: 'J' }, params => {
            if (params.length >= 1 && (params[0] === 2 || params[0] === 3)) {
                this._clearCommandsInViewport();
            }
            // We don't want to override xterm.js' default behavior, just augment it
            return false;
        }));
        if (this._onDidExecuteText) {
            this.add(this._onDidExecuteText(() => this._onEnter()));
        }
    }
    _onData(data) {
        if (data === '\x0d') {
            this._onEnter();
        }
    }
    _onEnter() {
        if (!this._terminal) {
            return;
        }
        if (this._terminal.buffer.active.cursorX >= 2 /* Constants.MinimumPromptLength */) {
            const marker = this._terminal.registerMarker(0);
            if (marker) {
                this._commands.push(marker);
                this._onCommandFinished.fire(marker);
            }
        }
    }
    _clearCommandsInViewport() {
        // Find the number of commands on the tail end of the array that are within the viewport
        let count = 0;
        for (let i = this._commands.length - 1; i >= 0; i--) {
            if (this._commands[i].line < this._terminal.buffer.active.baseY) {
                break;
            }
            count++;
        }
        // Remove them
        this._commands.splice(this._commands.length - count, count);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydGlhbENvbW1hbmREZXRlY3Rpb25DYXBhYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vY2FwYWJpbGl0aWVzL3BhcnRpYWxDb21tYW5kRGV0ZWN0aW9uQ2FwYWJpbGl0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBSXZFLElBQVcsU0FLVjtBQUxELFdBQVcsU0FBUztJQUNuQjs7T0FFRztJQUNILHVFQUF1QixDQUFBO0FBQ3hCLENBQUMsRUFMVSxTQUFTLEtBQVQsU0FBUyxRQUtuQjtBQUVEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxpQ0FBa0MsU0FBUSxlQUFlO0lBS3JFLElBQUksUUFBUSxLQUF5QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBSzdELFlBQ2tCLFNBQW1CLEVBQzVCLGlCQUEwQztRQUVsRCxLQUFLLEVBQUUsQ0FBQztRQUhTLGNBQVMsR0FBVCxTQUFTLENBQVU7UUFDNUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUF5QjtRQVgxQyxTQUFJLHNEQUE4QztRQUUxQyxjQUFTLEdBQWMsRUFBRSxDQUFDO1FBSTFCLHVCQUFrQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFDO1FBQzlELHNCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7UUFPMUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDMUUsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hFLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQ2pDLENBQUM7WUFDRCx3RUFBd0U7WUFDeEUsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pELENBQUM7SUFDRixDQUFDO0lBRU8sT0FBTyxDQUFDLElBQVk7UUFDM0IsSUFBSSxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2pCLENBQUM7SUFDRixDQUFDO0lBRU8sUUFBUTtRQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLHlDQUFpQyxFQUFFLENBQUM7WUFDM0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEQsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx3QkFBd0I7UUFDL0Isd0ZBQXdGO1FBQ3hGLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztRQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNyRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDakUsTUFBTTtZQUNQLENBQUM7WUFDRCxLQUFLLEVBQUUsQ0FBQztRQUNULENBQUM7UUFDRCxjQUFjO1FBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdELENBQUM7Q0FDRCJ9