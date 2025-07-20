/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const VIEWLET_ID = 'workbench.view.scm';
export const VIEW_PANE_ID = 'workbench.scm';
export const REPOSITORIES_VIEW_PANE_ID = 'workbench.scm.repositories';
export const HISTORY_VIEW_PANE_ID = 'workbench.scm.history';
export var ViewMode;
(function (ViewMode) {
    ViewMode["List"] = "list";
    ViewMode["Tree"] = "tree";
})(ViewMode || (ViewMode = {}));
export const ISCMService = createDecorator('scm');
export var InputValidationType;
(function (InputValidationType) {
    InputValidationType[InputValidationType["Error"] = 0] = "Error";
    InputValidationType[InputValidationType["Warning"] = 1] = "Warning";
    InputValidationType[InputValidationType["Information"] = 2] = "Information";
})(InputValidationType || (InputValidationType = {}));
export var SCMInputChangeReason;
(function (SCMInputChangeReason) {
    SCMInputChangeReason[SCMInputChangeReason["HistoryPrevious"] = 0] = "HistoryPrevious";
    SCMInputChangeReason[SCMInputChangeReason["HistoryNext"] = 1] = "HistoryNext";
})(SCMInputChangeReason || (SCMInputChangeReason = {}));
export var ISCMRepositorySortKey;
(function (ISCMRepositorySortKey) {
    ISCMRepositorySortKey["DiscoveryTime"] = "discoveryTime";
    ISCMRepositorySortKey["Name"] = "name";
    ISCMRepositorySortKey["Path"] = "path";
})(ISCMRepositorySortKey || (ISCMRepositorySortKey = {}));
export const ISCMViewService = createDecorator('scmView');
export const SCM_CHANGES_EDITOR_ID = 'workbench.editor.scmChangesEditor';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vY29tbW9uL3NjbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFhN0YsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUFDO0FBQy9DLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUM7QUFDNUMsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsNEJBQTRCLENBQUM7QUFDdEUsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsdUJBQXVCLENBQUM7QUFFNUQsTUFBTSxDQUFOLElBQWtCLFFBR2pCO0FBSEQsV0FBa0IsUUFBUTtJQUN6Qix5QkFBYSxDQUFBO0lBQ2IseUJBQWEsQ0FBQTtBQUNkLENBQUMsRUFIaUIsUUFBUSxLQUFSLFFBQVEsUUFHekI7QUFNRCxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFjLEtBQUssQ0FBQyxDQUFDO0FBa0UvRCxNQUFNLENBQU4sSUFBa0IsbUJBSWpCO0FBSkQsV0FBa0IsbUJBQW1CO0lBQ3BDLCtEQUFTLENBQUE7SUFDVCxtRUFBVyxDQUFBO0lBQ1gsMkVBQWUsQ0FBQTtBQUNoQixDQUFDLEVBSmlCLG1CQUFtQixLQUFuQixtQkFBbUIsUUFJcEM7QUFXRCxNQUFNLENBQU4sSUFBWSxvQkFHWDtBQUhELFdBQVksb0JBQW9CO0lBQy9CLHFGQUFlLENBQUE7SUFDZiw2RUFBVyxDQUFBO0FBQ1osQ0FBQyxFQUhXLG9CQUFvQixLQUFwQixvQkFBb0IsUUFHL0I7QUF3RkQsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0Qyx3REFBK0IsQ0FBQTtJQUMvQixzQ0FBYSxDQUFBO0lBQ2Isc0NBQWEsQ0FBQTtBQUNkLENBQUMsRUFKaUIscUJBQXFCLEtBQXJCLHFCQUFxQixRQUl0QztBQUVELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLFNBQVMsQ0FBQyxDQUFDO0FBa0MzRSxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxtQ0FBbUMsQ0FBQyJ9