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
import { AsyncIterableSource, DeferredPromise } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { transformErrorForSerialization, transformErrorFromSerialization } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { resizeImage } from '../../contrib/chat/browser/imageUtils.js';
import { ILanguageModelIgnoredFilesService } from '../../contrib/chat/common/ignoredFiles.js';
import { ILanguageModelStatsService } from '../../contrib/chat/common/languageModelStats.js';
import { ILanguageModelsService } from '../../contrib/chat/common/languageModels.js';
import { IAuthenticationAccessService } from '../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationService, INTERNAL_AUTH_PROVIDER_PREFIX } from '../../services/authentication/common/authentication.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { LanguageModelError } from '../common/extHostTypes.js';
let MainThreadLanguageModels = class MainThreadLanguageModels {
    constructor(extHostContext, _chatProviderService, _languageModelStatsService, _logService, _authenticationService, _authenticationAccessService, _extensionService, _ignoredFilesService) {
        this._chatProviderService = _chatProviderService;
        this._languageModelStatsService = _languageModelStatsService;
        this._logService = _logService;
        this._authenticationService = _authenticationService;
        this._authenticationAccessService = _authenticationAccessService;
        this._extensionService = _extensionService;
        this._ignoredFilesService = _ignoredFilesService;
        this._store = new DisposableStore();
        this._providerRegistrations = new DisposableMap();
        this._pendingProgress = new Map();
        this._ignoredFileProviderRegistrations = new DisposableMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostChatProvider);
        this._proxy.$acceptChatModelMetadata({ added: _chatProviderService.getLanguageModelIds().map(id => ({ identifier: id, metadata: _chatProviderService.lookupLanguageModel(id) })) });
        this._store.add(_chatProviderService.onDidChangeLanguageModels(this._proxy.$acceptChatModelMetadata, this._proxy));
    }
    dispose() {
        this._providerRegistrations.dispose();
        this._ignoredFileProviderRegistrations.dispose();
        this._store.dispose();
    }
    $registerLanguageModelProvider(handle, identifier, metadata) {
        const dipsosables = new DisposableStore();
        dipsosables.add(this._chatProviderService.registerLanguageModelChat(identifier, {
            metadata,
            sendChatRequest: async (messages, from, options, token) => {
                const requestId = (Math.random() * 1e6) | 0;
                const defer = new DeferredPromise();
                const stream = new AsyncIterableSource();
                try {
                    this._pendingProgress.set(requestId, { defer, stream });
                    await Promise.all(messages.flatMap(msg => msg.content)
                        .filter(part => part.type === 'image_url')
                        .map(async (part) => {
                        part.value.data = VSBuffer.wrap(await resizeImage(part.value.data.buffer));
                    }));
                    await this._proxy.$startChatRequest(handle, requestId, from, new SerializableObjectWithBuffers(messages), options, token);
                }
                catch (err) {
                    this._pendingProgress.delete(requestId);
                    throw err;
                }
                return {
                    result: defer.p,
                    stream: stream.asyncIterable
                };
            },
            provideTokenCount: (str, token) => {
                return this._proxy.$provideTokenLength(handle, str, token);
            },
        }));
        if (metadata.auth) {
            dipsosables.add(this._registerAuthenticationProvider(metadata.extension, metadata.auth));
        }
        this._providerRegistrations.set(handle, dipsosables);
    }
    async $reportResponsePart(requestId, chunk) {
        const data = this._pendingProgress.get(requestId);
        this._logService.trace('[LM] report response PART', Boolean(data), requestId, chunk);
        if (data) {
            data.stream.emitOne(chunk);
        }
    }
    async $reportResponseDone(requestId, err) {
        const data = this._pendingProgress.get(requestId);
        this._logService.trace('[LM] report response DONE', Boolean(data), requestId, err);
        if (data) {
            this._pendingProgress.delete(requestId);
            if (err) {
                const error = LanguageModelError.tryDeserialize(err) ?? transformErrorFromSerialization(err);
                data.stream.reject(error);
                data.defer.error(error);
            }
            else {
                data.stream.resolve();
                data.defer.complete(undefined);
            }
        }
    }
    $unregisterProvider(handle) {
        this._providerRegistrations.deleteAndDispose(handle);
    }
    $selectChatModels(selector) {
        return this._chatProviderService.selectLanguageModels(selector);
    }
    $whenLanguageModelChatRequestMade(identifier, extensionId, participant, tokenCount) {
        this._languageModelStatsService.update(identifier, extensionId, participant, tokenCount);
    }
    async $tryStartChatRequest(extension, providerId, requestId, messages, options, token) {
        this._logService.trace('[CHAT] request STARTED', extension.value, requestId);
        let response;
        try {
            response = await this._chatProviderService.sendChatRequest(providerId, extension, messages.value, options, token);
        }
        catch (err) {
            this._logService.error('[CHAT] request FAILED', extension.value, requestId, err);
            throw err;
        }
        // !!! IMPORTANT !!!
        // This method must return before the response is done (has streamed all parts)
        // and because of that we consume the stream without awaiting
        // !!! IMPORTANT !!!
        const streaming = (async () => {
            try {
                for await (const part of response.stream) {
                    this._logService.trace('[CHAT] request PART', extension.value, requestId, part);
                    await this._proxy.$acceptResponsePart(requestId, part);
                }
                this._logService.trace('[CHAT] request DONE', extension.value, requestId);
            }
            catch (err) {
                this._logService.error('[CHAT] extension request ERRORED in STREAM', toErrorMessage(err, true), extension.value, requestId);
                this._proxy.$acceptResponseDone(requestId, transformErrorForSerialization(err));
            }
        })();
        // When the response is done (signaled via its result) we tell the EH
        Promise.allSettled([response.result, streaming]).then(() => {
            this._logService.debug('[CHAT] extension request DONE', extension.value, requestId);
            this._proxy.$acceptResponseDone(requestId, undefined);
        }, err => {
            this._logService.error('[CHAT] extension request ERRORED', toErrorMessage(err, true), extension.value, requestId);
            this._proxy.$acceptResponseDone(requestId, transformErrorForSerialization(err));
        });
    }
    $countTokens(provider, value, token) {
        return this._chatProviderService.computeTokenLength(provider, value, token);
    }
    _registerAuthenticationProvider(extension, auth) {
        // This needs to be done in both MainThread & ExtHost ChatProvider
        const authProviderId = INTERNAL_AUTH_PROVIDER_PREFIX + extension.value;
        // Only register one auth provider per extension
        if (this._authenticationService.getProviderIds().includes(authProviderId)) {
            return Disposable.None;
        }
        const accountLabel = auth.accountLabel ?? localize('languageModelsAccountId', 'Language Models');
        const disposables = new DisposableStore();
        this._authenticationService.registerAuthenticationProvider(authProviderId, new LanguageModelAccessAuthProvider(authProviderId, auth.providerLabel, accountLabel));
        disposables.add(toDisposable(() => {
            this._authenticationService.unregisterAuthenticationProvider(authProviderId);
        }));
        disposables.add(this._authenticationAccessService.onDidChangeExtensionSessionAccess(async (e) => {
            const allowedExtensions = this._authenticationAccessService.readAllowedExtensions(authProviderId, accountLabel);
            const accessList = [];
            for (const allowedExtension of allowedExtensions) {
                const from = await this._extensionService.getExtension(allowedExtension.id);
                if (from) {
                    accessList.push({
                        from: from.identifier,
                        to: extension,
                        enabled: allowedExtension.allowed ?? true
                    });
                }
            }
            this._proxy.$updateModelAccesslist(accessList);
        }));
        return disposables;
    }
    $fileIsIgnored(uri, token) {
        return this._ignoredFilesService.fileIsIgnored(URI.revive(uri), token);
    }
    $registerFileIgnoreProvider(handle) {
        this._ignoredFileProviderRegistrations.set(handle, this._ignoredFilesService.registerIgnoredFileProvider({
            isFileIgnored: async (uri, token) => this._proxy.$isFileIgnored(handle, uri, token)
        }));
    }
    $unregisterFileIgnoreProvider(handle) {
        this._ignoredFileProviderRegistrations.deleteAndDispose(handle);
    }
};
MainThreadLanguageModels = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLanguageModels),
    __param(1, ILanguageModelsService),
    __param(2, ILanguageModelStatsService),
    __param(3, ILogService),
    __param(4, IAuthenticationService),
    __param(5, IAuthenticationAccessService),
    __param(6, IExtensionService),
    __param(7, ILanguageModelIgnoredFilesService)
], MainThreadLanguageModels);
export { MainThreadLanguageModels };
// The fake AuthenticationProvider that will be used to gate access to the Language Model. There will be one per provider.
class LanguageModelAccessAuthProvider {
    constructor(id, label, _accountLabel) {
        this.id = id;
        this.label = label;
        this._accountLabel = _accountLabel;
        this.supportsMultipleAccounts = false;
        // Important for updating the UI
        this._onDidChangeSessions = new Emitter();
        this.onDidChangeSessions = this._onDidChangeSessions.event;
    }
    async getSessions(scopes) {
        // If there are no scopes and no session that means no extension has requested a session yet
        // and the user is simply opening the Account menu. In that case, we should not return any "sessions".
        if (scopes === undefined && !this._session) {
            return [];
        }
        if (this._session) {
            return [this._session];
        }
        return [await this.createSession(scopes || [])];
    }
    async createSession(scopes) {
        this._session = this._createFakeSession(scopes);
        this._onDidChangeSessions.fire({ added: [this._session], changed: [], removed: [] });
        return this._session;
    }
    removeSession(sessionId) {
        if (this._session) {
            this._onDidChangeSessions.fire({ added: [], changed: [], removed: [this._session] });
            this._session = undefined;
        }
        return Promise.resolve();
    }
    confirmation(extensionName, _recreatingSession) {
        return localize('confirmLanguageModelAccess', "The extension '{0}' wants to access the language models provided by {1}.", extensionName, this.label);
    }
    _createFakeSession(scopes) {
        return {
            id: 'fake-session',
            account: {
                id: this.id,
                label: this._accountLabel,
            },
            accessToken: 'fake-access-token',
            scopes,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhbmd1YWdlTW9kZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZExhbmd1YWdlTW9kZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3RFLE9BQU8sRUFBbUIsOEJBQThCLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNsSSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFILE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTNDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDOUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDN0YsT0FBTyxFQUEySCxzQkFBc0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlNLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHNF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