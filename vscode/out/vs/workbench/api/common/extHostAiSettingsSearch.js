/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext } from './extHost.protocol.js';
import { Disposable } from './extHostTypes.js';
import { Progress } from '../../../platform/progress/common/progress.js';
import { AiSettingsSearch } from './extHostTypeConverters.js';
export class ExtHostAiSettingsSearch {
    constructor(mainContext) {
        this._settingsSearchProviders = new Map();
        this._nextHandle = 0;
        this._proxy = mainContext.getProxy(MainContext.MainThreadAiSettingsSearch);
    }
    async $startSearch(handle, query, option, token) {
        if (this._settingsSearchProviders.size === 0) {
            throw new Error('No related information providers registered');
        }
        const provider = this._settingsSearchProviders.get(handle);
        if (!provider) {
            throw new Error('Settings search provider not found');
        }
        const progressReporter = new Progress((data) => {
            this._proxy.$handleSearchResult(handle, AiSettingsSearch.fromSettingsSearchResult(data));
        });
        return provider.provideSettingsSearchResults(query, option, progressReporter, token);
    }
    registerSettingsSearchProvider(extension, provider) {
        const handle = this._nextHandle;
        this._nextHandle++;
        this._settingsSearchProviders.set(handle, provider);
        this._proxy.$registerAiSettingsSearchProvider(handle);
        return new Disposable(() => {
            this._proxy.$unregisterAiSettingsSearchProvider(handle);
            this._settingsSearchProviders.delete(handle);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEFpU2V0dGluZ3NTZWFyY2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RBaVNldHRpbmdzU2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE9BQU8sRUFBOEMsV0FBVyxFQUFtQyxNQUFNLHVCQUF1QixDQUFDO0FBQ2pJLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFFOUQsTUFBTSxPQUFPLHVCQUF1QjtJQU1uQyxZQUFZLFdBQXlCO1FBTDdCLDZCQUF3QixHQUF3QyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzFFLGdCQUFXLEdBQUcsQ0FBQyxDQUFDO1FBS3ZCLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFjLEVBQUUsS0FBYSxFQUFFLE1BQXVDLEVBQUUsS0FBd0I7UUFDbEgsSUFBSSxJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzlDLE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQztRQUNoRSxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixNQUFNLElBQUksS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUVELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxRQUFRLENBQXVCLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDcEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMxRixDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sUUFBUSxDQUFDLDRCQUE0QixDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVELDhCQUE4QixDQUFDLFNBQWdDLEVBQUUsUUFBZ0M7UUFDaEcsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNoQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDcEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN0RCxPQUFPLElBQUksVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3hELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QifQ==