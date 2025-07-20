/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { binarySearch } from '../../../base/common/arrays.js';
import { errorHandler, ErrorNoTelemetry } from '../../../base/common/errors.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { safeStringify } from '../../../base/common/objects.js';
import { FileOperationError } from '../../files/common/files.js';
export var ErrorEvent;
(function (ErrorEvent) {
    function compare(a, b) {
        if (a.callstack < b.callstack) {
            return -1;
        }
        else if (a.callstack > b.callstack) {
            return 1;
        }
        return 0;
    }
    ErrorEvent.compare = compare;
})(ErrorEvent || (ErrorEvent = {}));
export default class BaseErrorTelemetry {
    static { this.ERROR_FLUSH_TIMEOUT = 5 * 1000; }
    constructor(telemetryService, flushDelay = BaseErrorTelemetry.ERROR_FLUSH_TIMEOUT) {
        this._flushHandle = undefined;
        this._buffer = [];
        this._disposables = new DisposableStore();
        this._telemetryService = telemetryService;
        this._flushDelay = flushDelay;
        // (1) check for unexpected but handled errors
        const unbind = errorHandler.addListener((err) => this._onErrorEvent(err));
        this._disposables.add(toDisposable(unbind));
        // (2) install implementation-specific error listeners
        this.installErrorListeners();
    }
    dispose() {
        clearTimeout(this._flushHandle);
        this._flushBuffer();
        this._disposables.dispose();
    }
    installErrorListeners() {
        // to override
    }
    _onErrorEvent(err) {
        if (!err || err.code) {
            return;
        }
        // unwrap nested errors from loader
        if (err.detail && err.detail.stack) {
            err = err.detail;
        }
        // If it's the no telemetry error it doesn't get logged
        // TOOD @lramos15 hacking in FileOperation error because it's too messy to adopt ErrorNoTelemetry. A better solution should be found
        if (ErrorNoTelemetry.isErrorNoTelemetry(err) || err instanceof FileOperationError || (typeof err?.message === 'string' && err.message.includes('Unable to read file'))) {
            return;
        }
        // work around behavior in workerServer.ts that breaks up Error.stack
        const callstack = Array.isArray(err.stack) ? err.stack.join('\n') : err.stack;
        const msg = err.message ? err.message : safeStringify(err);
        // errors without a stack are not useful telemetry
        if (!callstack) {
            return;
        }
        this._enqueue({ msg, callstack });
    }
    _enqueue(e) {
        const idx = binarySearch(this._buffer, e, ErrorEvent.compare);
        if (idx < 0) {
            e.count = 1;
            this._buffer.splice(~idx, 0, e);
        }
        else {
            if (!this._buffer[idx].count) {
                this._buffer[idx].count = 0;
            }
            this._buffer[idx].count += 1;
        }
        if (this._flushHandle === undefined) {
            this._flushHandle = setTimeout(() => {
                this._flushBuffer();
                this._flushHandle = undefined;
            }, this._flushDelay);
        }
    }
    _flushBuffer() {
        for (const error of this._buffer) {
            this._telemetryService.publicLogError2('UnhandledError', error);
        }
        this._buffer.length = 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS9jb21tb24vZXJyb3JUZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQTBCakUsTUFBTSxLQUFXLFVBQVUsQ0FTMUI7QUFURCxXQUFpQixVQUFVO0lBQzFCLFNBQWdCLE9BQU8sQ0FBQyxDQUFhLEVBQUUsQ0FBYTtRQUNuRCxJQUFJLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQy9CLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDWCxDQUFDO2FBQU0sSUFBSSxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN0QyxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQztJQUNWLENBQUM7SUFQZSxrQkFBTyxVQU90QixDQUFBO0FBQ0YsQ0FBQyxFQVRnQixVQUFVLEtBQVYsVUFBVSxRQVMxQjtBQUVELE1BQU0sQ0FBQyxPQUFPLE9BQWdCLGtCQUFrQjthQUVqQyx3QkFBbUIsR0FBVyxDQUFDLEdBQUcsSUFBSSxBQUFuQixDQUFvQjtJQVFyRCxZQUFZLGdCQUFtQyxF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