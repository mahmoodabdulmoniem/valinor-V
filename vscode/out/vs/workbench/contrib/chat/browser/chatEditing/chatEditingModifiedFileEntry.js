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
var AbstractChatEditingModifiedFileEntry_1;
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableMap, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { clamp } from '../../../../../base/common/numbers.js';
import { autorun, derived, observableValue, observableValueOpts, transaction } from '../../../../../base/common/observable.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { editorBackground, registerColor, transparent } from '../../../../../platform/theme/common/colorRegistry.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IChatService } from '../../common/chatService.js';
class AutoAcceptControl {
    constructor(total, remaining, cancel) {
        this.total = total;
        this.remaining = remaining;
        this.cancel = cancel;
    }
}
export const pendingRewriteMinimap = registerColor('minimap.chatEditHighlight', transparent(editorBackground, 0.6), localize('editorSelectionBackground', "Color of pending edit regions in the minimap"));
let AbstractChatEditingModifiedFileEntry = class AbstractChatEditingModifiedFileEntry extends Disposable {
    static { AbstractChatEditingModifiedFileEntry_1 = this; }
    static { this.scheme = 'modified-file-entry'; }
    static { this.lastEntryId = 0; }
    get telemetryInfo() {
        return this._telemetryInfo;
    }
    get lastModifyingRequestId() {
        return this._telemetryInfo.requestId;
    }
    constructor(modifiedURI, _telemetryInfo, kind, configService, _fileConfigService, _chatService, _fileService, _undoRedoService, _instantiationService) {
        super();
        this.modifiedURI = modifiedURI;
        this._telemetryInfo = _telemetryInfo;
        this._fileConfigService = _fileConfigService;
        this._chatService = _chatService;
        this._fileService = _fileService;
        this._undoRedoService = _undoRedoService;
        this._instantiationService = _instantiationService;
        this.entryId = `${AbstractChatEditingModifiedFileEntry_1.scheme}::${++AbstractChatEditingModifiedFileEntry_1.lastEntryId}`;
        this._onDidDelete = this._register(new Emitter());
        this.onDidDelete = this._onDidDelete.event;
        this._stateObs = observableValue(this, 0 /* ModifiedFileEntryState.Modified */);
        this.state = this._stateObs;
        this._waitsForLastEdits = observableValue(this, false);
        this.waitsForLastEdits = this._waitsForLastEdits;
        this._isCurrentlyBeingModifiedByObs = observableValue(this, undefined);
        this.isCurrentlyBeingModifiedBy = this._isCurrentlyBeingModifiedByObs;
        this._lastModifyingResponseObs = observableValueOpts({ equalsFn: (a, b) => a?.requestId === b?.requestId }, undefined);
        this.lastModifyingResponse = this._lastModifyingResponseObs;
        this._lastModifyingResponseInProgressObs = this._lastModifyingResponseObs.map((value, r) => {
            return value?.isInProgress.read(r) ?? false;
        });
        this._rewriteRatioObs = observableValue(this, 0);
        this.rewriteRatio = this._rewriteRatioObs;
        this._reviewModeTempObs = observableValue(this, undefined);
        this._autoAcceptCtrl = observableValue(this, undefined);
        this.autoAcceptController = this._autoAcceptCtrl;
        this._refCounter = 1;
        this._userEditScheduler = this._register(new RunOnceScheduler(() => this._notifyAction('userModified'), 1000));
        this._editorIntegrations = this._register(new DisposableMap());
        if (kind === 0 /* ChatEditKind.Created */) {
            this.createdInRequestId = this._telemetryInfo.requestId;
        }
        if (this.modifiedURI.scheme !== Schemas.untitled && this.modifiedURI.scheme !== Schemas.vscodeNotebookCell) {
            this._register(this._fileService.watch(this.modifiedURI));
            this._register(this._fileService.onDidFilesChange(e => {
                if (e.affects(this.modifiedURI) && kind === 0 /* ChatEditKind.Created */ && e.gotDeleted()) {
                    this._onDidDelete.fire();
                }
            }));
        }
        // review mode depends on setting and temporary override
        const autoAcceptRaw = observableConfigValue('chat.editing.autoAcceptDelay', 0, configService);
        this._autoAcceptTimeout = derived(r => {
            const value = autoAcceptRaw.read(r);
            return clamp(value, 0, 100);
        });
        this.reviewMode = derived(r => {
            const configuredValue = this._autoAcceptTimeout.read(r);
            const tempValue = this._reviewModeTempObs.read(r);
            return tempValue ?? configuredValue === 0;
        });
        this._store.add(toDisposable(() => this._lastModifyingResponseObs.set(undefined, undefined)));
        const autoSaveOff = this._store.add(new MutableDisposable());
        this._store.add(autorun(r => {
            if (this._waitsForLastEdits.read(r)) {
                autoSaveOff.value = _fileConfigService.disableAutoSave(this.modifiedURI);
            }
            else {
                autoSaveOff.clear();
            }
        }));
        this._store.add(autorun(r => {
            const inProgress = this._lastModifyingResponseInProgressObs.read(r);
            if (inProgress === false && !this.reviewMode.read(r)) {
                // AUTO accept mode (when request is done)
                const acceptTimeout = this._autoAcceptTimeout.get() * 1000;
                const future = Date.now() + acceptTimeout;
                const update = () => {
                    const reviewMode = this.reviewMode.get();
                    if (reviewMode) {
                        // switched back to review mode
                        this._autoAcceptCtrl.set(undefined, undefined);
                        return;
                    }
                    const remain = Math.round(future - Date.now());
                    if (remain <= 0) {
                        this.accept();
                    }
                    else {
                        const handle = setTimeout(update, 100);
                        this._autoAcceptCtrl.set(new AutoAcceptControl(acceptTimeout, remain, () => {
                            clearTimeout(handle);
                            this._autoAcceptCtrl.set(undefined, undefined);
                        }), undefined);
                    }
                };
                update();
            }
        }));
    }
    dispose() {
        if (--this._refCounter === 0) {
            super.dispose();
        }
    }
    acquire() {
        this._refCounter++;
        return this;
    }
    enableReviewModeUntilSettled() {
        this._reviewModeTempObs.set(true, undefined);
        const cleanup = autorun(r => {
            // reset config when settled
            const resetConfig = this.state.read(r) !== 0 /* ModifiedFileEntryState.Modified */;
            if (resetConfig) {
                this._store.delete(cleanup);
                this._reviewModeTempObs.set(undefined, undefined);
            }
        });
        this._store.add(cleanup);
    }
    updateTelemetryInfo(telemetryInfo) {
        this._telemetryInfo = telemetryInfo;
    }
    async accept() {
        if (this._stateObs.get() !== 0 /* ModifiedFileEntryState.Modified */) {
            // already accepted or rejected
            return;
        }
        await this._doAccept();
        transaction(tx => {
            this._stateObs.set(1 /* ModifiedFileEntryState.Accepted */, tx);
            this._autoAcceptCtrl.set(undefined, tx);
        });
        this._notifyAction('accepted');
    }
    async reject() {
        if (this._stateObs.get() !== 0 /* ModifiedFileEntryState.Modified */) {
            // already accepted or rejected
            return;
        }
        this._notifyAction('rejected');
        await this._doReject();
        transaction(tx => {
            this._stateObs.set(2 /* ModifiedFileEntryState.Rejected */, tx);
            this._autoAcceptCtrl.set(undefined, tx);
        });
    }
    _notifyAction(outcome) {
        this._chatService.notifyUserAction({
            action: { kind: 'chatEditingSessionAction', uri: this.modifiedURI, hasRemainingEdits: false, outcome },
            agentId: this._telemetryInfo.agentId,
            command: this._telemetryInfo.command,
            sessionId: this._telemetryInfo.sessionId,
            requestId: this._telemetryInfo.requestId,
            result: this._telemetryInfo.result
        });
    }
    getEditorIntegration(pane) {
        let value = this._editorIntegrations.get(pane);
        if (!value) {
            value = this._createEditorIntegration(pane);
            this._editorIntegrations.set(pane, value);
        }
        return value;
    }
    acceptStreamingEditsStart(responseModel, tx) {
        this._resetEditsState(tx);
        this._isCurrentlyBeingModifiedByObs.set(responseModel, tx);
        this._lastModifyingResponseObs.set(responseModel, tx);
        this._autoAcceptCtrl.get()?.cancel();
        const undoRedoElement = this._createUndoRedoElement(responseModel);
        if (undoRedoElement) {
            this._undoRedoService.pushElement(undoRedoElement);
        }
    }
    async acceptStreamingEditsEnd() {
        this._resetEditsState(undefined);
        if (await this._areOriginalAndModifiedIdentical()) {
            // ACCEPT if identical
            await this.accept();
        }
    }
    _resetEditsState(tx) {
        this._isCurrentlyBeingModifiedByObs.set(undefined, tx);
        this._rewriteRatioObs.set(0, tx);
        this._waitsForLastEdits.set(false, tx);
    }
};
AbstractChatEditingModifiedFileEntry = AbstractChatEditingModifiedFileEntry_1 = __decorate([
    __param(3, IConfigurationService),
    __param(4, IFilesConfigurationService),
    __param(5, IChatService),
    __param(6, IFileService),
    __param(7, IUndoRedoService),
    __param(8, IInstantiationService)
], AbstractChatEditingModifiedFileEntry);
export { AbstractChatEditingModifiedFileEntry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdNb2RpZmllZEZpbGVFbnRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nTW9kaWZpZWRGaWxlRW50cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNySCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUE2QixlQUFlLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHMUosT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQztBQUM3RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3JILE9B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