/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise, raceCancellation } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { AiSettingsSearchResultKind, IAiSettingsSearchService } from './aiSettingsSearch.js';
export class AiSettingsSearchService extends Disposable {
    constructor() {
        super(...arguments);
        this._providers = [];
        this._llmRankedResultsPromises = new Map();
        this._embeddingsResultsPromises = new Map();
        this._onProviderRegistered = this._register(new Emitter());
        this.onProviderRegistered = this._onProviderRegistered.event;
    }
    static { this.MAX_PICKS = 5; }
    isEnabled() {
        return this._providers.length > 0;
    }
    registerSettingsSearchProvider(provider) {
        this._providers.push(provider);
        this._onProviderRegistered.fire();
        return {
            dispose: () => {
                const index = this._providers.indexOf(provider);
                if (index !== -1) {
                    this._providers.splice(index, 1);
                }
            }
        };
    }
    startSearch(query, embeddingsOnly, token) {
        if (!this.isEnabled()) {
            throw new Error('No settings search providers registered');
        }
        this._embeddingsResultsPromises.delete(query);
        this._llmRankedResultsPromises.delete(query);
        this._providers.forEach(provider => provider.searchSettings(query, { limit: AiSettingsSearchService.MAX_PICKS, embeddingsOnly }, token));
    }
    async getEmbeddingsResults(query, token) {
        if (!this.isEnabled()) {
            throw new Error('No settings search providers registered');
        }
        const existingPromise = this._embeddingsResultsPromises.get(query);
        if (existingPromise) {
            const result = await existingPromise.p;
            return result ?? null;
        }
        const promise = new DeferredPromise();
        this._embeddingsResultsPromises.set(query, promise);
        const result = await raceCancellation(promise.p, token);
        return result ?? null;
    }
    async getLLMRankedResults(query, token) {
        if (!this.isEnabled()) {
            throw new Error('No settings search providers registered');
        }
        const existingPromise = this._llmRankedResultsPromises.get(query);
        if (existingPromise) {
            const result = await existingPromise.p;
            return result ?? null;
        }
        const promise = new DeferredPromise();
        this._llmRankedResultsPromises.set(query, promise);
        const result = await raceCancellation(promise.p, token);
        return result ?? null;
    }
    handleSearchResult(result) {
        if (!this.isEnabled()) {
            return;
        }
        if (result.kind === AiSettingsSearchResultKind.EMBEDDED) {
            const promise = this._embeddingsResultsPromises.get(result.query);
            if (promise) {
                promise.complete(result.settings);
            }
            else {
                const parkedPromise = new DeferredPromise();
                parkedPromise.complete(result.settings);
                this._embeddingsResultsPromises.set(result.query, parkedPromise);
            }
        }
        else if (result.kind === AiSettingsSearchResultKind.LLM_RANKED) {
            const promise = this._llmRankedResultsPromises.get(result.query);
            if (promise) {
                promise.complete(result.settings);
            }
            else {
                const parkedPromise = new DeferredPromise();
                parkedPromise.complete(result.settings);
                this._llmRankedResultsPromises.set(result.query, parkedPromise);
            }
        }
    }
}
registerSingleton(IAiSettingsSearchService, AiSettingsSearchService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlTZXR0aW5nc1NlYXJjaFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9haVNldHRpbmdzU2VhcmNoL2NvbW1vbi9haVNldHRpbmdzU2VhcmNoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFckYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUEwQiwwQkFBMEIsRUFBNkIsd0JBQXdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVoSixNQUFNLE9BQU8sdUJBQXdCLFNBQVEsVUFBVTtJQUF2RDs7UUFJUyxlQUFVLEdBQWdDLEVBQUUsQ0FBQztRQUM3Qyw4QkFBeUIsR0FBMkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUM5RSwrQkFBMEIsR0FBMkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUUvRSwwQkFBcUIsR0FBa0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDMUUseUJBQW9CLEdBQWdCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7SUF5Ri9FLENBQUM7YUFoR3dCLGNBQVMsR0FBRyxDQUFDLEFBQUosQ0FBSztJQVN0QyxTQUFTO1FBQ1IsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVELDhCQUE4QixDQUFDLFFBQW1DO1FBQ2pF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