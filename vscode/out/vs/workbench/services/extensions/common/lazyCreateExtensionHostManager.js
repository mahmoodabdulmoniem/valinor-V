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
import { Barrier } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { RemoteAuthorityResolverErrorCode } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { ExtensionHostManager, friendlyExtHostName } from './extensionHostManager.js';
/**
 * Waits until `start()` and only if it has extensions proceeds to really start.
 */
let LazyCreateExtensionHostManager = class LazyCreateExtensionHostManager extends Disposable {
    get pid() {
        if (this._actual) {
            return this._actual.pid;
        }
        return null;
    }
    get kind() {
        return this._extensionHost.runningLocation.kind;
    }
    get startup() {
        return this._extensionHost.startup;
    }
    get friendyName() {
        return friendlyExtHostName(this.kind, this.pid);
    }
    constructor(extensionHost, _initialActivationEvents, _internalExtensionService, _instantiationService, _logService) {
        super();
        this._initialActivationEvents = _initialActivationEvents;
        this._internalExtensionService = _internalExtensionService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._onDidChangeResponsiveState = this._register(new Emitter());
        this.onDidChangeResponsiveState = this._onDidChangeResponsiveState.event;
        this._extensionHost = extensionHost;
        this.onDidExit = extensionHost.onExit;
        this._startCalled = new Barrier();
        this._actual = null;
    }
    _createActual(reason) {
        this._logService.info(`Creating lazy extension host (${this.friendyName}). Reason: ${reason}`);
        this._actual = this._register(this._instantiationService.createInstance(ExtensionHostManager, this._extensionHost, this._initialActivationEvents, this._internalExtensionService));
        this._register(this._actual.onDidChangeResponsiveState((e) => this._onDidChangeResponsiveState.fire(e)));
        return this._actual;
    }
    async _getOrCreateActualAndStart(reason) {
        if (this._actual) {
            // already created/started
            return this._actual;
        }
        const actual = this._createActual(reason);
        await actual.ready();
        return actual;
    }
    async ready() {
        await this._startCalled.wait();
        if (this._actual) {
            await this._actual.ready();
        }
    }
    async disconnect() {
        await this._actual?.disconnect();
    }
    representsRunningLocation(runningLocation) {
        return this._extensionHost.runningLocation.equals(runningLocation);
    }
    async deltaExtensions(extensionsDelta) {
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.deltaExtensions(extensionsDelta);
        }
        if (extensionsDelta.myToAdd.length > 0) {
            const actual = this._createActual(`contains ${extensionsDelta.myToAdd.length} new extension(s) (installed or enabled): ${extensionsDelta.myToAdd.map(extId => extId.value)}`);
            await actual.ready();
            return;
        }
    }
    containsExtension(extensionId) {
        return this._extensionHost.extensions?.containsExtension(extensionId) ?? false;
    }
    async activate(extension, reason) {
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.activate(extension, reason);
        }
        return false;
    }
    async activateByEvent(activationEvent, activationKind) {
        if (activationKind === 1 /* ActivationKind.Immediate */) {
            // this is an immediate request, so we cannot wait for start to be called
            if (this._actual) {
                return this._actual.activateByEvent(activationEvent, activationKind);
            }
            return;
        }
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.activateByEvent(activationEvent, activationKind);
        }
    }
    activationEventIsDone(activationEvent) {
        if (!this._startCalled.isOpen()) {
            return false;
        }
        if (this._actual) {
            return this._actual.activationEventIsDone(activationEvent);
        }
        return true;
    }
    async getInspectPort(tryEnableInspector) {
        await this._startCalled.wait();
        return this._actual?.getInspectPort(tryEnableInspector);
    }
    async resolveAuthority(remoteAuthority, resolveAttempt) {
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.resolveAuthority(remoteAuthority, resolveAttempt);
        }
        return {
            type: 'error',
            error: {
                message: `Cannot resolve authority`,
                code: RemoteAuthorityResolverErrorCode.Unknown,
                detail: undefined
            }
        };
    }
    async getCanonicalURI(remoteAuthority, uri) {
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.getCanonicalURI(remoteAuthority, uri);
        }
        throw new Error(`Cannot resolve canonical URI`);
    }
    async start(extensionRegistryVersionId, allExtensions, myExtensions) {
        if (myExtensions.length > 0) {
            // there are actual extensions, so let's launch the extension host (auto-start)
            const actual = this._createActual(`contains ${myExtensions.length} extension(s): ${myExtensions.map(extId => extId.value)}.`);
            const result = actual.ready();
            this._startCalled.open();
            return result;
        }
        // there are no actual extensions running
        this._startCalled.open();
    }
    async extensionTestsExecute() {
        await this._startCalled.wait();
        const actual = await this._getOrCreateActualAndStart(`execute tests.`);
        return actual.extensionTestsExecute();
    }
    async setRemoteEnvironment(env) {
        await this._startCalled.wait();
        if (this._actual) {
            return this._actual.setRemoteEnvironment(env);
        }
    }
};
LazyCreateExtensionHostManager = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILogService)
], LazyCreateExtensionHostManager);
export { LazyCreateExtensionHostManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF6eUNyZWF0ZUV4dGVuc2lvbkhvc3RNYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vbGF6eUNyZWF0ZUV4dGVuc2lvbkhvc3RNYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUVqSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQVF0Rjs7R0FFRztBQUNJLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQStCLFNBQVEsVUFBVTtJQVU3RCxJQUFXLEdBQUc7UUFDYixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQ3pCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFXLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztJQUNqRCxDQUFDO0lBRUQsSUFBVyxPQUFPO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxP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