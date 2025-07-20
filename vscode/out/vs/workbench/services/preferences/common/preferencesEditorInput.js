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
var SettingsEditor2Input_1;
import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IPreferencesService } from './preferences.js';
const SettingsEditorIcon = registerIcon('settings-editor-label-icon', Codicon.settings, nls.localize('settingsEditorLabelIcon', 'Icon of the settings editor label.'));
let SettingsEditor2Input = class SettingsEditor2Input extends EditorInput {
    static { SettingsEditor2Input_1 = this; }
    static { this.ID = 'workbench.input.settings2'; }
    constructor(_preferencesService) {
        super();
        this.resource = URI.from({
            scheme: Schemas.vscodeSettings,
            path: `settingseditor`
        });
        this._settingsModel = _preferencesService.createSettings2EditorModel();
    }
    matches(otherInput) {
        return super.matches(otherInput) || otherInput instanceof SettingsEditor2Input_1;
    }
    get typeId() {
        return SettingsEditor2Input_1.ID;
    }
    getName() {
        return nls.localize('settingsEditor2InputName', "Settings");
    }
    getIcon() {
        return SettingsEditorIcon;
    }
    async resolve() {
        return this._settingsModel;
    }
    dispose() {
        this._settingsModel.dispose();
        super.dispose();
    }
};
SettingsEditor2Input = SettingsEditor2Input_1 = __decorate([
    __param(0, IPreferencesService)
], SettingsEditor2Input);
export { SettingsEditor2Input };
const PreferencesEditorIcon = registerIcon('preferences-editor-label-icon', Codicon.settings, nls.localize('preferencesEditorLabelIcon', 'Icon of the preferences editor label.'));
export class PreferencesEditorInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = URI.from({
            scheme: Schemas.vscodeSettings,
            path: `preferenceseditor`
        });
    }
    static { this.ID = 'workbench.input.preferences'; }
    matches(otherInput) {
        return super.matches(otherInput) || otherInput instanceof PreferencesEditorInput;
    }
    get typeId() {
        return PreferencesEditorInput.ID;
    }
    getName() {
        return nls.localize('preferencesEditorInputName', "Preferences");
    }
    getIcon() {
        return PreferencesEditorIcon;
    }
    async resolve() {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL2NvbW1vbi9wcmVmZXJlbmNlc0VkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVqRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDcEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFHdkQsTUFBTSxrQkFBa0IsR0FBRyxZQUFZLENBQUMsNEJBQTRCLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLG9DQUFvQyxDQUFDLENBQUMsQ0FBQztBQUVoSyxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFdBQVc7O2FBRXBDLE9BQUUsR0FBVywyQkFBMkIsQUFBdEMsQ0FBdUM7SUFRekQsWUFDc0IsbUJBQXdDO1FBRTdELEtBQUssRUFBRSxDQUFDO1FBUkEsYUFBUSxHQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDakMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxjQUFjO1lBQzlCLElBQUksRUFBRSxnQkFBZ0I7U0FDdEIsQ0FBQyxDQUFDO1FBT0YsSUFBSSxDQUFDLGNBQWMsR0FBRyxtQkFBbUIsQ0FBQywwQkFBMEIsRUFBRSxDQUFDO0lBQ3hFLENBQUM7SUFFUSxPQUFPLENBQUMsVUFBNkM7UUFDN0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLFVBQVUsWUFBWSxzQkFBb0IsQ0FBQztJQUNoRixDQUFDO0lBRUQsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sc0JBQW9CLENBQUMsRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxrQkFBa0IsQ0FBQztJQUMzQixDQUFDO0lBRVEsS0FBSyxDQUFDLE9BQU87UUFDckIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDO0lBQzVCLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUU5QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDakIsQ0FBQzs7QUExQ1csb0JBQW9CO0lBVzlCLFdBQUEsbUJBQW1CLENBQUE7R0FYVCxvQkFBb0IsQ0EyQ2hDOztBQUVELE1BQU0scUJBQXFCLEdBQUcsWUFBWSxDQUFDLCtCQUErQixFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDLENBQUM7QUFFbkwsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFdBQVc7SUFBdkQ7O1FBSVUsYUFBUSxHQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDakMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxjQUFjO1lBQzlCLElBQUksRUFBRSxtQkFBbUI7U0FDekIsQ0FBQyxDQUFDO0lBcUJKLENBQUM7YUExQmdCLE9BQUUsR0FBVyw2QkFBNkIsQUFBeEMsQ0FBeUM7SUFPbEQsT0FBTyxDQUFDLFVBQTZDO1FBQzdELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxVQUFVLFlBQVksc0JBQXNCLENBQUM7SUFDbEYsQ0FBQztJQUVELElBQWEsTUFBTTtRQUNsQixPQUFPLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8scUJBQXFCLENBQUM7SUFDOUIsQ0FBQztJQUVRLEtBQUssQ0FBQyxPQUFPO1FBQ3JCLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQyJ9