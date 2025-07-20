/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IChatEditingService = createDecorator('chatEditingService');
export const chatEditingSnapshotScheme = 'chat-editing-snapshot-text-model';
export var ModifiedFileEntryState;
(function (ModifiedFileEntryState) {
    ModifiedFileEntryState[ModifiedFileEntryState["Modified"] = 0] = "Modified";
    ModifiedFileEntryState[ModifiedFileEntryState["Accepted"] = 1] = "Accepted";
    ModifiedFileEntryState[ModifiedFileEntryState["Rejected"] = 2] = "Rejected";
})(ModifiedFileEntryState || (ModifiedFileEntryState = {}));
export var ChatEditingSessionState;
(function (ChatEditingSessionState) {
    ChatEditingSessionState[ChatEditingSessionState["Initial"] = 0] = "Initial";
    ChatEditingSessionState[ChatEditingSessionState["StreamingEdits"] = 1] = "StreamingEdits";
    ChatEditingSessionState[ChatEditingSessionState["Idle"] = 2] = "Idle";
    ChatEditingSessionState[ChatEditingSessionState["Disposed"] = 3] = "Disposed";
})(ChatEditingSessionState || (ChatEditingSessionState = {}));
export const CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME = 'chat-editing-multi-diff-source';
export const chatEditingWidgetFileStateContextKey = new RawContextKey('chatEditingWidgetFileState', undefined, localize('chatEditingWidgetFileState', "The current state of the file in the chat editing widget"));
export const chatEditingAgentSupportsReadonlyReferencesContextKey = new RawContextKey('chatEditingAgentSupportsReadonlyReferences', undefined, localize('chatEditingAgentSupportsReadonlyReferences', "Whether the chat editing agent supports readonly references (temporary)"));
export const decidedChatEditingResourceContextKey = new RawContextKey('decidedChatEditingResource', []);
export const chatEditingResourceContextKey = new RawContextKey('chatEditingResource', undefined);
export const inChatEditingSessionContextKey = new RawContextKey('inChatEditingSession', undefined);
export const hasUndecidedChatEditingResourceContextKey = new RawContextKey('hasUndecidedChatEditingResource', false);
export const hasAppliedChatEditsContextKey = new RawContextKey('hasAppliedChatEdits', false);
export const applyingChatEditsFailedContextKey = new RawContextKey('applyingChatEditsFailed', false);
export const chatEditingMaxFileAssignmentName = 'chatEditingSessionFileLimit';
export const defaultChatEditingMaxFileLimit = 10;
export var ChatEditKind;
(function (ChatEditKind) {
    ChatEditKind[ChatEditKind["Created"] = 0] = "Created";
    ChatEditKind[ChatEditKind["Modified"] = 1] = "Modified";
})(ChatEditKind || (ChatEditKind = {}));
export function isChatEditingActionContext(thing) {
    return typeof thing === 'object' && !!thing && 'sessionId' in thing;
}
export function getMultiDiffSourceUri(session, showPreviousChanges) {
    return URI.from({
        scheme: CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME,
        authority: session.chatSessionId,
        query: showPreviousChanges ? 'previous' : undefined,
    });
}
export function parseChatMultiDiffUri(uri) {
    const chatSessionId = uri.authority;
    const showPreviousChanges = uri.query === 'previous';
    return { chatSessionId, showPreviousChanges };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0RWRpdGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBTTdGLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQztBQTZEOUYsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsa0NBQWtDLENBQUM7QUFxRjVFLE1BQU0sQ0FBTixJQUFrQixzQkFJakI7QUFKRCxXQUFrQixzQkFBc0I7SUFDdkMsMkVBQVEsQ0FBQTtJQUNSLDJFQUFRLENBQUE7SUFDUiwyRUFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUppQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBSXZDO0FBNEZELE1BQU0sQ0FBTixJQUFrQix1QkFLakI7QUFMRCxXQUFrQix1QkFBdUI7SUFDeEMsMkVBQVcsQ0FBQTtJQUNYLHlGQUFrQixDQUFBO0lBQ2xCLHFFQUFRLENBQUE7SUFDUiw2RUFBWSxDQUFBO0FBQ2IsQ0FBQyxFQUxpQix1QkFBdUIsS0FBdkIsdUJBQXVCLFFBS3hDO0FBRUQsTUFBTSxDQUFDLE1BQU0sOENBQThDLEdBQUcsZ0NBQWdDLENBQUM7QUFFL0YsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsSUFBSSxhQUFhLENBQXlCLDRCQUE0QixFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsNEJBQTRCLEVBQUUsMERBQTBELENBQUMsQ0FBQyxDQUFDO0FBQzNPLE1BQU0sQ0FBQyxNQUFNLG9EQUFvRCxHQUFHLElBQUksYUFBYSxDQUFVLDRDQUE0QyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsNENBQTRDLEVBQUUseUVBQXlFLENBQUMsQ0FBQyxDQUFDO0FBQzNSLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLElBQUksYUFBYSxDQUFXLDRCQUE0QixFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ2xILE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksYUFBYSxDQUFxQixxQkFBcUIsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUNySCxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLGFBQWEsQ0FBc0Isc0JBQXNCLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDeEgsTUFBTSxDQUFDLE1BQU0seUNBQXlDLEdBQUcsSUFBSSxhQUFhLENBQXNCLGlDQUFpQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzFJLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLElBQUksYUFBYSxDQUFzQixxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNsSCxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxJQUFJLGFBQWEsQ0FBc0IseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFMUgsTUFBTSxDQUFDLE1BQU0sZ0NBQWdDLEdBQUcsNkJBQTZCLENBQUM7QUFDOUUsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsRUFBRSxDQUFDO0FBRWpELE1BQU0sQ0FBTixJQUFrQixZQUdqQjtBQUhELFdBQWtCLFlBQVk7SUFDN0IscURBQU8sQ0FBQTtJQUNQLHVEQUFRLENBQUE7QUFDVCxDQUFDLEVBSGlCLFlBQVksS0FBWixZQUFZLFFBRzdCO0FBT0QsTUFBTSxVQUFVLDBCQUEwQixDQUFDLEtBQWM7SUFDeEQsT0FBTyxPQUFPLEtBQUssS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxXQUFXLElBQUksS0FBSyxDQUFDO0FBQ3JFLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsT0FBNEIsRUFBRSxtQkFBNkI7SUFDaEcsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ2YsTUFBTSxFQUFFLDhDQUE4QztRQUN0RCxTQUFTLEVBQUUsT0FBTyxDQUFDLGFBQWE7UUFDaEMsS0FBSyxFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVM7S0FDbkQsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FBQyxHQUFRO0lBQzdDLE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUM7SUFDcEMsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUMsS0FBSyxLQUFLLFVBQVUsQ0FBQztJQUVyRCxPQUFPLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLENBQUM7QUFDL0MsQ0FBQyJ9