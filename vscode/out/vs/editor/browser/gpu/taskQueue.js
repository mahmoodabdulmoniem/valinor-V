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
import { getActiveWindow } from '../../../base/browser/dom.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
let TaskQueue = class TaskQueue extends Disposable {
    constructor(_logService) {
        super();
        this._logService = _logService;
        this._tasks = [];
        this._i = 0;
        this._register(toDisposable(() => this.clear()));
    }
    enqueue(task) {
        this._tasks.push(task);
        this._start();
    }
    flush() {
        while (this._i < this._tasks.length) {
            if (!this._tasks[this._i]()) {
                this._i++;
            }
        }
        this.clear();
    }
    clear() {
        if (this._idleCallback) {
            this._cancelCallback(this._idleCallback);
            this._idleCallback = undefined;
        }
        this._i = 0;
        this._tasks.length = 0;
    }
    _start() {
        if (!this._idleCallback) {
            this._idleCallback = this._requestCallback(this._process.bind(this));
        }
    }
    _process(deadline) {
        this._idleCallback = undefined;
        let taskDuration = 0;
        let longestTask = 0;
        let lastDeadlineRemaining = deadline.timeRemaining();
        let deadlineRemaining = 0;
        while (this._i < this._tasks.length) {
            taskDuration = Date.now();
            if (!this._tasks[this._i]()) {
                this._i++;
            }
            // other than performance.now, Date.now might not be stable (changes on wall clock changes),
            // this is not an issue here as a clock change during a short running task is very unlikely
            // in case it still happened and leads to negative duration, simply assume 1 msec
            taskDuration = Math.max(1, Date.now() - taskDuration);
            longestTask = Math.max(taskDuration, longestTask);
            // Guess the following task will take a similar time to the longest task in this batch, allow
            // additional room to try avoid exceeding the deadline
            deadlineRemaining = deadline.timeRemaining();
            if (longestTask * 1.5 > deadlineRemaining) {
                // Warn when the time exceeding the deadline is over 20ms, if this happens in practice the
                // task should be split into sub-tasks to ensure the UI remains responsive.
                if (lastDeadlineRemaining - taskDuration < -20) {
                    this._logService.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(lastDeadlineRemaining - taskDuration))}ms`);
                }
                this._start();
                return;
            }
            lastDeadlineRemaining = deadlineRemaining;
        }
        this.clear();
    }
};
TaskQueue = __decorate([
    __param(0, ILogService)
], TaskQueue);
/**
 * A queue of that runs tasks over several tasks via setTimeout, trying to maintain above 60 frames
 * per second. The tasks will run in the order they are enqueued, but they will run some time later,
 * and care should be taken to ensure they're non-urgent and will not introduce race conditions.
 */
export class PriorityTaskQueue extends TaskQueue {
    _requestCallback(callback) {
        return getActiveWindow().setTimeout(() => callback(this._createDeadline(16)));
    }
    _cancelCallback(identifier) {
        getActiveWindow().clearTimeout(identifier);
    }
    _createDeadline(duration) {
        const end = Date.now() + duration;
        return {
            timeRemaining: () => Math.max(0, end - Date.now())
        };
    }
}
class IdleTaskQueueInternal extends TaskQueue {
    _requestCallback(callback) {
        return getActiveWindow().requestIdleCallback(callback);
    }
    _cancelCallback(identifier) {
        getActiveWindow().cancelIdleCallback(identifier);
    }
}
/**
 * A queue of that runs tasks over several idle callbacks, trying to respect the idle callback's
 * deadline given by the environment. The tasks will run in the order they are enqueued, but they
 * will run some time later, and care should be taken to ensure they're non-urgent and will not
 * introduce race conditions.
 *
 * This reverts to a {@link PriorityTaskQueue} if the environment does not support idle callbacks.
 */
export const IdleTaskQueue = ('requestIdleCallback' in getActiveWindow()) ? IdleTaskQueueInternal : PriorityTaskQueue;
/**
 * An object that tracks a single debounced task that will run on the next idle frame. When called
 * multiple times, only the last set task will run.
 */
let DebouncedIdleTask = class DebouncedIdleTask {
    constructor(instantiationService) {
        this._queue = instantiationService.createInstance(IdleTaskQueue);
    }
    set(task) {
        this._queue.clear();
        this._queue.enqueue(task);
    }
    flush() {
        this._queue.flush();
    }
};
DebouncedIdleTask = __decorate([
    __param(0, IInstantiationService)
], DebouncedIdleTask);
export { DebouncedIdleTask };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1F1ZXVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvdGFza1F1ZXVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBb0IsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFnQ2xFLElBQWUsU0FBUyxHQUF4QixNQUFlLFNBQVUsU0FBUSxVQUFVO0lBSzFDLFlBQ2MsV0FBeUM7UUFFdEQsS0FBSyxFQUFFLENBQUM7UUFGc0IsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFML0MsV0FBTSxHQUE2QixFQUFFLENBQUM7UUFFdEMsT0FBRSxHQUFHLENBQUMsQ0FBQztRQU1kLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUtNLE9BQU8sQ0FBQyxJQUEwQjtRQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDZixDQUFDO0lBRU0sS0FBSztRQUNYLE9BQU8sSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxF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