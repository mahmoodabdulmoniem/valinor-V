/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Primary workbench contribution
import './browser/terminal.contribution.js';
// Misc extensions to the workbench contribution
import './common/environmentVariable.contribution.js';
import './common/terminalExtensionPoints.contribution.js';
import './browser/terminalView.js';
// Terminal contributions - Standalone extensions to the terminal, these cannot be imported from the
// primary workbench contribution)
import '../terminalContrib/accessibility/browser/terminal.accessibility.contribution.js';
import '../terminalContrib/autoReplies/browser/terminal.autoReplies.contribution.js';
import '../terminalContrib/chatAgentTools/browser/terminal.chatAgentTools.contribution.js';
import '../terminalContrib/developer/browser/terminal.developer.contribution.js';
import '../terminalContrib/environmentChanges/browser/terminal.environmentChanges.contribution.js';
import '../terminalContrib/find/browser/terminal.find.contribution.js';
import '../terminalContrib/chat/browser/terminal.chat.contribution.js';
import '../terminalContrib/commandGuide/browser/terminal.commandGuide.contribution.js';
import '../terminalContrib/history/browser/terminal.history.contribution.js';
import '../terminalContrib/links/browser/terminal.links.contribution.js';
import '../terminalContrib/zoom/browser/terminal.zoom.contribution.js';
import '../terminalContrib/stickyScroll/browser/terminal.stickyScroll.contribution.js';
import '../terminalContrib/quickAccess/browser/terminal.quickAccess.contribution.js';
import '../terminalContrib/quickFix/browser/terminal.quickFix.contribution.js';
import '../terminalContrib/typeAhead/browser/terminal.typeAhead.contribution.js';
import '../terminalContrib/sendSequence/browser/terminal.sendSequence.contribution.js';
import '../terminalContrib/sendSignal/browser/terminal.sendSignal.contribution.js';
import '../terminalContrib/suggest/browser/terminal.suggest.contribution.js';
import '../terminalContrib/chat/browser/terminal.initialHint.contribution.js';
import '../terminalContrib/wslRecommendation/browser/terminal.wslRecommendation.contribution.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuYWxsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXJtaW5hbC5hbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsaUNBQWlDO0FBQ2pDLE9BQU8sb0NBQW9DLENBQUM7QUFFNUMsZ0RBQWdEO0FBQ2hELE9BQU8sOENBQThDLENBQUM7QUFDdEQsT0FBTyxrREFBa0QsQ0FBQztBQUMxRCxPQUFPLDJCQUEyQixDQUFDO0FBRW5DLG9HQUFvRztBQUNwRyxrQ0FBa0M7QUFDbEMsT0FBTyxpRkFBaUYsQ0FBQztBQUN6RixPQUFPLDZFQUE2RSxDQUFDO0FBQ3JGLE9BQU8sbUZBQW1GLENBQUM7QUFDM0YsT0FBTyx5RUFBeUUsQ0FBQztBQUNqRixPQUFPLDJGQUEyRixDQUFDO0FBQ25HLE9BQU8sK0RBQStELENBQUM7QUFDdkUsT0FBTywrREFBK0QsQ0FBQztBQUN2RSxPQUFPLCtFQUErRSxDQUFDO0FBQ3ZGLE9BQU8scUVBQXFFLENBQUM7QUFDN0UsT0FBTyxpRUFBaUUsQ0FBQztBQUN6RSxPQUFPLCtEQUErRCxDQUFDO0FBQ3ZFLE9BQU8sK0VBQStFLENBQUM7QUFDdkYsT0FBTyw2RUFBNkUsQ0FBQztBQUNyRixPQUFPLHVFQUF1RSxDQUFDO0FBQy9FLE9BQU8seUVBQXlFLENBQUM7QUFDakYsT0FBTywrRUFBK0UsQ0FBQztBQUN2RixPQUFPLDJFQUEyRSxDQUFDO0FBQ25GLE9BQU8scUVBQXFFLENBQUM7QUFDN0UsT0FBTyxzRUFBc0UsQ0FBQztBQUM5RSxPQUFPLHlGQUF5RixDQUFDIn0=