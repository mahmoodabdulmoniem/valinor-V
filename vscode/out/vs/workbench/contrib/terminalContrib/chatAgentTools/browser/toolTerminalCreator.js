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
var ToolTerminalCreator_1;
import { DeferredPromise, disposableTimeout, timeout } from '../../../../../base/common/async.js';
import { CancellationError } from '../../../../../base/common/errors.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
var ShellLaunchType;
(function (ShellLaunchType) {
    ShellLaunchType[ShellLaunchType["Unknown"] = 0] = "Unknown";
    ShellLaunchType[ShellLaunchType["Default"] = 1] = "Default";
    ShellLaunchType[ShellLaunchType["Fallback"] = 2] = "Fallback";
})(ShellLaunchType || (ShellLaunchType = {}));
export var ShellIntegrationQuality;
(function (ShellIntegrationQuality) {
    ShellIntegrationQuality["None"] = "none";
    ShellIntegrationQuality["Basic"] = "basic";
    ShellIntegrationQuality["Rich"] = "rich";
})(ShellIntegrationQuality || (ShellIntegrationQuality = {}));
let ToolTerminalCreator = class ToolTerminalCreator {
    static { ToolTerminalCreator_1 = this; }
    /**
     * The shell preference cached for the lifetime of the window. This allows skipping previous
     * shell approaches that failed in previous runs to save time.
     */
    static { this._lastSuccessfulShell = 0 /* ShellLaunchType.Unknown */; }
    constructor(_terminalService) {
        this._terminalService = _terminalService;
    }
    async createTerminal(token) {
        const instance = await this._createCopilotTerminal();
        const toolTerminal = {
            instance,
            shellIntegrationQuality: "none" /* ShellIntegrationQuality.None */,
        };
        // The default profile has shell integration
        if (ToolTerminalCreator_1._lastSuccessfulShell <= 1 /* ShellLaunchType.Default */) {
            const shellIntegrationQuality = await this._waitForShellIntegration(instance, 5000);
            if (token.isCancellationRequested) {
                instance.dispose();
                throw new CancellationError();
            }
            if (shellIntegrationQuality !== "none" /* ShellIntegrationQuality.None */) {
                ToolTerminalCreator_1._lastSuccessfulShell = 1 /* ShellLaunchType.Default */;
                toolTerminal.shellIntegrationQuality = shellIntegrationQuality;
                return toolTerminal;
            }
        }
        // Fallback case: No shell integration in default profile
        ToolTerminalCreator_1._lastSuccessfulShell = 2 /* ShellLaunchType.Fallback */;
        return toolTerminal;
    }
    _createCopilotTerminal() {
        return this._terminalService.createTerminal({
            config: {
                name: 'Copilot',
                icon: ThemeIcon.fromId('copilot'),
                hideFromUser: true,
                env: {
                    GIT_PAGER: 'cat', // avoid making `git diff` interactive when called from copilot
                },
            },
        });
    }
    _waitForShellIntegration(instance, timeoutMs) {
        const dataFinished = new DeferredPromise();
        const deferred = new DeferredPromise();
        const timer = disposableTimeout(() => deferred.complete("none" /* ShellIntegrationQuality.None */), timeoutMs);
        if (instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.hasRichCommandDetection) {
            timer.dispose();
            deferred.complete("rich" /* ShellIntegrationQuality.Rich */);
        }
        else {
            const onSetRichCommandDetection = this._terminalService.createOnInstanceCapabilityEvent(2 /* TerminalCapability.CommandDetection */, e => e.onSetRichCommandDetection);
            const richCommandDetectionListener = onSetRichCommandDetection.event((e) => {
                if (e.instance !== instance) {
                    return;
                }
                deferred.complete("rich" /* ShellIntegrationQuality.Rich */);
            });
            const store = new DisposableStore();
            const commandDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (commandDetection) {
                timer.dispose();
                // When command detection lights up, allow up to 200ms for the rich command
                // detection sequence to come in before declaring it as basic shell integration.
                // up.
                Promise.race([
                    dataFinished.p,
                    timeout(200)
                ]).then(() => {
                    if (!deferred.isResolved) {
                        deferred.complete("basic" /* ShellIntegrationQuality.Basic */);
                    }
                });
            }
            else {
                store.add(instance.capabilities.onDidAddCapabilityType(e => {
                    if (e === 2 /* TerminalCapability.CommandDetection */) {
                        timer.dispose();
                        // When command detection lights up, allow up to 200ms for the rich command
                        // detection sequence to come in before declaring it as basic shell integration.
                        // up.
                        Promise.race([
                            dataFinished.p,
                            timeout(200)
                        ]).then(() => deferred.complete("basic" /* ShellIntegrationQuality.Basic */));
                    }
                }));
            }
            deferred.p.finally(() => {
                store.dispose();
                richCommandDetectionListener.dispose();
            });
        }
        return deferred.p;
    }
};
ToolTerminalCreator = ToolTerminalCreator_1 = __decorate([
    __param(0, ITerminalService)
], ToolTerminalCreator);
export { ToolTerminalCreator };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbFRlcm1pbmFsQ3JlYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvdG9vbFRlcm1pbmFsQ3JlYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSx1Q0FBdUMsQ0FBQztBQUVqRyxJQUFXLGVBSVY7QUFKRCxXQUFXLGVBQWU7SUFDekIsMkRBQVcsQ0FBQTtJQUNYLDJEQUFXLENBQUE7SUFDWCw2REFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUpVLGVBQWUsS0FBZixlQUFlLFFBSXpCO0FBRUQsTUFBTSxDQUFOLElBQWtCLHVCQUlqQjtBQUpELFdBQWtCLHVCQUF1QjtJQUN4Qyx3Q0FBYSxDQUFBO0lBQ2IsMENBQWUsQ0FBQTtJQUNmLHdDQUFhLENBQUE7QUFDZCxDQUFDLEVBSmlCLHVCQUF1QixLQUF2Qix1QkFBdUIsUUFJeEM7QUFPTSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjs7SUFDL0I7OztPQUdHO2FBQ1kseUJBQW9CLGtDQUFBLENBQTRDO0lBRS9FLFlBQ29DLGdCQUFrQztRQUFsQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO0lBRXRFLENBQUM7SUFF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