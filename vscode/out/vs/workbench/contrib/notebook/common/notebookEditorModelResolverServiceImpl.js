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
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';
import { CellUri, NotebookSetting, NotebookWorkingCopyTypeIdentifier } from './notebookCommon.js';
import { NotebookFileWorkingCopyModelFactory, SimpleNotebookEditorModel } from './notebookEditorModel.js';
import { combinedDisposable, DisposableStore, dispose, ReferenceCollection, toDisposable } from '../../../../base/common/lifecycle.js';
import { INotebookService } from './notebookService.js';
import { AsyncEmitter, Emitter } from '../../../../base/common/event.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { FileWorkingCopyManager } from '../../../services/workingCopy/common/fileWorkingCopyManager.js';
import { Schemas } from '../../../../base/common/network.js';
import { NotebookProviderInfo } from './notebookProvider.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { INotebookLoggingService } from './notebookLoggingService.js';
import { parse } from '../../../services/notebook/common/notebookDocumentService.js';
let NotebookModelReferenceCollection = class NotebookModelReferenceCollection extends ReferenceCollection {
    constructor(_instantiationService, _notebookService, _configurationService, _telemetryService, _notebookLoggingService) {
        super();
        this._instantiationService = _instantiationService;
        this._notebookService = _notebookService;
        this._configurationService = _configurationService;
        this._telemetryService = _telemetryService;
        this._notebookLoggingService = _notebookLoggingService;
        this._disposables = new DisposableStore();
        this._workingCopyManagers = new Map();
        this._modelListener = new Map();
        this._onDidSaveNotebook = new Emitter();
        this.onDidSaveNotebook = this._onDidSaveNotebook.event;
        this._onDidChangeDirty = new Emitter();
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._dirtyStates = new ResourceMap();
        this.modelsToDispose = new Set();
    }
    dispose() {
        this._disposables.dispose();
        this._onDidSaveNotebook.dispose();
        this._onDidChangeDirty.dispose();
        dispose(this._modelListener.values());
        dispose(this._workingCopyManagers.values());
    }
    isDirty(resource) {
        return this._dirtyStates.get(resource) ?? false;
    }
    isListeningToModel(uri) {
        for (const key of this._modelListener.keys()) {
            if (key.resource.toString() === uri.toString()) {
                return true;
            }
        }
        return false;
    }
    async createReferencedObject(key, notebookType, hasAssociatedFilePath, limits, isScratchpad, viewType) {
        // Untrack as being disposed
        this.modelsToDispose.delete(key);
        const uri = URI.parse(key);
        const workingCopyTypeId = NotebookWorkingCopyTypeIdentifier.create(notebookType, viewType);
        let workingCopyManager = this._workingCopyManagers.get(workingCopyTypeId);
        if (!workingCopyManager) {
            const factory = new NotebookFileWorkingCopyModelFactory(notebookType, this._notebookService, this._configurationService, this._telemetryService, this._notebookLoggingService);
            workingCopyManager = this._instantiationService.createInstance((FileWorkingCopyManager), workingCopyTypeId, factory, factory);
            this._workingCopyManagers.set(workingCopyTypeId, workingCopyManager);
        }
        const isScratchpadView = isScratchpad || (notebookType === 'interactive' && this._configurationService.getValue(NotebookSetting.InteractiveWindowPromptToSave) !== true);
        const model = this._instantiationService.createInstance(SimpleNotebookEditorModel, uri, hasAssociatedFilePath, notebookType, workingCopyManager, isScratchpadView);
        const result = await model.load({ limits });
        // Whenever a notebook model is dirty we automatically reference it so that
        // we can ensure that at least one reference exists. That guarantees that
        // a model with unsaved changes is never disposed.
        let onDirtyAutoReference;
        this._modelListener.set(result, combinedDisposable(result.onDidSave(() => this._onDidSaveNotebook.fire(result.resource)), result.onDidChangeDirty(() => {
            const isDirty = result.isDirty();
            this._dirtyStates.set(result.resource, isDirty);
            // isDirty -> add reference
            // !isDirty -> free reference
            if (isDirty && !onDirtyAutoReference) {
                onDirtyAutoReference = this.acquire(key, notebookType);
            }
            else if (onDirtyAutoReference) {
                onDirtyAutoReference.dispose();
                onDirtyAutoReference = undefined;
            }
            this._onDidChangeDirty.fire(result);
        }), toDisposable(() => onDirtyAutoReference?.dispose())));
        return result;
    }
    destroyReferencedObject(key, object) {
        this.modelsToDispose.add(key);
        (async () => {
            try {
                const model = await object;
                if (!this.modelsToDispose.has(key)) {
                    // return if model has been acquired again meanwhile
                    return;
                }
                if (model instanceof SimpleNotebookEditorModel) {
                    await model.canDispose();
                }
                if (!this.modelsToDispose.has(key)) {
                    // return if model has been acquired again meanwhile
                    return;
                }
                // Finally we can dispose the model
                this._modelListener.get(model)?.dispose();
                this._modelListener.delete(model);
                model.dispose();
            }
            catch (err) {
                this._notebookLoggingService.error('NotebookModelCollection', 'FAILED to destory notebook - ' + err);
            }
            finally {
                this.modelsToDispose.delete(key); // Untrack as being disposed
            }
        })();
    }
};
NotebookModelReferenceCollection = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotebookService),
    __param(2, IConfigurationService),
    __param(3, ITelemetryService),
    __param(4, INotebookLoggingService)
], NotebookModelReferenceCollection);
let NotebookModelResolverServiceImpl = class NotebookModelResolverServiceImpl {
    constructor(instantiationService, _notebookService, _extensionService, _uriIdentService) {
        this._notebookService = _notebookService;
        this._extensionService = _extensionService;
        this._uriIdentService = _uriIdentService;
        this._onWillFailWithConflict = new AsyncEmitter();
        this.onWillFailWithConflict = this._onWillFailWithConflict.event;
        this._data = instantiationService.createInstance(NotebookModelReferenceCollection);
        this.onDidSaveNotebook = this._data.onDidSaveNotebook;
        this.onDidChangeDirty = this._data.onDidChangeDirty;
    }
    dispose() {
        this._data.dispose();
    }
    isDirty(resource) {
        return this._data.isDirty(resource);
    }
    createUntitledUri(notebookType) {
        const info = this._notebookService.getContributedNotebookType(assertReturnsDefined(notebookType));
        if (!info) {
            throw new Error('UNKNOWN notebook type: ' + notebookType);
        }
        const suffix = NotebookProviderInfo.possibleFileEnding(info.selectors) ?? '';
        for (let counter = 1;; counter++) {
            const candidate = URI.from({ scheme: Schemas.untitled, path: `Untitled-${counter}${suffix}`, query: notebookType });
            if (!this._notebookService.getNotebookTextModel(candidate) && !this._data.isListeningToModel(candidate)) {
                return candidate;
            }
        }
    }
    async validateResourceViewType(uri, viewType) {
        if (!uri && !viewType) {
            throw new Error('Must provide at least one of resource or viewType');
        }
        if (uri?.scheme === CellUri.scheme) {
            const originalUri = uri;
            uri = parse(uri)?.notebook;
            if (!uri) {
                throw new Error(`CANNOT open a cell-uri as notebook. Tried with ${originalUri.toString()}`);
            }
        }
        const resource = this._uriIdentService.asCanonicalUri(uri ?? this.createUntitledUri(viewType));
        const existingNotebook = this._notebookService.getNotebookTextModel(resource);
        if (!viewType) {
            if (existingNotebook) {
                viewType = existingNotebook.viewType;
            }
            else {
                await this._extensionService.whenInstalledExtensionsRegistered();
                const providers = this._notebookService.getContributedNotebookTypes(resource);
                viewType = providers.find(provider => provider.priority === 'exclusive')?.id ??
                    providers.find(provider => provider.priority === 'default')?.id ??
                    providers[0]?.id;
            }
        }
        if (!viewType) {
            throw new Error(`Missing viewType for '${resource}'`);
        }
        if (existingNotebook && existingNotebook.viewType !== viewType) {
            await this._onWillFailWithConflict.fireAsync({ resource: resource, viewType }, CancellationToken.None);
            // check again, listener should have done cleanup
            const existingViewType2 = this._notebookService.getNotebookTextModel(resource)?.viewType;
            if (existingViewType2 && existingViewType2 !== viewType) {
                throw new Error(`A notebook with view type '${existingViewType2}' already exists for '${resource}', CANNOT create another notebook with view type ${viewType}`);
            }
        }
        return { resource, viewType };
    }
    async createUntitledNotebookTextModel(viewType) {
        const resource = this._uriIdentService.asCanonicalUri(this.createUntitledUri(viewType));
        return (await this._notebookService.createNotebookTextModel(viewType, resource));
    }
    async resolve(arg0, viewType, options) {
        let resource;
        let hasAssociatedFilePath;
        if (URI.isUri(arg0)) {
            resource = arg0;
        }
        else if (arg0.untitledResource) {
            if (arg0.untitledResource.scheme === Schemas.untitled) {
                resource = arg0.untitledResource;
            }
            else {
                resource = arg0.untitledResource.with({ scheme: Schemas.untitled });
                hasAssociatedFilePath = true;
            }
        }
        const validated = await this.validateResourceViewType(resource, viewType);
        const reference = this._data.acquire(validated.resource.toString(), validated.viewType, hasAssociatedFilePath, options?.limits, options?.scratchpad, options?.viewType);
        try {
            const model = await reference.object;
            return {
                object: model,
                dispose() { reference.dispose(); }
            };
        }
        catch (err) {
            reference.dispose();
            throw err;
        }
    }
};
NotebookModelResolverServiceImpl = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotebookService),
    __param(2, IExtensionService),
    __param(3, IUriIdentityService)
], NotebookModelResolverServiceImpl);
export { NotebookModelResolverServiceImpl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JNb2RlbFJlc29sdmVyU2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9tYWhtb29kYWJkdWxtb25pZW0vRGVza3RvcC92YWxpbm9yLVYvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2NvbW1vbi9ub3RlYm9va0VkaXRvck1vZGVsUmVzb2x2ZXJTZXJ2aWNlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBb0UsZUFBZSxFQUFFLGlDQUFpQyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDcEssT0FBTyxFQUFnQyxtQ0FBbUMsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3hJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUEyQixtQkFBbUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoSyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsc0JBQXNCLEVBQTJCLE1BQU0sZ0VBQWdFLENBQUM7QUFDakksT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFD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