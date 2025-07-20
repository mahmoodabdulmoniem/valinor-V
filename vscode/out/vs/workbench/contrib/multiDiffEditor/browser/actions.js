/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize2 } from '../../../../nls.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { resolveCommandsContext } from '../../../browser/parts/editor/editorCommandsContext.js';
import { MultiDiffEditor } from './multiDiffEditor.js';
import { MultiDiffEditorInput } from './multiDiffEditorInput.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
export class GoToFileAction extends Action2 {
    constructor() {
        super({
            id: 'multiDiffEditor.goToFile',
            title: localize2('goToFile', 'Open File'),
            icon: Codicon.goToFile,
            precondition: ActiveEditorContext.isEqualTo(MultiDiffEditor.ID),
            menu: {
                when: ActiveEditorContext.isEqualTo(MultiDiffEditor.ID),
                id: MenuId.MultiDiffEditorFileToolbar,
                order: 22,
                group: 'navigation',
            },
        });
    }
    async run(accessor, ...args) {
        const uri = args[0];
        const editorService = accessor.get(IEditorService);
        const activeEditorPane = editorService.activeEditorPane;
        let selections = undefined;
        if (!(activeEditorPane instanceof MultiDiffEditor)) {
            return;
        }
        const editor = activeEditorPane.tryGetCodeEditor(uri);
        if (editor) {
            selections = editor.editor.getSelections() ?? undefined;
        }
        let targetUri = uri;
        const item = activeEditorPane.findDocumentDiffItem(uri);
        if (item && item.goToFileUri) {
            targetUri = item.goToFileUri;
        }
        await editorService.openEditor({
            resource: targetUri,
            options: {
                selection: selections?.[0],
                selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
            },
        });
    }
}
export class CollapseAllAction extends Action2 {
    constructor() {
        super({
            id: 'multiDiffEditor.collapseAll',
            title: localize2('collapseAllDiffs', 'Collapse All Diffs'),
            icon: Codicon.collapseAll,
            precondition: ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', MultiDiffEditor.ID), ContextKeyExpr.not('multiDiffEditorAllCollapsed')),
            menu: [MenuId.EditorTitle, MenuId.CompactWindowEditorTitle].map(id => ({
                id,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', MultiDiffEditor.ID), ContextKeyExpr.not('multiDiffEditorAllCollapsed')),
                group: 'navigation',
                order: 100
            })),
            f1: true,
        });
    }
    async run(accessor, ...args) {
        const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
        const groupContext = resolvedContext.groupedEditors[0];
        if (!groupContext) {
            return;
        }
        const editor = groupContext.editors[0];
        if (editor instanceof MultiDiffEditorInput) {
            const viewModel = await editor.getViewModel();
            viewModel.collapseAll();
        }
    }
}
export class ExpandAllAction extends Action2 {
    constructor() {
        super({
            id: 'multiDiffEditor.expandAll',
            title: localize2('ExpandAllDiffs', 'Expand All Diffs'),
            icon: Codicon.expandAll,
            precondition: ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', MultiDiffEditor.ID), ContextKeyExpr.has('multiDiffEditorAllCollapsed')),
            menu: [MenuId.EditorTitle, MenuId.CompactWindowEditorTitle].map(id => ({
                id,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('activeEditor', MultiDiffEditor.ID), ContextKeyExpr.has('multiDiffEditorAllCollapsed')),
                group: 'navigation',
                order: 100
            })),
            f1: true,
        });
    }
    async run(accessor, ...args) {
        const resolvedContext = resolveCommandsContext(args, accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IListService));
        const groupContext = resolvedContext.groupedEditors[0];
        if (!groupContext) {
            return;
        }
        const editor = groupContext.editors[0];
        if (editor instanceof MultiDiffEditorInput) {
            const viewModel = await editor.getViewModel();
            viewModel.expandAll();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbXVsdGlEaWZmRWRpdG9yL2Jyb3dzZXIvYWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFHOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBR3RGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDdkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDakUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJFLE1BQU0sT0FBTyxjQUFlLFNBQVEsT0FBTztJQUMxQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwwQkFBMEI7WUFDOUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDO1lBQ3pDLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUTtZQUN0QixZQUFZLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxDQUFDLGVB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