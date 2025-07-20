/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { EditorExtensions } from '../../../common/editor.js';
import { NativeProcessExplorerEditor } from './processExplorerEditor.js';
import { ProcessExplorerEditorInput } from '../browser/processExplorerEditorInput.js';
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(NativeProcessExplorerEditor, NativeProcessExplorerEditor.ID, localize('processExplorer', "Process Explorer")), [new SyncDescriptor(ProcessExplorerEditorInput)]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc0V4cGxvcmVyLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJvY2Vzc0V4cGxvcmVyL2VsZWN0cm9uLWJyb3dzZXIvcHJvY2Vzc0V4cGxvcmVyLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUM7QUFDdkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDN0QsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDekUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFdEYsUUFBUSxDQUFDLEVBQUUsQ0FBc0IsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsa0JBQWtCLENBQy9FLG9CQUFvQixDQUFDLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSwyQkFBMkIsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDLENBQUMsRUFDekksQ0FBQyxJQUFJLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQ2hELENBQUMifQ==