/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var QuickDiffService_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isEqualOrParent } from '../../../../base/common/resources.js';
import { score } from '../../../../editor/common/languageSelector.js';
import { Emitter } from '../../../../base/common/event.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
function createProviderComparer(uri) {
    return (a, b) => {
        if (a.rootUri && !b.rootUri) {
            return -1;
        }
        else if (!a.rootUri && b.rootUri) {
            return 1;
        }
        else if (!a.rootUri && !b.rootUri) {
            return 0;
        }
        const aIsParent = isEqualOrParent(uri, a.rootUri);
        const bIsParent = isEqualOrParent(uri, b.rootUri);
        if (aIsParent && bIsParent) {
            return providerComparer(a, b);
        }
        else if (aIsParent) {
            return -1;
        }
        else if (bIsParent) {
            return 1;
        }
        else {
            return 0;
        }
    };
}
function providerComparer(a, b) {
    if (a.kind === 'primary') {
        return -1;
    }
    else if (b.kind === 'primary') {
        return 1;
    }
    else if (a.kind === 'secondary') {
        return -1;
    }
    else if (b.kind === 'secondary') {
        return 1;
    }
    return 0;
}
let QuickDiffService = class QuickDiffService extends Disposable {
    static { QuickDiffService_1 = this; }
    static { this.STORAGE_KEY = 'workbench.scm.quickDiffProviders.hidden'; }
    get providers() {
        return Array.from(this.quickDiffProviders).sort(providerComparer);
    }
    constructor(storageService, uriIdentityService) {
        super();
        this.storageService = storageService;
        this.uriIdentityService = uriIdentityService;
        this.quickDiffProviders = new Set();
        this._onDidChangeQuickDiffProviders = this._register(new Emitter());
        this.onDidChangeQuickDiffProviders = this._onDidChangeQuickDiffProviders.event;
        this.hiddenQuickDiffProviders = new Set();
        this.loadState();
    }
    addQuickDiffProvider(quickDiff) {
        this.quickDiffProviders.add(quickDiff);
        this._onDidChangeQuickDiffProviders.fire();
        return {
            dispose: () => {
                this.quickDiffProviders.delete(quickDiff);
                this._onDidChangeQuickDiffProviders.fire();
            }
        };
    }
    async getQuickDiffs(uri, language = '', isSynchronized = false) {
        const providers = Array.from(this.quickDiffProviders)
            .filter(provider => !provider.rootUri || this.uriIdentityService.extUri.isEqualOrParent(uri, provider.rootUri))
            .sort(createProviderComparer(uri));
        const quickDiffOriginalResources = await Promise.allSettled(providers.map(async (provider) => {
            const scoreValue = provider.selector ? score(provider.selector, uri, language, isSynchronized, undefined, undefined) : 10;
            const originalResource = scoreValue > 0 ? await provider.getOriginalResource(uri) ?? undefined : undefined;
            return { provider, originalResource };
        }));
        const quickDiffs = [];
        for (const quickDiffOriginalResource of quickDiffOriginalResources) {
            if (quickDiffOriginalResource.status === 'rejected') {
                continue;
            }
            const { provider, originalResource } = quickDiffOriginalResource.value;
            if (!originalResource) {
                continue;
            }
            quickDiffs.push({
                id: provider.id,
                label: provider.label,
                kind: provider.kind,
                originalResource,
            });
        }
        return quickDiffs;
    }
    toggleQuickDiffProviderVisibility(id) {
        if (this.isQuickDiffProviderVisible(id)) {
            this.hiddenQuickDiffProviders.add(id);
        }
        else {
            this.hiddenQuickDiffProviders.delete(id);
        }
        this.saveState();
        this._onDidChangeQuickDiffProviders.fire();
    }
    isQuickDiffProviderVisible(id) {
        return !this.hiddenQuickDiffProviders.has(id);
    }
    loadState() {
        const raw = this.storageService.get(QuickDiffService_1.STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        if (raw) {
            try {
                this.hiddenQuickDiffProviders = new Set(JSON.parse(raw));
            }
            catch { }
        }
    }
    saveState() {
        if (this.hiddenQuickDiffProviders.size === 0) {
            this.storageService.remove(QuickDiffService_1.STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        }
        else {
            this.storageService.store(QuickDiffService_1.STORAGE_KEY, JSON.stringify(Array.from(this.hiddenQuickDiffProviders)), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
    }
};
QuickDiffService = QuickDiffService_1 = __decorate([
    __param(0, IStorageService),
    __param(1, IUriIdentityService)
], QuickDiffService);
export { QuickDiffService };
export async function getOriginalResource(quickDiffService, uri, language, isSynchronized) {
    const quickDiffs = await quickDiffService.getQuickDiffs(uri, language, isSynchronized);
    return quickDiffs.length > 0 ? quickDiffs[0].originalResource : null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL21haG1vb2RhYmR1bG1vbmllbS9EZXNrdG9wL3ZhbGlub3ItVi92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2NvbW1vbi9xdWlja0RpZmZTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFFL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5RyxTQUFTLHNCQUFzQixDQUFDLEdBQVE7SUFDdkMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUNmLElBQUksQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM3QixPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ1gsQ0FBQzthQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQyxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7YUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyQyxPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxPQUFR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