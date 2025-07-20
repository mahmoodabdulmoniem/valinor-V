/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../base/common/platform.js';
import { isObject, isString } from '../../../../../base/common/types.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
export var TerminalSendSignalCommandId;
(function (TerminalSendSignalCommandId) {
    TerminalSendSignalCommandId["SendSignal"] = "workbench.action.terminal.sendSignal";
})(TerminalSendSignalCommandId || (TerminalSendSignalCommandId = {}));
function toOptionalString(obj) {
    return isString(obj) ? obj : undefined;
}
const sendSignalString = localize2('sendSignal', "Send Signal");
registerTerminalAction({
    id: "workbench.action.terminal.sendSignal" /* TerminalSendSignalCommandId.SendSignal */,
    title: sendSignalString,
    f1: !isWindows,
    metadata: {
        description: sendSignalString.value,
        args: [{
                name: 'args',
                schema: {
                    type: 'object',
                    required: ['signal'],
                    properties: {
                        signal: {
                            description: localize('sendSignal.signal.desc', "The signal to send to the terminal process (e.g., 'SIGTERM', 'SIGINT', 'SIGKILL')"),
                            type: 'string'
                        }
                    },
                }
            }]
    },
    run: async (c, accessor, args) => {
        const quickInputService = accessor.get(IQuickInputService);
        const instance = c.service.activeInstance;
        if (!instance) {
            return;
        }
        let signal = isObject(args) && 'signal' in args ? toOptionalString(args.signal) : undefined;
        if (!signal) {
            const signalOptions = [
                { label: 'SIGINT', description: localize('SIGINT', 'Interrupt process (Ctrl+C)') },
                { label: 'SIGTERM', description: localize('SIGTERM', 'Terminate process gracefully') },
                { label: 'SIGKILL', description: localize('SIGKILL', 'Force kill process') },
                { label: 'SIGSTOP', description: localize('SIGSTOP', 'Stop process') },
                { label: 'SIGCONT', description: localize('SIGCONT', 'Continue process') },
                { label: 'SIGHUP', description: localize('SIGHUP', 'Hangup') },
                { label: 'SIGQUIT', description: localize('SIGQUIT', 'Quit process') },
                { label: 'SIGUSR1', description: localize('SIGUSR1', 'User-defined signal 1') },
                { label: 'SIGUSR2', description: localize('SIGUSR2', 'User-defined signal 2') },
                { type: 'separator' },
                { label: localize('manualSignal', 'Manually enter signal') }
            ];
            const selected = await quickInputService.pick(signalOptions, {
                placeHolder: localize('selectSignal', 'Select signal to send to terminal process')
            });
            if (!selected) {
                return;
            }
            if (selected.label === localize('manualSignal', 'Manually enter signal')) {
                const inputSignal = await quickInputService.input({
                    prompt: localize('enterSignal', 'Enter signal name (e.g., SIGTERM, SIGKILL)'),
                });
                if (!inputSignal) {
                    return;
                }
                signal = inputSignal;
            }
            else {
                signal = selected.label;
            }
        }
        await instance.sendSignal(signal);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuc2VuZFNpZ25hbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zZW5kU2lnbmFsL2Jyb3dzZXIvdGVybWluYWwuc2VuZFNpZ25hbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQXNCLE1BQU0seURBQXlELENBQUM7QUFDakgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFdEYsTUFBTSxDQUFOLElBQWtCLDJCQUVqQjtBQUZELFdBQWtCLDJCQUEyQjtJQUM1QyxrRkFBbUQsQ0FBQTtBQUNwRCxDQUFDLEVBRmlCLDJCQUEyQixLQUEzQiwyQkFBMkIsUUFFNUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLEdBQVk7SUFDckMsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ3hDLENBQUM7QUFFRCxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFDaEUsc0JBQXNCLENBQUM7SUFDdEIsRUFBRSxxRkFBd0M7SUFDMUMsS0FBSyxFQUFFLGdCQUFnQjtJQUN2QixFQUFFLEVBQUUsQ0FBQyxTQUFTO0lBQ2QsUUFBUSxFQUFFO1FB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