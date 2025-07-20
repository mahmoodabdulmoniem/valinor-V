/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { MenuPreventer } from './menuPreventer.js';
import { SelectionClipboardContributionID } from './selectionClipboard.js';
import { TabCompletionController } from '../../snippets/browser/tabCompletion.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { selectionBackground, inputBackground, inputForeground, editorSelectionBackground } from '../../../../platform/theme/common/colorRegistry.js';
export function getSimpleEditorOptions(configurationService) {
    return {
        wordWrap: 'on',
        overviewRulerLanes: 0,
        glyphMargin: false,
        lineNumbers: 'off',
        folding: false,
        selectOnLineNumbers: false,
        hideCursorInOverviewRuler: true,
        selectionHighlight: false,
        scrollbar: {
            horizontal: 'hidden',
            alwaysConsumeMouseWheel: false
        },
        lineDecorationsWidth: 0,
        overviewRulerBorder: false,
        scrollBeyondLastLine: false,
        renderLineHighlight: 'none',
        fixedOverflowWidgets: true,
        acceptSuggestionOnEnter: 'smart',
        dragAndDrop: false,
        revealHorizontalRightPadding: 5,
        minimap: {
            enabled: false
        },
        guides: {
            indentation: false
        },
        accessibilitySupport: configurationService.getValue('editor.accessibilitySupport'),
        cursorBlinking: configurationService.getValue('editor.cursorBlinking'),
        editContext: configurationService.getValue('editor.editContext'),
        defaultColorDecorators: 'never',
        allowVariableLineHeights: false,
        allowVariableFonts: false,
        allowVariableFontsInAccessibilityMode: false,
    };
}
export function getSimpleCodeEditorWidgetOptions() {
    return {
        isSimpleWidget: true,
        contributions: EditorExtensionsRegistry.getSomeEditorContributions([
            MenuPreventer.ID,
            SelectionClipboardContributionID,
            ContextMenuController.ID,
            SuggestController.ID,
            SnippetController2.ID,
            TabCompletionController.ID,
        ])
    };
}
/**
 * Should be called to set the styling on editors that are appearing as just input boxes
 * @param editorContainerSelector An element selector that will match the container of the editor
 */
export function setupSimpleEditorSelectionStyling(editorContainerSelector) {
    // Override styles in selections.ts
    return registerThemingParticipant((theme, collector) => {
        const selectionBackgroundColor = theme.getColor(selectionBackground);
        if (selectionBackgroundColor) {
            // Override inactive selection bg
            const inputBackgroundColor = theme.getColor(inputBackground);
            if (inputBackgroundColor) {
                collector.addRule(`${editorContainerSelector} .monaco-editor-background { background-color: ${inputBackgroundColor}; } `);
                collector.addRule(`${editorContainerSelector} .monaco-editor .selected-text { background-color: ${inputBackgroundColor.transparent(0.4)}; }`);
            }
            // Override selected fg
            const inputForegroundColor = theme.getColor(inputForeground);
            if (inputForegroundColor) {
                collector.addRule(`${editorContainerSelector} .monaco-editor .view-line span.inline-selected-text { color: ${inputForegroundColor}; }`);
            }
            collector.addRule(`${editorContainerSelector} .monaco-editor .focused .selected-text { background-color: ${selectionBackgroundColor}; }`);
        }
        else {
            // Use editor selection color if theme has not set a selection background color
            collector.addRule(`${editorContainerSelector} .monaco-editor .focused .selected-text { background-color: ${theme.getColor(editorSelectionBackground)}; }`);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL3NpbXBsZUVkaXRvck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDdEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzNFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRTFGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRS9GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLHlCQUF5QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdEosTUFBTSxVQUFVLHNCQUFzQixDQUFDLG9CQUEyQztJQUNqRixPQUFPO1FBQ04sUUFBUSxFQUFFLElBQUk7UUFDZCxrQkFBa0IsRUFBRSxDQUFDO1FBQ3JCLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLFdBQVcsRUFBRSxLQUFLO1FBQ2xCLE9BQU8sRUFBRSxLQUFLO1FBQ2QsbUJBQW1CLEVBQUUsS0FBSztRQUMxQix5QkFBeUIsRUFBRSxJQUFJO1FBQy9CLGtCQUFrQixFQUFFLEtBQUs7UUFDekIsU0FB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