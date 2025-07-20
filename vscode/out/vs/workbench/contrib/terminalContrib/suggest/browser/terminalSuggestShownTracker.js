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
import { TimeoutTimer } from '../../../../../base/common/async.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
export const TERMINAL_SUGGEST_DISCOVERABILITY_KEY = 'terminal.suggest.increasedDiscoverability';
export const TERMINAL_SUGGEST_DISCOVERABILITY_COUNT_KEY = 'terminal.suggest.increasedDiscoverabilityCount';
const TERMINAL_SUGGEST_DISCOVERABILITY_MAX_COUNT = 10;
const TERMINAL_SUGGEST_DISCOVERABILITY_MIN_MS = 10000;
let TerminalSuggestShownTracker = class TerminalSuggestShownTracker extends Disposable {
    constructor(_shellType, _storageService, _extensionService) {
        super();
        this._shellType = _shellType;
        this._storageService = _storageService;
        this._extensionService = _extensionService;
        this._firstShownTracker = undefined;
        this._done = this._storageService.getBoolean(TERMINAL_SUGGEST_DISCOVERABILITY_KEY, -1 /* StorageScope.APPLICATION */, false);
        this._count = this._storageService.getNumber(TERMINAL_SUGGEST_DISCOVERABILITY_COUNT_KEY, -1 /* StorageScope.APPLICATION */, 0);
        this._register(this._extensionService.onWillStop(() => this._firstShownTracker = undefined));
    }
    get done() {
        return this._done;
    }
    resetState() {
        this._done = false;
        this._count = 0;
        this._start = undefined;
        this._firstShownTracker = undefined;
    }
    resetTimer() {
        if (this._timeout) {
            this._timeout.cancel();
            this._timeout = undefined;
        }
        this._start = undefined;
    }
    update(widgetElt) {
        if (this._done) {
            return;
        }
        this._count++;
        this._storageService.store(TERMINAL_SUGGEST_DISCOVERABILITY_COUNT_KEY, this._count, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        if (widgetElt && !widgetElt.classList.contains('increased-discoverability')) {
            widgetElt.classList.add('increased-discoverability');
        }
        if (this._count >= TERMINAL_SUGGEST_DISCOVERABILITY_MAX_COUNT) {
            this._setDone(widgetElt);
        }
        else if (!this._start) {
            this.resetTimer();
            this._start = Date.now();
            this._timeout = this._register(new TimeoutTimer(() => {
                this._setDone(widgetElt);
            }, TERMINAL_SUGGEST_DISCOVERABILITY_MIN_MS));
        }
    }
    _setDone(widgetElt) {
        this._done = true;
        this._storageService.store(TERMINAL_SUGGEST_DISCOVERABILITY_KEY, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        if (widgetElt) {
            widgetElt.classList.remove('increased-discoverability');
        }
        if (this._timeout) {
            this._timeout.cancel();
            this._timeout = undefined;
        }
        this._start = undefined;
    }
    getFirstShown(shellType) {
        if (!this._firstShownTracker) {
            this._firstShownTracker = {
                window: true,
                shell: new Set([shellType])
            };
            return { window: true, shell: true };
        }
        const isFirstForWindow = this._firstShownTracker.window;
        const isFirstForShell = !this._firstShownTracker.shell.has(shellType);
        if (isFirstForWindow || isFirstForShell) {
            this.updateShown();
        }
        return {
            window: isFirstForWindow,
            shell: isFirstForShell
        };
    }
    updateShown() {
        if (!this._shellType || !this._firstShownTracker) {
            return;
        }
        this._firstShownTracker.window = false;
        this._firstShownTracker.shell.add(this._shellType);
    }
};
TerminalSuggestShownTracker = __decorate([
    __param(1, IStorageService),
    __param(2, IExtensionService)
], TerminalSuggestShownTracker);
export { TerminalSuggestShownTracker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0U2hvd25UcmFja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3Rlcm1pbmFsU3VnZ2VzdFNob3duVHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sbURBQW1ELENBQUM7QUFFakgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHekYsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsMkNBQTJDLENBQUM7QUFDaEcsTUFBTSxDQUFDLE1BQU0sMENBQTBDLEdBQUcsZ0RBQWdELENBQUM7QUFDM0csTUFBTSwwQ0FBMEMsR0FBRyxFQUFFLENBQUM7QUFDdEQsTUFBTSx1Q0FBdUMsR0FBRyxLQUFLLENBQUM7QUFRL0MsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBUTFELFlBQ2tCLFVBQXlDLEVBQ3pDLGVBQWlELEVBQy9DLGlCQUFxRDtRQUd4RSxLQUFLLEVBQUUsQ0FBQztRQUxTLGVBQVUsR0FBVixVQUFVLENBQStCO1FBQ3hCLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUM5QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBTGpFLHVCQUFrQixHQUErRSxTQUFTLENBQUM7UUFTbEgsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxvQ0FBb0MscUNBQTRC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