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
import { raceCancellation } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { ISpeechService, TextToSpeechStatus } from '../../contrib/speech/common/speechService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadSpeech = class MainThreadSpeech {
    constructor(extHostContext, speechService, logService) {
        this.speechService = speechService;
        this.logService = logService;
        this.providerRegistrations = new Map();
        this.speechToTextSessions = new Map();
        this.textToSpeechSessions = new Map();
        this.keywordRecognitionSessions = new Map();
        this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostSpeech);
    }
    $registerProvider(handle, identifier, metadata) {
        this.logService.trace('[Speech] extension registered provider', metadata.extension.value);
        const registration = this.speechService.registerSpeechProvider(identifier, {
            metadata,
            createSpeechToTextSession: (token, options) => {
                if (token.isCancellationRequested) {
                    return {
                        onDidChange: Event.None
                    };
                }
                const disposables = new DisposableStore();
                const session = Math.random();
                this.proxy.$createSpeechToTextSession(handle, session, options?.language);
                const onDidChange = disposables.add(new Emitter());
                this.speechToTextSessions.set(session, { onDidChange });
                disposables.add(token.onCancellationRequested(() => {
                    this.proxy.$cancelSpeechToTextSession(session);
                    this.speechToTextSessions.delete(session);
                    disposables.dispose();
                }));
                return {
                    onDidChange: onDidChange.event
                };
            },
            createTextToSpeechSession: (token, options) => {
                if (token.isCancellationRequested) {
                    return {
                        onDidChange: Event.None,
                        synthesize: async () => { }
                    };
                }
                const disposables = new DisposableStore();
                const session = Math.random();
                this.proxy.$createTextToSpeechSession(handle, session, options?.language);
                const onDidChange = disposables.add(new Emitter());
                this.textToSpeechSessions.set(session, { onDidChange });
                disposables.add(token.onCancellationRequested(() => {
                    this.proxy.$cancelTextToSpeechSession(session);
                    this.textToSpeechSessions.delete(session);
                    disposables.dispose();
                }));
                return {
                    onDidChange: onDidChange.event,
                    synthesize: async (text) => {
                        await this.proxy.$synthesizeSpeech(session, text);
                        const disposable = new DisposableStore();
                        try {
                            await raceCancellation(Event.toPromise(Event.filter(onDidChange.event, e => e.status === TextToSpeechStatus.Stopped, disposable), disposable), token);
                        }
                        finally {
                            disposable.dispose();
                        }
                    }
                };
            },
            createKeywordRecognitionSession: token => {
                if (token.isCancellationRequested) {
                    return {
                        onDidChange: Event.None
                    };
                }
                const disposables = new DisposableStore();
                const session = Math.random();
                this.proxy.$createKeywordRecognitionSession(handle, session);
                const onDidChange = disposables.add(new Emitter());
                this.keywordRecognitionSessions.set(session, { onDidChange });
                disposables.add(token.onCancellationRequested(() => {
                    this.proxy.$cancelKeywordRecognitionSession(session);
                    this.keywordRecognitionSessions.delete(session);
                    disposables.dispose();
                }));
                return {
                    onDidChange: onDidChange.event
                };
            }
        });
        this.providerRegistrations.set(handle, {
            dispose: () => {
                registration.dispose();
            }
        });
    }
    $unregisterProvider(handle) {
        const registration = this.providerRegistrations.get(handle);
        if (registration) {
            registration.dispose();
            this.providerRegistrations.delete(handle);
        }
    }
    $emitSpeechToTextEvent(session, event) {
        const providerSession = this.speechToTextSessions.get(session);
        providerSession?.onDidChange.fire(event);
    }
    $emitTextToSpeechEvent(session, event) {
        const providerSession = this.textToSpeechSessions.get(session);
        providerSession?.onDidChange.fire(event);
    }
    $emitKeywordRecognitionEvent(session, event) {
        const providerSession = this.keywordRecognitionSessions.get(session);
        providerSession?.onDidChange.fire(event);
    }
    dispose() {
        this.providerRegistrations.forEach(disposable => disposable.dispose());
        this.providerRegistrations.clear();
        this.speechToTextSessions.forEach(session => session.onDidChange.dispose());
        this.speechToTextSessions.clear();
        this.textToSpeechSessions.forEach(session => session.onDidChange.dispose());
        this.textToSpeechSessions.clear();
        this.keywordRecognitionSessions.forEach(session => session.onDidChange.dispose());
        this.keywordRecognitionSessions.clear();
    }
};
MainThreadSpeech = __decorate([
    extHostNamedCustomer(MainContext.MainThreadSpeech),
    __param(1, ISpeechService),
    __param(2, ILogService)
], MainThreadSpeech);
export { MainThreadSpeech };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNwZWVjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRTcGVlY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDakYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQXNCLFdBQVcsRUFBeUIsTUFBTSwrQkFBK0IsQ0FBQztBQUN2SCxPQUFPLEVBQXFELGNBQWMsRUFBMEMsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM3TCxPQUFPLEVBQW1CLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFldEcsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBZ0I7SUFVNUIsWUFDQyxjQUErQixFQUNmLGFBQThDLEVBQ2pELFVBQXdDO1FBRHBCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUNoQyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBVHJDLDBCQUFxQixHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBRXZELHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO1FBQzlELHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUErQixDQUFDO1FBQzlELCtCQUEwQixHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFDO1FBTzFGLElBQUksQ0FBQyxLQUFLLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxj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