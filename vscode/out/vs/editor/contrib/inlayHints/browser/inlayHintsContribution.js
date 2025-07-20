/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
import { HoverParticipantRegistry } from '../../hover/browser/hoverTypes.js';
import { InlayHintsController } from './inlayHintsController.js';
import { InlayHintsHover } from './inlayHintsHover.js';
registerEditorContribution(InlayHintsController.ID, InlayHintsController, 1 /* EditorContributionInstantiation.AfterFirstRender */);
HoverParticipantRegistry.register(InlayHintsHover);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50c0NvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5sYXlIaW50cy9icm93c2VyL2lubGF5SGludHNDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFtQywwQkFBMEIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25ILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUV2RCwwQkFBMEIsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsb0JBQW9CLDJEQUFtRCxDQUFDO0FBQzVILHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyJ9