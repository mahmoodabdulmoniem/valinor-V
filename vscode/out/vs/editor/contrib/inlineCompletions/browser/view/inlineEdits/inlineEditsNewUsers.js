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
import { timeout } from '../../../../../../base/common/async.js';
import { BugIndicatingError } from '../../../../../../base/common/errors.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableValue, runOnChange, runOnChangeWithCancellationToken } from '../../../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
var UserKind;
(function (UserKind) {
    UserKind["FirstTime"] = "firstTime";
    UserKind["SecondTime"] = "secondTime";
    UserKind["Active"] = "active";
})(UserKind || (UserKind = {}));
let InlineEditsOnboardingExperience = class InlineEditsOnboardingExperience extends Disposable {
    constructor(_host, _model, _indicator, _collapsedView, _storageService, _configurationService) {
        super();
        this._host = _host;
        this._model = _model;
        this._indicator = _indicator;
        this._collapsedView = _collapsedView;
        this._storageService = _storageService;
        this._configurationService = _configurationService;
        this._disposables = this._register(new MutableDisposable());
        this._setupDone = observableValue({ name: 'setupDone' }, false);
        this._activeCompletionId = derived(reader => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            if (!this._setupDone.read(reader)) {
                return undefined;
            }
            const indicator = this._indicator.read(reader);
            if (!indicator || !indicator.isVisible.read(reader)) {
                return undefined;
            }
            return model.inlineEdit.inlineCompletion.identity.id;
        });
        this._register(this._initializeDebugSetting());
        // Setup the onboarding experience for new users
        this._disposables.value = this.setupNewUserExperience();
        this._setupDone.set(true, undefined);
    }
    setupNewUserExperience() {
        if (this.getNewUserType() === UserKind.Active) {
            return undefined;
        }
        const disposableStore = new DisposableStore();
        let userHasHoveredOverIcon = false;
        let inlineEditHasBeenAccepted = false;
        let firstTimeUserAnimationCount = 0;
        let secondTimeUserAnimationCount = 0;
        // pulse animation for new users
        disposableStore.add(runOnChangeWithCancellationToken(this._activeCompletionId, async (id, _, __, token) => {
            if (id === undefined) {
                return;
            }
            let userType = this.getNewUserType();
            // User Kind Transition
            switch (userType) {
                case UserKind.FirstTime: {
                    if (firstTimeUserAnimationCount++ >= 5 || userHasHoveredOverIcon) {
                        userType = UserKind.SecondTime;
                        this.setNewUserType(userType);
                    }
                    break;
                }
                case UserKind.SecondTime: {
                    if (secondTimeUserAnimationCount++ >= 3 && inlineEditHasBeenAccepted) {
                        userType = UserKind.Active;
                        this.setNewUserType(userType);
                    }
                    break;
                }
            }
            // Animation
            switch (userType) {
                case UserKind.FirstTime: {
                    for (let i = 0; i < 3 && !token.isCancellationRequested; i++) {
                        await this._indicator.get()?.triggerAnimation();
                        await timeout(500);
                    }
                    break;
                }
                case UserKind.SecondTime: {
                    this._indicator.get()?.triggerAnimation();
                    break;
                }
            }
        }));
        disposableStore.add(autorun(reader => {
            if (this._collapsedView.isVisible.read(reader)) {
                if (this.getNewUserType() !== UserKind.Active) {
                    this._collapsedView.triggerAnimation();
                }
            }
        }));
        // Remember when the user has hovered over the icon
        disposableStore.add(autorunWithStore((reader, store) => {
            const indicator = this._indicator.read(reader);
            if (!indicator) {
                return;
            }
            store.add(runOnChange(indicator.isHoveredOverIcon, async (isHovered) => {
                if (isHovered) {
                    userHasHoveredOverIcon = true;
                }
            }));
        }));
        // Remember when the user has accepted an inline edit
        disposableStore.add(autorunWithStore((reader, store) => {
            const host = this._host.read(reader);
            if (!host) {
                return;
            }
            store.add(host.onDidAccept(() => {
                inlineEditHasBeenAccepted = true;
            }));
        }));
        return disposableStore;
    }
    getNewUserType() {
        return this._storageService.get('inlineEditsGutterIndicatorUserKind', -1 /* StorageScope.APPLICATION */, UserKind.FirstTime);
    }
    setNewUserType(value) {
        switch (value) {
            case UserKind.FirstTime:
                throw new BugIndicatingError('UserKind should not be set to first time');
            case UserKind.SecondTime:
                break;
            case UserKind.Active:
                this._disposables.clear();
                break;
        }
        this._storageService.store('inlineEditsGutterIndicatorUserKind', value, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    _initializeDebugSetting() {
        // Debug setting to reset the new user experience
        const hiddenDebugSetting = 'editor.inlineSuggest.edits.resetNewUserExperience';
        if (this._configurationService.getValue(hiddenDebugSetting)) {
            this._storageService.remove('inlineEditsGutterIndicatorUserKind', -1 /* StorageScope.APPLICATION */);
        }
        const disposable = this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(hiddenDebugSetting) && this._configurationService.getValue(hiddenDebugSetting)) {
                this._storageService.remove('inlineEditsGutterIndicatorUserKind', -1 /* StorageScope.APPLICATION */);
                this._disposables.value = this.setupNewUserExperience();
            }
        });
        return disposable;
    }
};
InlineEditsOnboardingExperience = __decorate([
    __param(4, IStorageService),
    __param(5, IConfigurationService)
], InlineEditsOnboardingExperience);
export { InlineEditsOnboardingExperience };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNOZXdVc2Vycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzTmV3VXNlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDekgsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQWUsZUFBZSxFQUFFLFdBQVcsRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlLLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sc0RBQXNELENBQUM7QUFLcEgsSUFBSyxRQUlKO0FBSkQsV0FBSyxRQUFRO0lBQ1osbUNBQXVCLENBQUE7SUFDdkIscUNBQXlCLENBQUE7SUFDekIsNkJBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQUpJLFFBQVEsS0FBUixRQUFRLFFBSVo7QUFFTSxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUFnQyxTQUFRLFVBQVU7SUFrQjlELFlBQ2tCLEtBQStDLEVBQy9DLE1BQWlELEVBQ2pELFVBQStELEVBQy9ELGNBQXdDLEVBQ3hDLGVBQWlELEVBQzNDLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQztRQVBTLFVBQUssR0FBTCxLQUFLLENBQTBDO1FB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