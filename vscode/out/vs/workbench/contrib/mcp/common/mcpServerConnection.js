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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { log, LogLevel } from '../../../../platform/log/common/log.js';
import { McpServerRequestHandler } from './mcpServerRequestHandler.js';
import { McpConnectionState } from './mcpTypes.js';
let McpServerConnection = class McpServerConnection extends Disposable {
    constructor(_collection, definition, _delegate, launchDefinition, _logger, _instantiationService) {
        super();
        this._collection = _collection;
        this.definition = definition;
        this._delegate = _delegate;
        this.launchDefinition = launchDefinition;
        this._logger = _logger;
        this._instantiationService = _instantiationService;
        this._launch = this._register(new MutableDisposable());
        this._state = observableValue('mcpServerState', { state: 0 /* McpConnectionState.Kind.Stopped */ });
        this._requestHandler = observableValue('mcpServerRequestHandler', undefined);
        this.state = this._state;
        this.handler = this._requestHandler;
    }
    /** @inheritdoc */
    async start(methods) {
        const currentState = this._state.get();
        if (!McpConnectionState.canBeStarted(currentState.state)) {
            return this._waitForState(2 /* McpConnectionState.Kind.Running */, 3 /* McpConnectionState.Kind.Error */);
        }
        this._launch.value = undefined;
        this._state.set({ state: 1 /* McpConnectionState.Kind.Starting */ }, undefined);
        this._logger.info(localize('mcpServer.starting', 'Starting server {0}', this.definition.label));
        try {
            const launch = this._delegate.start(this._collection, this.definition, this.launchDefinition);
            this._launch.value = this.adoptLaunch(launch, methods);
            return this._waitForState(2 /* McpConnectionState.Kind.Running */, 3 /* McpConnectionState.Kind.Error */);
        }
        catch (e) {
            const errorState = {
                state: 3 /* McpConnectionState.Kind.Error */,
                message: e instanceof Error ? e.message : String(e)
            };
            this._state.set(errorState, undefined);
            return errorState;
        }
    }
    adoptLaunch(launch, methods) {
        const store = new DisposableStore();
        const cts = new CancellationTokenSource();
        store.add(toDisposable(() => cts.dispose(true)));
        store.add(launch);
        store.add(launch.onDidLog(({ level, message }) => {
            log(this._logger, level, message);
        }));
        let didStart = false;
        store.add(autorun(reader => {
            const state = launch.state.read(reader);
            this._state.set(state, undefined);
            this._logger.info(localize('mcpServer.state', 'Connection state: {0}', McpConnectionState.toString(state)));
            if (state.state === 2 /* McpConnectionState.Kind.Running */ && !didStart) {
                didStart = true;
                McpServerRequestHandler.create(this._instantiationService, {
                    launch,
                    logger: this._logger,
                    requestLogLevel: this.definition.devMode ? LogLevel.Info : LogLevel.Debug,
                    ...methods,
                }, cts.token).then(handler => {
                    if (!store.isDisposed) {
                        this._requestHandler.set(handler, undefined);
                    }
                    else {
                        handler.dispose();
                    }
                }, err => {
                    if (!store.isDisposed) {
                        let message = err.message;
                        if (err instanceof CancellationError) {
                            message = 'Server exited before responding to `initialize` request.';
                            this._logger.error(message);
                        }
                        else {
                            this._logger.error(err);
                        }
                        this._state.set({ state: 3 /* McpConnectionState.Kind.Error */, message }, undefined);
                    }
                    store.dispose();
                });
            }
        }));
        return { dispose: () => store.dispose(), object: launch };
    }
    async stop() {
        this._logger.info(localize('mcpServer.stopping', 'Stopping server {0}', this.definition.label));
        this._launch.value?.object.stop();
        await this._waitForState(0 /* McpConnectionState.Kind.Stopped */, 3 /* McpConnectionState.Kind.Error */);
    }
    dispose() {
        this._requestHandler.get()?.dispose();
        super.dispose();
        this._state.set({ state: 0 /* McpConnectionState.Kind.Stopped */ }, undefined);
    }
    _waitForState(...kinds) {
        const current = this._state.get();
        if (kinds.includes(current.state)) {
            return Promise.resolve(current);
        }
        return new Promise(resolve => {
            const disposable = autorun(reader => {
                const state = this._state.read(reader);
                if (kinds.includes(state.state)) {
                    disposable.dispose();
                    resolve(state);
                }
            });
        });
    }
};
McpServerConnection = __decorate([
    __param(5, IInstantiationService)
], McpServerConnection);
export { McpServerConnection };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyQ29ubmVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BTZXJ2ZXJDb25uZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFjLGlCQUFpQixFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBVyxHQUFHLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFaEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDdkUsT0FBTyxFQUFvRSxrQkFBa0IsRUFBd0MsTUFBTSxlQUFlLENBQUM7QUFFcEosSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBUWxELFlBQ2tCLFdBQW9DLEVBQ3JDLFVBQStCLEVBQzlCLFNBQTJCLEVBQzVCLGdCQUFpQyxFQUNoQyxPQUFnQixFQUNWLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQVBTLGdCQUFXLEdBQVgsV0FBVyxDQUF5QjtRQUNyQyxlQUFVLEdBQVYsVUFBVSxDQUFxQjtRQUM5QixjQUFTLEdBQVQsU0FBUyxDQUFrQjtRQUM1QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWlCO1FBQ2hDLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDTywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBYnBFLFlBQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLEVBQW9DLENBQUMsQ0FBQztRQUNwRixXQUFNLEdBQUcsZUFBZSxDQUFxQixnQkFBZ0IsRUFBRSxFQUFFLEtBQUsseUNBQWlDLEVBQUUsQ0FBQyxDQUFDO1FBQzNHLG9CQUFlLEdBQUcsZUFBZSxDQUFzQyx5QkFBeUIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUU5RyxVQUFLLEdBQW9DLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDckQsWUFBTyxHQUFxRCxJQUFJLENBQUMsZUFBZSxDQUFDO0lBV2pHLENBQUM7SUFFRCxrQkFBa0I7SUFDWCxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQTBCO1FBQzVDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxRCxPQUFPLElBQUksQ0FBQyxhQUFhLGdGQUFnRSxDQUFDO1FBQzNGLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLDBDQUFrQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVoRyxJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDOUYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDdkQsT0FBTyxJQUFJLENBQUMsYUFBYSxnRkFBZ0UsQ0FBQztRQUMzRixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE1BQU0sVUFBVSxHQUF1QjtnQkFDdEMsS0FBSyx1Q0FBK0I7Z0JBQ3BDLE9BQU8sRUFBRSxDQUFDLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2FBQ25ELENBQUM7WUFDRixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDdkMsT0FBTyxVQUFVLENBQUM7UUFDbkIsQ0FBQztJQUNGLENBQUM7SUFFTyxXQUFXLENBQUMsTUFBNEIsRUFBRSxPQUEwQjtRQUMzRSxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sR0FBRyxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQztRQUUxQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRCxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xCLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7WUFDaEQsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7UUFDckIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDMUIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTVHLElBQUksS0FBSyxDQUFDLEtBQUssNENBQW9DLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbEUsUUFBUSxHQUFHLElBQUksQ0FBQztnQkFDaEIsdUJBQXVCLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRTtvQkFDMUQsTUFBTTtvQkFDTixNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU87b0JBQ3BCLGVBQWUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUs7b0JBQ3pFLEdBQUcsT0FBTztpQkFDVixFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQ2pCLE9BQU8sQ0FBQyxFQUFFO29CQUNULElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7d0JBQ3ZCLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDOUMsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbkIsQ0FBQztnQkFDRixDQUFDLEVBQ0QsR0FBRyxDQUFDLEVBQUU7b0JBQ0wsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQzt3QkFDdkIsSUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQzt3QkFDMUIsSUFBSSxHQUFHLFlBQVksaUJBQWlCLEVBQUUsQ0FBQzs0QkFDdEMsT0FBTyxHQUFHLDBEQUEwRCxDQUFDOzRCQUNyRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDN0IsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUN6QixDQUFDO3dCQUNELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyx1Q0FBK0IsRUFBRSxPQUFPLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDL0UsQ0FBQztvQkFDRCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2pCLENBQUMsQ0FDRCxDQUFDO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDM0QsQ0FBQztJQUVNLEtBQUssQ0FBQyxJQUFJO1FBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDaEcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2xDLE1BQU0sSUFBSSxDQUFDLGFBQWEsZ0ZBQWdFLENBQUM7SUFDMUYsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUN0QyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLHlDQUFpQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUVPLGFBQWEsQ0FBQyxHQUFHLEtBQWdDO1FBQ3hELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbEMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ25DLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBRUQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUM1QixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ25DLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN2QyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2pDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDckIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRCxDQUFBO0FBM0hZLG1CQUFtQjtJQWM3QixXQUFBLHFCQUFxQixDQUFBO0dBZFgsbUJBQW1CLENBMkgvQiJ9