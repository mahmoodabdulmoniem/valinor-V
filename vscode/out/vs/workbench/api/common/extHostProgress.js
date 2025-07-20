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
import { MainContext } from './extHost.protocol.js';
import { ProgressLocation } from './extHostTypeConverters.js';
import { Progress } from '../../../platform/progress/common/progress.js';
import { CancellationTokenSource, CancellationToken } from '../../../base/common/cancellation.js';
import { throttle } from '../../../base/common/decorators.js';
import { onUnexpectedExternalError } from '../../../base/common/errors.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
export const IExtHostProgress = createDecorator('IExtHostProgress');
let ExtHostProgress = class ExtHostProgress {
    constructor(extHostRpc) {
        this._handles = 0;
        this._mapHandleToCancellationSource = new Map();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadProgress);
    }
    async withProgress(extension, options, task) {
        const handle = this._handles++;
        const { title, location, cancellable } = options;
        const source = { label: extension.displayName || extension.name, id: extension.identifier.value };
        this._proxy.$startProgress(handle, { location: ProgressLocation.from(location), title, source, cancellable }, !extension.isUnderDevelopment ? extension.identifier.value : undefined).catch(onUnexpectedExternalError);
        return this._withProgress(handle, task, !!cancellable);
    }
    async withProgressFromSource(source, options, task) {
        const handle = this._handles++;
        const { title, location, cancellable } = options;
        this._proxy.$startProgress(handle, { location: ProgressLocation.from(location), title, source, cancellable }, undefined).catch(onUnexpectedExternalError);
        return this._withProgress(handle, task, !!cancellable);
    }
    _withProgress(handle, task, cancellable) {
        let source;
        if (cancellable) {
            source = new CancellationTokenSource();
            this._mapHandleToCancellationSource.set(handle, source);
        }
        const progressEnd = (handle) => {
            this._proxy.$progressEnd(handle);
            this._mapHandleToCancellationSource.delete(handle);
            source?.dispose();
        };
        let p;
        try {
            p = task(new ProgressCallback(this._proxy, handle), cancellable && source ? source.token : CancellationToken.None);
        }
        catch (err) {
            progressEnd(handle);
            throw err;
        }
        p.then(result => progressEnd(handle), err => progressEnd(handle));
        return p;
    }
    $acceptProgressCanceled(handle) {
        const source = this._mapHandleToCancellationSource.get(handle);
        if (source) {
            source.cancel();
            this._mapHandleToCancellationSource.delete(handle);
        }
    }
};
ExtHostProgress = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostProgress);
export { ExtHostProgress };
function mergeProgress(result, currentValue) {
    result.message = currentValue.message;
    if (typeof currentValue.increment === 'number') {
        if (typeof result.increment === 'number') {
            result.increment += currentValue.increment;
        }
        else {
            result.increment = currentValue.increment;
        }
    }
    return result;
}
class ProgressCallback extends Progress {
    constructor(_proxy, _handle) {
        super(p => this.throttledReport(p));
        this._proxy = _proxy;
        this._handle = _handle;
    }
    throttledReport(p) {
        this._proxy.$progressReport(this._handle, p);
    }
}
__decorate([
    throttle(100, (result, currentValue) => mergeProgress(result, currentValue), () => Object.create(null))
], ProgressCallback.prototype, "throttledReport", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFByb2dyZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0UHJvZ3Jlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFpRCxXQUFXLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFpQixNQUFNLCtDQUErQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFHNUQsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFtQixrQkFBa0IsQ0FBQyxDQUFDO0FBRS9FLElBQU0sZUFBZSxHQUFyQixNQUFNLGVBQWU7SUFRM0IsWUFBZ0MsVUFBOEI7UUFIdEQsYUFBUSxHQUFXLENBQUMsQ0FBQztRQUNyQixtQ0FBOEIsR0FBeUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUd4RixJQUFJLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDbkUsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZLENBQUksU0FBZ0MsRUFBRSxPQUF3QixFQUFFLElBQWtG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