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
import { URI } from '../../../base/common/uri.js';
import { Emitter } from '../../../base/common/event.js';
import { dispose } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IDecorationsService } from '../../services/decorations/common/decorations.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { DeferredPromise } from '../../../base/common/async.js';
import { CancellationError } from '../../../base/common/errors.js';
class DecorationRequestsQueue {
    constructor(_proxy, _handle) {
        this._proxy = _proxy;
        this._handle = _handle;
        this._idPool = 0;
        this._requests = new Map();
        this._resolver = new Map();
        //
    }
    enqueue(uri, token) {
        const id = ++this._idPool;
        const defer = new DeferredPromise();
        this._requests.set(id, { id, uri });
        this._resolver.set(id, defer);
        this._processQueue();
        const sub = token.onCancellationRequested(() => {
            this._requests.delete(id);
            this._resolver.delete(id);
            defer.error(new CancellationError());
        });
        return defer.p.finally(() => sub.dispose());
    }
    _processQueue() {
        if (this._timer !== undefined) {
            // already queued
            return;
        }
        this._timer = setTimeout(() => {
            // make request
            const requests = this._requests;
            const resolver = this._resolver;
            this._proxy.$provideDecorations(this._handle, [...requests.values()], CancellationToken.None).then(data => {
                for (const [id, defer] of resolver) {
                    defer.complete(data[id]);
                }
            });
            // reset
            this._requests = new Map();
            this._resolver = new Map();
            this._timer = undefined;
        }, 0);
    }
}
let MainThreadDecorations = class MainThreadDecorations {
    constructor(context, _decorationsService) {
        this._decorationsService = _decorationsService;
        this._provider = new Map();
        this._proxy = context.getProxy(ExtHostContext.ExtHostDecorations);
    }
    dispose() {
        this._provider.forEach(value => dispose(value));
        this._provider.clear();
    }
    $registerDecorationProvider(handle, label) {
        const emitter = new Emitter();
        const queue = new DecorationRequestsQueue(this._proxy, handle);
        const registration = this._decorationsService.registerDecorationsProvider({
            label,
            onDidChange: emitter.event,
            provideDecorations: async (uri, token) => {
                const data = await queue.enqueue(uri, token);
                if (!data) {
                    return undefined;
                }
                const [bubble, tooltip, letter, themeColor] = data;
                return {
                    weight: 10,
                    bubble: bubble ?? false,
                    color: themeColor?.id,
                    tooltip,
                    letter
                };
            }
        });
        this._provider.set(handle, [emitter, registration]);
    }
    $onDidChange(handle, resources) {
        const provider = this._provider.get(handle);
        if (provider) {
            const [emitter] = provider;
            emitter.fire(resources && resources.map(r => URI.revive(r)));
        }
    }
    $unregisterDecorationProvider(handle) {
        const provider = this._provider.get(handle);
        if (provider) {
            dispose(provider);
            this._provider.delete(handle);
        }
    }
};
MainThreadDecorations = __decorate([
    extHostNamedCustomer(MainContext.MainThreadDecorations),
    __param(1, IDecorationsService)
], MainThreadDecorations);
export { MainThreadDecorations };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZERlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBZSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBMEYsTUFBTSwrQkFBK0IsQ0FBQztBQUNwSyxPQUFPLEVBQUUsb0JBQW9CLEVBQW1CLE1BQU0sc0RBQXNELENBQUM7QUFDN0csT0FBTyxFQUFFLG1CQUFtQixFQUFtQixNQUFNLGtEQUFrRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVuRSxNQUFNLHVCQUF1QjtJQVE1QixZQUNrQixNQUErQixFQUMvQixPQUFlO1FBRGYsV0FBTSxHQUFOLE1BQU0sQ0FBeUI7UUFDL0IsWUFBTyxHQUFQLE9BQU8sQ0FBUTtRQVJ6QixZQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ1osY0FBUyxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFDO1FBQ2pELGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBMkMsQ0FBQztRQVF0RSxFQUFFO0lBQ0gsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFRLEVBQUUsS0FBd0I7UUFDekMs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