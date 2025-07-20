/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { AcceptAllInput1, AcceptAllInput2, AcceptMerge, CompareInput1WithBaseCommand, CompareInput2WithBaseCommand, GoToNextUnhandledConflict, GoToPreviousUnhandledConflict, OpenBaseFile, OpenMergeEditor, OpenResultResource, ResetToBaseAndAutoMergeCommand, SetColumnLayout, SetMixedLayout, ShowHideTopBase, ShowHideCenterBase, ShowHideBase, ShowNonConflictingChanges, ToggleActiveConflictInput1, ToggleActiveConflictInput2, ResetCloseWithConflictsChoice, AcceptAllCombination, ToggleBetweenInputs } from './commands/commands.js';
import { MergeEditorCopyContentsToJSON, MergeEditorLoadContentsFromFolder, MergeEditorSaveContentsToFolder } from './commands/devCommands.js';
import { MergeEditorInput } from './mergeEditorInput.js';
import { MergeEditor, MergeEditorOpenHandlerContribution, MergeEditorResolverContribution } from './view/mergeEditor.js';
import { MergeEditorSerializer } from './mergeEditorSerializer.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { MergeEditorAccessibilityHelpProvider } from './mergeEditorAccessibilityHelp.js';
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(MergeEditor, MergeEditor.ID, localize('name', "Merge Editor")), [
    new SyncDescriptor(MergeEditorInput)
]);
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(MergeEditorInput.ID, MergeEditorSerializer);
Registry.as(Extensions.Configuration).registerConfiguration({
    properties: {
        'mergeEditor.diffAlgorithm': {
            type: 'string',
            enum: ['legacy', 'advanced'],
            default: 'advanced',
            markdownEnumDescriptions: [
                localize('diffAlgorithm.legacy', "Uses the legacy diffing algorithm."),
                localize('diffAlgorithm.advanced', "Uses the advanced diffing algorithm."),
            ]
        },
        'mergeEditor.showDeletionMarkers': {
            type: 'boolean',
            default: true,
            description: 'Controls if deletions in base or one of the inputs should be indicated by a vertical bar.',
        },
    }
});
registerAction2(OpenResultResource);
registerAction2(SetMixedLayout);
registerAction2(SetColumnLayout);
registerAction2(OpenMergeEditor);
registerAction2(OpenBaseFile);
registerAction2(ShowNonConflictingChanges);
registerAction2(ShowHideBase);
registerAction2(ShowHideTopBase);
registerAction2(ShowHideCenterBase);
registerAction2(GoToNextUnhandledConflict);
registerAction2(GoToPreviousUnhandledConflict);
registerAction2(ToggleActiveConflictInput1);
registerAction2(ToggleActiveConflictInput2);
registerAction2(CompareInput1WithBaseCommand);
registerAction2(CompareInput2WithBaseCommand);
registerAction2(AcceptAllInput1);
registerAction2(AcceptAllInput2);
registerAction2(ResetToBaseAndAutoMergeCommand);
registerAction2(AcceptMerge);
registerAction2(ResetCloseWithConflictsChoice);
registerAction2(AcceptAllCombination);
registerAction2(ToggleBetweenInputs);
// Dev Commands
registerAction2(MergeEditorCopyContentsToJSON);
registerAction2(MergeEditorSaveContentsToFolder);
registerAction2(MergeEditorLoadContentsFromFolder);
Registry
    .as(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(MergeEditorOpenHandlerContribution, 3 /* LifecyclePhase.Restored */);
registerWorkbenchContribution2(MergeEditorResolverContribution.ID, MergeEditorResolverContribution, 1 /* WorkbenchPhase.BlockStartup */);
AccessibleViewRegistry.register(new MergeEditorAccessibilityHelpProvider());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3IuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21lcmdlRWRpdG9yLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQTBCLE1BQU0sb0VBQW9FLENBQUM7QUFDeEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUM7QUFDdkYsT0FBTyxFQUFFLFVBQVUsSUFBSSxtQkFBbUIsRUFBbUQsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0SyxPQUFPLEVBQUUsZ0JBQWdCLEVBQTBCLE1BQU0sMkJBQTJCLENBQUM7QUFDckYsT0FBTyxFQUNOLGVBQWUsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLDRCQUE0QixFQUMzRSw0QkFBNEIsRUFBRSx5QkFBeUIsRUFBRSw2QkFBNkIsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUNySCxrQkFBa0IsRUFBRSw4QkFBOEIsRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQ3RJLHlCQUF5QixFQUFFLDBCQUEwQixFQUFFLDBCQUEwQixFQUFFLDZCQUE2QixFQUNoSCxvQkFBb0IsRUFBRSxtQkFBbUIsRUFDekMsTUFBTSx3QkFB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