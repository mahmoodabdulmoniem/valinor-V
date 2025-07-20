/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { isEditorInputWithOptions, isEditorInput } from '../../../common/editor.js';
import { preferredSideBySideGroupDirection, IEditorGroupsService } from './editorGroupsService.js';
import { AUX_WINDOW_GROUP, SIDE_GROUP } from './editorService.js';
export function findGroup(accessor, editor, preferredGroup) {
    const editorGroupService = accessor.get(IEditorGroupsService);
    const configurationService = accessor.get(IConfigurationService);
    const group = doFindGroup(editor, preferredGroup, editorGroupService, configurationService);
    if (group instanceof Promise) {
        return group.then(group => handleGroupActivation(group, editor, preferredGroup, editorGroupService));
    }
    return handleGroupActivation(group, editor, preferredGroup, editorGroupService);
}
function handleGroupActivation(group, editor, preferredGroup, editorGroupService) {
    // Resolve editor activation strategy
    let activation = undefined;
    if (editorGroupService.activeGroup !== group && // only if target group is not already active
        editor.options && !editor.options.inactive && // never for inactive editors
        editor.options.preserveFocus && // only if preserveFocus
        typeof editor.options.activation !== 'number' && // only if activation is not already defined (either true or false)
        preferredGroup !== SIDE_GROUP // never for the SIDE_GROUP
    ) {
        // If the resolved group is not the active one, we typically
        // want the group to become active. There are a few cases
        // where we stay away from encorcing this, e.g. if the caller
        // is already providing `activation`.
        //
        // Specifically for historic reasons we do not activate a
        // group is it is opened as `SIDE_GROUP` with `preserveFocus:true`.
        // repeated Alt-clicking of files in the explorer always open
        // into the same side group and not cause a group to be created each time.
        activation = EditorActivation.ACTIVATE;
    }
    return [group, activation];
}
function doFindGroup(input, preferredGroup, editorGroupService, configurationService) {
    let group;
    const editor = isEditorInputWithOptions(input) ? input.editor : input;
    const options = input.options;
    // Group: Instance of Group
    if (preferredGroup && typeof preferredGroup !== 'number') {
        group = preferredGroup;
    }
    // Group: Specific Group
    else if (typeof preferredGroup === 'number' && preferredGroup >= 0) {
        group = editorGroupService.getGroup(preferredGroup);
    }
    // Group: Side by Side
    else if (preferredGroup === SIDE_GROUP) {
        const direction = preferredSideBySideGroupDirection(configurationService);
        let candidateGroup = editorGroupService.findGroup({ direction });
        if (!candidateGroup || isGroupLockedForEditor(candidateGroup, editor)) {
            // Create new group either when the candidate group
            // is locked or was not found in the direction
            candidateGroup = editorGroupService.addGroup(editorGroupService.activeGroup, direction);
        }
        group = candidateGroup;
    }
    // Group: Aux Window
    else if (preferredGroup === AUX_WINDOW_GROUP) {
        group = editorGroupService.createAuxiliaryEditorPart({
            bounds: options?.auxiliary?.bounds,
            compact: options?.auxiliary?.compact,
            alwaysOnTop: options?.auxiliary?.alwaysOnTop
        }).then(group => group.activeGroup);
    }
    // Group: Unspecified without a specific index to open
    else if (!options || typeof options.index !== 'number') {
        const groupsByLastActive = editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        // Respect option to reveal an editor if it is already visible in any group
        if (options?.revealIfVisible) {
            for (const lastActiveGroup of groupsByLastActive) {
                if (isActive(lastActiveGroup, editor)) {
                    group = lastActiveGroup;
                    break;
                }
            }
        }
        // Respect option to reveal an editor if it is open (not necessarily visible)
        // Still prefer to reveal an editor in a group where the editor is active though.
        // We also try to reveal an editor if it has the `Singleton` capability which
        // indicates that the same editor cannot be opened across groups.
        if (!group) {
            if (options?.revealIfOpened || configurationService.getValue('workbench.editor.revealIfOpen') || (isEditorInput(editor) && editor.hasCapability(8 /* EditorInputCapabilities.Singleton */))) {
                let groupWithInputActive = undefined;
                let groupWithInputOpened = undefined;
                for (const group of groupsByLastActive) {
                    if (isOpened(group, editor)) {
                        if (!groupWithInputOpened) {
                            groupWithInputOpened = group;
                        }
                        if (!groupWithInputActive && group.isActive(editor)) {
                            groupWithInputActive = group;
                        }
                    }
                    if (groupWithInputOpened && groupWithInputActive) {
                        break; // we found all groups we wanted
                    }
                }
                // Prefer a target group where the input is visible
                group = groupWithInputActive || groupWithInputOpened;
            }
        }
    }
    // Fallback to active group if target not valid but avoid
    // locked editor groups unless editor is already opened there
    if (!group) {
        let candidateGroup = editorGroupService.activeGroup;
        // Locked group: find the next non-locked group
        // going up the neigbours of the group or create
        // a new group otherwise
        if (isGroupLockedForEditor(candidateGroup, editor)) {
            for (const group of editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
                if (isGroupLockedForEditor(group, editor)) {
                    continue;
                }
                candidateGroup = group;
                break;
            }
            if (isGroupLockedForEditor(candidateGroup, editor)) {
                // Group is still locked, so we have to create a new
                // group to the side of the candidate group
                group = editorGroupService.addGroup(candidateGroup, preferredSideBySideGroupDirection(configurationService));
            }
            else {
                group = candidateGroup;
            }
        }
        // Non-locked group: take as is
        else {
            group = candidateGroup;
        }
    }
    return group;
}
function isGroupLockedForEditor(group, editor) {
    if (!group.isLocked) {
        // only relevant for locked editor groups
        return false;
    }
    if (isOpened(group, editor)) {
        // special case: the locked group contains
        // the provided editor. in that case we do not want
        // to open the editor in any different group.
        return false;
    }
    // group is locked for this editor
    return true;
}
function isActive(group, editor) {
    if (!group.activeEditor) {
        return false;
    }
    return group.activeEditor.matches(editor);
}
function isOpened(group, editor) {
    for (const typedEditor of group.editors) {
        if (typedEditor.matches(editor)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBGaW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvY29tbW9uL2VkaXRvckdyb3VwRmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRWhGLE9BQU8sRUFBMEIsd0JBQXdCLEVBQXVCLGFBQWEsRUFBMkIsTUFBTSwyQkFBMkIsQ0FBQztBQUUxSixPQUFPLEVBQTZCLGlDQUFpQyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDOUgsT0FBTyxFQUFFLGdCQUFnQixFQUF5QyxVQUFVLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQWN6RyxNQUFNLFVBQVUsU0FBUyxDQUFDLFFBQTBCLEVBQUUsTUFBb0QsRUFBRSxjQUEwQztJQUNySixNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUM5RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUVqRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQzVGLElBQUksS0FBSyxZQUFZLE9BQU8sRUFBRSxDQUFDO1FBQzlCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQztJQUN0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