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
import { derived, observableFromEvent } from '../../../../base/common/observable.js';
import { findMetadata } from '../../themes/common/colorThemeData.js';
import { IWorkbenchThemeService } from '../../themes/common/workbenchThemeService.js';
let TreeSitterThemeService = class TreeSitterThemeService {
    constructor(_themeService) {
        this._themeService = _themeService;
        this._colorTheme = observableFromEvent(this._themeService.onDidColorThemeChange, () => this._themeService.getColorTheme());
        this.onChange = derived(this, (reader) => {
            this._colorTheme.read(reader);
            reader.reportChange(void 0);
        });
    }
    findMetadata(captureNames, languageId, bracket, reader) {
        return findMetadata(this._colorTheme.read(reader), captureNames, languageId, bracket);
    }
};
TreeSitterThemeService = __decorate([
    __param(0, IWorkbenchThemeService)
], TreeSitterThemeService);
export { TreeSitterThemeService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRoZW1lU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RyZWVTaXR0ZXIvYnJvd3Nlci90cmVlU2l0dGVyVGhlbWVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQXdCLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFM0csT0FBTyxFQUFrQixZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUUvRSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUFzQjtJQUtsQyxZQUMwQyxhQUFxQztRQUFyQyxrQkFBYSxHQUFiLGFBQWEsQ0FBd0I7UUFFOUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFvQixDQUFDLENBQUM7UUFDN0ksSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDeEMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUIsTUFBTSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzdCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELFlBQVksQ0FBQyxZQUFzQixFQUFFLFVBQWtCLEVBQUUsT0FBZ0IsRUFBRSxNQUEyQjtRQUNyRyxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZGLENBQUM7Q0FDRCxDQUFBO0FBbEJZLHNCQUFzQjtJQU1oQyxXQUFBLHNCQUFzQixDQUFBO0dBTlosc0JBQXNCLENBa0JsQyJ9