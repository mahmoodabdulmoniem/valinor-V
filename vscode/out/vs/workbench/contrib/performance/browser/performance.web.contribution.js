/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { BrowserResourcePerformanceMarks, BrowserStartupTimings } from './startupTimings.js';
// -- startup timings
Registry.as(Extensions.Workbench).registerWorkbenchContribution(BrowserResourcePerformanceMarks, 4 /* LifecyclePhase.Eventually */);
Registry.as(Extensions.Workbench).registerWorkbenchContribution(BrowserStartupTimings, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGVyZm9ybWFuY2Uud2ViLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcGVyZm9ybWFuY2UvYnJvd3Nlci9wZXJmb3JtYW5jZS53ZWIuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFtQyxNQUFNLGtDQUFrQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRTdGLHFCQUFxQjtBQUVyQixRQUFRLENBQUMsRUFBRSxDQUFrQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsNkJBQTZCLENBQy9GLCtCQUErQixvQ0FFL0IsQ0FBQztBQUVGLFFBQVEsQ0FBQyxFQUFFLENBQWtDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyw2QkFBNkIsQ0FDL0YscUJBQXFCLG9DQUVyQixDQUFDIn0=