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
var PartsSplash_1;
import { onDidChangeFullscreen, isFullscreen } from '../../../../base/browser/browser.js';
import * as dom from '../../../../base/browser/dom.js';
import { Color } from '../../../../base/common/color.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { editorBackground, foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { getThemeTypeSelector, IThemeService } from '../../../../platform/theme/common/themeService.js';
import { DEFAULT_EDITOR_MIN_DIMENSIONS } from '../../../browser/parts/editor/editor.js';
import * as themes from '../../../common/theme.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import * as perf from '../../../../base/common/performance.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { ISplashStorageService } from './splash.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
let PartsSplash = class PartsSplash {
    static { PartsSplash_1 = this; }
    static { this.ID = 'workbench.contrib.partsSplash'; }
    static { this._splashElementId = 'monaco-parts-splash'; }
    constructor(_themeService, _layoutService, _environmentService, _configService, _partSplashService, editorGroupsService, lifecycleService) {
        this._themeService = _themeService;
        this._layoutService = _layoutService;
        this._environmentService = _environmentService;
        this._configService = _configService;
        this._partSplashService = _partSplashService;
        this._disposables = new DisposableStore();
        Event.once(_layoutService.onDidLayoutMainContainer)(() => {
            this._removePartsSplash();
            perf.mark('code/didRemovePartsSplash');
        }, undefined, this._disposables);
        const lastIdleSchedule = this._disposables.add(new MutableDisposable());
        const savePartsSplashSoon = () => {
            lastIdleSchedule.value = dom.runWhenWindowIdle(mainWindow, () => this._savePartsSplash(), 2500);
        };
        lifecycleService.when(3 /* LifecyclePhase.Restored */).then(() => {
            Event.any(Event.filter(onDidChangeFullscreen, windowId => windowId === mainWindow.vscodeWindowId), editorGroupsService.mainPart.onDidLayout, _themeService.onDidColorThemeChange)(savePartsSplashSoon, undefined, this._disposables);
            savePartsSplashSoon();
        });
        _configService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */)) {
                this._didChangeTitleBarStyle = true;
                this._savePartsSplash();
            }
        }, this, this._disposables);
    }
    dispose() {
        this._disposables.dispose();
    }
    _savePartsSplash() {
        const theme = this._themeService.getColorTheme();
        this._partSplashService.saveWindowSplash({
            zoomLevel: this._configService.getValue('window.zoomLevel'),
            baseTheme: getThemeTypeSelector(theme.type),
            colorInfo: {
                foreground: theme.getColor(foreground)?.toString(),
                background: Color.Format.CSS.formatHex(theme.getColor(editorBackground) || themes.WORKBENCH_BACKGROUND(theme)),
                editorBackground: theme.getColor(editorBackground)?.toString(),
                titleBarBackground: theme.getColor(themes.TITLE_BAR_ACTIVE_BACKGROUND)?.toString(),
                titleBarBorder: theme.getColor(themes.TITLE_BAR_BORDER)?.toString(),
                activityBarBackground: theme.getColor(themes.ACTIVITY_BAR_BACKGROUND)?.toString(),
                activityBarBorder: theme.getColor(themes.ACTIVITY_BAR_BORDER)?.toString(),
                sideBarBackground: theme.getColor(themes.SIDE_BAR_BACKGROUND)?.toString(),
                sideBarBorder: theme.getColor(themes.SIDE_BAR_BORDER)?.toString(),
                statusBarBackground: theme.getColor(themes.STATUS_BAR_BACKGROUND)?.toString(),
                statusBarBorder: theme.getColor(themes.STATUS_BAR_BORDER)?.toString(),
                statusBarNoFolderBackground: theme.getColor(themes.STATUS_BAR_NO_FOLDER_BACKGROUND)?.toString(),
                windowBorder: theme.getColor(themes.WINDOW_ACTIVE_BORDER)?.toString() ?? theme.getColor(themes.WINDOW_INACTIVE_BORDER)?.toString()
            },
            layoutInfo: !this._shouldSaveLayoutInfo() ? undefined : {
                sideBarSide: this._layoutService.getSideBarPosition() === 1 /* Position.RIGHT */ ? 'right' : 'left',
                editorPartMinWidth: DEFAULT_EDITOR_MIN_DIMENSIONS.width,
                titleBarHeight: this._layoutService.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow) ? dom.getTotalHeight(assertReturnsDefined(this._layoutService.getContainer(mainWindow, "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */))) : 0,
                activityBarWidth: this._layoutService.isVisible("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */) ? dom.getTotalWidth(assertReturnsDefined(this._layoutService.getContainer(mainWindow, "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */))) : 0,
                sideBarWidth: this._layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */) ? dom.getTotalWidth(assertReturnsDefined(this._layoutService.getContainer(mainWindow, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */))) : 0,
                auxiliaryBarWidth: this._layoutService.isAuxiliaryBarMaximized() ? Number.MAX_SAFE_INTEGER /* marker for maximized state */ : this._layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) ? dom.getTotalWidth(assertReturnsDefined(this._layoutService.getContainer(mainWindow, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */))) : 0,
                statusBarHeight: this._layoutService.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, mainWindow) ? dom.getTotalHeight(assertReturnsDefined(this._layoutService.getContainer(mainWindow, "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */))) : 0,
                windowBorder: this._layoutService.hasMainWindowBorder(),
                windowBorderRadius: this._layoutService.getMainWindowBorderRadius()
            }
        });
    }
    _shouldSaveLayoutInfo() {
        return !isFullscreen(mainWindow) && !this._environmentService.isExtensionDevelopment && !this._didChangeTitleBarStyle;
    }
    _removePartsSplash() {
        const element = mainWindow.document.getElementById(PartsSplash_1._splashElementId);
        if (element) {
            element.style.display = 'none';
        }
        // remove initial colors
        const defaultStyles = mainWindow.document.head.getElementsByClassName('initialShellColors');
        defaultStyles[0]?.remove();
    }
};
PartsSplash = PartsSplash_1 = __decorate([
    __param(0, IThemeService),
    __param(1, IWorkbenchLayoutService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IConfigurationService),
    __param(4, ISplashStorageService),
    __param(5, IEditorGroupsService),
    __param(6, ILifecycleService)
], PartsSplash);
export { PartsSplash };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydHNTcGxhc2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NwbGFzaC9icm93c2VyL3BhcnRzU3BsYXNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUYsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hGLE9BQU8sS0FBSyxNQUFNLE1BQU0sMEJBQTBCLENBQUM7QUFDbkQsT0FBTyxFQUFFLHVCQUF1QixFQUFtQixNQUFNLG1EQUFtRCxDQUFDO0FBQzdHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sS0FBSyxJQUFJLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLG9CQUFvQixFQUFF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