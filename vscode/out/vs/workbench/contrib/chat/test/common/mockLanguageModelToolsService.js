/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { constObservable } from '../../../../../base/common/observable.js';
export class MockLanguageModelToolsService {
    constructor() {
        this.onDidChangeTools = Event.None;
        this.toolSets = constObservable([]);
    }
    cancelToolCallsForRequest(requestId) {
    }
    registerToolData(toolData) {
        return Disposable.None;
    }
    resetToolAutoConfirmation() {
    }
    setToolAutoConfirmation(toolId, scope, autoConfirm) {
    }
    registerToolImplementation(name, tool) {
        return Disposable.None;
    }
    getTools() {
        return [];
    }
    getTool(id) {
        return undefined;
    }
    getToolByName(name, includeDisabled) {
        return undefined;
    }
    acceptProgress(sessionId, callId, progress) {
    }
    async invokeTool(dto, countTokens, token) {
        return {
            content: [{ kind: 'text', value: 'result' }]
        };
    }
    getToolSetByName(name) {
        return undefined;
    }
    getToolSet(id) {
        return undefined;
    }
    createToolSet() {
        throw new Error('Method not implemented.');
    }
    toToolEnablementMap(toolOrToolSetNames) {
        throw new Error('Method not implemented.');
    }
    toToolAndToolSetEnablementMap(toolOrToolSetNames) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0xhbmd1YWdlTW9kZWxUb29sc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbW9ja0xhbmd1YWdlTW9kZWxUb29sc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sMENBQTBDLENBQUM7QUFJeEYsTUFBTSxPQUFPLDZCQUE2QjtJQUd6QztRQUtBLHFCQUFnQixHQUFnQixLQUFLLENBQUMsSUFBSSxDQUFDO1FBd0MzQyxhQUFRLEdBQW9DLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQTdDaEQsQ0FBQztJQUVqQix5QkFBeUIsQ0FBQyxTQUFpQjtJQUMzQyxDQUFDO0lBSUQsZ0JBQWdCLENBQUMsUUFBbUI7UUFDbkMsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFDO0lBQ3hCLENBQUM7SUFFRCx5QkFBeUI7SUFFekIsQ0FBQztJQUVELHVCQUF1QixDQUFDLE1BQWMsRUFBRSxLQUE4QixFQUFFLFdBQXFCO0lBRTdGLENBQUM7SUFFRCwwQkFBMEIsQ0FBQyxJQUFZLEVBQUUsSUFBZTtRQUN2RCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUM7SUFDeEIsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxPQUFPLENBQUMsRUFBVTtRQUNqQixPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsYUFBYSxDQUFDLElBQVksRUFBRSxlQUF5QjtRQUNwRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsY0FBYyxDQUFDLFNBQTZCLEVBQUUsTUFBYyxFQUFFLFFBQXVCO0lBRXJGLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQW9CLEVBQUUsV0FBZ0MsRUFBRSxLQUF3QjtRQUNoRyxPQUFPO1lBQ04sT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQztTQUM1QyxDQUFDO0lBQ0gsQ0FBQztJQUlELGdCQUFnQixDQUFDLElBQVk7UUFDNUIsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELFVBQVUsQ0FBQyxFQUFVO1FBQ3BCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxhQUFhO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxrQkFBK0I7UUFDbEQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxrQkFBaUQ7UUFDOUUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRCJ9