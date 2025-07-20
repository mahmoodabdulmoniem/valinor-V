/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerAttachPromptActions } from './attachInstructionsAction.js';
import { registerChatModeActions } from './chatModeActions.js';
import { registerRunPromptActions } from './runPromptAction.js';
import { registerSaveToPromptActions } from './saveToPromptAction.js';
import { registerNewPromptFileActions } from './newPromptFileActions.js';
/**
 * Helper to register all actions related to reusable prompt files.
 */
export function registerPromptActions() {
    registerRunPromptActions();
    registerAttachPromptActions();
    registerSaveToPromptActions();
    registerChatModeActions();
    registerNewPromptFileActions();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvcHJvbXB0RmlsZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDNUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDL0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDaEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFHekU7O0dBRUc7QUFDSCxNQUFNLFVBQVUscUJBQXFCO0lBQ3BDLHdCQUF3QixFQUFFLENBQUM7SUFDM0IsMkJBQTJCLEVBQUUsQ0FBQztJQUM5QiwyQkFBMkIsRUFBRSxDQUFDO0lBQzlCLHVCQUF1QixFQUFFLENBQUM7SUFDMUIsNEJBQTRCLEVBQUUsQ0FBQztBQUNoQyxDQUFDIn0=