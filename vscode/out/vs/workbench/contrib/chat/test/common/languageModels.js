/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
export class NullLanguageModelsService {
    constructor() {
        this.onDidChangeLanguageModels = Event.None;
    }
    getLanguageModelIds() {
        return [];
    }
    lookupLanguageModel(identifier) {
        return undefined;
    }
    async selectLanguageModels(selector) {
        return [];
    }
    registerLanguageModelChat(identifier, provider) {
        return Disposable.None;
    }
    sendChatRequest(identifier, from, messages, options, token) {
        throw new Error('Method not implemented.');
    }
    computeTokenLength(identifier, message, token) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbGFuZ3VhZ2VNb2RlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUlsRixNQUFNLE9BQU8seUJBQXlCO0lBQXRDO1FBR0MsOEJBQXlCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztJQXlCeEMsQ0FBQztJQXZCQSxtQkFBbUI7UUFDbEIsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsbUJBQW1CLENBQUMsVUFBa0I7UUFDckMsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxRQUFvQztRQUM5RCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCx5QkFBeUIsQ0FBQyxVQUFrQixFQUFFLFFBQTRCO1FBQ3pFLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQztJQUN4QixDQUFDO0lBRUQsZUFBZSxDQUFDLFVBQWtCLEVBQUUsSUFBeUIsRUFBRSxRQUF3QixFQUFFLE9BQWdDLEVBQUUsS0FBd0I7UUFDbEosTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxVQUFrQixFQUFFLE9BQThCLEVBQUUsS0FBd0I7UUFDOUYsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRCJ9