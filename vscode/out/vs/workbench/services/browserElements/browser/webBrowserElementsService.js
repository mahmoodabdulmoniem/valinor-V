/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IBrowserElementsService } from './browserElementsService.js';
class WebBrowserElementsService {
    constructor() { }
    async getElementData(rect, token) {
        throw new Error('Not implemented');
    }
    startDebugSession(token, browserType) {
        throw new Error('Not implemented');
    }
}
registerSingleton(IBrowserElementsService, WebBrowserElementsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQnJvd3NlckVsZW1lbnRzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2Jyb3dzZXJFbGVtZW50cy9icm93c2VyL3dlYkJyb3dzZXJFbGVtZW50c1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXRFLE1BQU0seUJBQXlCO0lBRzlCLGdCQUFnQixDQUFDO0lBRWpCLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBZ0IsRUFBRSxLQUF3QjtRQUM5RCxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELGlCQUFpQixDQUFDLEtBQXdCLEVBQUUsV0FBd0I7UUFDbkUsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7Q0FDRDtBQUVELGlCQUFpQixDQUFDLHVCQUF1QixFQUFFLHlCQUF5QixvQ0FBNEIsQ0FBQyJ9