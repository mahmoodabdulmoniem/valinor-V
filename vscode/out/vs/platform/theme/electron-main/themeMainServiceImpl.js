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
var ThemeMainService_1;
import electron from 'electron';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IStateService } from '../../state/node/state.js';
import { ThemeTypeSelector } from '../common/theme.js';
import { coalesce } from '../../../base/common/arrays.js';
import { getAllWindowsExcludingOffscreen } from '../../windows/electron-main/windows.js';
import { ILogService } from '../../log/common/log.js';
// These default colors match our default themes
// editor background color ("Dark Modern", etc...)
const DEFAULT_BG_LIGHT = '#FFFFFF';
const DEFAULT_BG_DARK = '#1F1F1F';
const DEFAULT_BG_HC_BLACK = '#000000';
const DEFAULT_BG_HC_LIGHT = '#FFFFFF';
const THEME_STORAGE_KEY = 'theme';
const THEME_BG_STORAGE_KEY = 'themeBackground';
const THEME_WINDOW_SPLASH_KEY = 'windowSplash';
const THEME_WINDOW_SPLASH_OVERRIDE_KEY = 'windowSplashWorkspaceOverride';
const AUXILIARYBAR_DEFAULT_VISIBILITY = 'workbench.secondarySideBar.defaultVisibility';
var ThemeSettings;
(function (ThemeSettings) {
    ThemeSettings.DETECT_COLOR_SCHEME = 'window.autoDetectColorScheme';
    ThemeSettings.DETECT_HC = 'window.autoDetectHighContrast';
    ThemeSettings.SYSTEM_COLOR_THEME = 'window.systemColorTheme';
})(ThemeSettings || (ThemeSettings = {}));
let ThemeMainService = class ThemeMainService extends Disposable {
    static { ThemeMainService_1 = this; }
    static { this.DEFAULT_BAR_WIDTH = 300; }
    static { this.WORKSPACE_OVERRIDE_LIMIT = 50; }
    constructor(stateService, configurationService, logService) {
        super();
        this.stateService = stateService;
        this.configurationService = configurationService;
        this.logService = logService;
        this._onDidChangeColorScheme = this._register(new Emitter());
        this.onDidChangeColorScheme = this._onDidChangeColorScheme.event;
        // System Theme
        if (!isLinux) {
            this._register(this.configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(ThemeSettings.SYSTEM_COLOR_THEME) || e.affectsConfiguration(ThemeSettings.DETECT_COLOR_SCHEME)) {
                    this.updateSystemColorTheme();
                }
            }));
        }
        this.updateSystemColorTheme();
        // Color Scheme changes
        this._register(Event.fromNodeEventEmitter(electron.nativeTheme, 'updated')(() => this._onDidChangeColorScheme.fire(this.getColorScheme())));
    }
    updateSystemColorTheme() {
        if (isLinux || this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            electron.nativeTheme.themeSource = 'system'; // only with `system` we can detect the system color scheme
        }
        else {
            switch (this.configurationService.getValue(ThemeSettings.SYSTEM_COLOR_THEME)) {
                case 'dark':
                    electron.nativeTheme.themeSource = 'dark';
                    break;
                case 'light':
                    electron.nativeTheme.themeSource = 'light';
                    break;
                case 'auto':
                    switch (this.getPreferredBaseTheme() ?? this.getStoredBaseTheme()) {
                        case ThemeTypeSelector.VS:
                            electron.nativeTheme.themeSource = 'light';
                            break;
                        case ThemeTypeSelector.VS_DARK:
                            electron.nativeTheme.themeSource = 'dark';
                            break;
                        default: electron.nativeTheme.themeSource = 'system';
                    }
                    break;
                default:
                    electron.nativeTheme.themeSource = 'system';
                    break;
            }
        }
    }
    getColorScheme() {
        // high contrast is reflected by the shouldUseInvertedColorScheme property
        if (isWindows) {
            if (electron.nativeTheme.shouldUseHighContrastColors) {
                // shouldUseInvertedColorScheme is dark, !shouldUseInvertedColorScheme is light
                return { dark: electron.nativeTheme.shouldUseInvertedColorScheme, highContrast: true };
            }
        }
        // high contrast is set if one of shouldUseInvertedColorScheme or shouldUseHighContrastColors is set,
        // reflecting the 'Invert colours' and `Increase contrast` settings in MacOS
        else if (isMacintosh) {
            if (electron.nativeTheme.shouldUseInvertedColorScheme || electron.nativeTheme.shouldUseHighContrastColors) {
                return { dark: electron.nativeTheme.shouldUseDarkColors, highContrast: true };
            }
        }
        // ubuntu gnome seems to have 3 states, light dark and high contrast
        else if (isLinux) {
            if (electron.nativeTheme.shouldUseHighContrastColors) {
                return { dark: true, highContrast: true };
            }
        }
        return {
            dark: electron.nativeTheme.shouldUseDarkColors,
            highContrast: false
        };
    }
    getPreferredBaseTheme() {
        const colorScheme = this.getColorScheme();
        if (this.configurationService.getValue(ThemeSettings.DETECT_HC) && colorScheme.highContrast) {
            return colorScheme.dark ? ThemeTypeSelector.HC_BLACK : ThemeTypeSelector.HC_LIGHT;
        }
        if (this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            return colorScheme.dark ? ThemeTypeSelector.VS_DARK : ThemeTypeSelector.VS;
        }
        return undefined;
    }
    getBackgroundColor() {
        const preferred = this.getPreferredBaseTheme();
        const stored = this.getStoredBaseTheme();
        // If the stored theme has the same base as the preferred, we can return the stored background
        if (preferred === undefined || preferred === stored) {
            const storedBackground = this.stateService.getItem(THEME_BG_STORAGE_KEY, null);
            if (storedBackground) {
                return storedBackground;
            }
        }
        // Otherwise we return the default background for the preferred base theme. If there's no preferred, use the stored one.
        switch (preferred ?? stored) {
            case ThemeTypeSelector.VS: return DEFAULT_BG_LIGHT;
            case ThemeTypeSelector.HC_BLACK: return DEFAULT_BG_HC_BLACK;
            case ThemeTypeSelector.HC_LIGHT: return DEFAULT_BG_HC_LIGHT;
            default: return DEFAULT_BG_DARK;
        }
    }
    getStoredBaseTheme() {
        const baseTheme = this.stateService.getItem(THEME_STORAGE_KEY, ThemeTypeSelector.VS_DARK).split(' ')[0];
        switch (baseTheme) {
            case ThemeTypeSelector.VS: return ThemeTypeSelector.VS;
            case ThemeTypeSelector.HC_BLACK: return ThemeTypeSelector.HC_BLACK;
            case ThemeTypeSelector.HC_LIGHT: return ThemeTypeSelector.HC_LIGHT;
            default: return ThemeTypeSelector.VS_DARK;
        }
    }
    saveWindowSplash(windowId, workspace, splash) {
        // Update override as needed
        const splashOverride = this.updateWindowSplashOverride(workspace, splash);
        // Update in storage
        this.stateService.setItems(coalesce([
            { key: THEME_STORAGE_KEY, data: splash.baseTheme },
            { key: THEME_BG_STORAGE_KEY, data: splash.colorInfo.background },
            { key: THEME_WINDOW_SPLASH_KEY, data: splash },
            splashOverride ? { key: THEME_WINDOW_SPLASH_OVERRIDE_KEY, data: splashOverride } : undefined
        ]));
        // Update in opened windows
        if (typeof windowId === 'number') {
            this.updateBackgroundColor(windowId, splash);
        }
        // Update system theme
        this.updateSystemColorTheme();
    }
    updateWindowSplashOverride(workspace, splash) {
        let splashOverride = undefined;
        let changed = false;
        if (workspace) {
            splashOverride = { ...this.getWindowSplashOverride() }; // make a copy for modifications
            changed = this.doUpdateWindowSplashOverride(workspace, splash, splashOverride, 'sideBar');
            changed = this.doUpdateWindowSplashOverride(workspace, splash, splashOverride, 'auxiliaryBar') || changed;
        }
        return changed ? splashOverride : undefined;
    }
    doUpdateWindowSplashOverride(workspace, splash, splashOverride, part) {
        const currentWidth = part === 'sideBar' ? splash.layoutInfo?.sideBarWidth : splash.layoutInfo?.auxiliaryBarWidth;
        const overrideWidth = part === 'sideBar' ? splashOverride.layoutInfo.sideBarWidth : splashOverride.layoutInfo.auxiliaryBarWidth;
        // No layout info: remove override
        let changed = false;
        if (typeof currentWidth !== 'number') {
            if (splashOverride.layoutInfo.workspaces[workspace.id]) {
                delete splashOverride.layoutInfo.workspaces[workspace.id];
                changed = true;
            }
            return changed;
        }
        let workspaceOverride = splashOverride.layoutInfo.workspaces[workspace.id];
        if (!workspaceOverride) {
            const workspaceEntries = Object.keys(splashOverride.layoutInfo.workspaces);
            if (workspaceEntries.length >= ThemeMainService_1.WORKSPACE_OVERRIDE_LIMIT) {
                delete splashOverride.layoutInfo.workspaces[workspaceEntries[0]];
                changed = true;
            }
            workspaceOverride = { sideBarVisible: false, auxiliaryBarVisible: false };
            splashOverride.layoutInfo.workspaces[workspace.id] = workspaceOverride;
            changed = true;
        }
        // Part has width: update width & visibility override
        if (currentWidth > 0) {
            if (overrideWidth !== currentWidth) {
                splashOverride.layoutInfo[part === 'sideBar' ? 'sideBarWidth' : 'auxiliaryBarWidth'] = currentWidth;
                changed = true;
            }
            switch (part) {
                case 'sideBar':
                    if (!workspaceOverride.sideBarVisible) {
                        workspaceOverride.sideBarVisible = true;
                        changed = true;
                    }
                    break;
                case 'auxiliaryBar':
                    if (!workspaceOverride.auxiliaryBarVisible) {
                        workspaceOverride.auxiliaryBarVisible = true;
                        changed = true;
                    }
                    break;
            }
        }
        // Part is hidden: update visibility override
        else {
            switch (part) {
                case 'sideBar':
                    if (workspaceOverride.sideBarVisible) {
                        workspaceOverride.sideBarVisible = false;
                        changed = true;
                    }
                    break;
                case 'auxiliaryBar':
                    if (workspaceOverride.auxiliaryBarVisible) {
                        workspaceOverride.auxiliaryBarVisible = false;
                        changed = true;
                    }
                    break;
            }
        }
        return changed;
    }
    updateBackgroundColor(windowId, splash) {
        for (const window of getAllWindowsExcludingOffscreen()) {
            if (window.id === windowId) {
                window.setBackgroundColor(splash.colorInfo.background);
                break;
            }
        }
    }
    getWindowSplash(workspace) {
        try {
            return this.doGetWindowSplash(workspace);
        }
        catch (error) {
            this.logService.error('[theme main service] Failed to get window splash', error);
            return undefined;
        }
    }
    doGetWindowSplash(workspace) {
        const partSplash = this.stateService.getItem(THEME_WINDOW_SPLASH_KEY);
        if (!partSplash?.layoutInfo) {
            return partSplash; // return early: overrides currently only apply to layout info
        }
        const override = this.getWindowSplashOverride();
        // Figure out side bar width based on workspace and overrides
        let sideBarWidth;
        if (workspace) {
            if (override.layoutInfo.workspaces[workspace.id]?.sideBarVisible === false) {
                sideBarWidth = 0;
            }
            else {
                sideBarWidth = override.layoutInfo.sideBarWidth || partSplash.layoutInfo.sideBarWidth || ThemeMainService_1.DEFAULT_BAR_WIDTH;
            }
        }
        else {
            sideBarWidth = 0;
        }
        // Figure out auxiliary bar width based on workspace, configuration and overrides
        const auxiliaryBarDefaultVisibility = this.configurationService.getValue(AUXILIARYBAR_DEFAULT_VISIBILITY);
        let auxiliaryBarWidth;
        if (workspace) {
            const auxiliaryBarVisible = override.layoutInfo.workspaces[workspace.id]?.auxiliaryBarVisible;
            if (auxiliaryBarVisible === true) {
                auxiliaryBarWidth = override.layoutInfo.auxiliaryBarWidth || partSplash.layoutInfo.auxiliaryBarWidth || ThemeMainService_1.DEFAULT_BAR_WIDTH;
            }
            else if (auxiliaryBarVisible === false) {
                auxiliaryBarWidth = 0;
            }
            else {
                if (auxiliaryBarDefaultVisibility === 'visible' || auxiliaryBarDefaultVisibility === 'visibleInWorkspace') {
                    auxiliaryBarWidth = override.layoutInfo.auxiliaryBarWidth || partSplash.layoutInfo.auxiliaryBarWidth || ThemeMainService_1.DEFAULT_BAR_WIDTH;
                }
                else if (auxiliaryBarDefaultVisibility === 'maximized' || auxiliaryBarDefaultVisibility === 'maximizedInWorkspace') {
                    auxiliaryBarWidth = Number.MAX_SAFE_INTEGER; // marker for a maximised auxiliary bar
                }
                else {
                    auxiliaryBarWidth = 0;
                }
            }
        }
        else {
            auxiliaryBarWidth = 0; // technically not true if configured 'visible', but we never store splash per empty window, so we decide on a default here
        }
        return {
            ...partSplash,
            layoutInfo: {
                ...partSplash.layoutInfo,
                sideBarWidth,
                auxiliaryBarWidth
            }
        };
    }
    getWindowSplashOverride() {
        let override = this.stateService.getItem(THEME_WINDOW_SPLASH_OVERRIDE_KEY);
        if (!override?.layoutInfo) {
            override = {
                layoutInfo: {
                    sideBarWidth: ThemeMainService_1.DEFAULT_BAR_WIDTH,
                    auxiliaryBarWidth: ThemeMainService_1.DEFAULT_BAR_WIDTH,
                    workspaces: {}
                }
            };
        }
        if (!override.layoutInfo.sideBarWidth) {
            override.layoutInfo.sideBarWidth = ThemeMainService_1.DEFAULT_BAR_WIDTH;
        }
        if (!override.layoutInfo.auxiliaryBarWidth) {
            override.layoutInfo.auxiliaryBarWidth = ThemeMainService_1.DEFAULT_BAR_WIDTH;
        }
        if (!override.layoutInfo.workspaces) {
            override.layoutInfo.workspaces = {};
        }
        return override;
    }
};
ThemeMainService = ThemeMainService_1 = __decorate([
    __param(0, IStateService),
    __param(1, IConfigurationService),
    __param(2, ILogService)
], ThemeMainService);
export { ThemeMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVNYWluU2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2VsZWN0cm9uLW1haW4vdGhlbWVNYWluU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUNoQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFHMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUd0RCxnREFBZ0Q7QUFDaEQsa0RBQWtEO0FBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO0FBQ25DLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQztBQUNsQyxNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztBQUN0QyxNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQztBQUV0QyxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQztBQUNsQyxNQUFNLG9CQUFv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