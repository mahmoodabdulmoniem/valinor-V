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
var InlineCompletionsService_1;
import { WindowIntervalTimer } from '../../../base/browser/dom.js';
import { BugIndicatingError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../nls.js';
import { Action2 } from '../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../platform/contextkey/common/contextkey.js';
import { registerSingleton } from '../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
export const IInlineCompletionsService = createDecorator('IInlineCompletionsService');
const InlineCompletionsSnoozing = new RawContextKey('inlineCompletions.snoozed', false, localize('inlineCompletions.snoozed', "Whether inline completions are currently snoozed"));
let InlineCompletionsService = class InlineCompletionsService extends Disposable {
    static { InlineCompletionsService_1 = this; }
    static { this.SNOOZE_DURATION = 300_000; } // 5 minutes
    get snoozeTimeLeft() {
        if (this._snoozeTimeEnd === undefined) {
            return 0;
        }
        return Math.max(0, this._snoozeTimeEnd - Date.now());
    }
    constructor(_contextKeyService, _telemetryService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._telemetryService = _telemetryService;
        this._onDidChangeIsSnoozing = this._register(new Emitter());
        this.onDidChangeIsSnoozing = this._onDidChangeIsSnoozing.event;
        this._snoozeTimeEnd = undefined;
        this._timer = this._register(new WindowIntervalTimer());
        const inlineCompletionsSnoozing = InlineCompletionsSnoozing.bindTo(this._contextKeyService);
        this._register(this.onDidChangeIsSnoozing(() => inlineCompletionsSnoozing.set(this.isSnoozing())));
    }
    snooze(durationMs = InlineCompletionsService_1.SNOOZE_DURATION) {
        this.setSnoozeDuration(durationMs + this.snoozeTimeLeft);
    }
    setSnoozeDuration(durationMs) {
        if (durationMs < 0) {
            throw new BugIndicatingError(`Invalid snooze duration: ${durationMs}. Duration must be non-negative.`);
        }
        if (durationMs === 0) {
            this.cancelSnooze();
            return;
        }
        const wasSnoozing = this.isSnoozing();
        const timeLeft = this.snoozeTimeLeft;
        this._snoozeTimeEnd = Date.now() + durationMs;
        if (!wasSnoozing) {
            this._onDidChangeIsSnoozing.fire(true);
        }
        this._timer.cancelAndSet(() => {
            if (!this.isSnoozing()) {
                this._onDidChangeIsSnoozing.fire(false);
            }
            else {
                throw new BugIndicatingError('Snooze timer did not fire as expected');
            }
        }, this.snoozeTimeLeft + 1);
        this._reportSnooze(durationMs - timeLeft, durationMs);
    }
    isSnoozing() {
        return this.snoozeTimeLeft > 0;
    }
    cancelSnooze() {
        if (this.isSnoozing()) {
            this._reportSnooze(-this.snoozeTimeLeft, 0);
            this._snoozeTimeEnd = undefined;
            this._timer.cancel();
            this._onDidChangeIsSnoozing.fire(false);
        }
    }
    _reportSnooze(deltaMs, totalMs) {
        const deltaSeconds = Math.round(deltaMs / 1000);
        const totalSeconds = Math.round(totalMs / 1000);
        this._telemetryService.publicLog2('inlineCompletions.snooze', { deltaSeconds, totalSeconds });
    }
};
InlineCompletionsService = InlineCompletionsService_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, ITelemetryService)
], InlineCompletionsService);
export { InlineCompletionsService };
registerSingleton(IInlineCompletionsService, InlineCompletionsService, 1 /* InstantiationType.Delayed */);
const snoozeInlineSuggestId = 'editor.action.inlineSuggest.snooze';
const cancelSnoozeInlineSuggestId = 'editor.action.inlineSuggest.cancelSnooze';
const LAST_SNOOZE_DURATION_KEY = 'inlineCompletions.lastSnoozeDuration';
export class SnoozeInlineCompletion extends Action2 {
    static { this.ID = snoozeInlineSuggestId; }
    constructor() {
        super({
            id: SnoozeInlineCompletion.ID,
            title: localize2('action.inlineSuggest.snooze', "Snooze Inline Suggestions"),
            precondition: ContextKeyExpr.true(),
            f1: true,
        });
    }
    async run(accessor, ...args) {
        const quickInputService = accessor.get(IQuickInputService);
        const inlineCompletionsService = accessor.get(IInlineCompletionsService);
        const storageService = accessor.get(IStorageService);
        let durationMinutes;
        if (args.length > 0 && typeof args[0] === 'number') {
            durationMinutes = args[0];
        }
        if (!durationMinutes) {
            durationMinutes = await this.getDurationFromUser(quickInputService, storageService);
        }
        if (durationMinutes) {
            inlineCompletionsService.setSnoozeDuration(durationMinutes);
        }
    }
    async getDurationFromUser(quickInputService, storageService) {
        const lastSelectedDuration = storageService.getNumber(LAST_SNOOZE_DURATION_KEY, 0 /* StorageScope.PROFILE */, 300_000);
        const items = [
            { label: '1 minute', id: '1', value: 60_000 },
            { label: '5 minutes', id: '5', value: 300_000 },
            { label: '10 minutes', id: '10', value: 600_000 },
            { label: '15 minutes', id: '15', value: 900_000 },
            { label: '30 minutes', id: '30', value: 1_800_000 },
            { label: '60 minutes', id: '60', value: 3_600_000 }
        ];
        const picked = await quickInputService.pick(items, {
            placeHolder: localize('snooze.placeholder', "Select snooze duration for Code completions and NES"),
            activeItem: items.find(item => item.value === lastSelectedDuration),
        });
        if (picked) {
            storageService.store(LAST_SNOOZE_DURATION_KEY, picked.value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            return picked.value;
        }
        return undefined;
    }
}
export class CancelSnoozeInlineCompletion extends Action2 {
    static { this.ID = cancelSnoozeInlineSuggestId; }
    constructor() {
        super({
            id: CancelSnoozeInlineCompletion.ID,
            title: localize2('action.inlineSuggest.cancelSnooze', "Cancel Snooze Inline Suggestions"),
            precondition: InlineCompletionsSnoozing,
            f1: true,
        });
    }
    async run(accessor) {
        accessor.get(IInlineCompletionsService).cancelSnooze();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9zZXJ2aWNlcy9pbmxpbmVDb21wbGV0aW9uc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ25FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN0SCxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDNUcsT0FBTyxFQUFFLGVBQWUsRUFBb0IsTUFBTSx5REFBeUQsQ0FBQztBQUM1RyxPQUFPLEVBQUUsa0JBQWtCLEVBQWtCLE1BQU0sbURBQW1ELENBQUM7QUFDdkcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSw2Q0FBNkMsQ0FBQztBQUMzRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVwRixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQTRCLDJCQUEyQixDQUFDLENBQUM7QUFrQ2pILE1BQU0seUJBQXlCLEdBQUcsSUFBSSxhQUFh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