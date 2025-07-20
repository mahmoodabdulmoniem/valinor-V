/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extHostProtocol from './extHost.protocol.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
export class ExtHostChatStatus {
    constructor(mainContext) {
        this._items = new Map();
        this._proxy = mainContext.getProxy(extHostProtocol.MainContext.MainThreadChatStatus);
    }
    createChatStatusItem(extension, id) {
        const internalId = asChatItemIdentifier(extension.identifier, id);
        if (this._items.has(internalId)) {
            throw new Error(`Chat status item '${id}' already exists`);
        }
        const state = {
            id: internalId,
            title: '',
            description: '',
            detail: '',
        };
        let disposed = false;
        let visible = false;
        const syncState = () => {
            if (disposed) {
                throw new Error('Chat status item is disposed');
            }
            if (!visible) {
                return;
            }
            this._proxy.$setEntry(id, state);
        };
        const item = Object.freeze({
            id: id,
            get title() {
                return state.title;
            },
            set title(value) {
                state.title = value;
                syncState();
            },
            get description() {
                return state.description;
            },
            set description(value) {
                state.description = value;
                syncState();
            },
            get detail() {
                return state.detail;
            },
            set detail(value) {
                state.detail = value;
                syncState();
            },
            show: () => {
                visible = true;
                syncState();
            },
            hide: () => {
                visible = false;
                this._proxy.$disposeEntry(id);
            },
            dispose: () => {
                disposed = true;
                this._proxy.$disposeEntry(id);
                this._items.delete(internalId);
            },
        });
        this._items.set(internalId, item);
        return item;
    }
}
function asChatItemIdentifier(extension, id) {
    return `${ExtensionIdentifier.toKey(extension)}.${id}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENoYXRTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RDaGF0U3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxlQUFlLE1BQU0sdUJBQXVCLENBQUM7QUFDekQsT0FBTyxFQUFFLG1CQUFtQixFQUF5QixNQUFNLG1EQUFtRCxDQUFDO0FBRS9HLE1BQU0sT0FBTyxpQkFBaUI7SUFNN0IsWUFDQyxXQUF5QztRQUh6QixXQUFNLEdBQUcsSUFBSSxHQUFHLEVBQWlDLENBQUM7UUFLbEUsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUN0RixDQUFDO0lBRUQsb0JBQW9CLENBQUMsU0FBZ0MsRUFBRSxFQUFVO1FBQ2hFLE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbEUsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQXNDO1lBQ2hELEVBQUUsRUFBRSxVQUFVO1lBQ2QsS0FBSyxFQUFFLEVBQUU7WUFDVCxXQUFXLEVBQUUsRUFBRTtZQUNmLE1BQU0sRUFBRSxFQUFFO1NBQ1YsQ0FBQztRQUVGLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQztRQUNyQixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDcEIsTUFBTSxTQUFTLEdBQUcsR0FBRyxFQUFFO1lBQ3RCLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQ2pELENBQUM7WUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTztZQUNSLENBQUM7WUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEMsQ0FBQyxDQUFDO1FBRUYsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBd0I7WUFDakQsRUFBRSxFQUFFLEVBQUU7WUFFTixJQUFJLEtBQUs7Z0JBQ1IsT0FBTyxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQ3BCLENBQUM7WUFDRCxJQUFJLEtBQUssQ0FBQyxLQUErQztnQkFDeEQsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBQ3BCLFNBQVMsRUFBRSxDQUFDO1lBQ2IsQ0FBQztZQUVELElBQUksV0FBVztnQkFDZCxPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUM7WUFDMUIsQ0FBQztZQUNELElBQUksV0FBVyxDQUFDLEtBQWE7Z0JBQzVCLEtBQUssQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO2dCQUMxQixTQUFTLEVBQUUsQ0FBQztZQUNiLENBQUM7WUFFRCxJQUFJLE1BQU07Z0JBQ1QsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBQ3JCLENBQUM7WUFDRCxJQUFJLE1BQU0sQ0FBQyxLQUF5QjtnQkFDbkMsS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7Z0JBQ3JCLFNBQVMsRUFBRSxDQUFDO1lBQ2IsQ0FBQztZQUVELElBQUksRUFBRSxHQUFHLEVBQUU7Z0JBQ1YsT0FBTyxHQUFHLElBQUksQ0FBQztnQkFDZixTQUFTLEVBQUUsQ0FBQztZQUNiLENBQUM7WUFDRCxJQUFJLEVBQUUsR0FBRyxFQUFFO2dCQUNWLE9BQU8sR0FBRyxLQUFLLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQy9CLENBQUM7WUFDRCxPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUNiLFFBQVEsR0FBRyxJQUFJLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNoQyxDQUFDO1NBQ0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNEO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxTQUE4QixFQUFFLEVBQVU7SUFDdkUsT0FBTyxHQUFHLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztBQUN4RCxDQUFDIn0=