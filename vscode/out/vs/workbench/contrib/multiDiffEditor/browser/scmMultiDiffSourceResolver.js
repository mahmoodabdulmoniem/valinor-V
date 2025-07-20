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
var ScmMultiDiffSourceResolver_1, ScmHistoryItemResolver_1;
import { ValueWithChangeEvent } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableFromEvent, ValueWithChangeEventFromObservable, waitForState } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize2 } from '../../../../nls.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IActivityService, ProgressBadge } from '../../../services/activity/common/activity.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ISCMService } from '../../scm/common/scm.js';
import { IMultiDiffSourceResolverService, MultiDiffEditorItem } from './multiDiffSourceResolverService.js';
let ScmMultiDiffSourceResolver = class ScmMultiDiffSourceResolver {
    static { ScmMultiDiffSourceResolver_1 = this; }
    static { this._scheme = 'scm-multi-diff-source'; }
    static getMultiDiffSourceUri(repositoryUri, groupId) {
        return URI.from({
            scheme: ScmMultiDiffSourceResolver_1._scheme,
            query: JSON.stringify({ repositoryUri, groupId }),
        });
    }
    static parseUri(uri) {
        if (uri.scheme !== ScmMultiDiffSourceResolver_1._scheme) {
            return undefined;
        }
        let query;
        try {
            query = JSON.parse(uri.query);
        }
        catch (e) {
            return undefined;
        }
        if (typeof query !== 'object' || query === null) {
            return undefined;
        }
        const { repositoryUri, groupId } = query;
        if (typeof repositoryUri !== 'string' || typeof groupId !== 'string') {
            return undefined;
        }
        return { repositoryUri: URI.parse(repositoryUri), groupId };
    }
    constructor(_scmService, _activityService) {
        this._scmService = _scmService;
        this._activityService = _activityService;
    }
    canHandleUri(uri) {
        return ScmMultiDiffSourceResolver_1.parseUri(uri) !== undefined;
    }
    async resolveDiffSource(uri) {
        const { repositoryUri, groupId } = ScmMultiDiffSourceResolver_1.parseUri(uri);
        const repository = await waitForState(observableFromEvent(this, this._scmService.onDidAddRepository, () => [...this._scmService.repositories].find(r => r.provider.rootUri?.toString() === repositoryUri.toString())));
        const group = await waitForState(observableFromEvent(this, repository.provider.onDidChangeResourceGroups, () => repository.provider.groups.find(g => g.id === groupId)));
        const scmActivities = observableFromEvent(this._activityService.onDidChangeActivity, () => [...this._activityService.getViewContainerActivities('workbench.view.scm')]);
        const scmViewHasNoProgressBadge = scmActivities.map(activities => !activities.some(a => a.badge instanceof ProgressBadge));
        await waitForState(scmViewHasNoProgressBadge, v => v);
        return new ScmResolvedMultiDiffSource(group, repository);
    }
};
ScmMultiDiffSourceResolver = ScmMultiDiffSourceResolver_1 = __decorate([
    __param(0, ISCMService),
    __param(1, IActivityService)
], ScmMultiDiffSourceResolver);
export { ScmMultiDiffSourceResolver };
let ScmHistoryItemResolver = class ScmHistoryItemResolver {
    static { ScmHistoryItemResolver_1 = this; }
    static { this.scheme = 'scm-history-item'; }
    static getMultiDiffSourceUri(provider, historyItem) {
        const historyItemParentId = historyItem.parentIds.length > 0 ? historyItem.parentIds[0] : undefined;
        return URI.from({
            scheme: ScmHistoryItemResolver_1.scheme,
            path: provider.rootUri?.fsPath,
            query: JSON.stringify({
                repositoryId: provider.id,
                historyItemId: historyItem.id,
                historyItemParentId
            })
        }, true);
    }
    static parseUri(uri) {
        if (uri.scheme !== ScmHistoryItemResolver_1.scheme) {
            return undefined;
        }
        let query;
        try {
            query = JSON.parse(uri.query);
        }
        catch (e) {
            return undefined;
        }
        if (typeof query !== 'object' || query === null) {
            return undefined;
        }
        const { repositoryId, historyItemId, historyItemParentId } = query;
        if (typeof repositoryId !== 'string' || typeof historyItemId !== 'string' ||
            (typeof historyItemParentId !== 'string' && historyItemParentId !== undefined)) {
            return undefined;
        }
        return { repositoryId, historyItemId, historyItemParentId };
    }
    constructor(_scmService) {
        this._scmService = _scmService;
    }
    canHandleUri(uri) {
        return ScmHistoryItemResolver_1.parseUri(uri) !== undefined;
    }
    async resolveDiffSource(uri) {
        const { repositoryId, historyItemId, historyItemParentId } = ScmHistoryItemResolver_1.parseUri(uri);
        const repository = this._scmService.getRepository(repositoryId);
        const historyProvider = repository?.provider.historyProvider.get();
        const historyItemChanges = await historyProvider?.provideHistoryItemChanges(historyItemId, historyItemParentId) ?? [];
        const resources = ValueWithChangeEvent.const(historyItemChanges.map(change => new MultiDiffEditorItem(change.originalUri, change.modifiedUri, change.uri)));
        return { resources };
    }
};
ScmHistoryItemResolver = ScmHistoryItemResolver_1 = __decorate([
    __param(0, ISCMService)
], ScmHistoryItemResolver);
export { ScmHistoryItemResolver };
class ScmResolvedMultiDiffSource {
    constructor(_group, _repository) {
        this._group = _group;
        this._repository = _repository;
        this._resources = observableFromEvent(this._group.onDidChangeResources, () => /** @description resources */ this._group.resources.map(e => new MultiDiffEditorItem(e.multiDiffEditorOriginalUri, e.multiDiffEditorModifiedUri, e.sourceUri)));
        this.resources = new ValueWithChangeEventFromObservable(this._resources);
        this.contextKeys = {
            scmResourceGroup: this._group.id,
            scmProvider: this._repository.provider.providerId,
        };
    }
}
let ScmMultiDiffSourceResolverContribution = class ScmMultiDiffSourceResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.scmMultiDiffSourceResolver'; }
    constructor(instantiationService, multiDiffSourceResolverService) {
        super();
        this._register(multiDiffSourceResolverService.registerResolver(instantiationService.createInstance(ScmHistoryItemResolver)));
        this._register(multiDiffSourceResolverService.registerResolver(instantiationService.createInstance(ScmMultiDiffSourceResolver)));
    }
};
ScmMultiDiffSourceResolverContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IMultiDiffSourceResolverService)
], ScmMultiDiffSourceResolverContribution);
export { ScmMultiDiffSourceResolverContribution };
export class OpenScmGroupAction extends Action2 {
    static async openMultiFileDiffEditor(editorService, label, repositoryRootUri, resourceGroupId, options) {
        if (!repositoryRootUri) {
            return;
        }
        const multiDiffSource = ScmMultiDiffSourceResolver.getMultiDiffSourceUri(repositoryRootUri.toString(), resourceGroupId);
        return await editorService.openEditor({ label, multiDiffSource, options });
    }
    constructor() {
        super({
            id: '_workbench.openScmMultiDiffEditor',
            title: localize2('openChanges', 'Open Changes'),
            f1: false
        });
    }
    async run(accessor, options) {
        const editorService = accessor.get(IEditorService);
        await OpenScmGroupAction.openMultiFileDiffEditor(editorService, options.title, URI.revive(options.repositoryUri), options.resourceGroupId);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtTXVsdGlEaWZmU291cmNlUmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL211bHRpRGlmZkVkaXRvci9icm93c2VyL3NjbU11bHRpRGlmZlNvdXJjZVJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGtDQUFrQyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzlILE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUM7QUFFcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV6RSxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVsRixPQUFPLEVBQW1ELFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3ZHLE9BQU8sRUFBNEIsK0JBQStCLEVBQTRCLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFeEosSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMEI7O2FBQ2QsWUFBTyxHQUFHLHVCQUF1QixBQUExQixDQUEyQjtJQUVuRCxNQUFNLENBQUMscUJBQXFCLENBQUMsYUFB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