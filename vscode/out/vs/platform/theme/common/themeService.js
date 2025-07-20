/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../base/common/codicons.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import * as platform from '../../registry/common/platform.js';
import { ColorScheme, ThemeTypeSelector } from './theme.js';
export const IThemeService = createDecorator('themeService');
export function themeColorFromId(id) {
    return { id };
}
export const FileThemeIcon = Codicon.file;
export const FolderThemeIcon = Codicon.folder;
export function getThemeTypeSelector(type) {
    switch (type) {
        case ColorScheme.DARK: return ThemeTypeSelector.VS_DARK;
        case ColorScheme.HIGH_CONTRAST_DARK: return ThemeTypeSelector.HC_BLACK;
        case ColorScheme.HIGH_CONTRAST_LIGHT: return ThemeTypeSelector.HC_LIGHT;
        default: return ThemeTypeSelector.VS;
    }
}
// static theming participant
export const Extensions = {
    ThemingContribution: 'base.contributions.theming'
};
class ThemingRegistry extends Disposable {
    constructor() {
        super();
        this.themingParticipants = [];
        this.themingParticipants = [];
        this.onThemingParticipantAddedEmitter = this._register(new Emitter());
    }
    onColorThemeChange(participant) {
        this.themingParticipants.push(participant);
        this.onThemingParticipantAddedEmitter.fire(participant);
        return toDisposable(() => {
            const idx = this.themingParticipants.indexOf(participant);
            this.themingParticipants.splice(idx, 1);
        });
    }
    get onThemingParticipantAdded() {
        return this.onThemingParticipantAddedEmitter.event;
    }
    getThemingParticipants() {
        return this.themingParticipants;
    }
}
const themingRegistry = new ThemingRegistry();
platform.Registry.add(Extensions.ThemingContribution, themingRegistry);
export function registerThemingParticipant(participant) {
    return themingRegistry.onColorThemeChange(participant);
}
/**
 * Utility base class for all themable components.
 */
export class Themable extends Disposable {
    constructor(themeService) {
        super();
        this.themeService = themeService;
        this.theme = themeService.getColorTheme();
        // Hook up to theme changes
        this._register(this.themeService.onDidColorThemeChange(theme => this.onThemeChange(theme)));
    }
    onThemeChange(theme) {
        this.theme = theme;
        this.updateStyles();
    }
    updateStyles() {
        // Subclasses to override
    }
    getColor(id, modify) {
        let color = this.theme.getColor(id);
        if (color && modify) {
            color = modify(color, this.theme);
        }
        return color ? color.toString() : null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90aGVtZS9jb21tb24vdGhlbWVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDOUUsT0FBTyxLQUFLLFFBQVEsTUFBTSxtQ0FBbUMsQ0FBQztBQUc5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRTVELE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxlQUFlLENBQWdCLGNBQWMsQ0FBQyxDQUFDO0FBRTVFLE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxFQUFtQjtJQUNuRCxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUM7QUFDZixDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDMUMsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFFOUMsTUFBTSxVQUFVLG9CQUFvQixDQUFDLElBQWlCO0lBQ3JELFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZCxLQUFLLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLGlCQUFpQixDQUFDLE9BQU8sQ0FBQztRQUN4RCxLQUFLLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE9BQU8saUJBQWlCLENBQUMsUUFBUSxDQUFDO1FBQ3ZFLEtBQUssV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUMsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7UUFDeEUsT0FBTyxDQUFDLENBQUMsT0FBTyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7SUFDdEMsQ0FBQztBQUNGLENBQUM7QUF1RkQsNkJBQTZCO0FBQzdCLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRztJQUN6QixtQkFBbUIsRUFBRSw0QkFBNEI7Q0FDakQsQ0FBQztBQWNGLE1BQU0sZUFBZ0IsU0FBUSxVQUFVO0lBSXZDO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFKRCx3QkFBbUIsR0FBMEIsRUFBRSxDQUFDO1FBS3ZELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLGdDQUFnQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXVCLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBRU0sa0JBQWtCLENBQUMsV0FBZ0M7UUFDekQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzFELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELElBQVcseUJBQXlCO1FBQ25DLE9BQU8sSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQztJQUNwRCxDQUFDO0lBRU0sc0JBQXNCO1FBQzVCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDO0lBQ2pDLENBQUM7Q0FDRDtBQUVELE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7QUFDOUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQixFQUFFLGVBQWUsQ0FBQyxDQUFDO0FBRXZFLE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxXQUFnQztJQUMxRSxPQUFPLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sUUFBUyxTQUFRLFVBQVU7SUFHdkMsWUFDVyxZQUEyQjtRQUVyQyxLQUFLLEVBQUUsQ0FBQztRQUZFLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBSXJDLElBQUksQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBRTFDLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3RixDQUFDO0lBRVMsYUFBYSxDQUFDLEtBQWtCO1FBQ3pDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBRW5CLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNyQixDQUFDO0lBRUQsWUFBWTtRQUNYLHlCQUF5QjtJQUMxQixDQUFDO0lBRVMsUUFBUSxDQUFDLEVBQVUsRUFBRSxNQUFvRDtRQUNsRixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVwQyxJQUFJLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNyQixLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUN4QyxDQUFDO0NBQ0QifQ==