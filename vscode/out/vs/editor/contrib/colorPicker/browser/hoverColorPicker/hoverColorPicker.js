/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ColorDecorationInjectedTextMarker } from '../colorDetector.js';
export function isOnColorDecorator(mouseEvent) {
    const target = mouseEvent.target;
    return !!target
        && target.type === 6 /* MouseTargetType.CONTENT_TEXT */
        && target.detail.injectedText?.options.attachedData === ColorDecorationInjectedTextMarker;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb2xvclBpY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9ob3ZlckNvbG9yUGlja2VyL2hvdmVyQ29sb3JQaWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFHeEUsTUFBTSxVQUFVLGtCQUFrQixDQUFDLFVBQW9DO0lBQ3RFLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7SUFDakMsT0FBTyxDQUFDLENBQUMsTUFBTTtXQUNYLE1BQU0sQ0FBQyxJQUFJLHlDQUFpQztXQUM1QyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWSxLQUFLLGlDQUFpQyxDQUFDO0FBQzVGLENBQUMifQ==