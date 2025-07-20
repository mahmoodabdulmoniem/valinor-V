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
import { ResourceMap } from '../../../../base/common/map.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { isTextFileEditorModel, ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { Disposable, DisposableMap, DisposableStore, ReferenceCollection } from '../../../../base/common/lifecycle.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { shouldSynchronizeModel } from '../../../../editor/common/model.js';
import { compareChanges, getModifiedEndLineNumber, IQuickDiffService } from '../common/quickDiff.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { ISCMService } from '../common/scm.js';
import { sortedDiff, equals } from '../../../../base/common/arrays.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DiffState } from '../../../../editor/browser/widget/diffEditor/diffEditorViewModel.js';
import { toLineChanges } from '../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IChatEditingService } from '../../chat/common/chatEditingService.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { autorun, autorunWithStore } from '../../../../base/common/observable.js';
export const IQuickDiffModelService = createDecorator('IQuickDiffModelService');
const decoratorQuickDiffModelOptions = {
    algorithm: 'advanced',
    maxComputationTimeMs: 1000
};
let QuickDiffModelReferenceCollection = class QuickDiffModelReferenceCollection extends ReferenceCollection {
    constructor(_instantiationService) {
        super();
        this._instantiationService = _instantiationService;
    }
    createReferencedObject(_key, textFileModel, options) {
        return this._instantiationService.createInstance(QuickDiffModel, textFileModel, options);
    }
    destroyReferencedObject(_key, object) {
        object.dispose();
    }
};
QuickDiffModelReferenceCollection = __decorate([
    __param(0, IInstantiationService)
], QuickDiffModelReferenceCollection);
let QuickDiffModelService = class QuickDiffModelService {
    constructor(instantiationService, textFileService, uriIdentityService) {
        this.instantiationService = instantiationService;
        this.textFileService = textFileService;
        this.uriIdentityService = uriIdentityService;
        this._references = this.instantiationService.createInstance(QuickDiffModelReferenceCollection);
    }
    createQuickDiffModelReference(resource, options = decoratorQuickDiffModelOptions) {
        const textFileModel = this.textFileService.files.get(resource);
        if (!textFileModel?.isResolved()) {
            return undefined;
        }
        resource = this.uriIdentityService.asCanonicalUri(resource).with({ query: JSON.stringify(options) });
        return this._references.acquire(resource.toString(), textFileModel, options);
    }
};
QuickDiffModelService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITextFileService),
    __param(2, IUriIdentityService)
], QuickDiffModelService);
export { QuickDiffModelService };
let QuickDiffModel = class QuickDiffModel extends Disposable {
    get originalTextModels() {
        return Iterable.map(this._originalEditorModels.values(), editorModel => editorModel.textEditorModel);
    }
    get allChanges() { return this._allChanges; }
    get changes() { return this._changes; }
    get quickDiffChanges() { return this._quickDiffChanges; }
    constructor(textFileModel, options, scmService, quickDiffService, editorWorkerService, configurationService, textModelResolverService, _chatEditingService, progressService) {
        super();
        this.options = options;
        this.scmService = scmService;
        this.quickDiffService = quickDiffService;
        this.editorWorkerService = editorWorkerService;
        this.configurationService = configurationService;
        this.textModelResolverService = textModelResolverService;
        this._chatEditingService = _chatEditingService;
        this.progressService = progressService;
        this._originalEditorModels = new ResourceMap();
        this._originalEditorModelsDisposables = this._register(new DisposableStore());
        this._disposed = false;
        this._quickDiffs = [];
        this._diffDelayer = new ThrottledDelayer(200);
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._allChanges = [];
        this._changes = [];
        /**
         * Map of quick diff name to the index of the change in `this.changes`
         */
        this._quickDiffChanges = new Map();
        this._repositoryDisposables = new DisposableMap();
        this._model = textFileModel;
        this._register(textFileModel.textEditorModel.onDidChangeContent(() => this.triggerDiff()));
        this._register(Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.diffDecorationsIgnoreTrimWhitespace') || e.affectsConfiguration('diffEditor.ignoreTrimWhitespace'))(this.triggerDiff, this));
        this._register(scmService.onDidAddRepository(this.onDidAddRepository, this));
        for (const r of scmService.repositories) {
            this.onDidAddRepository(r);
        }
        this._register(this._model.onDidChangeEncoding(() => {
            this._diffDelayer.cancel();
            this._quickDiffs = [];
            this._originalEditorModels.clear();
            this._quickDiffsPromise = undefined;
            this.setChanges([], [], new Map());
            this.triggerDiff();
        }));
        this._register(this.quickDiffService.onDidChangeQuickDiffProviders(() => this.triggerDiff()));
        this._register(autorunWithStore((r, store) => {
            for (const session of this._chatEditingService.editingSessionsObs.read(r)) {
                store.add(autorun(r => {
                    for (const entry of session.entries.read(r)) {
                        entry.state.read(r); // signal
                    }
                    this.triggerDiff();
                }));
            }
        }));
        this.triggerDiff();
    }
    get quickDiffs() {
        return this._quickDiffs;
    }
    getQuickDiffResults() {
        return this._quickDiffs.map(quickDiff => {
            const changes = this.allChanges
                .filter(change => change.providerId === quickDiff.id);
            return {
                original: quickDiff.originalResource,
                modified: this._model.resource,
                changes: changes.map(change => change.change),
                changes2: changes.map(change => change.change2)
            };
        });
    }
    getDiffEditorModel(originalUri) {
        const editorModel = this._originalEditorModels.get(originalUri);
        return editorModel ?
            {
                modified: this._model.textEditorModel,
                original: editorModel.textEditorModel
            } : undefined;
    }
    onDidAddRepository(repository) {
        const disposables = new DisposableStore();
        disposables.add(repository.provider.onDidChangeResources(this.triggerDiff, this));
        const onDidRemoveRepository = Event.filter(this.scmService.onDidRemoveRepository, r => r === repository);
        disposables.add(onDidRemoveRepository(() => this._repositoryDisposables.deleteAndDispose(repository)));
        this._repositoryDisposables.set(repository, disposables);
        this.triggerDiff();
    }
    triggerDiff() {
        if (!this._diffDelayer) {
            return;
        }
        this._diffDelayer
            .trigger(async () => {
            const result = await this.diff();
            const editorModels = Array.from(this._originalEditorModels.values());
            if (!result || this._disposed || this._model.isDisposed() || editorModels.some(editorModel => editorModel.isDisposed())) {
                return; // disposed
            }
            this.setChanges(result.allChanges, result.changes, result.mapChanges);
        })
            .catch(err => onUnexpectedError(err));
    }
    setChanges(allChanges, changes, mapChanges) {
        const diff = sortedDiff(this.changes, changes, (a, b) => compareChanges(a.change, b.change));
        this._allChanges = allChanges;
        this._changes = changes;
        this._quickDiffChanges = mapChanges;
        this._onDidChange.fire({ changes, diff });
    }
    diff() {
        return this.progressService.withProgress({ location: 3 /* ProgressLocation.Scm */, delay: 250 }, async () => {
            const originalURIs = await this.getQuickDiffsPromise();
            if (this._disposed || this._model.isDisposed() || (originalURIs.length === 0)) {
                // Disposed
                return Promise.resolve({ allChanges: [], changes: [], mapChanges: new Map() });
            }
            const quickDiffs = originalURIs
                .filter(quickDiff => this.editorWorkerService.canComputeDirtyDiff(quickDiff.originalResource, this._model.resource));
            if (quickDiffs.length === 0) {
                // All files are too large
                return Promise.resolve({ allChanges: [], changes: [], mapChanges: new Map() });
            }
            const quickDiffPrimary = quickDiffs.find(quickDiff => quickDiff.kind === 'primary');
            const ignoreTrimWhitespaceSetting = this.configurationService.getValue('scm.diffDecorationsIgnoreTrimWhitespace');
            const ignoreTrimWhitespace = ignoreTrimWhitespaceSetting === 'inherit'
                ? this.configurationService.getValue('diffEditor.ignoreTrimWhitespace')
                : ignoreTrimWhitespaceSetting !== 'false';
            const diffs = [];
            const secondaryDiffs = [];
            for (const quickDiff of quickDiffs) {
                const diff = await this._diff(quickDiff.originalResource, this._model.resource, ignoreTrimWhitespace);
                if (diff.changes && diff.changes2 && diff.changes.length === diff.changes2.length) {
                    for (let index = 0; index < diff.changes.length; index++) {
                        const change2 = diff.changes2[index];
                        // The secondary diffs are complimentary to the primary diffs, and
                        // they can overlap. We need to remove the secondary quick diffs that
                        // overlap for the UI, but we need to expose all diffs through the API.
                        if (quickDiffPrimary && quickDiff.kind === 'secondary') {
                            // Check whether the:
                            // 1. the modified line range is equal
                            // 2. the original line range length is equal
                            const primaryQuickDiffChange = diffs
                                .find(d => d.change2.modified.equals(change2.modified) &&
                                d.change2.original.length === change2.original.length);
                            if (primaryQuickDiffChange) {
                                // Check whether the original content matches
                                const primaryModel = this._originalEditorModels.get(quickDiffPrimary.originalResource)?.textEditorModel;
                                const primaryContent = primaryModel?.getValueInRange(primaryQuickDiffChange.change2.toRangeMapping().originalRange);
                                const secondaryModel = this._originalEditorModels.get(quickDiff.originalResource)?.textEditorModel;
                                const secondaryContent = secondaryModel?.getValueInRange(change2.toRangeMapping().originalRange);
                                if (primaryContent === secondaryContent) {
                                    secondaryDiffs.push({
                                        providerId: quickDiff.id,
                                        original: quickDiff.originalResource,
                                        modified: this._model.resource,
                                        change: diff.changes[index],
                                        change2: diff.changes2[index]
                                    });
                                    continue;
                                }
                            }
                        }
                        diffs.push({
                            providerId: quickDiff.id,
                            original: quickDiff.originalResource,
                            modified: this._model.resource,
                            change: diff.changes[index],
                            change2: diff.changes2[index]
                        });
                    }
                }
            }
            const diffsSorted = diffs.sort((a, b) => compareChanges(a.change, b.change));
            const allDiffsSorted = [...diffs, ...secondaryDiffs].sort((a, b) => compareChanges(a.change, b.change));
            const map = new Map();
            for (let i = 0; i < diffsSorted.length; i++) {
                const providerId = diffsSorted[i].providerId;
                if (!map.has(providerId)) {
                    map.set(providerId, []);
                }
                map.get(providerId).push(i);
            }
            return { allChanges: allDiffsSorted, changes: diffsSorted, mapChanges: map };
        });
    }
    async _diff(original, modified, ignoreTrimWhitespace) {
        const maxComputationTimeMs = this.options.maxComputationTimeMs ?? Number.MAX_SAFE_INTEGER;
        const result = await this.editorWorkerService.computeDiff(original, modified, {
            computeMoves: false, ignoreTrimWhitespace, maxComputationTimeMs
        }, this.options.algorithm);
        return { changes: result ? toLineChanges(DiffState.fromDiffResult(result)) : null, changes2: result?.changes ?? null };
    }
    getQuickDiffsPromise() {
        if (this._quickDiffsPromise) {
            return this._quickDiffsPromise;
        }
        this._quickDiffsPromise = this.getOriginalResource().then(async (quickDiffs) => {
            if (this._disposed) { // disposed
                return [];
            }
            if (quickDiffs.length === 0) {
                this._quickDiffs = [];
                this._originalEditorModels.clear();
                return [];
            }
            if (equals(this._quickDiffs, quickDiffs, (a, b) => a.id === b.id &&
                a.originalResource.toString() === b.originalResource.toString() &&
                this.quickDiffService.isQuickDiffProviderVisible(a.id) === this.quickDiffService.isQuickDiffProviderVisible(b.id))) {
                return quickDiffs;
            }
            this._quickDiffs = quickDiffs;
            this._originalEditorModels.clear();
            this._originalEditorModelsDisposables.clear();
            return (await Promise.all(quickDiffs.map(async (quickDiff) => {
                try {
                    const ref = await this.textModelResolverService.createModelReference(quickDiff.originalResource);
                    if (this._disposed) { // disposed
                        ref.dispose();
                        return [];
                    }
                    this._originalEditorModels.set(quickDiff.originalResource, ref.object);
                    if (isTextFileEditorModel(ref.object)) {
                        const encoding = this._model.getEncoding();
                        if (encoding) {
                            ref.object.setEncoding(encoding, 1 /* EncodingMode.Decode */);
                        }
                    }
                    this._originalEditorModelsDisposables.add(ref);
                    this._originalEditorModelsDisposables.add(ref.object.textEditorModel.onDidChangeContent(() => this.triggerDiff()));
                    return quickDiff;
                }
                catch (error) {
                    return []; // possibly invalid reference
                }
            }))).flat();
        });
        return this._quickDiffsPromise.finally(() => {
            this._quickDiffsPromise = undefined;
        });
    }
    async getOriginalResource() {
        if (this._disposed) {
            return Promise.resolve([]);
        }
        const uri = this._model.resource;
        // disable dirty diff when doing chat edits
        const isBeingModifiedByChatEdits = this._chatEditingService.editingSessionsObs.get()
            .some(session => session.getEntry(uri)?.state.get() === 0 /* ModifiedFileEntryState.Modified */);
        if (isBeingModifiedByChatEdits) {
            return Promise.resolve([]);
        }
        const isSynchronized = this._model.textEditorModel ? shouldSynchronizeModel(this._model.textEditorModel) : undefined;
        return this.quickDiffService.getQuickDiffs(uri, this._model.getLanguageId(), isSynchronized);
    }
    findNextClosestChange(lineNumber, inclusive = true, providerId) {
        const visibleQuickDiffIds = this.quickDiffs
            .filter(quickDiff => (!providerId || quickDiff.id === providerId) &&
            this.quickDiffService.isQuickDiffProviderVisible(quickDiff.id))
            .map(quickDiff => quickDiff.id);
        if (!inclusive) {
            // Next visible change
            let nextChangeIndex = this.changes
                .findIndex(change => visibleQuickDiffIds.includes(change.providerId) &&
                change.change.modifiedStartLineNumber > lineNumber);
            if (nextChangeIndex !== -1) {
                return nextChangeIndex;
            }
            // First visible change
            nextChangeIndex = this.changes
                .findIndex(change => visibleQuickDiffIds.includes(change.providerId));
            return nextChangeIndex !== -1 ? nextChangeIndex : 0;
        }
        const primaryQuickDiffId = this.quickDiffs
            .find(quickDiff => quickDiff.kind === 'primary')?.id;
        const primaryInclusiveChangeIndex = this.changes
            .findIndex(change => change.providerId === primaryQuickDiffId &&
            change.change.modifiedStartLineNumber <= lineNumber &&
            getModifiedEndLineNumber(change.change) >= lineNumber);
        if (primaryInclusiveChangeIndex !== -1) {
            return primaryInclusiveChangeIndex;
        }
        // Next visible change
        let nextChangeIndex = this.changes
            .findIndex(change => visibleQuickDiffIds.includes(change.providerId) &&
            change.change.modifiedStartLineNumber <= lineNumber &&
            getModifiedEndLineNumber(change.change) >= lineNumber);
        if (nextChangeIndex !== -1) {
            return nextChangeIndex;
        }
        // First visible change
        nextChangeIndex = this.changes
            .findIndex(change => visibleQuickDiffIds.includes(change.providerId));
        return nextChangeIndex !== -1 ? nextChangeIndex : 0;
    }
    findPreviousClosestChange(lineNumber, inclusive = true, providerId) {
        for (let i = this.changes.length - 1; i >= 0; i--) {
            if (providerId && this.changes[i].providerId !== providerId) {
                continue;
            }
            // Skip quick diffs that are not visible
            const quickDiff = this.quickDiffs.find(quickDiff => quickDiff.id === this.changes[i].providerId);
            if (!quickDiff || !this.quickDiffService.isQuickDiffProviderVisible(quickDiff.id)) {
                continue;
            }
            const change = this.changes[i].change;
            if (inclusive) {
                if (change.modifiedStartLineNumber <= lineNumber) {
                    return i;
                }
            }
            else {
                if (getModifiedEndLineNumber(change) < lineNumber) {
                    return i;
                }
            }
        }
        return this.changes.length - 1;
    }
    dispose() {
        this._disposed = true;
        this._quickDiffs = [];
        this._diffDelayer.cancel();
        this._originalEditorModels.clear();
        this._repositoryDisposables.dispose();
        super.dispose();
    }
};
QuickDiffModel = __decorate([
    __param(2, ISCMService),
    __param(3, IQuickDiffService),
    __param(4, IEditorWorkerService),
    __param(5, IConfigurationService),
    __param(6, ITextModelService),
    __param(7, IChatEditingService),
    __param(8, IProgressService)
], QuickDiffModel);
export { QuickDiffModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3F1aWNrRGlmZk1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDcEgsT0FBTyxFQUE4QyxxQkFBcUIsRUFBd0IsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMzSyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWMsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuSSxPQUFPLEVBQXFCLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDN0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFHN0YsT0FBTyxFQUE0QixpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3BILE9BQU8sRUFBYyxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsaUJBQWlCLEVBQStDLE1BQU0sd0JBQXdCLENBQUM7QUFDbEosT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFrQixXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FB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