/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise, RunOnceScheduler } from '../../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
export async function waitForIdle(onData, idleDurationMs) {
    // This is basically Event.debounce but with an initial event to trigger the debounce
    // immediately
    const store = new DisposableStore();
    const deferred = new DeferredPromise();
    const scheduler = store.add(new RunOnceScheduler(() => deferred.complete(), idleDurationMs));
    store.add(onData(() => scheduler.schedule()));
    scheduler.schedule();
    return deferred.p.finally(() => store.dispose());
}
/**
 * Tracks the terminal for being idle on a prompt input. This must be called before `executeCommand`
 * is called.
 */
export async function trackIdleOnPrompt(instance, idleDurationMs, store) {
    const idleOnPrompt = new DeferredPromise();
    const onData = instance.onData;
    const scheduler = store.add(new RunOnceScheduler(() => {
        idleOnPrompt.complete();
    }, idleDurationMs));
    // Only schedule when a prompt sequence (A) is seen after an execute sequence (C). This prevents
    // cases where the command is executed before the prompt is written. While not perfect, sitting
    // on an A without a C following shortly after is a very good indicator that the command is done
    // and the terminal is idle. Note that D is treated as a signal for executed since shell
    // integration sometimes lacks the C sequence either due to limitations in the integation or the
    // required hooks aren't available.
    let TerminalState;
    (function (TerminalState) {
        TerminalState[TerminalState["Initial"] = 0] = "Initial";
        TerminalState[TerminalState["Prompt"] = 1] = "Prompt";
        TerminalState[TerminalState["Executing"] = 2] = "Executing";
        TerminalState[TerminalState["PromptAfterExecuting"] = 3] = "PromptAfterExecuting";
    })(TerminalState || (TerminalState = {}));
    let state = 0 /* TerminalState.Initial */;
    store.add(onData(e => {
        // Update state
        // p10k fires C as `133;C;`
        const matches = e.matchAll(/(?:\x1b\]|\x9d)[16]33;(?<type>[ACD])(?:;.*)?(?:\x1b\\|\x07|\x9c)/g);
        for (const match of matches) {
            if (match.groups?.type === 'A') {
                if (state === 0 /* TerminalState.Initial */) {
                    state = 1 /* TerminalState.Prompt */;
                }
                else if (state === 2 /* TerminalState.Executing */) {
                    state = 3 /* TerminalState.PromptAfterExecuting */;
                }
            }
            else if (match.groups?.type === 'C' || match.groups?.type === 'D') {
                state = 2 /* TerminalState.Executing */;
            }
        }
        // Re-schedule on every data event as we're tracking data idle
        if (state === 3 /* TerminalState.PromptAfterExecuting */) {
            scheduler.schedule();
        }
        else {
            scheduler.cancel();
        }
    }));
    return idleOnPrompt.p;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0ZVN0cmF0ZWd5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci9leGVjdXRlU3RyYXRlZ3kvZXhlY3V0ZVN0cmF0ZWd5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUczRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFZN0UsTUFBTSxDQUFDLEtBQUssVUFBVSxXQUFXLENBQUMsTUFBc0IsRUFBRSxjQUFzQjtJQUMvRSxxRkFBcUY7SUFDckYsY0FBYztJQUNkLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDcEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFlLEVBQVEsQ0FBQztJQUM3QyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDN0YsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM5QyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDckIsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUNsRCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxpQkFBaUIsQ0FDdEMsUUFBMkIsRUFDM0IsY0FBc0IsRUFDdEIsS0FBc0I7SUFFdEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxlQUFlLEVBQVEsQ0FBQztJQUNqRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO0lBQy9CLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7UUFDckQsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3pCLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQ3BCLGdHQUFnRztJQUNoRywrRkFBK0Y7SUFDL0YsZ0dBQWdHO0lBQ2hHLHdGQUF3RjtJQUN4RixnR0FBZ0c7SUFDaEcsbUNBQW1DO0lBQ25DLElBQVcsYUFLVjtJQUxELFdBQVcsYUFBYTtRQUN2Qix1REFBTyxDQUFBO1FBQ1AscURBQU0sQ0FBQTtRQUNOLDJEQUFTLENBQUE7UUFDVCxpRkFBb0IsQ0FBQTtJQUNyQixDQUFDLEVBTFUsYUFBYSxLQUFiLGFBQWEsUUFLdkI7SUFDRCxJQUFJLEtBQUssZ0NBQXVDLENBQUM7SUFDakQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDcEIsZUFBZTtRQUNmLDJCQUEyQjtRQUMzQixNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLG1FQUFtRSxDQUFDLENBQUM7UUFDaEcsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUM3QixJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLEtBQUssa0NBQTBCLEVBQUUsQ0FBQztvQkFDckMsS0FBSywrQkFBdUIsQ0FBQztnQkFDOUIsQ0FBQztxQkFBTSxJQUFJLEtBQUssb0NBQTRCLEVBQUUsQ0FBQztvQkFDOUMsS0FBSyw2Q0FBcUMsQ0FBQztnQkFDNUMsQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ3JFLEtBQUssa0NBQTBCLENBQUM7WUFDakMsQ0FBQztRQUNGLENBQUM7UUFDRCw4REFBOEQ7UUFDOUQsSUFBSSxLQUFLLCtDQUF1QyxFQUFFLENBQUM7WUFDbEQsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3RCLENBQUM7YUFBTSxDQUFDO1lBQ1AsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0osT0FBTyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMifQ==