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
var MultiDiffEditorInput_1;
import { LazyStatefulPromise, raceTimeout } from '../../../../base/common/async.js';
import { BugIndicatingError, onUnexpectedError } from '../../../../base/common/errors.js';
import { Event, ValueWithChangeEvent } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { parse } from '../../../../base/common/marshalling.js';
import { Schemas } from '../../../../base/common/network.js';
import { deepClone } from '../../../../base/common/objects.js';
import { ObservableLazyPromise, ValueWithChangeEventFromObservable, autorun, constObservable, derived, mapObservableArrayCached, observableFromEvent, observableFromValueWithChangeEvent, observableValue, recomputeInitiallyAndOnChange } from '../../../../base/common/observable.js';
import { isDefined, isObject } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { RefCounted } from '../../../../editor/browser/widget/diffEditor/utils.js';
import { MultiDiffEditorViewModel } from '../../../../editor/browser/widget/multiDiffEditor/multiDiffEditorViewModel.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { MultiDiffEditorIcon } from './icons.contribution.js';
import { IMultiDiffSourceResolverService, MultiDiffEditorItem } from './multiDiffSourceResolverService.js';
let MultiDiffEditorInput = class MultiDiffEditorInput extends EditorInput {
    static { MultiDiffEditorInput_1 = this; }
    static fromResourceMultiDiffEditorInput(input, instantiationService) {
        if (!input.multiDiffSource && !input.resources) {
            throw new BugIndicatingError('MultiDiffEditorInput requires either multiDiffSource or resources');
        }
        const multiDiffSource = input.multiDiffSource ?? URI.parse(`multi-diff-editor:${new Date().getMilliseconds().toString() + Math.random().toString()}`);
        return instantiationService.createInstance(MultiDiffEditorInput_1, multiDiffSource, input.label, input.resources?.map(resource => {
            return new MultiDiffEditorItem(resource.original.resource, resource.modified.resource, resource.goToFileResource);
        }), input.isTransient ?? false);
    }
    static fromSerialized(data, instantiationService) {
        return instantiationService.createInstance(MultiDiffEditorInput_1, URI.parse(data.multiDiffSourceUri), data.label, data.resources?.map(resource => new MultiDiffEditorItem(resource.originalUri ? URI.parse(resource.originalUri) : undefined, resource.modifiedUri ? URI.parse(resource.modifiedUri) : undefined, resource.goToFileUri ? URI.parse(resource.goToFileUri) : undefined)), false);
    }
    static { this.ID = 'workbench.input.multiDiffEditor'; }
    get resource() { return this.multiDiffSource; }
    get capabilities() { return 2 /* EditorInputCapabilities.Readonly */; }
    get typeId() { return MultiDiffEditorInput_1.ID; }
    getName() { return this._name; }
    get editorId() { return DEFAULT_EDITOR_ASSOCIATION.id; }
    getIcon() { return MultiDiffEditorIcon; }
    constructor(multiDiffSource, label, initialResources, isTransient = false, _textModelService, _textResourceConfigurationService, _instantiationService, _multiDiffSourceResolverService, _textFileService) {
        super();
        this.multiDiffSource = multiDiffSource;
        this.label = label;
        this.initialResources = initialResources;
        this.isTransient = isTransient;
        this._textModelService = _textModelService;
        this._textResourceConfigurationService = _textResourceConfigurationService;
        this._instantiationService = _instantiationService;
        this._multiDiffSourceResolverService = _multiDiffSourceResolverService;
        this._textFileService = _textFileService;
        this._name = '';
        this._viewModel = new LazyStatefulPromise(async () => {
            const model = await this._createModel();
            this._register(model);
            const vm = new MultiDiffEditorViewModel(model, this._instantiationService);
            this._register(vm);
            await raceTimeout(vm.waitForDiffs(), 1000);
            return vm;
        });
        this._resolvedSource = new ObservableLazyPromise(async () => {
            const source = this.initialResources
                ? { resources: ValueWithChangeEvent.const(this.initialResources) }
                : await this._multiDiffSourceResolverService.resolve(this.multiDiffSource);
            return {
                source,
                resources: source ? observableFromValueWithChangeEvent(this, source.resources) : constObservable([]),
            };
        });
        this.resources = derived(this, reader => this._resolvedSource.cachedPromiseResult.read(reader)?.data?.resources.read(reader));
        this.textFileServiceOnDidChange = new FastEventDispatcher(this._textFileService.files.onDidChangeDirty, item => item.resource.toString(), uri => uri.toString());
        this._isDirtyObservables = mapObservableArrayCached(this, this.resources.map(r => r ?? []), res => {
            const isModifiedDirty = res.modifiedUri ? isUriDirty(this.textFileServiceOnDidChange, this._textFileService, res.modifiedUri) : constObservable(false);
            const isOriginalDirty = res.originalUri ? isUriDirty(this.textFileServiceOnDidChange, this._textFileService, res.originalUri) : constObservable(false);
            return derived(reader => /** @description modifiedDirty||originalDirty */ isModifiedDirty.read(reader) || isOriginalDirty.read(reader));
        }, i => i.getKey());
        this._isDirtyObservable = derived(this, reader => this._isDirtyObservables.read(reader).some(isDirty => isDirty.read(reader)))
            .keepObserved(this._store);
        this.onDidChangeDirty = Event.fromObservableLight(this._isDirtyObservable);
        this.closeHandler = {
            // This is a workaround for not having a better way
            // to figure out if the editors this input wraps
            // around are opened or not
            async confirm() {
                return 1 /* ConfirmResult.DONT_SAVE */;
            },
            showConfirm() {
                return false;
            }
        };
        this._register(autorun((reader) => {
            /** @description Updates name */
            const resources = this.resources.read(reader);
            const label = this.label ?? localize('name', "Multi Diff Editor");
            if (resources && resources.length === 1) {
                this._name = localize({ key: 'nameWithOneFile', comment: ['{0} is the name of the editor'] }, "{0} (1 file)", label);
            }
            else if (resources) {
                this._name = localize({ key: 'nameWithFiles', comment: ['{0} is the name of the editor', '{1} is the number of files being shown'] }, "{0} ({1} files)", label, resources.length);
            }
            else {
                this._name = label;
            }
            this._onDidChangeLabel.fire();
        }));
    }
    serialize() {
        return {
            label: this.label,
            multiDiffSourceUri: this.multiDiffSource.toString(),
            resources: this.initialResources?.map(resource => ({
                originalUri: resource.originalUri?.toString(),
                modifiedUri: resource.modifiedUri?.toString(),
                goToFileUri: resource.goToFileUri?.toString(),
            })),
        };
    }
    setLanguageId(languageId, source) {
        const activeDiffItem = this._viewModel.requireValue().activeDiffItem.get();
        const value = activeDiffItem?.documentDiffItem;
        if (!value) {
            return;
        }
        const target = value.modified ?? value.original;
        if (!target) {
            return;
        }
        target.setLanguage(languageId, source);
    }
    async getViewModel() {
        return this._viewModel.getPromise();
    }
    async _createModel() {
        const source = await this._resolvedSource.getPromise();
        const textResourceConfigurationService = this._textResourceConfigurationService;
        const documentsWithPromises = mapObservableArrayCached(this, source.resources, async (r, store) => {
            /** @description documentsWithPromises */
            let original;
            let modified;
            const multiDiffItemStore = new DisposableStore();
            try {
                [original, modified] = await Promise.all([
                    r.originalUri ? this._textModelService.createModelReference(r.originalUri) : undefined,
                    r.modifiedUri ? this._textModelService.createModelReference(r.modifiedUri) : undefined,
                ]);
                if (original) {
                    multiDiffItemStore.add(original);
                }
                if (modified) {
                    multiDiffItemStore.add(modified);
                }
            }
            catch (e) {
                // e.g. "File seems to be binary and cannot be opened as text"
                console.error(e);
                onUnexpectedError(e);
                return undefined;
            }
            const uri = (r.modifiedUri ?? r.originalUri);
            const result = {
                multiDiffEditorItem: r,
                original: original?.object.textEditorModel,
                modified: modified?.object.textEditorModel,
                contextKeys: r.contextKeys,
                get options() {
                    return {
                        ...getReadonlyConfiguration(modified?.object.isReadonly() ?? true),
                        ...computeOptions(textResourceConfigurationService.getValue(uri)),
                    };
                },
                onOptionsDidChange: h => this._textResourceConfigurationService.onDidChangeConfiguration(e => {
                    if (e.affectsConfiguration(uri, 'editor') || e.affectsConfiguration(uri, 'diffEditor')) {
                        h();
                    }
                }),
            };
            return store.add(RefCounted.createOfNonDisposable(result, multiDiffItemStore, this));
        }, i => JSON.stringify([i.modifiedUri?.toString(), i.originalUri?.toString()]));
        const documents = observableValue('documents', 'loading');
        const updateDocuments = derived(async (reader) => {
            /** @description Update documents */
            const docsPromises = documentsWithPromises.read(reader);
            const docs = await Promise.all(docsPromises);
            const newDocuments = docs.filter(isDefined);
            documents.set(newDocuments, undefined);
        });
        const a = recomputeInitiallyAndOnChange(updateDocuments);
        await updateDocuments.get();
        const result = {
            dispose: () => a.dispose(),
            documents: new ValueWithChangeEventFromObservable(documents),
            contextKeys: source.source?.contextKeys,
        };
        return result;
    }
    matches(otherInput) {
        if (super.matches(otherInput)) {
            return true;
        }
        if (otherInput instanceof MultiDiffEditorInput_1) {
            return this.multiDiffSource.toString() === otherInput.multiDiffSource.toString();
        }
        return false;
    }
    isDirty() { return this._isDirtyObservable.get(); }
    async save(group, options) {
        await this.doSaveOrRevert('save', group, options);
        return this;
    }
    revert(group, options) {
        return this.doSaveOrRevert('revert', group, options);
    }
    async doSaveOrRevert(mode, group, options) {
        const items = this._viewModel.currentValue?.items.get();
        if (items) {
            await Promise.all(items.map(async (item) => {
                const model = item.diffEditorViewModel.model;
                const handleOriginal = model.original.uri.scheme !== Schemas.untitled && this._textFileService.isDirty(model.original.uri); // match diff editor behaviour
                await Promise.all([
                    handleOriginal ? mode === 'save' ? this._textFileService.save(model.original.uri, options) : this._textFileService.revert(model.original.uri, options) : Promise.resolve(),
                    mode === 'save' ? this._textFileService.save(model.modified.uri, options) : this._textFileService.revert(model.modified.uri, options),
                ]);
            }));
        }
        return undefined;
    }
};
MultiDiffEditorInput = MultiDiffEditorInput_1 = __decorate([
    __param(4, ITextModelService),
    __param(5, ITextResourceConfigurationService),
    __param(6, IInstantiationService),
    __param(7, IMultiDiffSourceResolverService),
    __param(8, ITextFileService)
], MultiDiffEditorInput);
export { MultiDiffEditorInput };
/**
 * Uses a map to efficiently dispatch events to listeners that are interested in a specific key.
*/
class FastEventDispatcher {
    constructor(_event, _getEventArgsKey, _keyToString) {
        this._event = _event;
        this._getEventArgsKey = _getEventArgsKey;
        this._keyToString = _keyToString;
        this._count = 0;
        this._buckets = new Map();
        this._handleEventChange = (e) => {
            const key = this._getEventArgsKey(e);
            const bucket = this._buckets.get(key);
            if (bucket) {
                for (const listener of bucket) {
                    listener(e);
                }
            }
        };
    }
    filteredEvent(filter) {
        return listener => {
            const key = this._keyToString(filter);
            let bucket = this._buckets.get(key);
            if (!bucket) {
                bucket = new Set();
                this._buckets.set(key, bucket);
            }
            bucket.add(listener);
            this._count++;
            if (this._count === 1) {
                this._eventSubscription = this._event(this._handleEventChange);
            }
            return {
                dispose: () => {
                    bucket.delete(listener);
                    if (bucket.size === 0) {
                        this._buckets.delete(key);
                    }
                    this._count--;
                    if (this._count === 0) {
                        this._eventSubscription?.dispose();
                        this._eventSubscription = undefined;
                    }
                }
            };
        };
    }
}
function isUriDirty(onDidChangeDirty, textFileService, uri) {
    return observableFromEvent(onDidChangeDirty.filteredEvent(uri), () => textFileService.isDirty(uri));
}
function getReadonlyConfiguration(isReadonly) {
    return {
        readOnly: !!isReadonly,
        readOnlyMessage: typeof isReadonly !== 'boolean' ? isReadonly : undefined
    };
}
function computeOptions(configuration) {
    const editorConfiguration = deepClone(configuration.editor);
    // Handle diff editor specially by merging in diffEditor configuration
    if (isObject(configuration.diffEditor)) {
        const diffEditorConfiguration = deepClone(configuration.diffEditor);
        // User settings defines `diffEditor.codeLens`, but here we rename that to `diffEditor.diffCodeLens` to avoid collisions with `editor.codeLens`.
        diffEditorConfiguration.diffCodeLens = diffEditorConfiguration.codeLens;
        delete diffEditorConfiguration.codeLens;
        // User settings defines `diffEditor.wordWrap`, but here we rename that to `diffEditor.diffWordWrap` to avoid collisions with `editor.wordWrap`.
        diffEditorConfiguration.diffWordWrap = diffEditorConfiguration.wordWrap;
        delete diffEditorConfiguration.wordWrap;
        Object.assign(editorConfiguration, diffEditorConfiguration);
    }
    return editorConfiguration;
}
let MultiDiffEditorResolverContribution = class MultiDiffEditorResolverContribution extends Disposable {
    static { this.ID = 'workbench.contrib.multiDiffEditorResolver'; }
    constructor(editorResolverService, instantiationService) {
        super();
        this._register(editorResolverService.registerEditor(`*`, {
            id: DEFAULT_EDITOR_ASSOCIATION.id,
            label: DEFAULT_EDITOR_ASSOCIATION.displayName,
            detail: DEFAULT_EDITOR_ASSOCIATION.providerDisplayName,
            priority: RegisteredEditorPriority.builtin
        }, {}, {
            createMultiDiffEditorInput: (multiDiffEditor) => {
                return {
                    editor: MultiDiffEditorInput.fromResourceMultiDiffEditorInput(multiDiffEditor, instantiationService),
                };
            },
        }));
    }
};
MultiDiffEditorResolverContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService)
], MultiDiffEditorResolverContribution);
export { MultiDiffEditorResolverContribution };
export class MultiDiffEditorSerializer {
    canSerialize(editor) {
        return editor instanceof MultiDiffEditorInput && !editor.isTransient;
    }
    serialize(editor) {
        if (!this.canSerialize(editor)) {
            return undefined;
        }
        return JSON.stringify(editor.serialize());
    }
    deserialize(instantiationService, serializedEditor) {
        try {
            const data = parse(serializedEditor);
            return MultiDiffEditorInput.fromSerialized(data, instantiationService);
        }
        catch (err) {
            onUnexpectedError(err);
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlEaWZmRWRpdG9ySW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL211bHRpRGlmZkVkaXRvci9icm93c2VyL211bHRpRGlmZkVkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUYsT0FBTyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRS9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUEyQixNQUFNLHNDQUFzQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxrQ0FBa0MsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxtQkFBbUIsRUFBRSxrQ0FBa0MsRUFBRSxlQUFlLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUV4UixPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFbkYsT0FBTyxF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