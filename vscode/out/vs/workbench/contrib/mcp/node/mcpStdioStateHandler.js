/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TimeoutTimer } from '../../../../base/common/async.js';
import { killTree } from '../../../../base/node/processes.js';
import { isWindows } from '../../../../base/common/platform.js';
var McpProcessState;
(function (McpProcessState) {
    McpProcessState[McpProcessState["Running"] = 0] = "Running";
    McpProcessState[McpProcessState["StdinEnded"] = 1] = "StdinEnded";
    McpProcessState[McpProcessState["KilledPolite"] = 2] = "KilledPolite";
    McpProcessState[McpProcessState["KilledForceful"] = 3] = "KilledForceful";
})(McpProcessState || (McpProcessState = {}));
/**
 * Manages graceful shutdown of MCP stdio connections following the MCP specification.
 *
 * Per spec, shutdown should:
 * 1. Close the input stream to the child process
 * 2. Wait for the server to exit, or send SIGTERM if it doesn't exit within 10 seconds
 * 3. Send SIGKILL if the server doesn't exit within 10 seconds after SIGTERM
 * 4. Allow forceful killing if called twice
 */
export class McpStdioStateHandler {
    static { this.GRACE_TIME_MS = 10_000; }
    get stopped() {
        return this._procState !== 0 /* McpProcessState.Running */;
    }
    constructor(_child, _graceTimeMs = McpStdioStateHandler.GRACE_TIME_MS) {
        this._child = _child;
        this._graceTimeMs = _graceTimeMs;
        this._procState = 0 /* McpProcessState.Running */;
    }
    /**
     * Initiates graceful shutdown. If called while shutdown is already in progress,
     * forces immediate termination.
     */
    stop() {
        if (this._procState === 0 /* McpProcessState.Running */) {
            let graceTime = this._graceTimeMs;
            try {
                this._child.stdin.end();
            }
            catch (error) {
                // If stdin.end() fails, continue with termination sequence
                // This can happen if the stream is already in an error state
                graceTime = 1;
            }
            this._procState = 1 /* McpProcessState.StdinEnded */;
            this._nextTimeout = new TimeoutTimer(() => this.killPolite(), graceTime);
        }
        else {
            this._nextTimeout?.dispose();
            this.killForceful();
        }
    }
    async killPolite() {
        this._procState = 2 /* McpProcessState.KilledPolite */;
        this._nextTimeout = new TimeoutTimer(() => this.killForceful(), this._graceTimeMs);
        if (this._child.pid) {
            if (!isWindows) {
                await killTree(this._child.pid, false).catch(() => {
                    this._child.kill('SIGTERM');
                });
            }
        }
        else {
            this._child.kill('SIGTERM');
        }
    }
    async killForceful() {
        this._procState = 3 /* McpProcessState.KilledForceful */;
        if (this._child.pid) {
            await killTree(this._child.pid, true).catch(() => {
                this._child.kill('SIGKILL');
            });
        }
        else {
            this._child.kill();
        }
    }
    write(message) {
        if (!this.stopped) {
            this._child.stdin.write(message + '\n');
        }
    }
    dispose() {
        this._nextTimeout?.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU3RkaW9TdGF0ZUhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9ub2RlL21jcFN0ZGlvU3RhdGVIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRWhFLElBQVcsZUFLVjtBQUxELFdBQVcsZUFBZTtJQUN6QiwyREFBTyxDQUFBO0lBQ1AsaUVBQVUsQ0FBQTtJQUNWLHFFQUFZLENBQUE7SUFDWix5RUFBYyxDQUFBO0FBQ2YsQ0FBQyxFQUxVLGVBQWUsS0FBZixlQUFlLFFBS3pCO0FBRUQ7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLE9BQU8sb0JBQW9CO2FBQ1Isa0JBQWEsR0FBRyxNQUFNLEFBQVQsQ0FBVTtJQUsvQyxJQUFXLE9BQU87UUFDakIsT0FBTyxJQUFJLENBQUMsVUFBVSxvQ0FBNEIsQ0FBQztJQUNwRCxDQUFDO0lBRUQsWUFDa0IsTUFBc0MsRUFDdEMsZUFBdUIsb0JBQW9CLENBQUMsYUFBYTtRQUR6RCxXQUFNLEdBQU4sTUFBTSxDQUFnQztRQUN0QyxpQkFBWSxHQUFaLFlBQVksQ0FBNkM7UUFUbkUsZUFBVSxtQ0FBMkI7SUFVekMsQ0FBQztJQUVMOzs7T0FHRztJQUNJLElBQUk7UUFDVixJQUFJLElBQUksQ0FBQyxVQUFVLG9DQUE0QixFQUFFLENBQUM7WUFDakQsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUNsQyxJQUFJLENBQUM7Z0JBQ0osSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDekIsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2hCLDJEQUEyRDtnQkFDM0QsNkRBQTZEO2dCQUM3RCxTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBQ2YsQ0FBQztZQUNELElBQUksQ0FBQyxVQUFVLHFDQUE2QixDQUFDO1lBQzdDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzFFLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDckIsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsVUFBVTtRQUN2QixJQUFJLENBQUMsVUFBVSx1Q0FBK0IsQ0FBQztRQUMvQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFbkYsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtvQkFDakQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzdCLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0IsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWTtRQUN6QixJQUFJLENBQUMsVUFBVSx5Q0FBaUMsQ0FBQztRQUVqRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDckIsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtnQkFDaEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFFTSxLQUFLLENBQUMsT0FBZTtRQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUM5QixDQUFDIn0=