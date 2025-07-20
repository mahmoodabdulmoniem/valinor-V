/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { Event } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
export class ExtensionSecrets {
    #secretState;
    constructor(extensionDescription, secretState) {
        this.disposables = new DisposableStore();
        this._extensionDescription = extensionDescription;
        this._id = ExtensionIdentifier.toKey(extensionDescription.identifier);
        this.#secretState = secretState;
        this.onDidChange = Event.map(Event.filter(this.#secretState.onDidChangePassword, e => e.extensionId === this._id), e => ({ key: e.key }), this.disposables);
    }
    dispose() {
        this.disposables.dispose();
    }
    get(key) {
        return this.#secretState.get(this._id, key);
    }
    store(key, value) {
        return this.#secretState.store(this._id, key, value);
    }
    delete(key) {
        return this.#secretState.delete(this._id, key);
    }
    keys() {
        checkProposedApiEnabled(this._extensionDescription, 'secretStorageKeys');
        return this.#secretState.keys(this._id) || [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNlY3JldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RTZWNyZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBeUIsTUFBTSxtREFBbUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRXpGLE1BQU0sT0FBTyxnQkFBZ0I7SUFJbkIsWUFBWSxDQUFxQjtJQUsxQyxZQUFZLG9CQUEyQyxFQUFFLFdBQStCO1FBRi9FLGdCQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUc1QyxJQUFJLENBQUMscUJBQXFCLEdBQUcsb0JBQW9CLENBQUM7UUFDbEQsSUFBSSxDQUFDLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdEUsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUM7UUFFaEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUMzQixLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFDcEYsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUNyQixJQUFJLENBQUMsV0FBVyxDQUNoQixDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQVcsRUFBRSxLQUFhO1FBQy9CLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUVELE1BQU0sQ0FBQyxHQUFXO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQsSUFBSTtRQUNILHVCQUF1QixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3pFLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMvQyxDQUFDO0NBQ0QifQ==