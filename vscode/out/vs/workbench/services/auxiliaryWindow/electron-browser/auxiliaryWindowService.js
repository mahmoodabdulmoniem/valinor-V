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
var NativeAuxiliaryWindow_1;
import { localize } from '../../../../nls.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { AuxiliaryWindow, AuxiliaryWindowMode, BrowserAuxiliaryWindowService, IAuxiliaryWindowService } from '../browser/auxiliaryWindowService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { mark } from '../../../../base/common/performance.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IHostService } from '../../host/browser/host.js';
import { applyZoom } from '../../../../platform/window/electron-browser/window.js';
import { getZoomLevel, isFullscreen, setFullscreen } from '../../../../base/browser/browser.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { isMacintosh } from '../../../../base/common/platform.js';
let NativeAuxiliaryWindow = NativeAuxiliaryWindow_1 = class NativeAuxiliaryWindow extends AuxiliaryWindow {
    constructor(window, container, stylesHaveLoaded, configurationService, nativeHostService, instantiationService, hostService, environmentService, dialogService) {
        super(window, container, stylesHaveLoaded, configurationService, hostService, environmentService);
        this.nativeHostService = nativeHostService;
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this.skipUnloadConfirmation = false;
        this.maximized = false;
        this.alwaysOnTop = false;
        if (!isMacintosh) {
            // For now, limit this to platforms that have clear maximised
            // transitions (Windows, Linux) via window buttons.
            this.handleMaximizedState();
        }
        this.handleFullScreenState();
        this.handleAlwaysOnTopState();
    }
    handleMaximizedState() {
        (async () => {
            this.maximized = await this.nativeHostService.isMaximized({ targetWindowId: this.window.vscodeWindowId });
        })();
        this._register(this.nativeHostService.onDidMaximizeWindow(windowId => {
            if (windowId === this.window.vscodeWindowId) {
                this.maximized = true;
            }
        }));
        this._register(this.nativeHostService.onDidUnmaximizeWindow(windowId => {
            if (windowId === this.window.vscodeWindowId) {
                this.maximized = false;
            }
        }));
    }
    handleAlwaysOnTopState() {
        (async () => {
            this.alwaysOnTop = await this.nativeHostService.isWindowAlwaysOnTop({ targetWindowId: this.window.vscodeWindowId });
        })();
        this._register(this.nativeHostService.onDidChangeWindowAlwaysOnTop(({ windowId, alwaysOnTop }) => {
            if (windowId === this.window.vscodeWindowId) {
                this.alwaysOnTop = alwaysOnTop;
            }
        }));
    }
    async handleFullScreenState() {
        const fullscreen = await this.nativeHostService.isFullScreen({ targetWindowId: this.window.vscodeWindowId });
        if (fullscreen) {
            setFullscreen(true, this.window);
        }
    }
    async handleVetoBeforeClose(e, veto) {
        this.preventUnload(e);
        await this.dialogService.error(veto, localize('backupErrorDetails', "Try saving or reverting the editors with unsaved changes first and then try again."));
    }
    async confirmBeforeClose(e) {
        if (this.skipUnloadConfirmation) {
            return;
        }
        this.preventUnload(e);
        const confirmed = await this.instantiationService.invokeFunction(accessor => NativeAuxiliaryWindow_1.confirmOnShutdown(accessor, 1 /* ShutdownReason.CLOSE */));
        if (confirmed) {
            this.skipUnloadConfirmation = true;
            this.nativeHostService.closeWindow({ targetWindowId: this.window.vscodeWindowId });
        }
    }
    preventUnload(e) {
        e.preventDefault();
        e.returnValue = true;
    }
    createState() {
        const state = super.createState();
        const fullscreen = isFullscreen(this.window);
        return {
            ...state,
            bounds: state.bounds,
            mode: this.maximized ? AuxiliaryWindowMode.Maximized : fullscreen ? AuxiliaryWindowMode.Fullscreen : AuxiliaryWindowMode.Normal,
            alwaysOnTop: this.alwaysOnTop
        };
    }
};
NativeAuxiliaryWindow = NativeAuxiliaryWindow_1 = __decorate([
    __param(3, IConfigurationService),
    __param(4, INativeHostService),
    __param(5, IInstantiationService),
    __param(6, IHostService),
    __param(7, IWorkbenchEnvironmentService),
    __param(8, IDialogService)
], NativeAuxiliaryWindow);
export { NativeAuxiliaryWindow };
let NativeAuxiliaryWindowService = class NativeAuxiliaryWindowService extends BrowserAuxiliaryWindowService {
    constructor(layoutService, configurationService, nativeHostService, dialogService, instantiationService, telemetryService, hostService, environmentService) {
        super(layoutService, dialogService, configurationService, telemetryService, hostService, environmentService);
        this.nativeHostService = nativeHostService;
        this.instantiationService = instantiationService;
    }
    async resolveWindowId(auxiliaryWindow) {
        mark('code/auxiliaryWindow/willResolveWindowId');
        const windowId = await auxiliaryWindow.vscode.ipcRenderer.invoke('vscode:registerAuxiliaryWindow', this.nativeHostService.windowId);
        mark('code/auxiliaryWindow/didResolveWindowId');
        return windowId;
    }
    createContainer(auxiliaryWindow, disposables, options) {
        // Zoom level (either explicitly provided or inherited from main window)
        let windowZoomLevel;
        if (typeof options?.zoomLevel === 'number') {
            windowZoomLevel = options.zoomLevel;
        }
        else {
            windowZoomLevel = getZoomLevel(getActiveWindow());
        }
        applyZoom(windowZoomLevel, auxiliaryWindow);
        return super.createContainer(auxiliaryWindow, disposables);
    }
    createAuxiliaryWindow(targetWindow, container, stylesHaveLoaded) {
        return new NativeAuxiliaryWindow(targetWindow, container, stylesHaveLoaded, this.configurationService, this.nativeHostService, this.instantiationService, this.hostService, this.environmentService, this.dialogService);
    }
};
NativeAuxiliaryWindowService = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, IConfigurationService),
    __param(2, INativeHostService),
    __param(3, IDialogService),
    __param(4, IInstantiationService),
    __param(5, ITelemetryService),
    __param(6, IHostService),
    __param(7, IWorkbenchEnvironmentService)
], NativeAuxiliaryWindowService);
export { NativeAuxiliaryWindowService };
registerSingleton(IAuxiliaryWindowService, NativeAuxiliaryWindowService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5V2luZG93U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2F1eGlsaWFyeVdpbmRvdy9lbGVjdHJvbi1icm93c2VyL2F1eGlsaWFyeVdpbmRvd1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFBRSw2QkFBNkIsRUFBK0IsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqTCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFaEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXZGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFD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