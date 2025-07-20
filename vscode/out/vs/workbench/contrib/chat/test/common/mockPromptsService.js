/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
export class MockPromptsService {
    constructor() {
        this._onDidChangeCustomChatModes = new Emitter();
        this.onDidChangeCustomChatModes = this._onDidChangeCustomChatModes.event;
        this._customModes = [];
    }
    setCustomModes(modes) {
        this._customModes = modes;
        this._onDidChangeCustomChatModes.fire();
    }
    async getCustomChatModes(token) {
        return this._customModes;
    }
    // Stub implementations for required interface methods
    getSyntaxParserFor(_model) { throw new Error('Not implemented'); }
    listPromptFiles(_type) { throw new Error('Not implemented'); }
    getSourceFolders(_type) { throw new Error('Not implemented'); }
    asPromptSlashCommand(_command) { return undefined; }
    resolvePromptSlashCommand(_data, _token) { throw new Error('Not implemented'); }
    findPromptSlashCommands() { throw new Error('Not implemented'); }
    parse(_uri, _type, _token) { throw new Error('Not implemented'); }
    getPromptFileType(_resource) { return undefined; }
    dispose() { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja1Byb21wdHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvbWFobW9vZGFiZHVsbW9uaWVtL0Rlc2t0b3AvdmFsaW5vci1WL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL21vY2tQcm9tcHRzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFJOUQsTUFBTSxPQUFPLGtCQUFrQjtJQUEvQjtRQUdrQixnQ0FBMkIsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBQzFELCtCQUEwQixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUM7UUFFckUsaUJBQVksR0FBc0IsRUFBRSxDQUFDO0lBcUI5QyxDQUFDO0lBbkJBLGNBQWMsQ0FBQyxLQUF3QjtRQUN0QyxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztRQUMxQixJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxLQUF3QjtRQUNoRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUVELHNEQUFzRDtJQUN0RCxrQkFBa0IsQ0FBQyxNQUFXLElBQVMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RSxlQUFlLENBQUMsS0FBVSxJQUE2QixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVGLGdCQUFnQixDQUFDLEtBQVUsSUFBb0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRixvQkFBb0IsQ0FBQyxRQUFnQixJQUFTLE9BQU8sU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNqRSx5QkFBeUIsQ0FBQyxLQUFVLEVBQUUsTUFBeUIsSUFBa0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0SCx1QkFBdUIsS0FBcUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqRixLQUFLLENBQUMsSUFBUyxFQUFFLEtBQVUsRUFBRSxNQUF5QixJQUFrQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdHLGlCQUFpQixDQUFDLFNBQWMsSUFBUyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDNUQsT0FBTyxLQUFXLENBQUM7Q0FDbkIifQ==