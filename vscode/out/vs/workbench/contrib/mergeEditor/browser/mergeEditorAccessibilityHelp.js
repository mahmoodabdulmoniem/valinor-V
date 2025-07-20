/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyEqualsExpr } from '../../../../platform/contextkey/common/contextkey.js';
export class MergeEditorAccessibilityHelpProvider {
    constructor() {
        this.name = 'mergeEditor';
        this.type = "help" /* AccessibleViewType.Help */;
        this.priority = 125;
        this.when = ContextKeyEqualsExpr.create('isMergeEditor', true);
    }
    getProvider(accessor) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
        if (!codeEditor) {
            return;
        }
        const content = [
            localize('msg1', "You are in a merge editor."),
            localize('msg2', "Navigate between merge conflicts using the commands Go to Next Unhandled Conflict{0} and Go to Previous Unhandled Conflict{1}.", '<keybinding:merge.goToNextUnhandledConflict>', '<keybinding:merge.goToPreviousUnhandledConflict>'),
            localize('msg3', "Run the command Merge Editor: Accept All Incoming Changes from the Left{0} and Merge Editor: Accept All Current Changes from the Right{1}", '<keybinding:merge.acceptAllInput1>', '<keybinding:merge.acceptAllInput2>'),
            localize('msg4', "Complete the Merge{0}.", '<keybinding:mergeEditor.acceptMerge>'),
            localize('msg5', "Toggle between merge editor inputs, incoming and current changes {0}.", '<keybinding:mergeEditor.toggleBetweenInputs>'),
        ];
        return new AccessibleContentProvider("mergeEditor" /* AccessibleViewProviderId.MergeEditor */, { type: "help" /* AccessibleViewType.Help */ }, () => content.join('\n'), () => codeEditor.focus(), "accessibility.verbosity.mergeEditor" /* AccessibilityVerbositySettingId.MergeEditor */);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tZXJnZUVkaXRvckFjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUseUJBQXlCLEVBQWdELE1BQU0sOERBQThELENBQUM7QUFFdkosT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFLNUYsTUFBTSxPQUFPLG9DQUFvQztJQUFqRDtRQUNVLFNBQUksR0FBRyxhQUFhLENBQUM7UUFDckIsU0FBSSx3Q0FBMkI7UUFDL0IsYUFBUSxHQUFHLEdBQUcsQ0FBQztRQUNmLFNBQUksR0FBRyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBeUJwRSxDQUFDO0lBeEJBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUUzRCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDdkcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUc7WUFDZixRQUFRLENBQUMsTUFBTSxFQUFFLDRCQUE0QixDQUFDO1lBQzlDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsZ0lBQWdJLEVBQUUsOENBQThDLEVBQUUsa0RBQWtELENBQUM7WUFDdFAsUUFBUSxDQUFDLE1BQU0sRUFBRSwySUFBMkksRUFBRSxvQ0FBb0MsRUFBRSxvQ0FBb0MsQ0FBQztZQUN6TyxRQUFRLENBQUMsTUFBTSxFQUFFLHdCQUF3QixFQUFFLHNDQUFzQyxDQUFDO1lBQ2xGLFFBQVEsQ0FBQyxNQUFNLEVBQUUsdUVBQXVFLEVBQUUsOENBQThDLENBQUM7U0FDekksQ0FBQztRQUVGLE9BQU8sSUFBSSx5QkFBeUIsMkRBRW5DLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxFQUNqQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUN4QixHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLDBGQUV4QixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=