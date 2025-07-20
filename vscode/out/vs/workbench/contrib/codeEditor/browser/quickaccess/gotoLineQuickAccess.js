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
import { localize, localize2 } from '../../../../../nls.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { AbstractGotoLineQuickAccessProvider } from '../../../../../editor/contrib/quickAccess/browser/gotoLineQuickAccess.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions as QuickaccesExtensions } from '../../../../../platform/quickinput/common/quickAccess.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
let GotoLineQuickAccessProvider = class GotoLineQuickAccessProvider extends AbstractGotoLineQuickAccessProvider {
    constructor(editorService, editorGroupService, configurationService) {
        super();
        this.editorService = editorService;
        this.editorGroupService = editorGroupService;
        this.configurationService = configurationService;
        this.onDidActiveTextEditorControlChange = this.editorService.onDidActiveEditorChange;
    }
    get configuration() {
        const editorConfig = this.configurationService.getValue().workbench?.editor;
        return {
            openEditorPinned: !editorConfig?.enablePreviewFromQuickOpen || !editorConfig?.enablePreview
        };
    }
    get activeTextEditorControl() {
        return this.editorService.activeTextEditorControl;
    }
    gotoLocation(context, options) {
        // Check for sideBySide use
        if ((options.keyMods.alt || (this.configuration.openEditorPinned && options.keyMods.ctrlCmd) || options.forceSideBySide) && this.editorService.activeEditor) {
            context.restoreViewState?.(); // since we open to the side, restore view state in this editor
            const editorOptions = {
                selection: options.range,
                pinned: options.keyMods.ctrlCmd || this.configuration.openEditorPinned,
                preserveFocus: options.preserveFocus
            };
            this.editorGroupService.sideGroup.openEditor(this.editorService.activeEditor, editorOptions);
        }
        // Otherwise let parent handle it
        else {
            super.gotoLocation(context, options);
        }
    }
};
GotoLineQuickAccessProvider = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, IConfigurationService)
], GotoLineQuickAccessProvider);
export { GotoLineQuickAccessProvider };
class GotoLineAction extends Action2 {
    static { this.ID = 'workbench.action.gotoLine'; }
    constructor() {
        super({
            id: GotoLineAction.ID,
            title: localize2('gotoLine', 'Go to Line/Column...'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: null,
                primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 37 /* KeyCode.KeyG */ }
            }
        });
    }
    async run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(GotoLineQuickAccessProvider.PREFIX);
    }
}
registerAction2(GotoLineAction);
Registry.as(QuickaccesExtensions.Quickaccess).registerQuickAccessProvider({
    ctor: GotoLineQuickAccessProvider,
    prefix: AbstractGotoLineQuickAccessProvider.PREFIX,
    placeholder: localize('gotoLineQuickAccessPlaceholder', "Type the line number and optional column to go to (e.g. 42:5 for line 42 and column 5)."),
    helpEntries: [{ description: localize('gotoLineQuickAccess', "Go to Line/Column"), commandId: GotoLineAction.ID }]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b0xpbmVRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL3F1aWNrYWNjZXNzL2dvdG9MaW5lUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1RCxPQUFPLEVBQVksa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFckYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDL0gsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9FLE9BQU8sRUFBd0IsVUFBVSxJQUFJLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDcEksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQU03RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUUxRixJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLG1DQUFtQztJQUluRixZQUNrQyxhQUE2QixFQUN2QixrQkFBd0MsRUFDdkMsb0JBQTJDO1FBRW5GLEtBQUssRUFBRSxDQUFDO1FBSnlCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUN2Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXNCO1FBQ3ZDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFHbkYsSUFBSSxDQUFDLGtDQUFrQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUM7SUFDdEYsQ0FBQztJQUVELElBQVksYUFBYTtRQUN4QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFpQyxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUM7UUFFM0csT0FBTztZQUNOLGdCQUFnQixFQUFFLENBQUMsWUFBWSxFQUFFLDBCQUEwQixJQUFJLENBQUMsWUFBWSxFQUFFLGFBQWE7U0FDM0YsQ0FBQztJQUNILENBQUM7SUFFRCxJQUFjLHVCQUF1QjtRQUNwQyxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUM7SUFDbkQsQ0FBQztJQUVrQixZQUFZLENBQUMsT0FBc0MsRUFBRSxPQUFpRztRQUV4SywyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzdKLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQywrREFBK0Q7WUFFN0YsTUFBTSxhQUFhLEdBQXVCO2dCQUN6QyxTQUFTLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ3hCLE1BQU0sRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQjtnQkFDdEUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxhQUFhO2FBQ3BDLENBQUM7WUFFRixJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUM5RixDQUFDO1FBRUQsaUNBQWlDO2FBQzVCLENBQUM7WUFDTCxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0QyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUE3Q1ksMkJBQTJCO0lBS3JDLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLHFCQUFxQixDQUFBO0dBUFgsMkJBQTJCLENBNkN2Qzs7QUFFRCxNQUFNLGNBQWUsU0FBUSxPQUFPO2FBRW5CLE9BQUUsR0FBRywyQkFBMkIsQ0FBQztJQUVqRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxjQUFjLENBQUMsRUFBRTtZQUNyQixLQUFLLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxzQkFBc0IsQ0FBQztZQUNwRCxFQUFFLEVBQUUsSUFBSTtZQUNSLFVBQVUsRUFBRTtnQkFDWCxNQUFNLDZDQUFtQztnQkFDekMsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsT0FBTyxFQUFFLGlEQUE2QjtnQkFDdEMsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLGdEQUE2QixFQUFFO2FBQy9DO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdkYsQ0FBQzs7QUFHRixlQUFlLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFaEMsUUFBUSxDQUFDLEVBQUUsQ0FBdUIsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUMsMkJBQTJCLENBQUM7SUFDL0YsSUFBSSxFQUFFLDJCQUEyQjtJQUNqQyxNQUFNLEVBQUUsbUNBQW1DLENBQUMsTUFBTTtJQUNsRCxXQUFXLEVBQUUsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLHlGQUF5RixDQUFDO0lBQ2xKLFdBQVcsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLFNBQVMsRUFBRSxjQUFjLENBQUMsRUFBRSxFQUFFLENBQUM7Q0FDbEgsQ0FBQyxDQUFDIn0=