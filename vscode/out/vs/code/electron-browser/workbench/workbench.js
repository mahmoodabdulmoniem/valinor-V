"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable no-restricted-globals */
(async function () {
    // Add a perf entry right from the top
    performance.mark('code/didStartRenderer');
    const preloadGlobals = window.vscode; // defined by preload.ts
    const safeProcess = preloadGlobals.process;
    //#region Splash Screen Helpers
    function showSplash(configuration) {
        performance.mark('code/willShowPartsSplash');
        let data = configuration.partsSplash;
        if (data) {
            if (configuration.autoDetectHighContrast && configuration.colorScheme.highContrast) {
                if ((configuration.colorScheme.dark && data.baseTheme !== 'hc-black') || (!configuration.colorScheme.dark && data.baseTheme !== 'hc-light')) {
                    data = undefined; // high contrast mode has been turned by the OS -> ignore stored colors and layouts
                }
            }
            else if (configuration.autoDetectColorScheme) {
                if ((configuration.colorScheme.dark && data.baseTheme !== 'vs-dark') || (!configuration.colorScheme.dark && data.baseTheme !== 'vs')) {
                    data = undefined; // OS color scheme is tracked and has changed
                }
            }
        }
        // developing an extension -> ignore stored layouts
        if (data && configuration.extensionDevelopmentPath) {
            data.layoutInfo = undefined;
        }
        // minimal color configuration (works with or without persisted data)
        let baseTheme;
        let shellBackground;
        let shellForeground;
        if (data) {
            baseTheme = data.baseTheme;
            shellBackground = data.colorInfo.editorBackground;
            shellForeground = data.colorInfo.foreground;
        }
        else if (configuration.autoDetectHighContrast && configuration.colorScheme.highContrast) {
            if (configuration.colorScheme.dark) {
                baseTheme = 'hc-black';
                shellBackground = '#000000';
                shellForeground = '#FFFFFF';
            }
            else {
                baseTheme = 'hc-light';
                shellBackground = '#FFFFFF';
                shellForeground = '#000000';
            }
        }
        else if (configuration.autoDetectColorScheme) {
            if (configuration.colorScheme.dark) {
                baseTheme = 'vs-dark';
                shellBackground = '#1E1E1E';
                shellForeground = '#CCCCCC';
            }
            else {
                baseTheme = 'vs';
                shellBackground = '#FFFFFF';
                shellForeground = '#000000';
            }
        }
        const style = document.createElement('style');
        style.className = 'initialShellColors';
        window.document.head.appendChild(style);
        style.textContent = `body {	background-color: ${shellBackground}; color: ${shellForeground}; margin: 0; padding: 0; }`;
        // set zoom level as soon as possible
        if (typeof data?.zoomLevel === 'number' && typeof preloadGlobals?.webFrame?.setZoomLevel === 'function') {
            preloadGlobals.webFrame.setZoomLevel(data.zoomLevel);
        }
        // restore parts if possible (we might not always store layout info)
        if (data?.layoutInfo) {
            const { layoutInfo, colorInfo } = data;
            const splash = document.createElement('div');
            splash.id = 'monaco-parts-splash';
            splash.className = baseTheme ?? 'vs-dark';
            if (layoutInfo.windowBorder && colorInfo.windowBorder) {
                const borderElement = document.createElement('div');
                borderElement.style.position = 'absolute';
                borderElement.style.width = 'calc(100vw - 2px)';
                borderElement.style.height = 'calc(100vh - 2px)';
                borderElement.style.zIndex = '1'; // allow border above other elements
                borderElement.style.border = `1px solid var(--window-border-color)`;
                borderElement.style.setProperty('--window-border-color', colorInfo.windowBorder);
                if (layoutInfo.windowBorderRadius) {
                    borderElement.style.borderRadius = layoutInfo.windowBorderRadius;
                }
                splash.appendChild(borderElement);
            }
            if (layoutInfo.auxiliaryBarWidth === Number.MAX_SAFE_INTEGER) {
                // if auxiliary bar is maximized, it goes as wide as the
                // window width but leaving room for activity bar
                layoutInfo.auxiliaryBarWidth = window.innerWidth - layoutInfo.activityBarWidth;
            }
            else {
                // otherwise adjust for other parts sizes if not maximized
                layoutInfo.auxiliaryBarWidth = Math.min(layoutInfo.auxiliaryBarWidth, window.innerWidth - (layoutInfo.activityBarWidth + layoutInfo.editorPartMinWidth + layoutInfo.sideBarWidth));
            }
            layoutInfo.sideBarWidth = Math.min(layoutInfo.sideBarWidth, window.innerWidth - (layoutInfo.activityBarWidth + layoutInfo.editorPartMinWidth + layoutInfo.auxiliaryBarWidth));
            // part: title
            if (layoutInfo.titleBarHeight > 0) {
                const titleDiv = document.createElement('div');
                titleDiv.style.position = 'absolute';
                titleDiv.style.width = '100%';
                titleDiv.style.height = `${layoutInfo.titleBarHeight}px`;
                titleDiv.style.left = '0';
                titleDiv.style.top = '0';
                titleDiv.style.backgroundColor = `${colorInfo.titleBarBackground}`;
                titleDiv.style['-webkit-app-region'] = 'drag';
                splash.appendChild(titleDiv);
                if (colorInfo.titleBarBorder) {
                    const titleBorder = document.createElement('div');
                    titleBorder.style.position = 'absolute';
                    titleBorder.style.width = '100%';
                    titleBorder.style.height = '1px';
                    titleBorder.style.left = '0';
                    titleBorder.style.bottom = '0';
                    titleBorder.style.borderBottom = `1px solid ${colorInfo.titleBarBorder}`;
                    titleDiv.appendChild(titleBorder);
                }
            }
            // part: activity bar
            if (layoutInfo.activityBarWidth > 0) {
                const activityDiv = document.createElement('div');
                activityDiv.style.position = 'absolute';
                activityDiv.style.width = `${layoutInfo.activityBarWidth}px`;
                activityDiv.style.height = `calc(100% - ${layoutInfo.titleBarHeight + layoutInfo.statusBarHeight}px)`;
                activityDiv.style.top = `${layoutInfo.titleBarHeight}px`;
                if (layoutInfo.sideBarSide === 'left') {
                    activityDiv.style.left = '0';
                }
                else {
                    activityDiv.style.right = '0';
                }
                activityDiv.style.backgroundColor = `${colorInfo.activityBarBackground}`;
                splash.appendChild(activityDiv);
                if (colorInfo.activityBarBorder) {
                    const activityBorderDiv = document.createElement('div');
                    activityBorderDiv.style.position = 'absolute';
                    activityBorderDiv.style.width = '1px';
                    activityBorderDiv.style.height = '100%';
                    activityBorderDiv.style.top = '0';
                    if (layoutInfo.sideBarSide === 'left') {
                        activityBorderDiv.style.right = '0';
                        activityBorderDiv.style.borderRight = `1px solid ${colorInfo.activityBarBorder}`;
                    }
                    else {
                        activityBorderDiv.style.left = '0';
                        activityBorderDiv.style.borderLeft = `1px solid ${colorInfo.activityBarBorder}`;
                    }
                    activityDiv.appendChild(activityBorderDiv);
                }
            }
            // part: side bar
            if (layoutInfo.sideBarWidth > 0) {
                const sideDiv = document.createElement('div');
                sideDiv.style.position = 'absolute';
                sideDiv.style.width = `${layoutInfo.sideBarWidth}px`;
                sideDiv.style.height = `calc(100% - ${layoutInfo.titleBarHeight + layoutInfo.statusBarHeight}px)`;
                sideDiv.style.top = `${layoutInfo.titleBarHeight}px`;
                if (layoutInfo.sideBarSide === 'left') {
                    sideDiv.style.left = `${layoutInfo.activityBarWidth}px`;
                }
                else {
                    sideDiv.style.right = `${layoutInfo.activityBarWidth}px`;
                }
                sideDiv.style.backgroundColor = `${colorInfo.sideBarBackground}`;
                splash.appendChild(sideDiv);
                if (colorInfo.sideBarBorder) {
                    const sideBorderDiv = document.createElement('div');
                    sideBorderDiv.style.position = 'absolute';
                    sideBorderDiv.style.width = '1px';
                    sideBorderDiv.style.height = '100%';
                    sideBorderDiv.style.top = '0';
                    sideBorderDiv.style.right = '0';
                    if (layoutInfo.sideBarSide === 'left') {
                        sideBorderDiv.style.borderRight = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    else {
                        sideBorderDiv.style.left = '0';
                        sideBorderDiv.style.borderLeft = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    sideDiv.appendChild(sideBorderDiv);
                }
            }
            // part: auxiliary sidebar
            if (layoutInfo.auxiliaryBarWidth > 0) {
                const auxSideDiv = document.createElement('div');
                auxSideDiv.style.position = 'absolute';
                auxSideDiv.style.width = `${layoutInfo.auxiliaryBarWidth}px`;
                auxSideDiv.style.height = `calc(100% - ${layoutInfo.titleBarHeight + layoutInfo.statusBarHeight}px)`;
                auxSideDiv.style.top = `${layoutInfo.titleBarHeight}px`;
                if (layoutInfo.sideBarSide === 'left') {
                    auxSideDiv.style.right = '0';
                }
                else {
                    auxSideDiv.style.left = '0';
                }
                auxSideDiv.style.backgroundColor = `${colorInfo.sideBarBackground}`;
                splash.appendChild(auxSideDiv);
                if (colorInfo.sideBarBorder) {
                    const auxSideBorderDiv = document.createElement('div');
                    auxSideBorderDiv.style.position = 'absolute';
                    auxSideBorderDiv.style.width = '1px';
                    auxSideBorderDiv.style.height = '100%';
                    auxSideBorderDiv.style.top = '0';
                    if (layoutInfo.sideBarSide === 'left') {
                        auxSideBorderDiv.style.left = '0';
                        auxSideBorderDiv.style.borderLeft = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    else {
                        auxSideBorderDiv.style.right = '0';
                        auxSideBorderDiv.style.borderRight = `1px solid ${colorInfo.sideBarBorder}`;
                    }
                    auxSideDiv.appendChild(auxSideBorderDiv);
                }
            }
            // part: statusbar
            if (layoutInfo.statusBarHeight > 0) {
                const statusDiv = document.createElement('div');
                statusDiv.style.position = 'absolute';
                statusDiv.style.width = '100%';
                statusDiv.style.height = `${layoutInfo.statusBarHeight}px`;
                statusDiv.style.bottom = '0';
                statusDiv.style.left = '0';
                if (configuration.workspace && colorInfo.statusBarBackground) {
                    statusDiv.style.backgroundColor = colorInfo.statusBarBackground;
                }
                else if (!configuration.workspace && colorInfo.statusBarNoFolderBackground) {
                    statusDiv.style.backgroundColor = colorInfo.statusBarNoFolderBackground;
                }
                splash.appendChild(statusDiv);
                if (colorInfo.statusBarBorder) {
                    const statusBorderDiv = document.createElement('div');
                    statusBorderDiv.style.position = 'absolute';
                    statusBorderDiv.style.width = '100%';
                    statusBorderDiv.style.height = '1px';
                    statusBorderDiv.style.top = '0';
                    statusBorderDiv.style.borderTop = `1px solid ${colorInfo.statusBarBorder}`;
                    statusDiv.appendChild(statusBorderDiv);
                }
            }
            window.document.body.appendChild(splash);
        }
        performance.mark('code/didShowPartsSplash');
    }
    //#endregion
    //#region Window Helpers
    async function load(esModule, options) {
        // Window Configuration from Preload Script
        const configuration = await resolveWindowConfiguration();
        // Signal before import()
        options?.beforeImport?.(configuration);
        // Developer settings
        const { enableDeveloperKeybindings, removeDeveloperKeybindingsAfterLoad, developerDeveloperKeybindingsDisposable, forceDisableShowDevtoolsOnError } = setupDeveloperKeybindings(configuration, options);
        // NLS
        setupNLS(configuration);
        // Compute base URL and set as global
        const baseUrl = new URL(`${fileUriFromPath(configuration.appRoot, { isWindows: safeProcess.platform === 'win32', scheme: 'vscode-file', fallbackAuthority: 'vscode-app' })}/out/`);
        globalThis._VSCODE_FILE_ROOT = baseUrl.toString();
        // Dev only: CSS import map tricks
        setupCSSImportMaps(configuration, baseUrl);
        // ESM Import
        try {
            const result = await import(new URL(`${esModule}.js`, baseUrl).href);
            if (developerDeveloperKeybindingsDisposable && removeDeveloperKeybindingsAfterLoad) {
                developerDeveloperKeybindingsDisposable();
            }
            return { result, configuration };
        }
        catch (error) {
            onUnexpectedError(error, enableDeveloperKeybindings && !forceDisableShowDevtoolsOnError);
            throw error;
        }
    }
    async function resolveWindowConfiguration() {
        const timeout = setTimeout(() => { console.error(`[resolve window config] Could not resolve window configuration within 10 seconds, but will continue to wait...`); }, 10000);
        performance.mark('code/willWaitForWindowConfig');
        const configuration = await preloadGlobals.context.resolveConfiguration();
        performance.mark('code/didWaitForWindowConfig');
        clearTimeout(timeout);
        return configuration;
    }
    function setupDeveloperKeybindings(configuration, options) {
        const { forceEnableDeveloperKeybindings, disallowReloadKeybinding, removeDeveloperKeybindingsAfterLoad, forceDisableShowDevtoolsOnError } = typeof options?.configureDeveloperSettings === 'function' ? options.configureDeveloperSettings(configuration) : {
            forceEnableDeveloperKeybindings: false,
            disallowReloadKeybinding: false,
            removeDeveloperKeybindingsAfterLoad: false,
            forceDisableShowDevtoolsOnError: false
        };
        const isDev = !!safeProcess.env['VSCODE_DEV'];
        const enableDeveloperKeybindings = Boolean(isDev || forceEnableDeveloperKeybindings);
        let developerDeveloperKeybindingsDisposable = undefined;
        if (enableDeveloperKeybindings) {
            developerDeveloperKeybindingsDisposable = registerDeveloperKeybindings(disallowReloadKeybinding);
        }
        return {
            enableDeveloperKeybindings,
            removeDeveloperKeybindingsAfterLoad,
            developerDeveloperKeybindingsDisposable,
            forceDisableShowDevtoolsOnError
        };
    }
    function registerDeveloperKeybindings(disallowReloadKeybinding) {
        const ipcRenderer = preloadGlobals.ipcRenderer;
        const extractKey = function (e) {
            return [
                e.ctrlKey ? 'ctrl-' : '',
                e.metaKey ? 'meta-' : '',
                e.altKey ? 'alt-' : '',
                e.shiftKey ? 'shift-' : '',
                e.keyCode
            ].join('');
        };
        // Devtools & reload support
        const TOGGLE_DEV_TOOLS_KB = (safeProcess.platform === 'darwin' ? 'meta-alt-73' : 'ctrl-shift-73'); // mac: Cmd-Alt-I, rest: Ctrl-Shift-I
        const TOGGLE_DEV_TOOLS_KB_ALT = '123'; // F12
        const RELOAD_KB = (safeProcess.platform === 'darwin' ? 'meta-82' : 'ctrl-82'); // mac: Cmd-R, rest: Ctrl-R
        let listener = function (e) {
            const key = extractKey(e);
            if (key === TOGGLE_DEV_TOOLS_KB || key === TOGGLE_DEV_TOOLS_KB_ALT) {
                ipcRenderer.send('vscode:toggleDevTools');
            }
            else if (key === RELOAD_KB && !disallowReloadKeybinding) {
                ipcRenderer.send('vscode:reloadWindow');
            }
        };
        window.addEventListener('keydown', listener);
        return function () {
            if (listener) {
                window.removeEventListener('keydown', listener);
                listener = undefined;
            }
        };
    }
    function setupNLS(configuration) {
        globalThis._VSCODE_NLS_MESSAGES = configuration.nls.messages;
        globalThis._VSCODE_NLS_LANGUAGE = configuration.nls.language;
        let language = configuration.nls.language || 'en';
        if (language === 'zh-tw') {
            language = 'zh-Hant';
        }
        else if (language === 'zh-cn') {
            language = 'zh-Hans';
        }
        window.document.documentElement.setAttribute('lang', language);
    }
    function onUnexpectedError(error, showDevtoolsOnError) {
        if (showDevtoolsOnError) {
            const ipcRenderer = preloadGlobals.ipcRenderer;
            ipcRenderer.send('vscode:openDevTools');
        }
        console.error(`[uncaught exception]: ${error}`);
        if (error && typeof error !== 'string' && error.stack) {
            console.error(error.stack);
        }
    }
    function fileUriFromPath(path, config) {
        // Since we are building a URI, we normalize any backslash
        // to slashes and we ensure that the path begins with a '/'.
        let pathName = path.replace(/\\/g, '/');
        if (pathName.length > 0 && pathName.charAt(0) !== '/') {
            pathName = `/${pathName}`;
        }
        let uri;
        // Windows: in order to support UNC paths (which start with '//')
        // that have their own authority, we do not use the provided authority
        // but rather preserve it.
        if (config.isWindows && pathName.startsWith('//')) {
            uri = encodeURI(`${config.scheme || 'file'}:${pathName}`);
        }
        // Otherwise we optionally add the provided authority if specified
        else {
            uri = encodeURI(`${config.scheme || 'file'}://${config.fallbackAuthority || ''}${pathName}`);
        }
        return uri.replace(/#/g, '%23');
    }
    function setupCSSImportMaps(configuration, baseUrl) {
        // DEV ---------------------------------------------------------------------------------------
        // DEV: This is for development and enables loading CSS via import-statements via import-maps.
        // DEV: For each CSS modules that we have we defined an entry in the import map that maps to
        // DEV: a blob URL that loads the CSS via a dynamic @import-rule.
        // DEV ---------------------------------------------------------------------------------------
        if (Array.isArray(configuration.cssModules) && configuration.cssModules.length > 0) {
            performance.mark('code/willAddCssLoader');
            globalThis._VSCODE_CSS_LOAD = function (url) {
                const link = document.createElement('link');
                link.setAttribute('rel', 'stylesheet');
                link.setAttribute('type', 'text/css');
                link.setAttribute('href', url);
                window.document.head.appendChild(link);
            };
            const importMap = { imports: {} };
            for (const cssModule of configuration.cssModules) {
                const cssUrl = new URL(cssModule, baseUrl).href;
                const jsSrc = `globalThis._VSCODE_CSS_LOAD('${cssUrl}');\n`;
                const blob = new Blob([jsSrc], { type: 'application/javascript' });
                importMap.imports[cssUrl] = URL.createObjectURL(blob);
            }
            const ttp = window.trustedTypes?.createPolicy('vscode-bootstrapImportMap', { createScript(value) { return value; }, });
            const importMapSrc = JSON.stringify(importMap, undefined, 2);
            const importMapScript = document.createElement('script');
            importMapScript.type = 'importmap';
            importMapScript.setAttribute('nonce', '0c6a828f1297');
            // @ts-ignore
            importMapScript.textContent = ttp?.createScript(importMapSrc) ?? importMapSrc;
            window.document.head.appendChild(importMapScript);
            performance.mark('code/didAddCssLoader');
        }
    }
    //#endregion
    const { result, configuration } = await load('vs/workbench/workbench.desktop.main', {
        configureDeveloperSettings: function (windowConfig) {
            return {
                // disable automated devtools opening on error when running extension tests
                // as this can lead to nondeterministic test execution (devtools steals focus)
                forceDisableShowDevtoolsOnError: typeof windowConfig.extensionTestsPath === 'string' || windowConfig['enable-smoke-test-driver'] === true,
                // enable devtools keybindings in extension development window
                forceEnableDeveloperKeybindings: Array.isArray(windowConfig.extensionDevelopmentPath) && windowConfig.extensionDevelopmentPath.length > 0,
                removeDeveloperKeybindingsAfterLoad: true
            };
        },
        beforeImport: function (windowConfig) {
            // Show our splash as early as possible
            showSplash(windowConfig);
            // Code windows have a `vscodeWindowId` property to identify them
            Object.defineProperty(window, 'vscodeWindowId', {
                get: () => windowConfig.windowId
            });
            // It looks like browsers only lazily enable
            // the <canvas> element when needed. Since we
            // leverage canvas elements in our code in many
            // locations, we try to help the browser to
            // initialize canvas when it is idle, right
            // before we wait for the scripts to be loaded.
            window.requestIdleCallback(() => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                context?.clearRect(0, 0, canvas.width, canvas.height);
                canvas.remove();
            }, { timeout: 50 });
            // Track import() perf
            performance.mark('code/willLoadWorkbenchMain');
        }
    });
    // Mark start of workbench
    performance.mark('code/didLoadWorkbenchMain');
    // Load workbench
    result.main(configuration);
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLWJyb3dzZXIvd29ya2JlbmNoL3dvcmtiZW5jaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztnR0FHZ0c7QUFFaEcsMENBQTBDO0FBRTFDLENBQUMsS0FBSztJQUVMLHNDQUFzQztJQUN0QyxXQUFXLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFTMUMsTUFBTSxjQUFjLEdBQStCLE1BQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyx3QkFBd0I7SUFDbEcsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQztJQUUzQywrQkFBK0I7SUFFL0IsU0FBUyxVQUFVLENBQUMsYUFBeUM7UUFDNUQsV0FBVyxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBRTdDLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyxXQUFXLENBQUM7UUFDckMsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNWLElBQUksYUFBYSxDQUFDLHNCQUFzQixJQUFJLGFBQWEsQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3BGLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxLQUFLLFVBQVUsQ0FBQyxFQUFFLENBQUM7b0JBQzdJLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQyxtRkFBbUY7Z0JBQ3RHLENBQUM7WUFDRixDQUFDO2lCQUFNLElBQUksYUFBYSxDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQ2hELElBQUksQ0FBQyxhQUFhLENBQUMsV0FB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