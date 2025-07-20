/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, AUX_WINDOW_GROUP, IEditorService } from '../../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { isChatViewTitleActionContext } from '../../common/chatActions.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { ChatEditor } from '../chatEditor.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { CHAT_CATEGORY } from './chatActions.js';
var MoveToNewLocation;
(function (MoveToNewLocation) {
    MoveToNewLocation["Editor"] = "Editor";
    MoveToNewLocation["Window"] = "Window";
})(MoveToNewLocation || (MoveToNewLocation = {}));
export function registerMoveActions() {
    registerAction2(class GlobalMoveToEditorAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.openInEditor',
                title: localize2('chat.openInEditor.label', "Open Chat in Editor"),
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                f1: true,
                menu: {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.equals('view', ChatViewId),
                    order: 0,
                    group: '1_open'
                },
            });
        }
        async run(accessor, ...args) {
            const context = args[0];
            executeMoveToAction(accessor, MoveToNewLocation.Editor, isChatViewTitleActionContext(context) ? context.sessionId : undefined);
        }
    });
    registerAction2(class GlobalMoveToNewWindowAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.openInNewWindow',
                title: localize2('chat.openInNewWindow.label', "Open Chat in New Window"),
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                f1: true,
                menu: {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.equals('view', ChatViewId),
                    order: 0,
                    group: '1_open'
                },
            });
        }
        async run(accessor, ...args) {
            const context = args[0];
            executeMoveToAction(accessor, MoveToNewLocation.Window, isChatViewTitleActionContext(context) ? context.sessionId : undefined);
        }
    });
    registerAction2(class GlobalMoveToSidebarAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.openInSidebar',
                title: localize2('interactiveSession.openInSidebar.label', "Open Chat in Side Bar"),
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                f1: true
            });
        }
        async run(accessor, ...args) {
            return moveToSidebar(accessor);
        }
    });
    function appendOpenChatInViewMenuItem(menuId, title, icon, locationContextKey) {
        MenuRegistry.appendMenuItem(menuId, {
            command: { id: 'workbench.action.chat.openInSidebar', title, icon },
            when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID), locationContextKey),
            group: menuId === MenuId.CompactWindowEditorTitle ? 'navigation' : undefined,
            order: 0
        });
    }
    [MenuId.EditorTitle, MenuId.CompactWindowEditorTitle].forEach(id => {
        appendOpenChatInViewMenuItem(id, localize('interactiveSession.openInSecondarySidebar.label', "Open Chat in Secondary Side Bar"), Codicon.layoutSidebarRightDock, ChatContextKeys.panelLocation.isEqualTo(2 /* ViewContainerLocation.AuxiliaryBar */));
        appendOpenChatInViewMenuItem(id, localize('interactiveSession.openInPrimarySidebar.label', "Open Chat in Primary Side Bar"), Codicon.layoutSidebarLeftDock, ChatContextKeys.panelLocation.isEqualTo(0 /* ViewContainerLocation.Sidebar */));
        appendOpenChatInViewMenuItem(id, localize('interactiveSession.openInPanel.label', "Open Chat in Panel"), Codicon.layoutPanelDock, ChatContextKeys.panelLocation.isEqualTo(1 /* ViewContainerLocation.Panel */));
    });
}
async function executeMoveToAction(accessor, moveTo, _sessionId) {
    const widgetService = accessor.get(IChatWidgetService);
    const editorService = accessor.get(IEditorService);
    const widget = (_sessionId ? widgetService.getWidgetBySessionId(_sessionId) : undefined)
        ?? widgetService.lastFocusedWidget;
    if (!widget || !widget.viewModel || widget.location !== ChatAgentLocation.Panel) {
        await editorService.openEditor({ resource: ChatEditorInput.getNewEditorUri(), options: { pinned: true, auxiliary: { compact: true, bounds: { width: 640, height: 640 } } } }, moveTo === MoveToNewLocation.Window ? AUX_WINDOW_GROUP : ACTIVE_GROUP);
        return;
    }
    const sessionId = widget.viewModel.sessionId;
    const viewState = widget.getViewState();
    widget.clear();
    await widget.waitForReady();
    const options = { target: { sessionId }, pinned: true, viewState, auxiliary: { compact: true, bounds: { width: 640, height: 640 } } };
    await editorService.openEditor({ resource: ChatEditorInput.getNewEditorUri(), options }, moveTo === MoveToNewLocation.Window ? AUX_WINDOW_GROUP : ACTIVE_GROUP);
}
async function moveToSidebar(accessor) {
    const viewsService = accessor.get(IViewsService);
    const editorService = accessor.get(IEditorService);
    const editorGroupService = accessor.get(IEditorGroupsService);
    const chatEditor = editorService.activeEditorPane;
    const chatEditorInput = chatEditor?.input;
    let view;
    if (chatEditor instanceof ChatEditor && chatEditorInput instanceof ChatEditorInput && chatEditorInput.sessionId) {
        await editorService.closeEditor({ editor: chatEditor.input, groupId: editorGroupService.activeGroup.id });
        view = await viewsService.openView(ChatViewId);
        await view.loadSession(chatEditorInput.sessionId, chatEditor.getViewState());
    }
    else {
        view = await viewsService.openView(ChatViewId);
    }
    view.focus();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vdmVBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0TW92ZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxjQUFjLEVBQXdCLE1BQU0seURBQXlELENBQUM7QUFFL0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDakcsT0FBTyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNySCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBc0IsTUFBTSxrQkFBa0IsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1B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