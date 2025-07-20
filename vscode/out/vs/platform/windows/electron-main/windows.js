/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import electron from 'electron';
import { Color } from '../../../base/common/color.js';
import { join } from '../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IProductService } from '../../product/common/productService.js';
import { IThemeMainService } from '../../theme/electron-main/themeMainService.js';
import { WindowMinimumSize, hasNativeTitlebar, useNativeFullScreen, useWindowControlsOverlay, zoomLevelToZoomFactor } from '../../window/common/window.js';
import { defaultWindowState } from '../../window/electron-main/window.js';
export const IWindowsMainService = createDecorator('windowsMainService');
export var OpenContext;
(function (OpenContext) {
    // opening when running from the command line
    OpenContext[OpenContext["CLI"] = 0] = "CLI";
    // macOS only: opening from the dock (also when opening files to a running instance from desktop)
    OpenContext[OpenContext["DOCK"] = 1] = "DOCK";
    // opening from the main application window
    OpenContext[OpenContext["MENU"] = 2] = "MENU";
    // opening from a file or folder dialog
    OpenContext[OpenContext["DIALOG"] = 3] = "DIALOG";
    // opening from the OS's UI
    OpenContext[OpenContext["DESKTOP"] = 4] = "DESKTOP";
    // opening through the API
    OpenContext[OpenContext["API"] = 5] = "API";
    // opening from a protocol link
    OpenContext[OpenContext["LINK"] = 6] = "LINK";
})(OpenContext || (OpenContext = {}));
export function defaultBrowserWindowOptions(accessor, windowState, overrides, webPreferences) {
    const themeMainService = accessor.get(IThemeMainService);
    const productService = accessor.get(IProductService);
    const configurationService = accessor.get(IConfigurationService);
    const environmentMainService = accessor.get(IEnvironmentMainService);
    const windowSettings = configurationService.getValue('window');
    const options = {
        backgroundColor: themeMainService.getBackgroundColor(),
        minWidth: WindowMinimumSize.WIDTH,
        minHeight: WindowMinimumSize.HEIGHT,
        title: productService.nameLong,
        show: windowState.mode !== 0 /* WindowMode.Maximized */ && windowState.mode !== 3 /* WindowMode.Fullscreen */, // reduce flicker by showing later
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        webPreferences: {
            ...webPreferences,
            enableWebSQL: false,
            spellcheck: false,
            zoomFactor: zoomLevelToZoomFactor(windowState.zoomLevel ?? windowSettings?.zoomLevel),
            autoplayPolicy: 'user-gesture-required',
            // Enable experimental css highlight api https://chromestatus.com/feature/5436441440026624
            // Refs https://github.com/microsoft/vscode/issues/140098
            enableBlinkFeatures: 'HighlightAPI',
            sandbox: true,
            // TODO(deepak1556): Should be removed once migration is complete
            // https://github.com/microsoft/vscode/issues/239228
            enableDeprecatedPaste: true,
        },
        experimentalDarkMode: true
    };
    if (isWindows) {
        const borderSetting = windowSettings?.border || 'default';
        if (borderSetting !== 'default') {
            if (borderSetting === 'off') {
                options.accentColor = false;
            }
            else if (typeof borderSetting === 'string') {
                options.accentColor = borderSetting;
            }
        }
    }
    if (isLinux) {
        options.icon = join(environmentMainService.appRoot, 'resources/linux/code.png'); // always on Linux
    }
    else if (isWindows && !environmentMainService.isBuilt) {
        options.icon = join(environmentMainService.appRoot, 'resources/win32/code_150x150.png'); // only when running out of sources on Windows
    }
    if (isMacintosh) {
        options.acceptFirstMouse = true; // enabled by default
        if (windowSettings?.clickThroughInactive === false) {
            options.acceptFirstMouse = false;
        }
    }
    if (overrides?.disableFullscreen) {
        options.fullscreen = false;
    }
    else if (isMacintosh && !useNativeFullScreen(configurationService)) {
        options.fullscreenable = false; // enables simple fullscreen mode
    }
    const useNativeTabs = isMacintosh && windowSettings?.nativeTabs === true;
    if (useNativeTabs) {
        options.tabbingIdentifier = productService.nameShort; // this opts in to sierra tabs
    }
    const hideNativeTitleBar = !hasNativeTitlebar(configurationService, overrides?.forceNativeTitlebar ? "native" /* TitlebarStyle.NATIVE */ : undefined);
    if (hideNativeTitleBar) {
        options.titleBarStyle = 'hidden';
        if (!isMacintosh) {
            options.frame = false;
        }
        if (useWindowControlsOverlay(configurationService)) {
            if (isMacintosh) {
                options.titleBarOverlay = true;
            }
            else {
                // This logic will not perfectly guess the right colors
                // to use on initialization, but prefer to keep things
                // simple as it is temporary and not noticeable
                const titleBarColor = themeMainService.getWindowSplash(undefined)?.colorInfo.titleBarBackground ?? themeMainService.getBackgroundColor();
                const symbolColor = Color.fromHex(titleBarColor).isDarker() ? '#FFFFFF' : '#000000';
                options.titleBarOverlay = {
                    height: 29, // the smallest size of the title bar on windows accounting for the border on windows 11
                    color: titleBarColor,
                    symbolColor
                };
            }
        }
    }
    if (overrides?.alwaysOnTop) {
        options.alwaysOnTop = true;
    }
    return options;
}
export function getLastFocused(windows) {
    let lastFocusedWindow = undefined;
    let maxLastFocusTime = Number.MIN_VALUE;
    for (const window of windows) {
        if (window.lastFocusTime > maxLastFocusTime) {
            maxLastFocusTime = window.lastFocusTime;
            lastFocusedWindow = window;
        }
    }
    return lastFocusedWindow;
}
export var WindowStateValidator;
(function (WindowStateValidator) {
    function validateWindowState(logService, state, displays = electron.screen.getAllDisplays()) {
        logService.trace(`window#validateWindowState: validating window state on ${displays.length} display(s)`, state);
        if (typeof state.x !== 'number' ||
            typeof state.y !== 'number' ||
            typeof state.width !== 'number' ||
            typeof state.height !== 'number') {
            logService.trace('window#validateWindowState: unexpected type of state values');
            return undefined;
        }
        if (state.width <= 0 || state.height <= 0) {
            logService.trace('window#validateWindowState: unexpected negative values');
            return undefined;
        }
        // Single Monitor: be strict about x/y positioning
        // macOS & Linux: these OS seem to be pretty good in ensuring that a window is never outside of it's bounds.
        // Windows: it is possible to have a window with a size that makes it fall out of the window. our strategy
        //          is to try as much as possible to keep the window in the monitor bounds. we are not as strict as
        //          macOS and Linux and allow the window to exceed the monitor bounds as long as the window is still
        //          some pixels (128) visible on the screen for the user to drag it back.
        if (displays.length === 1) {
            const displayWorkingArea = getWorkingArea(displays[0]);
            logService.trace('window#validateWindowState: single monitor working area', displayWorkingArea);
            if (displayWorkingArea) {
                function ensureStateInDisplayWorkingArea() {
                    if (!state || typeof state.x !== 'number' || typeof state.y !== 'number' || !displayWorkingArea) {
                        return;
                    }
                    if (state.x < displayWorkingArea.x) {
                        // prevent window from falling out of the screen to the left
                        state.x = displayWorkingArea.x;
                    }
                    if (state.y < displayWorkingArea.y) {
                        // prevent window from falling out of the screen to the top
                        state.y = displayWorkingArea.y;
                    }
                }
                // ensure state is not outside display working area (top, left)
                ensureStateInDisplayWorkingArea();
                if (state.width > displayWorkingArea.width) {
                    // prevent window from exceeding display bounds width
                    state.width = displayWorkingArea.width;
                }
                if (state.height > displayWorkingArea.height) {
                    // prevent window from exceeding display bounds height
                    state.height = displayWorkingArea.height;
                }
                if (state.x > (displayWorkingArea.x + displayWorkingArea.width - 128)) {
                    // prevent window from falling out of the screen to the right with
                    // 128px margin by positioning the window to the far right edge of
                    // the screen
                    state.x = displayWorkingArea.x + displayWorkingArea.width - state.width;
                }
                if (state.y > (displayWorkingArea.y + displayWorkingArea.height - 128)) {
                    // prevent window from falling out of the screen to the bottom with
                    // 128px margin by positioning the window to the far bottom edge of
                    // the screen
                    state.y = displayWorkingArea.y + displayWorkingArea.height - state.height;
                }
                // again ensure state is not outside display working area
                // (it may have changed from the previous validation step)
                ensureStateInDisplayWorkingArea();
            }
            return state;
        }
        // Multi Montior (fullscreen): try to find the previously used display
        if (state.display && state.mode === 3 /* WindowMode.Fullscreen */) {
            const display = displays.find(d => d.id === state.display);
            if (display && typeof display.bounds?.x === 'number' && typeof display.bounds?.y === 'number') {
                logService.trace('window#validateWindowState: restoring fullscreen to previous display');
                const defaults = defaultWindowState(3 /* WindowMode.Fullscreen */); // make sure we have good values when the user restores the window
                defaults.x = display.bounds.x; // carefull to use displays x/y position so that the window ends up on the correct monitor
                defaults.y = display.bounds.y;
                return defaults;
            }
        }
        // Multi Monitor (non-fullscreen): ensure window is within display bounds
        let display;
        let displayWorkingArea;
        try {
            display = electron.screen.getDisplayMatching({ x: state.x, y: state.y, width: state.width, height: state.height });
            displayWorkingArea = getWorkingArea(display);
            logService.trace('window#validateWindowState: multi-monitor working area', displayWorkingArea);
        }
        catch (error) {
            // Electron has weird conditions under which it throws errors
            // e.g. https://github.com/microsoft/vscode/issues/100334 when
            // large numbers are passed in
            logService.error('window#validateWindowState: error finding display for window state', error);
        }
        if (display && validateWindowStateOnDisplay(state, display)) {
            return state;
        }
        logService.trace('window#validateWindowState: state is outside of the multi-monitor working area');
        return undefined;
    }
    WindowStateValidator.validateWindowState = validateWindowState;
    function validateWindowStateOnDisplay(state, display) {
        if (typeof state.x !== 'number' ||
            typeof state.y !== 'number' ||
            typeof state.width !== 'number' ||
            typeof state.height !== 'number' ||
            state.width <= 0 || state.height <= 0) {
            return false;
        }
        const displayWorkingArea = getWorkingArea(display);
        return Boolean(displayWorkingArea && // we have valid working area bounds
            state.x + state.width > displayWorkingArea.x && // prevent window from falling out of the screen to the left
            state.y + state.height > displayWorkingArea.y && // prevent window from falling out of the screen to the top
            state.x < displayWorkingArea.x + displayWorkingArea.width && // prevent window from falling out of the screen to the right
            state.y < displayWorkingArea.y + displayWorkingArea.height // prevent window from falling out of the screen to the bottom
        );
    }
    WindowStateValidator.validateWindowStateOnDisplay = validateWindowStateOnDisplay;
    function getWorkingArea(display) {
        // Prefer the working area of the display to account for taskbars on the
        // desktop being positioned somewhere (https://github.com/microsoft/vscode/issues/50830).
        //
        // Linux X11 sessions sometimes report wrong display bounds, so we validate
        // the reported sizes are positive.
        if (display.workArea.width > 0 && display.workArea.height > 0) {
            return display.workArea;
        }
        if (display.bounds.width > 0 && display.bounds.height > 0) {
            return display.bounds;
        }
        return undefined;
    }
})(WindowStateValidator || (WindowStateValidator = {}));
/**
 * We have some components like `NativeWebContentExtractorService` that create offscreen windows
 * to extract content from web pages. These windows are not visible to the user and are not
 * considered part of the main application window. This function filters out those offscreen
 * windows from the list of all windows.
 * @returns An array of all BrowserWindow instances that are not offscreen.
 */
export function getAllWindowsExcludingOffscreen() {
    return electron.BrowserWindow.getAllWindows().filter(win => !win.webContents.isOffscreen());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93cy9lbGVjdHJvbi1tYWluL3dpbmRvd3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxRQUFnQyxNQUFNLFVBQVUsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFdEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBdUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUd4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUVwRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQW9CLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNsRixPQUFPLEVBQTRFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDck8sT0FBTyxFQUF5QyxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpILE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQztBQXlDOUYsTUFBTSxDQUFOLElBQWtCLFdBc0JqQjtBQXRCRCxXQUFrQixXQUFXO0lBRTVCLDZDQUE2QztJQUM3QywyQ0FBRyxDQUFBO0lBRUgsaUdBQWlH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